"""youtube-transcript-api(>=1.2.4, 인스턴스 API)로 자막을 가져온다.

자막 선택 우선순위: 선호 언어의 수동 자막 > 자동생성 자막 > 그 외 언어(가능하면 번역).
자막이 전혀 없으면 NoCaptionsError(→ Whisper 폴백), 차단되면 BlockedError(폴백 금지).
"""
from __future__ import annotations

from youtube_transcript_api import YouTubeTranscriptApi

# 예외는 버전에 따라 위치가 다를 수 있어 방어적으로 임포트한다.
try:  # 최신: 패키지 최상위에서 노출
    from youtube_transcript_api import (
        TranscriptsDisabled,
        NoTranscriptFound,
        VideoUnavailable,
    )
except ImportError:  # pragma: no cover
    from youtube_transcript_api._errors import (  # type: ignore
        TranscriptsDisabled,
        NoTranscriptFound,
        VideoUnavailable,
    )

# 비교적 최근에 추가된 예외들 — 없으면 더미로 둔다(except 절에서 무해).
from youtube_transcript_api import _errors as _err  # noqa: E402


def _opt_exc(name: str) -> type[BaseException]:
    cls = getattr(_err, name, None)
    if isinstance(cls, type) and issubclass(cls, BaseException):
        return cls
    class _Never(Exception):  # 절대 발생하지 않는 더미
        ...
    return _Never


RequestBlocked = _opt_exc("RequestBlocked")
IpBlocked = _opt_exc("IpBlocked")
PoTokenRequired = _opt_exc("PoTokenRequired")
AgeRestricted = _opt_exc("AgeRestricted")
InvalidVideoId = _opt_exc("InvalidVideoId")
VideoUnplayable = _opt_exc("VideoUnplayable")
NotTranslatable = _opt_exc("NotTranslatable")
TranslationLanguageNotAvailable = _opt_exc("TranslationLanguageNotAvailable")

from .config import Settings  # noqa: E402
from .model import (  # noqa: E402
    Cue,
    TranscriptResult,
    NoCaptionsError,
    BlockedError,
    SkipVideo,
    Cancelled,
)


def make_api(settings: Settings) -> YouTubeTranscriptApi:
    """설정에 따라 (선택적으로 프록시를 단) API 인스턴스 생성."""
    proxy_config = None
    try:
        from youtube_transcript_api.proxies import (
            WebshareProxyConfig,
            GenericProxyConfig,
        )

        if settings.webshare_user and settings.webshare_pass:
            proxy_config = WebshareProxyConfig(
                proxy_username=settings.webshare_user,
                proxy_password=settings.webshare_pass,
            )
        elif settings.proxy:
            proxy_config = GenericProxyConfig(
                http_url=settings.proxy, https_url=settings.proxy
            )
    except Exception:  # noqa: BLE001 - 프록시 모듈 부재/구버전이면 그냥 직접 연결
        proxy_config = None

    if proxy_config is not None:
        return YouTubeTranscriptApi(proxy_config=proxy_config)
    return YouTubeTranscriptApi()


def _list_transcripts(api: YouTubeTranscriptApi, video_id: str):
    # 1.x: .list(); 혹시 모를 구버전 대비 .list_transcripts() 폴백
    if hasattr(api, "list"):
        return api.list(video_id)
    return api.list_transcripts(video_id)  # type: ignore[attr-defined]


def _select(transcript_list, lang_prefs: list[str]):
    """(transcript, source_tag) 선택. 없으면 NoCaptionsError."""
    primary = lang_prefs[0] if lang_prefs else "ko"

    # 1) 선호 언어 수동 자막
    try:
        return transcript_list.find_manually_created_transcript(lang_prefs), "youtube-manual"
    except NoTranscriptFound:
        pass
    # 2) 선호 언어 자동생성 자막
    try:
        return transcript_list.find_generated_transcript(lang_prefs), "youtube-auto"
    except NoTranscriptFound:
        pass
    # 3) 선호 언어 아무거나
    try:
        t = transcript_list.find_transcript(lang_prefs)
        return t, ("youtube-auto" if t.is_generated else "youtube-manual")
    except NoTranscriptFound:
        pass

    # 4) 그 외 언어: 가능하면 primary 로 번역, 안 되면 첫 번째 그대로
    available = list(transcript_list)
    if not available:
        raise NoCaptionsError
    if primary:
        for t in available:
            if getattr(t, "is_translatable", False):
                # translation_languages 원소는 dataclass(.language_code) 라 .get() 불가.
                # 멤버십 직접 검사 대신 translate() 가 검증하도록 맡긴다.
                try:
                    return t.translate(primary), "youtube-auto"
                except (NotTranslatable, TranslationLanguageNotAvailable):
                    continue
    t = available[0]
    return t, ("youtube-auto" if t.is_generated else "youtube-manual")


def fetch_captions(
    api: YouTubeTranscriptApi,
    video_id: str,
    lang_prefs: list[str],
    is_cancelled=lambda: False,
) -> TranscriptResult:
    """자막을 가져와 TranscriptResult 로 반환.

    raises:
        NoCaptionsError  자막 없음(또는 PoToken 필요) → Whisper 폴백 대상
        BlockedError     YouTube 차단 → 폴백 금지, 사용자에게 알림
        SkipVideo        비공개/삭제/연령제한 등 → 건너뜀
        Cancelled        사용자가 중지함
    """
    if is_cancelled():
        raise Cancelled
    try:
        transcript_list = _list_transcripts(api, video_id)
    except TranscriptsDisabled:
        raise NoCaptionsError
    except (RequestBlocked, IpBlocked):
        raise BlockedError
    except PoTokenRequired:
        raise NoCaptionsError
    except (VideoUnavailable, InvalidVideoId, AgeRestricted, VideoUnplayable) as exc:
        raise SkipVideo(exc.__class__.__name__)
    except NoTranscriptFound:
        raise NoCaptionsError

    transcript, source = _select(transcript_list, lang_prefs)

    if is_cancelled():
        raise Cancelled
    try:
        fetched = transcript.fetch()
    except (RequestBlocked, IpBlocked):
        raise BlockedError
    except PoTokenRequired:
        raise NoCaptionsError
    except (VideoUnavailable, InvalidVideoId, AgeRestricted, VideoUnplayable) as exc:
        raise SkipVideo(exc.__class__.__name__)

    cues: list[Cue] = []
    for snip in fetched:
        # 스니펫은 객체(.text/.start) — dict 접근 금지
        text = getattr(snip, "text", None)
        start = getattr(snip, "start", None)
        if text is None and isinstance(snip, dict):  # 혹시 모를 구버전
            text, start = snip.get("text"), snip.get("start")
        if not text:
            continue
        cues.append(Cue(start=float(start or 0.0), text=text))

    if not cues:
        raise NoCaptionsError

    language = (
        getattr(fetched, "language_code", None)
        or getattr(transcript, "language_code", None)
        or (lang_prefs[0] if lang_prefs else "")
    )
    return TranscriptResult(cues=cues, language=language, source=source)
