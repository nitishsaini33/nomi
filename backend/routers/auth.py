from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import random
import json
import logging

from core.database import get_db
from core.security import verify_password, get_password_hash, create_access_token
from models.user import User
from schemas.user import UserResponse, Token, LoginRequest, SendOTPRequest, VerifyOTPRequest
from core.rate_limit import limiter
from core.redis import get_redis
from services.email_service import send_otp_email

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/send-otp")
@limiter.limit("3/minute")
async def send_otp(request: Request, body: SendOTPRequest, db: AsyncSession = Depends(get_db)):
    # 1. Check if username is already taken
    result = await db.execute(select(User).where(User.username == body.username.strip()))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Username already taken. Please choose a different one.")

    # 2. Check if email is already taken
    result = await db.execute(select(User).where(User.email == body.email.lower()))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="An account with this email already exists. Please log in instead.")

    # 3. Generate 6-digit OTP
    otp = str(random.randint(100000, 999999))
    
    # 4. Hash password now so we don't store plain text in Redis
    hashed_password = get_password_hash(body.password)

    # 5. Store in Redis with 10 min expiration
    redis = await get_redis()
    if not redis:
        raise HTTPException(status_code=500, detail="Internal server error (Redis offline)")
    
    redis_key = f"registration_otp:{body.email.lower()}"
    user_data = {
        "username": body.username.strip(),
        "email": body.email.lower(),
        "hashed_password": hashed_password,
        "otp": otp
    }
    
    await redis.setex(redis_key, 600, json.dumps(user_data)) # 10 minutes (600s)

    # 6. Send the email
    email_sent = await send_otp_email(body.email.lower(), otp)
    if not email_sent:
        # If email fails, delete from Redis and return error
        await redis.delete(redis_key)
        raise HTTPException(status_code=500, detail="Failed to send verification email. Please try again.")

    return {"message": "Verification code sent to your email."}


@router.post("/verify-otp", response_model=UserResponse)
@limiter.limit("5/minute")
async def verify_otp(request: Request, body: VerifyOTPRequest, db: AsyncSession = Depends(get_db)):
    email = body.email.lower()
    provided_otp = body.otp.strip()
    
    redis = await get_redis()
    if not redis:
        raise HTTPException(status_code=500, detail="Internal server error")
        
    redis_key = f"registration_otp:{email}"
    data_str = await redis.get(redis_key)
    
    if not data_str:
        raise HTTPException(status_code=400, detail="OTP expired or invalid email. Please request a new code.")
        
    user_data = json.loads(data_str)
    
    if user_data["otp"] != provided_otp:
        raise HTTPException(status_code=400, detail="Incorrect verification code.")
        
    # Validation passed. Create the user in the database.
    
    # Double check username/email haven't been taken in the last 10 minutes
    result = await db.execute(select(User).where((User.username == user_data["username"]) | (User.email == email)))
    if result.scalars().first():
        await redis.delete(redis_key)
        raise HTTPException(status_code=400, detail="Username or email was taken while you were verifying. Please start over.")

    new_user = User(
        username=user_data["username"],
        email=user_data["email"],
        hashed_password=user_data["hashed_password"],
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    # Clean up Redis
    await redis.delete(redis_key)
    
    return new_user


@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
async def login(request: Request, body: LoginRequest, db: AsyncSession = Depends(get_db)):
    identifier = body.identifier.strip()

    # Auto-detect: if identifier contains '@', treat as email; otherwise as username
    if "@" in identifier:
        result = await db.execute(select(User).where(User.email == identifier.lower()))
    else:
        result = await db.execute(select(User).where(User.username == identifier))

    user = result.scalars().first()

    # Use constant-time comparison to prevent user enumeration
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Please check your username/email and password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}
