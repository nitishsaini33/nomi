from pydantic import BaseModel, EmailStr, field_validator
from email_validator import validate_email, EmailNotValidError
import re

class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    email: str
    password: str

    @field_validator('email')
    @classmethod
    def email_valid(cls, v: str) -> str:
        try:
            # check_deliverability=True checks the domain's MX records to ensure it can receive mail
            valid = validate_email(v, check_deliverability=True)
            return valid.normalized
        except EmailNotValidError as e:
            raise ValueError(str(e))

    @field_validator('username')
    @classmethod
    def username_valid(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError('Username must be at least 3 characters')
        if len(v) > 30:
            raise ValueError('Username must be at most 30 characters')
        if not re.match(r'^[a-zA-Z0-9_]+$', v):
            raise ValueError('Username may only contain letters, numbers, and underscores')
        return v

    @field_validator('password')
    @classmethod
    def password_strong(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters')
        return v

class UserResponse(UserBase):
    id: str
    email: str | None = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

# Used for login — accepts username OR email in the identifier field
class LoginRequest(BaseModel):
    identifier: str   # username or email
    password: str

# Used to request an OTP before registration
class SendOTPRequest(UserCreate):
    pass

# Used to verify the OTP and complete registration
class VerifyOTPRequest(BaseModel):
    email: str
    otp: str
