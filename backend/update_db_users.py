import asyncio
from sqlalchemy import text
from core.database import engine

async def main():
    async with engine.begin() as conn:
        print("Adding last_seen column to users table...")
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN last_seen TIMESTAMP WITH TIME ZONE;"))
            print("Successfully added last_seen")
        except Exception as e:
            print(f"Skipped (or error): {e}")

if __name__ == "__main__":
    asyncio.run(main())
