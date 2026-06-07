#!/bin/bash
# 더블클릭으로 실행하는 런처 (macOS).
# 처음 실행 시 가상환경을 만들고 필요한 패키지를 설치한 뒤 GUI를 띄웁니다.
set -e
cd "$(dirname "$0")"

# 파이썬 선택: 3.12 우선, 없으면 python3. 단 3.10~3.14 범위만 허용(휠 호환성).
PY=python3.12
command -v "$PY" >/dev/null 2>&1 || PY=python3
if ! command -v "$PY" >/dev/null 2>&1; then
  echo "⚠ Python 이 필요합니다. brew install python@3.12 로 설치해 주세요."
  exit 1
fi
if ! "$PY" -c 'import sys; raise SystemExit(0 if (3,10)<=sys.version_info[:2]<(3,15) else 1)'; then
  echo "⚠ Python 3.10~3.14 가 필요합니다 (3.12 권장)."
  echo "   설치: brew install python@3.12"
  exit 1
fi

# .installed 센티넬로 '완전히' 설치된 경우에만 건너뛴다(부분 설치 자가복구).
if [ ! -f ".venv/.installed" ]; then
  echo "처음 실행: 가상환경을 만들고 패키지를 설치합니다 (몇 분 걸릴 수 있어요)…"
  rm -rf .venv
  trap 'echo; echo "설치 실패 — .venv 를 정리했습니다. 다시 실행해 주세요."; rm -rf .venv' ERR
  "$PY" -m venv .venv
  ./.venv/bin/python -m pip install --upgrade pip
  ./.venv/bin/pip install -e .
  touch .venv/.installed
  trap - ERR
fi

# GUI용 Tk 바인딩 확인 (Homebrew 파이썬은 기본 미포함)
if ! ./.venv/bin/python -c 'import tkinter' >/dev/null 2>&1; then
  echo "⚠ GUI(Tk) 바인딩이 없습니다. 아래를 설치한 뒤 다시 실행해 주세요:"
  echo "   brew install python-tk@3.12"
  exit 1
fi

# ffmpeg 안내 (음성인식 시 필요)
if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "⚠ ffmpeg 가 없습니다. 음성인식(자막 없는 영상) 사용 시 필요합니다."
  echo "   설치: brew install ffmpeg"
fi

echo "유튜브 대본 추출기를 실행합니다…"
exec ./.venv/bin/python -m ytbatch
