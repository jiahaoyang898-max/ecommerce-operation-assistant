"""统一的生成媒体落盘与目录解析工具。

图片与视频生成 service 共用：把供应商临时 URL 下载到本地 uploads，
并校验内容真实有效，避免写入空文件/HTML 导致前端 404 裂图。
"""
from pathlib import Path

import httpx

from app.core.config import resolve_uploads_dir


class BadDownloadedMediaError(RuntimeError):
    """下载内容不是有效媒体文件时抛出（由调用方转成各自的生成异常）。"""


def save_downloaded_media(response: httpx.Response, output_path: Path, media_type: str) -> str:
    """落盘下载的媒体文件并做格式校验，返回检测到的真实扩展名。

    - 校验内容非空且大于最小阈值；
    - 图片支持 PNG/JPEG，视频支持 MP4；
    - 任何失败都抛出 BadDownloadedMediaError 且不写入半完成文件。
    """
    content = response.content
    if not content or len(content) < 64:
        raise BadDownloadedMediaError(f"下载的{media_type}内容为空或过小（{len(content)} 字节）")
    if media_type == "image":
        if content.startswith(b"\x89PNG\r\n\x1a\n"):
            ext = ".png"
        elif content.startswith(b"\xFF\xD8\xFF"):
            ext = ".jpg"
        else:
            raise BadDownloadedMediaError("下载内容不是有效的 PNG/JPEG 文件")
    elif media_type == "video":
        if b"ftyp" not in content[:512]:
            raise BadDownloadedMediaError("下载内容不是有效的 MP4 文件")
        ext = ".mp4"
    else:
        raise BadDownloadedMediaError(f"不支持的媒体类型: {media_type}")
    output_path.write_bytes(content)
    return ext


__all__ = ["BadDownloadedMediaError", "save_downloaded_media", "resolve_uploads_dir"]
