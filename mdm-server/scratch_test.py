"""
Diagnostic script: kiểm tra toàn bộ login flow
"""
import asyncio
import httpx
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import bcrypt

DB_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/mdm_db"

async def main():
    print("=== Kiểm tra DB kết nối ===")
    engine = create_async_engine(DB_URL)
    
    try:
        async with engine.connect() as conn:
            result = await conn.execute(text(
                "SELECT id, username, password_hash, is_active, role FROM users WHERE username='superadmin'"
            ))
            row = result.fetchone()
            if not row:
                print("❌ Không tìm thấy user superadmin!")
                return
            
            user_id, username, pw_hash, is_active, role = row
            print(f"✅ User found: {username} | active={is_active} | role={role}")
            print(f"   Hash: {pw_hash[:30]}...")
            
            # Kiểm tra bcrypt verify
            try:
                match = bcrypt.checkpw("admin123".encode(), pw_hash.encode())
                print(f"   bcrypt verify 'admin123': {'✅ MATCH' if match else '❌ NO MATCH'}")
            except Exception as e:
                print(f"   ❌ bcrypt error: {e}")
                
    except Exception as e:
        print(f"❌ DB error: {e}")
    finally:
        await engine.dispose()

    print("\n=== Kiểm tra API Login ===")
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post(
                "http://localhost:8081/api/auth/login",
                json={"username": "superadmin", "password": "admin123"}
            )
            print(f"Status: {r.status_code}")
            data = r.json()
            if r.status_code == 200:
                print(f"✅ Login thành công!")
                print(f"   accessToken: {data['data']['accessToken'][:40]}...")
            else:
                print(f"❌ Login thất bại: {data}")
    except httpx.ConnectError:
        print("❌ Không kết nối được tới backend (http://localhost:8081)")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
