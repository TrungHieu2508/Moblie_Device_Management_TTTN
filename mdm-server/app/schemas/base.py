"""
CamelCase Base Model — Đảm bảo tất cả JSON response dùng camelCase.

Frontend (TypeScript) và Android Agent (Gson) đều mong đợi camelCase.
Backend Python dùng snake_case nội bộ, nhưng serialize ra camelCase.
"""

from pydantic import BaseModel


def to_camel(snake: str) -> str:
    """Chuyển snake_case → camelCase.  Ví dụ: access_token → accessToken"""
    components = snake.split("_")
    return components[0] + "".join(x.title() for x in components[1:])


class CamelModel(BaseModel):
    """
    Base Pydantic model cho toàn bộ hệ thống.
    - Serialize ra JSON dùng camelCase (alias)
    - Nhận input bằng cả camelCase lẫn snake_case (populate_by_name)
    - Hỗ trợ ORM mode (from_attributes)
    """
    model_config = {
        "alias_generator": to_camel,
        "populate_by_name": True,
        "from_attributes": True,
    }
