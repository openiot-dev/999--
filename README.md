# 유튜브 대본 추출기 (ytbatch)

유튜브 **채널** 또는 **재생목록**(혹은 단일 영상) 링크를 넣으면, 그 안의 영상들 대본을
**타임스탬프 포함 텍스트**로 한 번에 추출하는 데스크톱 앱입니다.

- 유튜브 자막(수동 → 자동생성) 을 먼저 사용하고,
- 자막이 없는 영상은 **로컬 Whisper 음성인식**으로 대체합니다.
- 결과는 영상마다 `제목 [영상ID].txt` 파일로 저장됩니다.

```
[00:00:00] 안녕하세요, 오늘은…
[00:00:07] 첫 번째 주제는…
```

---

## 빠른 시작 (가장 쉬운 방법, macOS)

1. Finder 에서 **`유튜브대본추출.command`** 를 더블클릭
   - 처음 한 번은 자동으로 환경을 설치합니다(몇 분 소요).
   - "확인되지 않은 개발자" 경고가 뜨면: **우클릭 → 열기** 또는
     `시스템 설정 → 개인정보 보호 및 보안`에서 허용.
2. 창이 뜨면 URL과 저장 폴더를 넣고 **추출 시작**.

> ⚠️ 사전 준비(처음 한 번):
> - 음성인식(자막 없는 영상)용 **ffmpeg**: `brew install ffmpeg`
> - GUI용 **Tk 바인딩**(Homebrew 파이썬은 빠져 있음): `brew install python-tk@3.12`

---

## 수동 설치 / 실행

```bash
# (Homebrew 파이썬이면) GUI용 Tk 바인딩 먼저:
brew install python-tk@3.12 ffmpeg

python3.12 -m venv .venv
source .venv/bin/activate
pip install -e .          # 또는: pip install -r requirements.txt

# GUI
python -m ytbatch
# 또는
ytbatch-gui
```

### 명령줄(CLI)로도 가능

```bash
ytbatch "https://www.youtube.com/@채널핸들" -o ./대본 --lang ko
ytbatch "https://www.youtube.com/playlist?list=XXXX" -o ./대본
ytbatch "https://youtu.be/영상ID" -o ./대본 --no-whisper
```

---

## 입력할 수 있는 링크

| 종류 | 예시 |
|---|---|
| 채널(핸들) | `https://www.youtube.com/@채널핸들` |
| 채널(ID) | `https://www.youtube.com/channel/UCxxxxxxxx` |
| 재생목록 | `https://www.youtube.com/playlist?list=PLxxxx` |
| 단일 영상 | `https://youtu.be/영상ID` |

채널은 **동영상 / Shorts / 라이브 다시보기** 탭을 옵션으로 포함할 수 있습니다.

---

## 옵션 설명

- **언어**: 한국어 우선 / 영어 우선 / 자동. (자막·음성인식 모두에 적용)
- **Whisper 모델**: `large-v3-turbo`(기본, 균형) → 더 정확하게는 `large-v3`,
  더 빠르게는 `small`/`base`. 한국어는 `large-v3-turbo` 이상을 권장합니다.
- **자막 없으면 음성인식 사용**: 끄면 자막 있는 영상만 추출합니다.
- **이미 추출된 영상 건너뛰기**: 대량 채널을 나눠서/이어서 받을 때 유용.
- **프록시(선택)**: `http://user:pass@host:port`. YouTube 차단(주로 클라우드/서버 IP)
  대응용. 가정용 인터넷에서는 보통 필요 없습니다.

### (선택) Apple Silicon 가속

`faster-whisper` 는 Mac 에서 CPU로 동작해 느릴 수 있습니다. 더 빠른 음성인식을
원하면 **별도 가상환경**에 `mlx-whisper` 를 설치하세요. 설치돼 있으면 자동으로 우선 사용합니다.

```bash
python3.12 -m venv .venv-mlx
.venv-mlx/bin/pip install -r requirements-mlx.txt -e .
.venv-mlx/bin/python -m ytbatch
```

---

## 알아두면 좋은 점 / 한계

1. **YouTube는 자주 바뀝니다.** 추출이 안 되면 `pip install -U --pre "yt-dlp[default,curl-cffi]"`
   로 yt-dlp 를 최신으로 올려보세요.
2. **IP 차단**: 클라우드/서버 IP에서는 자막 요청이 첫 호출부터 차단될 수 있습니다
   (가정용 회선은 대개 괜찮음). 잦으면 레지덴셜 프록시가 필요합니다.
3. **일부 영상은 불가**: 비공개·삭제·연령제한·멤버십 전용 영상은 건너뜁니다.
4. **음성인식은 느릴 수 있음**: 자막 없는 영상이 많은 채널은 시간이 오래 걸립니다
   (Mac CPU 기준). 첫 실행 시 모델(수백 MB~1.5GB)을 자동 다운로드합니다.
5. **정확도**: 자동 자막과 음성인식 결과에는 오류가 있을 수 있습니다.

---

## 구조

```
src/ytbatch/
├── app.py         # Tkinter GUI (메인 스레드 전용)
├── worker.py      # 백그라운드 배치 엔진 (queue 로만 통신)
├── enumerate.py   # 채널/재생목록 → 영상 목록 (yt-dlp)
├── captions.py    # 유튜브 자막 (youtube-transcript-api)
├── audio.py       # 오디오 다운로드 (yt-dlp)
├── transcribe.py  # Whisper 음성인식 (mlx-whisper / faster-whisper)
├── formatting.py  # 타임스탬프·파일 출력
├── config.py      # 설정값
├── model.py       # 공용 데이터 모델/예외
└── cli.py         # 명령줄 인터페이스
```
