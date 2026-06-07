# 회사 지식베이스 자동 동기화 스케줄

`pnpm sync` (= `node scripts/sync-company-kb.mjs`) 를 주기적으로 돌려 `data/company-kb.md` 를 갱신합니다.

## 필요한 환경변수
- `GITHUB_TOKEN` — (선택) 없으면 로컬에 로그인된 `gh` CLI 사용. CI/서버에서는 repo 읽기 권한 PAT 권장.
- `NOTION_TOKEN` — (선택) **노션 내부 통합(Integration) 토큰**. 설정 + 대상 페이지를 그 통합에 "연결"해야 노션 수집이 동작. 미설정 시 노션은 생략(seed의 노션 유래 사실은 유지).
- `ANTHROPIC_API_KEY` — 합성(정제)용. 없으면 seed + 원본을 단순 합칩니다.

## macOS — launchd (매일 새벽 4시)
`~/Library/LaunchAgents/com.openiot.brandstudio.sync.plist` 생성:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.openiot.brandstudio.sync</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/zsh</string><string>-lc</string>
    <string>cd /Users/openiot/dev/999-유튜브대본추출/brand-studio && /opt/homebrew/bin/pnpm sync >> /tmp/brandstudio-sync.log 2>&1</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>ANTHROPIC_API_KEY</key><string>sk-ant-...</string>
    <!-- <key>NOTION_TOKEN</key><string>ntn_...</string> -->
  </dict>
  <key>StartCalendarInterval</key><dict><key>Hour</key><integer>4</integer><key>Minute</key><integer>0</integer></dict>
</dict>
</plist>
```
적용: `launchctl load ~/Library/LaunchAgents/com.openiot.brandstudio.sync.plist`
해제: `launchctl unload ...`

## Linux/서버 — cron (매일 04:00)
```
0 4 * * * cd /path/to/brand-studio && ANTHROPIC_API_KEY=sk-ant-... GITHUB_TOKEN=ghp_... /usr/bin/pnpm sync >> /var/log/brandstudio-sync.log 2>&1
```

## 수동 실행
```bash
cd brand-studio
ANTHROPIC_API_KEY=... pnpm sync       # GitHub(+gh) 만
NOTION_TOKEN=ntn_... ANTHROPIC_API_KEY=... pnpm sync   # 노션 포함
```

> 동기화 후 변경된 `data/company-kb.md` 는 다음 서버 시작 시 반영됩니다(서버는 부팅 시 파일을 읽어 캐시). 운영 중 즉시 반영이 필요하면 앱을 재시작하세요.
