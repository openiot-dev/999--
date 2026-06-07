"""yt-dlp 로 영상의 오디오만 받아온다 (Whisper 입력용)."""
from __future__ import annotations

import shutil
from pathlib import Path
from typing import Callable

from yt_dlp import YoutubeDL

from .model import Cancelled
from .ytlog import QuietLogger

# bestaudio 단일 스트림(m4a/webm)을 그대로 받는다. 재인코딩(FFmpegExtractAudio)을
# 하지 않으므로 ffmpeg 바이너리 없이도 동작하며, faster-whisper(PyAV)가 직접 디코딩한다.
_FORMAT = "bestaudio[ext=m4a]/bestaudio/best"


def download_audio(
    video_url: str,
    dest_dir: str | Path,
    on_progress: Callable[[float], None] = lambda _f: None,
    is_cancelled: Callable[[], bool] = lambda: False,
    proxy: str = "",
) -> Path:
    """오디오를 dest_dir 에 받고 그 경로를 반환. 취소 시 Cancelled."""
    dest_dir = Path(dest_dir)
    dest_dir.mkdir(parents=True, exist_ok=True)
    outtmpl = str(dest_dir / "%(id)s.%(ext)s")

    def hook(d: dict) -> None:
        if is_cancelled():
            raise Cancelled
        if d.get("status") == "downloading":
            total = d.get("total_bytes") or d.get("total_bytes_estimate")
            done = d.get("downloaded_bytes") or 0
            if total:
                on_progress(min(done / total, 1.0))

    opts = {
        "format": _FORMAT,
        "outtmpl": outtmpl,
        "quiet": True,
        "no_warnings": True,
        "noprogress": True,
        "ignoreerrors": False,
        "progress_hooks": [hook],
        "retries": 3,
        "fragment_retries": 3,
        # 대량 채널에서 429 회피용 약간의 간격
        "sleep_interval_requests": 1,
        "logger": QuietLogger(),
    }
    if proxy:
        opts["proxy"] = proxy
    ff = shutil.which("ffmpeg")
    if ff:
        opts["ffmpeg_location"] = str(Path(ff).parent)

    with YoutubeDL(opts) as ydl:
        info = ydl.extract_info(video_url, download=True)
        if not info:
            raise RuntimeError("다운로드 정보를 가져오지 못했습니다")
        reqs = info.get("requested_downloads")
        if reqs:
            return Path(reqs[0]["filepath"])
        return Path(ydl.prepare_filename(info))
