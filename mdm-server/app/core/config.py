"""
EduGuardian MDM Server — Application Configuration.

Thay thế application.yml của Spring Boot.
Sử dụng pydantic-settings để đọc từ .env file hoặc biến môi trường.
"""

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Cấu hình toàn bộ ứng dụng, đọc từ .env file hoặc environment variables."""

    # ── Database ──────────────────────────────────────────────
    db_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/mdm_db"

    # ── JWT ───────────────────────────────────────────────────
    jwt_secret: str = "RWR1R3VhcmRpYW5NRE1TZWNyZXRLZXkyMDI0VmVyeUxvbmdTZWNyZXRLZXlGb3JIUzI1NkFsZ29yaXRobQ=="
    jwt_access_expire_seconds: int = 3600          # 1 giờ
    jwt_refresh_expire_seconds: int = 604800       # 7 ngày
    jwt_device_expire_seconds: int = 2592000       # 30 ngày

    # ── Server ────────────────────────────────────────────────
    server_host: str = "0.0.0.0"
    server_port: int = 8081
    api_prefix: str = "/api"
    ws_url: str = "ws://192.168.1.5:8081/api/ws/agent"

    # ── CORS ──────────────────────────────────────────────────
    cors_origins: List[str] = ["*"]

    # ── Logging ───────────────────────────────────────────────
    log_level: str = "INFO"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
    }


# Singleton instance — import trực tiếp từ bất kỳ file nào
settings = Settings()
