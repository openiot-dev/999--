"""타임스탬프 포맷팅, 파일명 정리, 대본 파일 쓰기."""
from __future__ import annotations

import re
from pathlib import Path

from .model import Cue, TranscriptResult

_ILLEGAL = re.compile(r'[<>:"/\\|?*\x00-\x1f]')
_SOURCE_LABEL = {
    "youtube-manual": "유튜브 자막(수동)",
    "youtube-auto": "유튜브 자막(자동생성)",
    "whisper-local": "음성인식(Whisper)",
}


def format_timestamp(seconds: float) -> str:
    """초 → [HH:MM:SS]. 음수/None 방어."""
    if seconds is None or seconds < 0:
        seconds = 0
    total = int(seconds)
    h, rem = divmod(total, 3600)
    m, s = divmod(rem, 60)
    return f"{h:02d}:{m:02d}:{s:02d}"


def _truncate_bytes(s: str, max_bytes: int) -> str:
    """UTF-8 바이트 길이 기준으로 자른다 (멀티바이트 글자 안 깨지게)."""
    b = s.encode("utf-8")
    if len(b) <= max_bytes:
        return s
    return b[:max_bytes].decode("utf-8", "ignore")


def sanitize_filename(name: str, max_bytes: int = 200) -> str:
    """파일명으로 안전하게. 길이는 코드포인트가 아닌 UTF-8 바이트 기준. 비면 'untitled'."""
    name = _ILLEGAL.sub("", name or "").strip()
    name = re.sub(r"\s+", " ", name)
    name = name.rstrip(". ")            # 윈도우: 끝의 점/공백 금지
    name = _truncate_bytes(name, max_bytes).rstrip(". ")  # 자른 뒤 다시 끝 정리
    return name or "untitled"


def render_transcript(result: TranscriptResult, title: str, url: str) -> str:
    """대본 결과를 타임스탬프 포함 텍스트 문자열로 렌더링."""
    src = _SOURCE_LABEL.get(result.source, result.source)
    lines = [
        f"# {title}",
        f"# URL: {url}",
        f"# 출처: {src} / 언어: {result.language or '알수없음'}",
        "#" + "-" * 60,
        "",
    ]
    for cue in result.cues:
        # 큐 내부 줄바꿈/연속 공백을 한 칸으로 정규화해 한 줄 = 한 큐 유지
        text = " ".join((cue.text or "").split())
        if not text:
            continue
        lines.append(f"[{format_timestamp(cue.start)}] {text}")
    return "\n".join(lines) + "\n"


def output_path(output_dir: str, title: str, video_id: str) -> Path:
    """'<제목> [<id>].txt' 경로. 파일명 1개는 보통 255바이트 제한이라 여유를 둠."""
    suffix = f" [{video_id}].txt"
    budget = 255 - len(suffix.encode("utf-8")) - 10
    fname = f"{sanitize_filename(title, budget)}{suffix}"
    return Path(output_dir) / fname


def write_transcript(
    output_dir: str, video_id: str, title: str, url: str, result: TranscriptResult
) -> Path:
    path = output_path(output_dir, title, video_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(render_transcript(result, title, url), encoding="utf-8")
    return path
