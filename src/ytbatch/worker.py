"""백그라운드 배치 엔진. UI 위젯을 절대 만지지 않고 queue.Queue 로만 통신한다."""
from __future__ import annotations

import queue
import shutil
import tempfile
import threading
from dataclasses import dataclass, field
from pathlib import Path

from .config import Settings
from .captions import make_api, fetch_captions
from .audio import download_audio
from .transcribe import transcribe
from .enumerate import list_videos
from .formatting import output_path, write_transcript
from .model import (
    NoCaptionsError,
    BlockedError,
    SkipVideo,
    Cancelled,
)


# ───────────────────────── 큐 메시지 ─────────────────────────
@dataclass
class Log:
    text: str
    level: str = "info"          # info | warn | error


@dataclass
class Phase:
    text: str


@dataclass
class Total:
    count: int


@dataclass
class VideoStart:
    index: int
    total: int
    title: str
    video_id: str


@dataclass
class VideoProgress:
    index: int
    fraction: float              # 0.0~1.0
    note: str = ""


@dataclass
class VideoDone:
    index: int
    status: str                  # saved|exists|no_captions|skipped|blocked|empty|error
    source: str = ""
    path: str = ""
    note: str = ""


@dataclass
class Finished:
    counts: dict = field(default_factory=dict)
    cancelled: bool = False
    error: str = ""


# 한 영상은 정확히 하나의 터미널 상태로 집계된다. (blocked 는 터미널 상태가 아니라
# 폴백을 유발하는 '사건'이므로 별도 정보 카운터 blocked_events 로 센다.)
_STATUS_KEYS = ["saved", "exists", "no_captions", "skipped", "empty", "error"]


def run_batch(settings: Settings, q: "queue.Queue", cancel_event: threading.Event) -> None:
    """배치 실행 진입점. 워커 스레드에서 호출한다."""
    def post(msg) -> None:
        q.put(msg)

    def cancelled() -> bool:
        return cancel_event.is_set()

    counts = {k: 0 for k in _STATUS_KEYS}
    counts["blocked_events"] = 0
    tmpdir: str | None = None

    try:
        post(Phase("영상 목록을 가져오는 중…"))
        videos = list_videos(
            settings.url,
            include_shorts=settings.include_shorts,
            include_streams=settings.include_streams,
            log=lambda m: post(Log(m)),
            is_cancelled=cancelled,
        )
        if cancelled():
            post(Finished(counts, cancelled=True))
            return

        total = len(videos)
        post(Total(total))
        if total == 0:
            post(Log("영상을 찾지 못했습니다. URL을 확인하세요.", "error"))
            post(Finished(counts))
            return
        post(Phase(f"총 {total}개 영상 처리 시작"))

        api = make_api(settings)
        tmpdir = tempfile.mkdtemp(prefix="ytbatch_")
        warned_block = False

        for i, v in enumerate(videos, 1):
            if cancelled():
                break
            post(VideoStart(i, total, v.title, v.video_id))

            out = output_path(settings.output_dir, v.title, v.video_id)
            if settings.skip_existing and out.exists():
                counts["exists"] += 1
                post(VideoDone(i, "exists", path=str(out)))
                continue

            result = None
            need_whisper = False

            # 1) 자막 시도
            try:
                result = fetch_captions(
                    api, v.video_id, settings.lang_prefs, is_cancelled=cancelled
                )
            except NoCaptionsError:
                need_whisper = True
            except BlockedError:
                counts["blocked_events"] += 1   # 정보용(터미널 상태와 별개로 집계)
                if not warned_block:
                    post(Log("⚠ 자막 요청이 차단됨(IP/봇 차단). 음성인식으로 대체합니다. "
                             "자주 발생하면 프록시(레지덴셜) 설정을 권장합니다.", "warn"))
                    warned_block = True
                need_whisper = True
            except SkipVideo as exc:
                counts["skipped"] += 1
                post(VideoDone(i, "skipped", note=str(exc)))
                continue
            except Cancelled:
                break
            except Exception as exc:  # noqa: BLE001 - 알 수 없는 자막 오류 → 폴백 시도
                post(Log(f"  자막 처리 오류: {exc.__class__.__name__}: {exc}", "warn"))
                need_whisper = True

            # 2) 필요 시 Whisper 폴백
            if need_whisper:
                if not settings.enable_whisper:
                    counts["no_captions"] += 1
                    post(VideoDone(i, "no_captions"))
                    continue
                audio = None
                try:
                    post(VideoProgress(i, 0.0, "오디오 다운로드 중"))
                    audio = download_audio(
                        v.watch_url,
                        tmpdir,
                        on_progress=lambda f, _i=i: post(VideoProgress(_i, f * 0.4, "오디오 다운로드 중")),
                        is_cancelled=cancelled,
                        proxy=settings.proxy,
                    )
                    post(VideoProgress(i, 0.4, "음성 인식 중 (시간이 걸릴 수 있어요)"))
                    result = transcribe(
                        audio,
                        settings.whisper_model,
                        settings.whisper_language,
                        on_progress=lambda f, _i=i: post(VideoProgress(_i, 0.4 + f * 0.6, "음성 인식 중")),
                        is_cancelled=cancelled,
                    )
                except Cancelled:
                    break
                except Exception as exc:  # noqa: BLE001
                    counts["error"] += 1
                    post(VideoDone(i, "error", note=f"{exc.__class__.__name__}: {exc}"))
                    continue
                finally:
                    # 성공/실패/취소 어느 경우든 임시 오디오 삭제(배치 중 누적 방지)
                    if audio is not None:
                        try:
                            Path(audio).unlink(missing_ok=True)
                        except Exception:  # noqa: BLE001
                            pass

            # 3) 저장
            if result is None or result.is_empty:
                counts["empty"] += 1
                post(VideoDone(i, "empty"))
                continue

            try:
                path = write_transcript(
                    settings.output_dir, v.video_id, v.title, v.watch_url, result
                )
            except Exception as exc:  # noqa: BLE001
                counts["error"] += 1
                post(VideoDone(i, "error", note=f"저장 실패: {exc}"))
                continue

            counts["saved"] += 1
            post(VideoDone(i, "saved", source=result.source, path=str(path)))

        post(Finished(counts, cancelled=cancelled()))

    except Exception as exc:  # noqa: BLE001 - 워커가 조용히 죽지 않도록
        post(Log(f"치명적 오류: {exc.__class__.__name__}: {exc}", "error"))
        post(Finished(counts, error=str(exc)))
    finally:
        if tmpdir:
            shutil.rmtree(tmpdir, ignore_errors=True)
