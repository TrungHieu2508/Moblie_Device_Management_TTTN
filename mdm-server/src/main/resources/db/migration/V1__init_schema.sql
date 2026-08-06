-- ==============================================================================
-- V1__init_schema.sql
-- Description: Khởi tạo cấu trúc Database cho EduGuardian MDM
-- Dialect: PostgreSQL
-- ==============================================================================

-- 1. Xóa các kiểu ENUM nếu tồn tại (cho quá trình test lại dễ dàng)
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS device_status CASCADE;
DROP TYPE IF EXISTS event_type CASCADE;
DROP TYPE IF EXISTS command_type CASCADE;
DROP TYPE IF EXISTS command_status CASCADE;
DROP TYPE IF EXISTS rule_type CASCADE;
DROP TYPE IF EXISTS severity_level CASCADE;
DROP TYPE IF EXISTS alert_status CASCADE;

-- 2. Tạo các kiểu ENUM
CREATE TYPE user_role AS ENUM ('IT_ADMIN', 'SUPER_ADMIN');
CREATE TYPE device_status AS ENUM ('PENDING', 'ONLINE', 'OFFLINE', 'WARNING', 'CRITICAL');
CREATE TYPE event_type AS ENUM ('BLACKLIST_APP_DETECTED', 'WHITELIST_APP_EXITED', 'DEVICE_OFFLINE', 'RAM_HIGH', 'BATTERY_LOW');
CREATE TYPE command_type AS ENUM ('SHOW_ALERT', 'LOCK_SCREEN', 'OPEN_LEARNING_APP', 'RESTART_LEARNING_APP', 'REBOOT_DEVICE', 'QUICK_RECOVERY', 'CLEAR_BACKGROUND_APPS');
CREATE TYPE command_status AS ENUM ('PENDING', 'SENT', 'ACKNOWLEDGED', 'EXECUTED', 'FAILED', 'EXPIRED', 'CANCELED');
CREATE TYPE rule_type AS ENUM ('APP_BLACKLIST', 'APP_WHITELIST', 'RAM_THRESHOLD', 'BATTERY_THRESHOLD', 'OFFLINE_THRESHOLD');
CREATE TYPE severity_level AS ENUM ('INFO', 'WARNING', 'CRITICAL');
CREATE TYPE alert_status AS ENUM ('NEW', 'PROCESSING', 'RESOLVED', 'DISMISSED');

-- ==========================================
-- BẢNG DANH MỤC TRƯỜNG HỌC (SCHOOLS & FACILITIES)
-- ==========================================
CREATE TABLE schools (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE campuses (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE classrooms (
    id UUID PRIMARY KEY,
    campus_id UUID NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    capacity INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- BẢNG NGƯỜI DÙNG (USERS)
-- ==========================================
CREATE TABLE users (
    id UUID PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL,
    school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- BẢNG THIẾT BỊ (DEVICES)
-- ==========================================
CREATE TABLE devices (
    id UUID PRIMARY KEY,
    device_id VARCHAR(100) UNIQUE NOT NULL,
    device_name VARCHAR(255),
    serial_number VARCHAR(100),
    model VARCHAR(100),
    android_version VARCHAR(50),
    agent_version VARCHAR(50),
    school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
    campus_id UUID REFERENCES campuses(id) ON DELETE SET NULL,
    classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL,
    status device_status DEFAULT 'PENDING',
    registration_token TEXT,
    last_heartbeat_at TIMESTAMP WITH TIME ZONE,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT
);

CREATE TABLE device_metrics (
    id UUID PRIMARY KEY,
    device_id UUID UNIQUE NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    ram_total_mb INT,
    ram_used_mb INT,
    ram_usage_pct NUMERIC(5,2),
    cpu_usage_pct NUMERIC(5,2),
    storage_total_gb NUMERIC(6,2),
    storage_used_gb NUMERIC(6,2),
    battery_level INT,
    battery_charging BOOLEAN,
    wifi_ssid VARCHAR(100),
    wifi_signal INT,
    ip_address VARCHAR(50),
    current_app VARCHAR(255),
    current_app_name VARCHAR(255),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- BẢNG SỰ KIỆN (EVENTS & RULES)
-- ==========================================
CREATE TABLE device_events (
    id BIGSERIAL PRIMARY KEY,
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    event_type event_type NOT NULL,
    event_data JSONB,
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE rules (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    rule_type rule_type NOT NULL,
    rule_data JSONB,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE, -- NULL nghĩa là Global Rule
    severity severity_level NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE alerts (
    id UUID PRIMARY KEY,
    alert_code VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    severity severity_level NOT NULL,
    status alert_status DEFAULT 'NEW',
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
    campus_id UUID REFERENCES campuses(id) ON DELETE SET NULL,
    classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL,
    rule_id UUID REFERENCES rules(id) ON DELETE SET NULL,
    event_id BIGINT REFERENCES device_events(id) ON DELETE SET NULL,
    event_data JSONB,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- BẢNG LỆNH (REMOTE COMMANDS)
-- ==========================================
CREATE TABLE remote_commands (
    id UUID PRIMARY KEY,
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    issued_by UUID REFERENCES users(id) ON DELETE SET NULL,
    alert_id UUID REFERENCES alerts(id) ON DELETE SET NULL,
    command_type command_type NOT NULL,
    command_params JSONB,
    status command_status DEFAULT 'PENDING',
    expires_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    executed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- BẢNG HEARTBEAT (PARTITIONED)
-- ==========================================
-- Bảng chính
CREATE TABLE heartbeat_logs (
    id BIGSERIAL,
    device_id UUID NOT NULL, -- Bỏ FK REFERENCES để hỗ trợ partition dễ hơn
    ram_usage_pct NUMERIC(5,2),
    cpu_usage_pct NUMERIC(5,2),
    battery_level INT,
    wifi_connected BOOLEAN,
    current_app VARCHAR(255),
    ip_address VARCHAR(50),
    received_at TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY (id, received_at)
) PARTITION BY RANGE (received_at);

-- Tạo Index cho FK device_id để tra cứu
CREATE INDEX idx_heartbeat_logs_device_id ON heartbeat_logs(device_id);

-- Tạo 2 partitions ban đầu (tháng hiện tại và tháng tới) 
CREATE TABLE heartbeat_logs_2024_08 PARTITION OF heartbeat_logs
    FOR VALUES FROM ('2024-08-01 00:00:00+00') TO ('2024-09-01 00:00:00+00');

CREATE TABLE heartbeat_logs_2024_09 PARTITION OF heartbeat_logs
    FOR VALUES FROM ('2024-09-01 00:00:00+00') TO ('2024-10-01 00:00:00+00');

CREATE TABLE heartbeat_logs_2024_10 PARTITION OF heartbeat_logs
    FOR VALUES FROM ('2024-10-01 00:00:00+00') TO ('2024-11-01 00:00:00+00');

-- ==========================================
-- BẢNG LOGS (AUDIT LOGS)
-- ==========================================
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100),
    entity_id VARCHAR(100),
    details JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- INDEXES
-- ==========================================
CREATE INDEX idx_devices_school_id ON devices(school_id, campus_id, classroom_id);
CREATE INDEX idx_devices_status ON devices(status);
CREATE INDEX idx_devices_last_heartbeat_at ON devices(last_heartbeat_at);

CREATE INDEX idx_device_events_device_id_occurred_at ON device_events(device_id, occurred_at DESC);
CREATE INDEX idx_device_events_unprocessed ON device_events(processed) WHERE processed = false;

CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_created_at ON alerts(created_at DESC);

CREATE INDEX idx_remote_commands_device_status ON remote_commands(device_id, status);

CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
