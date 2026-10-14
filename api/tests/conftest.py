"""课程测试只使用内存数据库，不读取课堂数据库连接。"""
import os

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["APP_ENV"] = "development"
os.environ["AUTH_SECRET_KEY"] = "course-test-secret-not-for-deployment"

# 测试必须离线且结果确定：显式清空模型供应商配置。
# api/.env 里保存了真实密钥，若不清空，"未配置边界"类用例会真的向外网发起调用，
# 结果随环境漂移（无网络即失败），并可能产生真实调用开销。
for _provider_env in (
    "LLM_BASE_URL",
    "LLM_API_KEY",
    "LLM_MODEL",
    "IMAGE_PROVIDER",
    "IMAGE_BASE_URL",
    "IMAGE_API_KEY",
    "IMAGE_MODEL",
    "IMAGE_WORKSPACE_ID",
    "VIDEO_PROVIDER",
    "VIDEO_BASE_URL",
    "VIDEO_API_KEY",
    "VIDEO_MODEL",
    "VIDEO_WORKSPACE_ID",
):
    os.environ[_provider_env] = ""