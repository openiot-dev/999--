"""명령줄 인터페이스 (GUI 와 동일한 워커 엔진 사용). 자동화/디버깅용.

예: python -m ytbatch.cli "https://www.youtube.com/@채널/videos" -o ./out --lang ko
"""
from __future__ import annotations

import argparse
import queue
import sys
import threading

from .config import Settings, WHISPER_MODELS, DEFAULT_WHISPER_MODEL
from .worker import run_batch, Phase, Log, Total, VideoStart, VideoProgress, VideoDone, Finished


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="유튜브 채널/재생목록 대본 추출기 (CLI)")
    p.add_argument("url", help="채널 / 재생목록 / 영상 URL")
    p.add_argument("-o", "--output", default="./transcripts", help="저장 폴더")
    p.add_argument("--lang", default="ko", choices=["ko", "en", ""], help="언어 선호(빈값=자동)")
    p.add_argument("--model", default=DEFAULT_WHISPER_MODEL, choices=WHISPER_MODELS)
    p.add_argument("--no-whisper", action="store_true", help="음성인식 폴백 비활성화")
    p.add_argument("--no-shorts", action="store_true")
    p.add_argument("--no-streams", action="store_true")
    p.add_argument("--no-skip", action="store_true", help="이미 있는 파일도 다시 추출")
    p.add_argument("--proxy", default="")
    args = p.parse_args(argv)

    settings = Settings(
        url=args.url,
        output_dir=args.output,
        language_code=args.lang,
        enable_whisper=not args.no_whisper,
        whisper_model=args.model,
        skip_existing=not args.no_skip,
        include_shorts=not args.no_shorts,
        include_streams=not args.no_streams,
        proxy=args.proxy,
    )

    q: "queue.Queue" = queue.Queue()
    cancel = threading.Event()
    th = threading.Thread(target=run_batch, args=(settings, q, cancel), daemon=True)
    th.start()

    code = 0
    try:
        while True:
            msg = q.get()
            if isinstance(msg, (Phase, Log)):
                print(msg.text)
            elif isinstance(msg, Total):
                print(f"== 총 {msg.count}개 ==")
            elif isinstance(msg, VideoStart):
                print(f"[{msg.index}/{msg.total}] {msg.title}")
            elif isinstance(msg, VideoProgress):
                pass  # CLI 에서는 소음 방지
            elif isinstance(msg, VideoDone):
                tail = msg.source or msg.note
                print(f"   → {msg.status}" + (f" ({tail})" if tail else ""))
            elif isinstance(msg, Finished):
                print("결과:", msg.counts)
                if msg.error:
                    code = 1
                break
    except KeyboardInterrupt:
        cancel.set()
        print("\n중지 요청…")
        th.join(timeout=30)
    return code


if __name__ == "__main__":
    sys.exit(main())
