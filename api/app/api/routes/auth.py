from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import User
from app.schemas import AuthTokenRead, LoginRequest, UserRead
from app.services.auth import (
    AuthTokenError,
    create_access_token,
    ensure_user_can_login,
    parse_access_token,
)
from app.services.users import user_to_read, verify_password

#配置路由器
router = APIRouter(prefix="/auth", tags=["auth"])
#依赖注入数据库会话
SessionDep = Annotated[Session, Depends(get_db)]

#登录接口
@router.post("/login", response_model=AuthTokenRead)
def login(payload: LoginRequest, db: SessionDep) -> dict:
    #获取用户的登录信息
    user = db.scalars(select(User).where(User.email == payload.email.strip().lower())).first()
    if user is None or not user.password_hash or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    try:
        #验证用户是否可以登录
        ensure_user_can_login(user)
    except AuthTokenError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    #返回访问令牌和用户信息
    return {"access_token": create_access_token(user), "token_type": "bearer", "user": user_to_read(user)}

#获取当前用户的依赖函数
def get_current_user(
    db: SessionDep,
    #授权头部，格式为 "Bearer <token>"
    authorization: Annotated[str | None, Header()] = None,
) -> User:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing auth token")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=401, detail="Invalid auth header")
    try:
        #解析访问令牌，获取用户信息
        payload = parse_access_token(token)
        #返回当前用户对象
        return ensure_user_can_login(db.get(User, int(payload.get("sub", 0))))
    except (AuthTokenError, ValueError) as exc:
        raise HTTPException(status_code=401, detail="Invalid auth token") from exc

# 获取当前登录用户的接口
@router.get("/me", response_model=UserRead)
def get_me(current_user: Annotated[User, Depends(get_current_user)]) -> dict:
    return user_to_read(current_user)

