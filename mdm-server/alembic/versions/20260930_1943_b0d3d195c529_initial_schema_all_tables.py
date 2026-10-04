"""Initial schema — tất cả bảng của EduGuardian MDM Server.

Revision ID: b0d3d195c529
Revises: 
Create Date: 2026-09-30 19:43:08

Tạo toàn bộ schema từ đầu, thay thế 12 Flyway migration files
của Java Spring Boot.

Thứ tự tạo bảng tuân theo quan hệ FK:
  1. campuses          (không phụ thuộc)
  2. schools           (FK → campuses)
  3. users             (FK → schools, campuses)
  4. classrooms        (FK → schools)
  5. class_sessions    (FK → classrooms, users)
  6. enrollment_profiles (FK → schools, campuses, classrooms)
  7. devices           (FK → schools, campuses, classrooms)
  8. refresh_tokens    (FK → users)
  9. rules             (FK → schools, users)
  10. device_events    (FK → devices)
  11. alerts           (FK → devices, schools, campuses, classrooms, rules, device_events, users)
  12. device_commands  (FK → devices, users)
  13. audit_logs       (FK → users)
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "b0d3d195c529"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. campuses ───────────────────────────────────────────
    op.create_table(
        "campuses",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("code", sa.String(50), nullable=False, unique=True),
        sa.Column("address", sa.Text, nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    # ── 2. schools ────────────────────────────────────────────
    op.create_table(
        "schools",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("code", sa.String(50), nullable=False, unique=True),
        sa.Column("address", sa.Text, nullable=True),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("email", sa.String(100), nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("campus_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("campuses.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_schools_campus_id", "schools", ["campus_id"])

    # ── 3. users ──────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("username", sa.String(50), nullable=False, unique=True),
        sa.Column("email", sa.String(100), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(100), nullable=False),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("school_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("schools.id", ondelete="SET NULL"), nullable=True),
        sa.Column("campus_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("campuses.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_users_school_id", "users", ["school_id"])
    op.create_index("ix_users_campus_id", "users", ["campus_id"])
    op.create_index("ix_users_role", "users", ["role"])

    # ── 4. classrooms ─────────────────────────────────────────
    op.create_table(
        "classrooms",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("code", sa.String(50), nullable=False, unique=True),
        sa.Column("capacity", sa.Integer, nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("school_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("schools.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_classrooms_school_id", "classrooms", ["school_id"])

    # ── 5. class_sessions ─────────────────────────────────────
    op.create_table(
        "class_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("classroom_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("classrooms.id", ondelete="CASCADE"), nullable=False),
        sa.Column("teacher_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="ACTIVE"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("scheduled_start_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("scheduled_end_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_class_sessions_classroom_id", "class_sessions", ["classroom_id"])
    op.create_index("ix_class_sessions_teacher_id", "class_sessions", ["teacher_id"])
    op.create_index("ix_class_sessions_status", "class_sessions", ["status"])

    # ── 6. enrollment_profiles ────────────────────────────────
    op.create_table(
        "enrollment_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("code", sa.String(20), nullable=False, unique=True),
        sa.Column("school_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("schools.id", ondelete="CASCADE"), nullable=False),
        sa.Column("campus_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("campuses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("classroom_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("classrooms.id", ondelete="SET NULL"), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("max_uses", sa.Integer, nullable=False, server_default="0"),
        sa.Column("current_uses", sa.Integer, nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_enrollment_profiles_campus_id", "enrollment_profiles", ["campus_id"])
    op.create_index("ix_enrollment_profiles_active", "enrollment_profiles", ["is_active"])

    # ── 7. devices ────────────────────────────────────────────
    op.create_table(
        "devices",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("device_id", sa.String(100), nullable=False, unique=True),
        sa.Column("device_name", sa.String(255), nullable=True),
        sa.Column("serial_number", sa.String(100), nullable=True),
        sa.Column("model", sa.String(100), nullable=True),
        sa.Column("android_version", sa.String(50), nullable=True),
        sa.Column("agent_version", sa.String(50), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="PENDING"),
        sa.Column("registration_token", sa.Text, nullable=True),
        sa.Column("last_heartbeat_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("registered_at", sa.DateTime(timezone=True), nullable=True, server_default=sa.text("now()")),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("school_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("schools.id", ondelete="SET NULL"), nullable=True),
        sa.Column("campus_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("campuses.id", ondelete="SET NULL"), nullable=True),
        sa.Column("classroom_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("classrooms.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_devices_status", "devices", ["status"])
    op.create_index("ix_devices_school_id", "devices", ["school_id"])
    op.create_index("ix_devices_campus_id", "devices", ["campus_id"])
    op.create_index("ix_devices_classroom_id", "devices", ["classroom_id"])

    # ── 8. refresh_tokens ─────────────────────────────────────
    op.create_table(
        "refresh_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token", sa.Text, nullable=False, unique=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_revoked", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_refresh_tokens_user_id", "refresh_tokens", ["user_id"])
    op.create_index("ix_refresh_tokens_is_revoked", "refresh_tokens", ["is_revoked"])

    # ── 9. rules ──────────────────────────────────────────────
    op.create_table(
        "rules",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("rule_type", sa.String(50), nullable=False),
        sa.Column("rule_data", postgresql.JSONB, nullable=True),
        sa.Column("severity", sa.String(20), nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("school_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("schools.id", ondelete="CASCADE"), nullable=True),
        sa.Column("created_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_rules_school_id", "rules", ["school_id"])
    op.create_index("ix_rules_rule_type", "rules", ["rule_type"])
    op.create_index("ix_rules_is_active", "rules", ["is_active"])

    # ── 10. device_events ─────────────────────────────────────
    op.create_table(
        "device_events",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("device_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("devices.id", ondelete="CASCADE"), nullable=False),
        sa.Column("event_type", sa.String(50), nullable=False),
        sa.Column("event_data", postgresql.JSONB, nullable=True),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("processed", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_device_events_device_id", "device_events", ["device_id"])
    op.create_index("ix_device_events_event_type", "device_events", ["event_type"])
    op.create_index("ix_device_events_occurred_at", "device_events", ["occurred_at"])
    op.create_index("ix_device_events_processed", "device_events", ["processed"])

    # ── 11. alerts ────────────────────────────────────────────
    op.create_table(
        "alerts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("alert_code", sa.String(100), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("severity", sa.String(20), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="NEW"),
        sa.Column("event_data", postgresql.JSONB, nullable=True),
        sa.Column("resolution_note", sa.Text, nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("device_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("devices.id", ondelete="CASCADE"), nullable=False),
        sa.Column("school_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("schools.id", ondelete="SET NULL"), nullable=True),
        sa.Column("campus_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("campuses.id", ondelete="SET NULL"), nullable=True),
        sa.Column("classroom_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("classrooms.id", ondelete="SET NULL"), nullable=True),
        sa.Column("rule_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("rules.id", ondelete="SET NULL"), nullable=True),
        sa.Column("event_id", sa.BigInteger, sa.ForeignKey("device_events.id", ondelete="SET NULL"), nullable=True),
        sa.Column("resolved_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_alerts_device_id", "alerts", ["device_id"])
    op.create_index("ix_alerts_status", "alerts", ["status"])
    op.create_index("ix_alerts_severity", "alerts", ["severity"])
    op.create_index("ix_alerts_campus_id", "alerts", ["campus_id"])
    op.create_index("ix_alerts_created_at", "alerts", ["created_at"])

    # ── 12. device_commands ───────────────────────────────────
    op.create_table(
        "device_commands",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("command_type", sa.String(50), nullable=False),
        sa.Column("payload", postgresql.JSONB, nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="PENDING"),
        sa.Column("error_message", sa.String(1000), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("acknowledged_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("executed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("device_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("devices.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_device_commands_device_id", "device_commands", ["device_id"])
    op.create_index("ix_device_commands_status", "device_commands", ["status"])
    op.create_index("ix_device_commands_command_type", "device_commands", ["command_type"])

    # ── 13. audit_logs ────────────────────────────────────────
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("action", sa.String(255), nullable=False),
        sa.Column("entity_type", sa.String(100), nullable=True),
        sa.Column("entity_id", sa.String(100), nullable=True),
        sa.Column("details", postgresql.JSONB, nullable=True),
        sa.Column("ip_address", sa.String(50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
    )
    op.create_index("ix_audit_logs_user_id", "audit_logs", ["user_id"])
    op.create_index("ix_audit_logs_action", "audit_logs", ["action"])
    op.create_index("ix_audit_logs_created_at", "audit_logs", ["created_at"])

    # ── Seed: SUPER_ADMIN mặc định ────────────────────────────
    # Password: Admin@123 (bcrypt hash)
    op.execute("""
        INSERT INTO users (id, username, email, password_hash, full_name, role, is_active, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            'superadmin',
            'superadmin@eduguardian.vn',
            '$2b$12$EkbIvOH5oeB.rr3YfD3w6.rvJRvnRiVMa2Y4TjcP2mFBRFJb7aSxG',
            'Super Administrator',
            'SUPER_ADMIN',
            true,
            now(),
            now()
        )
        ON CONFLICT (username) DO NOTHING;
    """)


def downgrade() -> None:
    # Xóa theo thứ tự ngược (FK dependencies)
    op.drop_table("audit_logs")
    op.drop_table("device_commands")
    op.drop_table("alerts")
    op.drop_table("device_events")
    op.drop_table("rules")
    op.drop_table("refresh_tokens")
    op.drop_table("devices")
    op.drop_table("enrollment_profiles")
    op.drop_table("class_sessions")
    op.drop_table("classrooms")
    op.drop_table("users")
    op.drop_table("schools")
    op.drop_table("campuses")
