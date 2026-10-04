"""
Script tao bang device_metrics_snapshots trong PostgreSQL.
Chay 1 lan sau khi them model moi.
"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from urllib.parse import quote_plus

password = "Hieu@123"
encoded_pw = quote_plus(password)
DB_URL = f"postgresql+asyncpg://postgres:{encoded_pw}@localhost:5432/mdm_db"

STATEMENTS = [
    """
    CREATE TABLE IF NOT EXISTS device_metrics_snapshots (
        id                   BIGSERIAL PRIMARY KEY,
        device_id            UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
        ram_usage_mb         INTEGER,
        ram_total_mb         INTEGER,
        cpu_usage_percent    FLOAT,
        battery_level        INTEGER,
        battery_charging     VARCHAR(20),
        storage_used_mb      INTEGER,
        storage_total_mb     INTEGER,
        wifi_ssid            VARCHAR(100),
        wifi_signal_strength INTEGER,
        recorded_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    "CREATE INDEX IF NOT EXISTS idx_metrics_device_id   ON device_metrics_snapshots(device_id)",
    "CREATE INDEX IF NOT EXISTS idx_metrics_recorded_at ON device_metrics_snapshots(recorded_at)",
    "CREATE INDEX IF NOT EXISTS idx_metrics_device_time ON device_metrics_snapshots(device_id, recorded_at DESC)",
]

async def main():
    engine = create_async_engine(DB_URL)
    try:
        async with engine.begin() as conn:
            for stmt in STATEMENTS:
                await conn.execute(text(stmt.strip()))
        print("OK - Bang device_metrics_snapshots da duoc tao thanh cong!")
        print("   3 indexes da duoc tao.")
    except Exception as e:
        print(f"LOI: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
