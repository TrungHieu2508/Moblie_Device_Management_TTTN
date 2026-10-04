"""
Database session management — Async SQLAlchemy Engine + Session.

Thay thế Spring Boot DataSource (HikariCP) + JPA EntityManager.
Sử dụng AsyncSession để tất cả truy vấn DB không chặn event loop.
"""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


# ── Engine ────────────────────────────────────────────────────
# pool_size=20 + max_overflow=30 → tối đa 50 connections (tương đương HikariCP maximum-pool-size=50)
engine = create_async_engine(
    settings.db_url,
    echo=False,                # True = in SQL ra console (tương đương show-sql trong JPA)
    pool_size=20,
    max_overflow=30,
    pool_timeout=30,           # connection-timeout: 30s
    pool_recycle=1800,         # max-lifetime: 30 phút
    pool_pre_ping=True,        # Tự kiểm tra connection trước khi dùng, tránh lỗi connection reset
)

# ── Session Factory ───────────────────────────────────────────
async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,    # Tương đương open-in-view: false
)


# ── Base Model ────────────────────────────────────────────────
class Base(DeclarativeBase):
    """SQLAlchemy Declarative Base — tất cả model kế thừa từ đây."""
    pass


# ── Dependency Injection ──────────────────────────────────────
async def get_db() -> AsyncSession:
    """
    FastAPI dependency: Cung cấp AsyncSession cho mỗi request.

    Tương đương @Transactional trong Spring Boot:
    - Tự động commit khi không có lỗi
    - Tự động rollback khi exception xảy ra
    - Tự động trả connection về pool khi xong
    """
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
