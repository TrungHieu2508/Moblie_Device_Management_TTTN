"""Remove TEACHER role and class_sessions table (2-Role Refactor)

Revision ID: c9f4a812e501
Revises: b0d3d195c529
Create Date: 2026-11-11 15:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c9f4a812e501'
down_revision: Union[str, Sequence[str], None] = 'b0d3d195c529'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    1. Chuyển đổi an toàn toàn bộ tài khoản có role = 'TEACHER' sang 'IT_ADMIN' (Admin dùng chung).
    2. Xóa bảng class_sessions và các index liên quan đến lịch sử/phiên học của Teacher Portal.
    """
    # 1. Migrate existing TEACHER accounts to IT_ADMIN
    op.execute("UPDATE users SET role = 'IT_ADMIN' WHERE role = 'TEACHER'")

    # 2. Drop indexes and table class_sessions
    op.drop_index('idx_class_sessions_teacher_id', table_name='class_sessions')
    op.drop_index('idx_class_sessions_status', table_name='class_sessions')
    op.drop_index('idx_class_sessions_classroom_id', table_name='class_sessions')
    op.drop_table('class_sessions')


def downgrade() -> None:
    """Khôi phục bảng class_sessions và các index phục vụ rollback."""
    op.create_table(
        'class_sessions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('classroom_id', sa.UUID(), nullable=False),
        sa.Column('teacher_id', sa.UUID(), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('scheduled_start_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('scheduled_end_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('ended_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['classroom_id'], ['classrooms.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['teacher_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_class_sessions_classroom_id', 'class_sessions', ['classroom_id'], unique=False)
    op.create_index('idx_class_sessions_status', 'class_sessions', ['status'], unique=False)
    op.create_index('idx_class_sessions_teacher_id', 'class_sessions', ['teacher_id'], unique=False)

