"""로컬 Whisper 음성인식. mlx-whisper(Apple Silicon, 빠름) 우선, 없으면 faster-whisper(CPU)."""
from __future__ import annotations

import importlib.util
from pathlib import Path
from typing import Callable

from .model import Cue, TranscriptResult, Cancelled

# faster-whisper 모델 크기 → mlx-whisper HF 레포 매핑
_MLX_REPOS = {
    "large-v3-turbo": "mlx-community/whisper-large-v3-turbo",
    "large-v3": "mlx-community/whisper-large-v3-mlx",
    "medium": "mlx-community/whisper-medium-mlx",
    "small": "mlx-community/whisper-small-mlx",
    "base": "mlx-community/whisper-base-mlx",
    "tiny": "mlx-community/whisper-tiny-mlx",
}

_FW_CACHE: dict[tuple, object] = {}


def _has(mod: str) -> bool:
    return importlib.util.find_spec(mod) is not None


def whisper_status(prefer_mlx: bool = True) -> str:
    """GUI 표시용: 어떤 백엔드를 쓰게 될지 / 없으면 안내."""
    has_mlx, has_fw = _has("mlx_whisper"), _has("faster_whisper")
    if prefer_mlx and has_mlx:
        return "mlx-whisper (Apple Silicon 가속)"
    if has_fw:
        return "faster-whisper (CPU)"
    if has_mlx:
        return "mlx-whisper"
    return "없음 — pip install faster-whisper 필요"


def _transcribe_faster(
    audio: Path, model_size: str, language: str | None,
    on_progress: Callable[[float], None], is_cancelled: Callable[[], bool],
) -> TranscriptResult:
    from faster_whisper import WhisperModel

    key = ("cpu", "int8", model_size)
    model = _FW_CACHE.get(key)
    if model is None:
        model = WhisperModel(model_size, device="cpu", compute_type="int8")
        _FW_CACHE[key] = model

    segments, info = model.transcribe(
        str(audio),
        language=language or None,
        vad_filter=True,        # 무음 구간 환각 줄이기
        beam_size=5,
    )
    total = float(getattr(info, "duration", 0.0) or 0.0)
    detected = getattr(info, "language", None) or language or ""

    cues: list[Cue] = []
    for seg in segments:        # lazy generator — 여기서 실제 연산 발생
        if is_cancelled():
            raise Cancelled
        text = (seg.text or "").strip()
        if text:
            cues.append(Cue(start=float(seg.start or 0.0), text=text))
        if total:
            on_progress(min(float(seg.end or 0.0) / total, 1.0))
    on_progress(1.0)
    return TranscriptResult(cues=cues, language=detected, source="whisper-local")


def _transcribe_mlx(
    audio: Path, model_size: str, language: str | None,
    on_progress: Callable[[float], None], is_cancelled: Callable[[], bool],
) -> TranscriptResult:
    import mlx_whisper

    repo = _MLX_REPOS.get(model_size, _MLX_REPOS["large-v3-turbo"])
    if is_cancelled():
        raise Cancelled
    # mlx 는 한 번에 전체를 처리(증분 진행률 없음) — 시작 후에는 중간 취소 불가
    result = mlx_whisper.transcribe(
        str(audio), path_or_hf_repo=repo, language=language or None
    )
    if is_cancelled():
        raise Cancelled
    on_progress(1.0)
    segs = result.get("segments") or []
    cues = [
        Cue(start=float(s.get("start") or 0.0), text=(s.get("text") or "").strip())
        for s in segs
        if (s.get("text") or "").strip()
    ]
    detected = result.get("language") or language or ""
    return TranscriptResult(cues=cues, language=detected, source="whisper-local")


def transcribe(
    audio: str | Path,
    model_size: str,
    language: str | None = None,
    prefer_mlx: bool = True,
    on_progress: Callable[[float], None] = lambda _f: None,
    is_cancelled: Callable[[], bool] = lambda: False,
) -> TranscriptResult:
    """오디오 파일을 받아 타임스탬프 포함 대본으로. 백엔드 자동 선택."""
    audio = Path(audio)
    has_mlx, has_fw = _has("mlx_whisper"), _has("faster_whisper")
    if prefer_mlx and has_mlx:
        return _transcribe_mlx(audio, model_size, language, on_progress, is_cancelled)
    if has_fw:
        return _transcribe_faster(audio, model_size, language, on_progress, is_cancelled)
    if has_mlx:
        return _transcribe_mlx(audio, model_size, language, on_progress, is_cancelled)
    raise RuntimeError(
        "Whisper 백엔드가 없습니다. 'pip install faster-whisper' (또는 mlx-whisper)를 설치하세요."
    )
