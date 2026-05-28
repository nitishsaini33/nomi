import asyncio
from sqlalchemy import text
from core.database import engine

async def main():
    async with engine.begin() as conn:
        print("Adding columns to messages table if they don't exist...")
        queries = [
            "ALTER TABLE messages ADD COLUMN status VARCHAR DEFAULT 'SENT';",
            "ALTER TABLE messages ADD COLUMN is_edited BOOLEAN DEFAULT FALSE;",
            "ALTER TABLE messages ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;",
            "ALTER TABLE messages ADD COLUMN reply_to_id VARCHAR REFERENCES messages(id);"
        ]
        
        for q in queries:
            try:
                await conn.execute(text(q))
                print(f"Executed: {q}")
            except Exception as e:
                # Might already exist
                print(f"Skipped (or error): {e}")

if __name__ == "__main__":
    asyncio.run(main())
