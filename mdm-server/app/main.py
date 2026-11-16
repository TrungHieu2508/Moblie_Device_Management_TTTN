import logging
import socket
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.exceptions import register_exception_handlers

# Imports từ tất cả modules để SQLAlchemy nhận diện đầy đủ
from app.models import (  # noqa: F401 — side-effect imports để đảm bảo models được load
    AuditLog,
    Alert,
    Campus,
    Classroom,
    Device,
    DeviceCommand,
    DeviceEvent,
    DeviceMetricsSnapshot,
    EnrollmentProfile,
    RefreshToken,
    Rule,
    School,
    User,
)

# Routers
from app.routers import alerts, auth, commands, dashboard, devices, enrollments, rules, schools, users

# WebSocket routers
from app.ws import agent_ws, dashboard_ws

# ── Logging ───────────────────────────────────────────────────
logging.basicConfig(
    level=logging.getLevelName(settings.log_level),
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger(__name__)


# ── Lifespan ──────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Quản lý vòng đời ứng dụng.
    Tương đương @PostConstruct và @PreDestroy trong Spring Boot.
    """
    logger.info("🚀 EduGuardian MDM Server (FastAPI) starting up...")
    logger.info("📡 WebSocket endpoint: %s", settings.ws_url)
    logger.info("🗄️  Database: %s", settings.db_url.split("@")[-1])  # Ẩn credentials

    yield  # Ứng dụng đang chạy

    logger.info("🛑 EduGuardian MDM Server shutting down...")


# ── FastAPI App ───────────────────────────────────────────────

app = FastAPI(
    title="EduGuardian MDM Server",
    version="2.0.0",
    docs_url="/swagger-ui.html",
    redoc_url="/redoc",
    openapi_url="/v3/api-docs",
    lifespan=lifespan,
)

# ── CORS Middleware ────────────────────────────────────────────
# Tương đương SecurityConfig.corsConfigurationSource()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# ── Exception Handlers ────────────────────────────────────────
# Tương đương GlobalExceptionHandler.java
register_exception_handlers(app)

# ── HTTP Routers ──────────────────────────────────────────────
# Tất cả routes đều có prefix /api (tương đương server.servlet.context-path=/api)
app.include_router(auth.router, prefix=settings.api_prefix)
app.include_router(devices.router, prefix=settings.api_prefix)
app.include_router(enrollments.router, prefix=settings.api_prefix)
app.include_router(commands.router, prefix=settings.api_prefix)
app.include_router(alerts.router, prefix=settings.api_prefix)
app.include_router(schools.router, prefix=settings.api_prefix)
app.include_router(rules.router, prefix=settings.api_prefix)
app.include_router(users.router, prefix=settings.api_prefix)
app.include_router(dashboard.router, prefix=settings.api_prefix)

# ── WebSocket Routers ─────────────────────────────────────────
# WebSocket endpoints KHÔNG có prefix /api để Android Agent kết nối đơn giản hơn
app.include_router(agent_ws.router)
app.include_router(dashboard_ws.router)


# ── Health Check ──────────────────────────────────────────────

def _detect_lan_ip() -> str | None:
    """Phát hiện IPv4 LAN thực tế hiện tại của máy chủ (bỏ qua card ảo/loopback)."""
    for target in (("8.8.8.8", 80), ("10.255.255.255", 1)):
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            sock.connect(target)
            ip = sock.getsockname()[0]
            if ip and not ip.startswith("127.") and not ip.startswith("169.254."):
                return ip
        except OSError:
            pass
        finally:
            sock.close()
    return None


@app.get("/health", tags=["Health"])
@app.get("/api/health", tags=["Health"])
async def health_check():
    """Health check endpoint cho Docker/Kubernetes và tự động cấp LAN URL cho mã QR."""
    from app.ws.connection_manager import manager
    lan_ip = _detect_lan_ip()
    return {
        "status": "UP",
        "service": "EduGuardian MDM Server",
        "version": "2.0.0",
        "architecture": "WebSocket-First (Plan B - No Redis)",
        "lanUrl": f"http://{lan_ip}:{settings.server_port}" if lan_ip else None,
        **manager.get_connection_stats(),
    }


# ── Entry Point ───────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.server_host,
        port=settings.server_port,
        reload=True,           # Auto-reload khi phát triển (tương đương spring-boot-devtools)
        log_level=settings.log_level.lower(),
        ws_ping_interval=20,   # Ping WebSocket mỗi 20s để giữ kết nối
        ws_ping_timeout=20,    # Timeout nếu không nhận pong sau 20s
    )
