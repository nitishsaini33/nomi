"""
Run this ONCE on production to:
1. Add the email column (if not exists)
2. Remove duplicate users (keep the oldest account per username)

Usage:
    python migrate_add_email.py
"""
import asyncio
import sys
from sqlalchemy import text
from core.database import engine

# Fix Windows emoji encoding
sys.stdout.reconfigure(encoding='utf-8')

async def migrate():
    async with engine.begin() as conn:
        # 1. Add email column if it doesn't already exist
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN email VARCHAR UNIQUE"))
            print("[OK] Added email column")
        except Exception as e:
            err = str(e).lower()
            if "already exists" in err or "duplicate" in err or "column" in err:
                print("[INFO] email column already exists, skipping")
            else:
                print(f"[WARN] Could not add email column: {e}")

        # 2. Create partial unique index on email (ignores NULLs)
        try:
            await conn.execute(text(
                "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users (email) WHERE email IS NOT NULL"
            ))
            print("[OK] Created unique index on email")
        except Exception as e:
            print(f"[INFO] Index note: {e}")

        # 3. Remove duplicate usernames — keep only the earliest record
        result = await conn.execute(text(
            "SELECT username, COUNT(*) as cnt FROM users GROUP BY username HAVING COUNT(*) > 1"
        ))
        duplicates = result.fetchall()

        deleted = 0
        for row in duplicates:
            username = row[0]
            result2 = await conn.execute(
                text("SELECT id FROM users WHERE username = :u ORDER BY last_seen ASC"),
                {"u": username}
            )
            ids = [r[0] for r in result2.fetchall()]
            for dup_id in ids[1:]:
                await conn.execute(text("DELETE FROM users WHERE id = :id"), {"id": dup_id})
                deleted += 1
                print(f"  [REMOVED] duplicate user id={dup_id} (username={username})")

        if deleted == 0:
            print("[OK] No duplicate usernames found")
        else:
            print(f"[OK] Removed {deleted} duplicate user(s)")

    print("\n[DONE] Migration complete.")

if __name__ == "__main__":
    asyncio.run(migrate())
