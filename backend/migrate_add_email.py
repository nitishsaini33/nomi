"""
Run this ONCE on production to:
1. Add the email column (if not exists)
2. Remove duplicate users (keep the oldest account per username cluster)

Usage:
    python migrate_add_email.py
"""
import asyncio
from sqlalchemy import text
from core.database import engine

async def migrate():
    async with engine.begin() as conn:
        # 1. Add email column if it doesn't already exist
        try:
            await conn.execute(text("""
                ALTER TABLE users ADD COLUMN email VARCHAR UNIQUE
            """))
            print("✅ Added email column")
        except Exception as e:
            if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
                print("ℹ️  email column already exists, skipping")
            else:
                print(f"⚠️  Could not add email column: {e}")

        # 2. Create index on email if it doesn't exist
        try:
            await conn.execute(text("""
                CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users (email)
                WHERE email IS NOT NULL
            """))
            print("✅ Created unique index on email")
        except Exception as e:
            print(f"ℹ️  Index note: {e}")

        # 3. Remove exact duplicate usernames — keep oldest (lowest created rowid/id alphabetically)
        # Find usernames that appear more than once
        result = await conn.execute(text("""
            SELECT username, COUNT(*) as cnt FROM users GROUP BY username HAVING COUNT(*) > 1
        """))
        duplicates = result.fetchall()

        deleted = 0
        for row in duplicates:
            username = row[0]
            # Keep the first-created user (smallest id alphabetically as UUID v4 is random,
            # so we keep by last_seen as proxy — keep the one with earliest last_seen)
            result2 = await conn.execute(text(
                "SELECT id FROM users WHERE username = :u ORDER BY last_seen ASC"
            ), {"u": username})
            ids = [r[0] for r in result2.fetchall()]
            # Delete all but the first
            for dup_id in ids[1:]:
                await conn.execute(text("DELETE FROM users WHERE id = :id"), {"id": dup_id})
                deleted += 1
                print(f"  🗑️  Removed duplicate user id={dup_id} (username={username})")

        if deleted == 0:
            print("✅ No duplicate usernames found")
        else:
            print(f"✅ Removed {deleted} duplicate user(s)")

    print("\n✅ Migration complete.")

if __name__ == "__main__":
    asyncio.run(migrate())
