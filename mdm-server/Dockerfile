FROM python:3.12-slim

# Cài đặt thư viện hệ thống cần thiết cho asyncpg và bcrypt
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Cài dependencies trước (cache layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy toàn bộ source code
COPY . .

# Port 8081 (giống Spring Boot cũ)
EXPOSE 8081

# Khởi động: chạy Alembic migration trước, sau đó khởi động server
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8081 --ws-ping-interval 20 --ws-ping-timeout 20"]
