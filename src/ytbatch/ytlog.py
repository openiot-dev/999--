"""yt-dlp 의 stderr 직접 출력(예: '없는 탭' ERROR)을 삼키는 조용한 로거."""
from __future__ import annotations

from typing import Callable


class QuietLogger:
    """yt-dlp 의 logger 인터페이스. 기본은 전부 무시.

    sink 를 주면 메시지를 그쪽으로만 전달(앱 로그 통합용).
    """

    def __init__(self, sink: Callable[[str], None] | None = None) -> None:
        self._sink = sink

    def debug(self, msg: str) -> None:  # yt-dlp 는 info 도 debug 로 보냄
        pass

    def info(self, msg: str) -> None:
        pass

    def warning(self, msg: str) -> None:
        pass

    def error(self, msg: str) -> None:
        if self._sink:
            self._sink(str(msg))
