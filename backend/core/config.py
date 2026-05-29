import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Modern Chat App"
    DATABASE_URL: str
    SECRET_KEY: str
    REDIS_URL: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days for convenience
    
    GOOGLE_SCRIPT_URL: str = ""

    class Config:
        env_file = ".env"

settings = Settings()
