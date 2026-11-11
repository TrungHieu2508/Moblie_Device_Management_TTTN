"""
Cấu hình Pytest Fixtures dùng chung cho toàn bộ Unit & Integration Tests (50 Test Cases).
Sử dụng SQLite in-memory (aiosqlite) độc lập hoàn toàn để:
1. Chạy siêu nhanh (~2 giây cho 50 test cases).
2. Không làm ảnh hưởng hay xóa dữ liệu thật trong PostgreSQL của người dùng.
"""

import uuid
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import JSON, Integer, Uuid
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token, hash_password
from app.db.session import Base, get_db
from app.main import app
from app.models.enums import UserRole
from app.models.school import Campus, Classroom, School
from app.models.user import User
from app.ws.connection_manager import manager


# Chuyển đổi kiểu cột PostgreSQL (UUID, JSONB, BigInteger PK) sang tương thích SQLite khi chạy test
for table in Base.metadata.tables.values():
    for column in table.columns:
        if isinstance(column.type, PG_UUID):
            column.type = Uuid(as_uuid=True)
        elif isinstance(column.type, JSONB):
            column.type = JSON()
        elif column.primary_key and column.autoincrement and column.type.__class__.__name__ == "BigInteger":
            column.type = Integer()


TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine_test = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = async_sessionmaker(
    bind=engine_test,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_test_database():
    """Khởi tạo toàn bộ bảng và dữ liệu mẫu ban đầu cho phiên chạy Pytest."""
    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as db:
        # Tạo Campus, School, Classroom mặc định
        campus = Campus(
            id=uuid.UUID("11111111-1111-1111-1111-111111111111"),
            name="Cơ sở Quận 12 - UTH",
            code="UTH_Q12",
            address="Quận 12, TP.HCM",
            is_active=True,
        )
        school = School(
            id=uuid.UUID("22222222-2222-2222-2222-222222222222"),
            name="Trường THPT Thực Hành EduGuardian",
            code="EDU_HIGH_01",
            address="TP.HCM",
            phone="0901234567",
            email="contact@eduguardian.vn",
            campus_id=campus.id,
            is_active=True,
        )
        classroom = Classroom(
            id=uuid.UUID("33333333-3333-3333-3333-333333333333"),
            name="Lớp 12A1",
            code="12A1",
            capacity=40,
            school_id=school.id,
            is_active=True,
        )
        db.add_all([campus, school, classroom])
        await db.flush()

        # Tạo 3 tài khoản theo 3 vai trò: SUPER_ADMIN, IT_ADMIN, TEACHER
        super_admin = User(
            id=uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
            username="admin_test",
            email="admin_test@eduguardian.vn",
            password_hash=hash_password("Admin@123"),
            full_name="Quản Trị Viên Tối Cao",
            role=UserRole.SUPER_ADMIN.value,
            is_active=True,
        )
        it_admin = User(
            id=uuid.UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
            username="itadmin_test",
            email="itadmin_test@eduguardian.vn",
            password_hash=hash_password("ItAdmin@123"),
            full_name="Quản Trị CNTT Trường",
            role=UserRole.IT_ADMIN.value,
            school_id=school.id,
            campus_id=campus.id,
            is_active=True,
        )
        teacher = User(
            id=uuid.UUID("cccccccc-cccc-cccc-cccc-cccccccccccc"),
            username="teacher_test",
            email="teacher_test@eduguardian.vn",
            password_hash=hash_password("Teacher@123"),
            full_name="Giáo Viên Chủ Nhiệm 12A1",
            role=UserRole.TEACHER.value,
            school_id=school.id,
            campus_id=campus.id,
            is_active=True,
        )
        db.add_all([super_admin, it_admin, teacher])
        await db.commit()

    async def override_get_db():
        async with TestingSessionLocal() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.clear()
    manager.agent_connections.clear()
    manager.dashboard_connections.clear()
    manager.device_metrics.clear()
    manager.device_current_app.clear()


@pytest_asyncio.fixture
async def db_session():
    """Session trực tiếp vào DB test hiện hành."""
    async with TestingSessionLocal() as session:
        yield session


@pytest_asyncio.fixture
async def client():
    """HTTP AsyncClient gọi trực tiếp vào FastAPI app."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac


@pytest.fixture
def super_admin_headers():
    token = create_access_token(
        user_id="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        username="admin_test",
        role=f"ROLE_{UserRole.SUPER_ADMIN.value}",
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def it_admin_headers():
    token = create_access_token(
        user_id="bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        username="itadmin_test",
        role=f"ROLE_{UserRole.IT_ADMIN.value}",
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def teacher_headers():
    token = create_access_token(
        user_id="cccccccc-cccc-cccc-cccc-cccccccccccc",
        username="teacher_test",
        role=f"ROLE_{UserRole.TEACHER.value}",
    )
    return {"Authorization": f"Bearer {token}"}
