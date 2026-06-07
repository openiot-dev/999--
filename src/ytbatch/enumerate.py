"""채널 / 재생목록 / 단일 영상 URL 을 영상 목록으로 펼친다 (yt-dlp extract_flat)."""
from __future__ import annotations

import re
from typing import Callable, Iterator

from yt_dlp import YoutubeDL

from .model import VideoRef
from .ytlog import QuietLogger

_CHANNEL_RE = re.compile(
    r"^(https?://(?:www\.|m\.)?youtube\.com/"
    r"(?:@[^/?#]+|channel/[^/?#]+|c/[^/?#]+|user/[^/?#]+))",
    re.I,
)
_LIST_RE = re.compile(r"[?&]list=([^&]+)")
_VIDEO_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")


def _looks_like_video_id(vid: str | None) -> bool:
    return bool(vid) and bool(_VIDEO_ID_RE.match(vid))


def build_source_urls(url: str, include_shorts: bool, include_streams: bool) -> list[str]:
    """입력 URL → 실제로 extract 할 URL 목록.

    - 재생목록(list=)  → 재생목록 URL 1개
    - 채널            → 선택한 탭들(/videos, /shorts, /streams)
    - 단일 영상        → 그 영상 URL 1개
    """
    url = url.strip()

    # 재생목록 우선 (watch?v=...&list=... 도 재생목록으로 간주)
    m = _LIST_RE.search(url)
    if m:
        list_id = m.group(1)
        # 'Watch Later'(WL), 'Liked'(LL) 같은 비공개 목록은 그대로 두되 일반 목록은 정규화
        return [f"https://www.youtube.com/playlist?list={list_id}"]

    # 채널
    m = _CHANNEL_RE.match(url)
    if m:
        base = m.group(1)
        urls = [f"{base}/videos"]
        if include_shorts:
            urls.append(f"{base}/shorts")
        if include_streams:
            urls.append(f"{base}/streams")
        return urls

    # 단일 영상 (watch?v=, youtu.be/, embed 등) → 그대로
    return [url]


def _ydl_flat() -> YoutubeDL:
    opts = {
        "extract_flat": "in_playlist",
        "skip_download": True,
        "quiet": True,
        "no_warnings": True,
        "ignoreerrors": True,
        "noprogress": True,
        "logger": QuietLogger(),
    }
    return YoutubeDL(opts)


def _iter_video_refs(info: dict | None) -> Iterator[VideoRef]:
    """extract_info 결과를 재귀적으로 훑어 영상만 추출 (entries 는 lazy 일 수 있음)."""
    if not info:
        return
    entries = info.get("entries")
    if entries is not None:
        for e in entries:            # 제너레이터일 수 있으므로 순차 소비
            yield from _iter_video_refs(e)
        return

    # leaf 노드
    vid = info.get("id")
    ie = (info.get("ie_key") or info.get("extractor_key") or "").lower()
    if not _looks_like_video_id(vid):
        return
    # 탭/재생목록 leaf 가 섞여 들어오는 것을 배제 (영상만)
    if ie and "youtube" not in ie:
        return
    if ie in ("youtubetab", "youtubeplaylist"):
        return
    title = info.get("title") or vid
    url = info.get("url") or info.get("webpage_url") or ""
    yield VideoRef(video_id=vid, title=title, url=url)


def list_videos(
    url: str,
    include_shorts: bool = True,
    include_streams: bool = True,
    log: Callable[[str], None] = lambda _m: None,
    is_cancelled: Callable[[], bool] = lambda: False,
) -> list[VideoRef]:
    """URL 을 영상 목록으로. id 기준 중복 제거 (탭 간 겹침 방지)."""
    sources = build_source_urls(url, include_shorts, include_streams)
    seen: set[str] = set()
    result: list[VideoRef] = []

    with _ydl_flat() as ydl:
        for src in sources:
            if is_cancelled():
                break
            log(f"목록 조회 중: {src}")
            try:
                info = ydl.extract_info(src, download=False)
            except Exception as exc:  # noqa: BLE001 - 탭이 없을 수 있음(예: /streams 없음)
                log(f"  건너뜀 ({exc.__class__.__name__})")
                continue
            count_before = len(result)
            for ref in _iter_video_refs(info):
                if is_cancelled():
                    break
                if ref.video_id in seen:
                    continue
                seen.add(ref.video_id)
                result.append(ref)
            log(f"  {len(result) - count_before}개 발견 (누적 {len(result)})")

    return result
