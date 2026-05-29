from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_

from core.database import get_db
from core.security import verify_password, get_password_hash, create_access_token
from models.user import User
from schemas.user import UserCreate, UserResponse, Token, LoginRequest
from core.rate_limit import limiter

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse)
async def register(user: UserCreate, db: AsyncSession = Depends(get_db)):
    # Check username uniqueness
    result = await db.execute(select(User).where(User.username == user.username.strip()))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Username already taken. Please choose a different one.")

    # Check email uniqueness
    result = await db.execute(select(User).where(User.email == user.email.lower()))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="An account with this email already exists. Please log in instead.")

    hashed_password = get_password_hash(user.password)
    new_user = User(
        username=user.username.strip(),
        email=user.email.lower(),
        hashed_password=hashed_password,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
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
