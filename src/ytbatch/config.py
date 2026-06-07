"""기본 설정값과 사용자 선택 옵션."""
from __future__ import annotations

from dataclasses import dataclass, field

# GUI 드롭다운에서 보여줄 언어 선택지. (표시이름, 코드)
# code='' 은 Whisper 자동 감지를 의미.
LANGUAGE_CHOICES: list[tuple[str, str]] = [
    ("한국어 우선", "ko"),
    ("영어 우선", "en"),
    ("자동 감지", ""),
]

# Whisper 모델 선택지 (속도 ↔ 정확도). large-v3-turbo 가 한국어 품질/속도 균형이 좋음.
WHISPER_MODELS: list[str] = [
    "large-v3-turbo",
    "large-v3",
    "medium",
    "small",
    "base",
    "tiny",
]

DEFAULT_WHISPER_MODEL = "large-v3-turbo"


def default_lang_prefs(code: str) -> list[str]:
    """선택한 언어 코드를 자막 선호 순서 리스트로 변환."""
    if not code:          # 자동
        return ["ko", "en"]
    if code == "ko":
        return ["ko", "en"]
    if code == "en":
        return ["en", "ko"]
    return [code, "en"]


@dataclass(slots=True)
class Settings:
    """한 번의 배치 실행에 필요한 모든 옵션."""

    url: str = ""
    output_dir: str = ""

    # 언어
    language_code: str = "ko"          # LANGUAGE_CHOICES 의 code

    # Whisper 폴백
    enable_whisper: bool = True        # 자막 없을 때 음성인식 사용 여부
    whisper_model: str = DEFAULT_WHISPER_MODEL

    # 이미 추출된 파일이 있으면 건너뛰기 (대량 채널 이어받기용)
    skip_existing: bool = True

    # 차단 회피용 프록시 (선택). 예: "http://user:pass@host:port"
    proxy: str = ""

    # Webshare 로테이팅 레지덴셜 프록시 (선택). 둘 중 하나만 채우면 됨.
    webshare_user: str = ""
    webshare_pass: str = ""

    # 채널에서 어떤 탭을 포함할지
    include_shorts: bool = True
    include_streams: bool = True

    @property
    def lang_prefs(self) -> list[str]:
        return default_lang_prefs(self.language_code)

    @property
    def whisper_language(self) -> str | None:
        """Whisper 에 넘길 언어. '' → None(자동감지)."""
        return self.language_code or None
