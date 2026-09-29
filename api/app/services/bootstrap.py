from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import User, UserRole, UserStatus
from app.services.users import hash_password

#创建或确保引导用户存在
def ensure_bootstrap_user(
    db: Session,
    *,
    email: str,
    display_name: str,
    password: str,
    role: UserRole = UserRole.OWNER,
) -> tuple[User, bool]:
    #规范化电子邮件地址
    normalized_email = email.strip().lower()
    #检查数据库中是否已存在具有相同电子邮件的用户
    existing = db.scalars(select(User).where(User.email == normalized_email)).first()
    if existing is not None:
        return existing, False
    user = User(
        email=normalized_email,
        display_name=display_name.strip() or normalized_email,
        role=role,
        status=UserStatus.ACTIVE,
        password_hash=hash_password(password),
    )
    db.add(user)
    db.commit()
    #刷新用户对象以确保其状态与数据库同步
    db.refresh(user)
    return user, True