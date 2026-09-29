import base64
import hashlib
import hmac
import os

from app.models import User, UserRole


ROLE_PERMISSIONS = {
    UserRole.OWNER: {"can_read": True, "can_edit": True, "can_manage_users": True},
    UserRole.OPERATOR: {"can_read": True, "can_edit": True, "can_manage_users": False},
    UserRole.VIEWER: {"can_read": True, "can_edit": False, "can_manage_users": False},
}

#获取用户的权限
def user_permissions(user: User) -> dict[str, bool]:
    return ROLE_PERMISSIONS[user.role]

#将用户对象转换为可读的字典格式
def user_to_read(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "display_name": user.display_name,
        "role": user.role.value,
        "status": user.status.value,
        "permissions": user_permissions(user),
        "last_login_at": user.last_login_at,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
    }

#哈希密码
def hash_password(password: str) -> str:
    #生成一个随机的盐值
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120_000)
    return f"pbkdf2_sha256${base64.b64encode(salt).decode()}${base64.b64encode(digest).decode()}"

#验证密码
def verify_password(password: str, password_hash: str) -> bool:
    try:
        #将存储的密码哈希拆分为算法、盐值和摘要
        algorithm, salt_value, digest_value = password_hash.split("$", 2)
    except ValueError:
        return False
    #如果算法不是pbkdf2_sha256，则返回False
    if algorithm != "pbkdf2_sha256":
        return False
    salt = base64.b64decode(salt_value)
    expected = base64.b64decode(digest_value)
    actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120_000)
    #使用hmac.compare_digest进行安全比较，防止时间攻击
    return hmac.compare_digest(actual, expected)