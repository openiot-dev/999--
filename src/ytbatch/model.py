"""프로젝트 전반에서 공유하는 데이터 모델."""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(slots=True)
class VideoRef:
    """열거 단계에서 얻는 영상 참조 (다운로드 전, 가벼운 메타)."""

    video_id: str
    title: str
    url: str

    @property
    def watch_url(self) -> str:
        # extract_flat 의 url 이 비어 있을 수 있으므로 id 로 안전하게 재구성
        return self.url or f"https://www.youtube.com/watch?v={self.video_id}"


@dataclass(slots=True)
class Cue:
    """타임스탬프가 붙은 한 줄의 자막/대본 조각."""

    start: float  # 초 단위 시작 시각
    text: str


@dataclass(slots=True)
class TranscriptResult:
    """한 영상에 대한 최종 대본 결과."""

    cues: list[Cue]
    language: str          # 실제 사용된 언어 코드 (예: 'ko', 'en')
    source: str            # 'youtube-manual' | 'youtube-auto' | 'whisper-local'

    @property
    def is_empty(self) -> bool:
        return not self.cues


class NoCaptionsError(Exception):
    """해당 영상에 (선호 언어의) 가져올 수 있는 자막이 없음 → Whisper 폴백 대상."""


class BlockedError(Exception):
    """YouTube 가 요청을 차단함 (IP/봇 차단). 자막 없음과 구분해야 함 (폴백 X)."""


class SkipVideo(Exception):
    """이 영상은 처리 불가 (비공개/삭제/연령제한 등) → 건너뜀."""


class Cancelled(Exception):
    """사용자가 중지를 눌러 작업이 협조적으로 취소됨."""
