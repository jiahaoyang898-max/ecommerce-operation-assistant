from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.routes.auth import require_edit_permission
from app.db.session import get_db
from app.models import User
from app.schemas import (
    ModelSettingsRead,
    ModelSettingsTestRequest,
    ModelSettingsTestResult,
    ModelSettingsUpdate,
)
from app.services.image_generation import (
    ImageGenerationError,
    ImageGenerationNotConfiguredError,
    _create_jimeng_image_task,
    is_image_generation_configured,
)
from app.services.llm import LLMNotConfiguredError, LLMResponseError, create_json_chat_completion
from app.services.model_settings import (
    get_runtime_settings,
    read_model_settings,
    update_model_settings,
)
from app.services.video_generation import (
    VideoGenerationError,
    VideoGenerationNotConfiguredError,
    create_jimeng_video_task,
    is_video_generation_configured,
)

router = APIRouter(prefix='/model-settings', tags=['model-settings'])
SessionDep = Annotated[Session, Depends(get_db)]
EditorDep = Annotated[User, Depends(require_edit_permission)]


@router.get('', response_model=ModelSettingsRead)
def get_model_settings(db: SessionDep, _current_user: EditorDep) -> dict:
    return read_model_settings(db)


@router.patch('', response_model=ModelSettingsRead)
def patch_model_settings(payload: ModelSettingsUpdate, db: SessionDep, _current_user: EditorDep) -> dict:
    return update_model_settings(payload.model_dump(exclude_unset=True), db)


@router.post('/test', response_model=ModelSettingsTestResult)
def test_model_settings(payload: ModelSettingsTestRequest, _current_user: EditorDep) -> dict:
    if payload.target == 'image':
        return _test_image_model()
    if payload.target == 'video':
        return _test_video_model()
    return _test_text_model()


def _provider_error_message(kind: str, raw: str) -> str:
    """把供应商原始报错转成运营看得懂的中文说明，并保留关键原始信息便于排查。"""
    if '50400' in raw or 'Access Denied' in raw:
        return (
            f'{kind}模型不可用：供应商返回「Access Denied」(code 50400)，'
            '通常是当前火山引擎账号尚未开通该模型权限，请在火山引擎控制台开通对应能力后重试。'
        )
    if '50200' in raw or 'not supported' in raw:
        return f'{kind}模型不可用：供应商不支持当前模型名，请检查模型配置。'
    return f'{kind}模型调用失败：{raw[:300]}'


def _test_image_model() -> dict:
    """图片模型连通性测试：向供应商提交一个最小生成任务，确认鉴权与模型权限均可用。"""
    settings = get_runtime_settings()
    if not is_image_generation_configured(settings):
        raise HTTPException(
            status_code=400,
            detail='图片模型未配置，请先填写 Provider、Base URL、API Key 与模型名。',
        )
    try:
        task_id = _create_jimeng_image_task('纯色背景的商品展示图，用于接口连通性测试。', settings)
    except ImageGenerationNotConfiguredError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ImageGenerationError as exc:
        raise HTTPException(status_code=502, detail=_provider_error_message('图片', str(exc))) from exc
    return {
        'target': 'image',
        'ok': True,
        'message': f'图片模型通道可达，供应商已接受测试任务（task_id={task_id}）。',
    }


def _test_video_model() -> dict:
    """视频模型连通性测试：向供应商提交一个最小生成任务，失败时回传可读的中文原因。"""
    settings = get_runtime_settings()
    if not is_video_generation_configured(settings):
        raise HTTPException(
            status_code=400,
            detail='视频模型未配置，请先填写 Provider、Base URL、API Key 与模型名。',
        )
    try:
        task_id = create_jimeng_video_task(
            '电商商品短视频，用于接口连通性测试。',
            settings,
            workflow={'reference_images': []},
        )
    except VideoGenerationNotConfiguredError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except VideoGenerationError as exc:
        raise HTTPException(status_code=502, detail=_provider_error_message('视频', str(exc))) from exc
    return {
        'target': 'video',
        'ok': True,
        'message': f'视频模型通道可达，供应商已接受测试任务（task_id={task_id}）。',
    }


def _test_text_model() -> dict:
    settings = get_runtime_settings()
    try:
        result, _raw = create_json_chat_completion(
            [
                {'role': 'system', 'content': '你是一个接口连通性测试助手，只返回 JSON。'},
                {'role': 'user', 'content': '返回 {"ok": true, "message": "ready"}'},
            ],
            max_tokens=80,
            temperature=0,
            settings=settings,
        )
    except LLMNotConfiguredError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except LLMResponseError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    if result.get('ok') is not True:
        raise HTTPException(status_code=502, detail='Text model test response must contain ok=true.')
    return {'target': 'text', 'ok': True, 'message': 'Text model is reachable and returned ok=true.'}