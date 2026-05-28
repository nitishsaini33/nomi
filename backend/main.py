from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from core.database import Base, engine
from routers import auth, users, chat, websockets, blocks
import models # Important for metadata
from core.redis import init_redis, close_redis
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from core.rate_limit import limiter

app = FastAPI(title="Modern Chat App API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(chat.router)
app.include_router(websockets.router)
app.include_router(blocks.router)

@app.on_event("startup")
async def startup():
    await init_redis()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
@app.on_event("shutdown")
async def shutdown():
    await close_redis()

@app.get("/")
def root():
    return {"message": "Welcome to Modern Chat App API"}
