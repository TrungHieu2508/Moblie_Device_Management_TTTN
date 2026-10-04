"""
Reset password superadmin = admin123 trong database.
"""
import asyncio
import bcrypt
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from urllib.parse import quote_plus

# Password Hieu@123 — @ phai encode thanh %40
password = "Hieu@123"
encoded_pw = quote_plus(password)
DB_URL = f"postgresql+asyncpg://postgres:{encoded_pw}@localhost:5432/mdm_db"

async def main():
    print(f"Ket noi toi: localhost:5432/mdm_db voi user=postgres")
    engine = create_async_engine(DB_URL)
    
    try:
        # Tao hash moi cho admin123
        new_hash = bcrypt.hashpw("admin123".encode("utf-8"), bcrypt.gensalt(rounds=10)).decode("utf-8")
        print(f"New hash tao thanh cong")
        
        async with engine.begin() as conn:
            # Kiem tra user hien tai
            result = await conn.execute(text(
                "SELECT id, username, password_hash, is_active, role FROM users WHERE username='superadmin'"
            ))
            row = result.fetchone()
            
            if not row:
                print("Khong tim thay user superadmin. Tao moi...")
                import uuid
                uid = str(uuid.uuid4())
                await conn.execute(text("""
                    INSERT INTO users (id, username, password_hash, full_name, role, is_active, created_at, updated_at)
                    VALUES (:id, 'superadmin', :hash, 'Super Admin', 'SUPER_ADMIN', true, NOW(), NOW())
                """), {"id": uid, "hash": new_hash})
                print(f"Da tao user superadmin moi")
            else:
                print(f"Tim thay user: {row.username} | active={row.is_active} | role={row.role}")
                await conn.execute(text(
                    "UPDATE users SET password_hash=:hash, is_active=true WHERE username='superadmin'"
                ), {"hash": new_hash})
                print("Da cap nhat password_hash moi!")
            
            # Xac nhan
            result2 = await conn.execute(text(
                "SELECT password_hash FROM users WHERE username='superadmin'"
            ))
            saved_hash = result2.scalar()
            match = bcrypt.checkpw("admin123".encode(), saved_hash.encode())
            if match:
                print("\n>>> THANH CONG! Ban co the dang nhap voi:")
                print("    Username: superadmin")
                print("    Password: admin123")
            else:
                print("THAT BAI - Hash khong khop!")
    except Exception as e:
        print(f"LOI: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
