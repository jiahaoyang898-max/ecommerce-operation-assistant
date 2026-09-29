import base64
import hashlib
import hmac
import json
from datetime import UTC, datetime, timedelta
from typing import Any

from app.core.config import Settings, get_settings
from app.models import User, UserStatus

# 自定义认证令牌异常
class AuthTokenError(ValueError):
    pass

#创建访问令牌
def create_access_token(user: User, settings: Settings | None = None) -> str:
    #1. 获取配置设置，如果没有提供，则使用默认设置
    settings = settings or get_settings()
    #2. 计算访问令牌的过期时间，单位为分钟
    expires_at = datetime.now(UTC) + timedelta(minutes=settings.auth_token_expire_minutes)
    #3. 创建访问令牌的有效负载，包括用户ID、邮箱、角色和过期时间
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role.value,
        "exp": int(expires_at.timestamp()),
    }
    #4. 将有效负载编码为JSON字符串，并使用Base64 URL安全编码
    encoded_payload = _base64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    #5. 使用HMAC-SHA256算法对编码后的有效负载进行签名，生成签名字符串
    #6. 返回最终的访问令牌，格式为 "encoded_payload.signature"
    return f"{encoded_payload}.{_sign(encoded_payload, settings.auth_secret_key)}"

#解析访问令牌
def parse_access_token(token: str, settings: Settings | None = None) -> dict[str, Any]:
    #1.获取配置设置，如果没有提供，则使用默认设置
    settings = settings or get_settings()
    try:
        #2. 将访问令牌拆分为编码后的有效负载和签名部分
        encoded_payload, signature = token.split(".", 1)
    except ValueError as exc:
        raise AuthTokenError("Token format is invalid") from exc
    if not hmac.compare_digest(signature, _sign(encoded_payload, settings.auth_secret_key)):
        #3. 如果签名不匹配，则抛出令牌签名无效的异常
        raise AuthTokenError("Token signature is invalid")
    try:
        #4. 解码并解析有效负载
        payload = json.loads(_base64url_decode(encoded_payload))
    except (ValueError, json.JSONDecodeError) as exc:
        raise AuthTokenError("Token payload is invalid") from exc
    if int(payload.get("exp", 0)) < int(datetime.now(UTC).timestamp()):
        #5. 如果令牌已过期，则抛出异常，否则返回有效负载
        raise AuthTokenError("Token has expired")
    return payload

#验证用户是否可以登录
def ensure_user_can_login(user: User | None) -> User:
    if user is None:
        raise AuthTokenError("User not found")
    #如果用户的状态不是激活状态，则抛出异常
    if user.status != UserStatus.ACTIVE:
        raise AuthTokenError("User is disabled")
    return user

#签名函数
def _sign(encoded_payload: str, secret_key: str) -> str:
    # 使用HMAC-SHA256算法对编码后的有效负载进行签名
    digest = hmac.new(secret_key.encode("utf-8"), encoded_payload.encode("utf-8"), hashlib.sha256).digest()
    return _base64url_encode(digest)

# Base64 URL安全编码函数
def _base64url_encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")

# Base64 URL安全解码函数
def _base64url_decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))