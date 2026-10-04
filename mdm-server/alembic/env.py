"""
Alembic Environment — Async Migration Setup.

Cấu hình chuẩn cho SQLAlchemy 2.0 (async) + Alembic 1.13.
Đọc DB URL từ .env thông qua app/core/config.py (không hardcode credentials).

Hỗ trợ 2 chế độ:
  - offline: Sinh SQL ra file, không cần kết nối DB thực
  - online (async): Kết nối thực tới PostgreSQL và chạy migration
"""

import asyncio
import os
import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

# ── Path setup ────────────────────────────────────────────────
# Đảm bảo thư mục gốc dự án (MDM-server/) nằm trong sys.path
# để import app.* hoạt động dù chạy alembic từ bất kỳ đâu
BASE_DIR = Path(__file__).resolve().parent.parent  # MDM-server/
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

# ── Load .env trước khi import settings ───────────────────────
# Cần thiết nếu chạy alembic trực tiếp (không qua uvicorn)
from dotenv import load_dotenv
load_dotenv(BASE_DIR / ".env")

# ── Import models + config ─────────────────────────────────────
# Phải import TẤT CẢ models trước target_metadata = Base.metadata
# Nếu bỏ sót một model → Alembic không tạo bảng đó
from app.core.config import settings
from app.db.session import Base

# Import toàn bộ models — side-effect: đăng ký vào Base.metadata
from app.models.school import Campus, School, Classroom, ClassSession      # noqa: F401
from app.models.user import User, RefreshToken                              # noqa: F401
from app.models.device import Device, EnrollmentProfile                    # noqa: F401
from app.models.rule import Rule                                            # noqa: F401
from app.models.event import DeviceEvent                                    # noqa: F401
from app.models.alert import Alert                                          # noqa: F401
from app.models.command import DeviceCommand                               # noqa: F401
from app.models.audit import AuditLog                                       # noqa: F401

# ── Alembic config ────────────────────────────────────────────
config = context.config

# Ghi đè sqlalchemy.url từ .env (ưu tiên hơn giá trị trong alembic.ini)
# settings.db_url đọc từ DB_URL trong .env → postgresql+asyncpg://...
# Escape '%' to '%%' for configparser interpolation
config.set_main_option("sqlalchemy.url", settings.db_url.replace("%", "%%"))

# Logging config từ [loggers] trong alembic.ini
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ── Target Metadata ────────────────────────────────────────────
# Alembic sẽ so sánh schema thực trong DB với metadata này
# để tự sinh migration script (autogenerate)
target_metadata = Base.metadata


# ──────────────────────────────────────────────────────────────
# OFFLINE MODE — Sinh SQL script không cần kết nối DB
# Dùng: alembic upgrade head --sql > migrate.sql
# ──────────────────────────────────────────────────────────────

def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        # Cho phép Alembic nhận biết các type custom (JSONB, UUID, ARRAY)
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


# ──────────────────────────────────────────────────────────────
# ONLINE MODE (ASYNC) — Kết nối thực và chạy migration
# Dùng: alembic upgrade head
#       alembic downgrade -1
#       alembic revision --autogenerate -m "add_xxx_table"
# ──────────────────────────────────────────────────────────────

def do_run_migrations(connection: Connection) -> None:
    """Chạy migration trong context đồng bộ (được gọi từ async context)."""
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        # So sánh kiểu dữ liệu cột — cần cho JSONB, UUID, ENUM
        compare_type=True,
        # So sánh giá trị mặc định server-side
        compare_server_default=True,
        # Giữ nguyên tên constraint khi autogenerate
        render_as_batch=False,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Tạo async engine và chạy migration."""
    # Lấy config section [alembic] từ alembic.ini
    configuration = config.get_section(config.config_ini_section, {})

    # Ghi đè URL một lần nữa để chắc chắn (asyncpg cho online mode)
    configuration["sqlalchemy.url"] = settings.db_url

    connectable = async_engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        # NullPool: không giữ connection pool trong quá trình migration
        # Tránh lỗi "connection pool exhausted" khi chạy nhiều migration
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Entry point cho online mode."""
    asyncio.run(run_async_migrations())


# ── Main ──────────────────────────────────────────────────────
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
