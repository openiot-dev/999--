# 브랜드 스튜디오 (Brand Studio)

마케팅 지식베이스(자청·이상한마케팅 강의 51편 종합)를 근거로, 브랜드 정보를 넣으면
**릴스·유튜브·블로그·광고·플레이스·스레드** 콘텐츠를 만들어주는 Next.js 웹앱.

- **콘텐츠 생성** — 브랜드/제품 정보 + 4사분면(도달범위×사업속성) + 톤을 입력 → Claude가 KB의
  프레임워크(후킹·트렌드 정당화·단계적 가치증명·CTA)를 적용해 실시간 스트리밍으로 작성.
- **지식 열람** — 지식베이스 전체(플레이북 + 원본별 노트)를 검색·열람.

근거 데이터는 같은 저장소에서 만든 [`../마케팅봇_지식베이스.md`](../마케팅봇_지식베이스.md) 이며,
`data/playbook.md`(Part 1 핵심 플레이북)는 생성 시 시스템 프롬프트에 **프롬프트 캐시**로 주입됩니다.

## 스택
Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · `@anthropic-ai/sdk` · Zod

## 빠른 시작

```bash
cd brand-studio
pnpm install

# API 키 설정
cp .env.local.example .env.local
#   .env.local 의 ANTHROPIC_API_KEY 를 실제 키로 채우기
#   (또는 셸 환경변수 ANTHROPIC_API_KEY 가 있으면 그대로 사용됨)

pnpm dev          # http://localhost:3000
# 프로덕션:  pnpm build && pnpm start
```

## 환경변수

| 변수 | 필수 | 설명 |
|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ | Anthropic API 키 |
| `ANTHROPIC_MODEL` | — | 기본 `claude-opus-4-8` |
| `ANTHROPIC_EFFORT` | — | `low`/`medium`/`high`/`max` (기본 `medium`) |
| `ANTHROPIC_MAX_TOKENS` | — | 기본 32000 |
| `APP_PASSWORD` | — | 사내 로그인 게이트 활성화(설정 시 전 페이지·API 보호) |
| `APP_SESSION_SECRET` | — | 세션 서명 키(권장: `openssl rand -hex 32`). 미설정 시 `APP_PASSWORD`로 파생 |
| `GITHUB_TOKEN` / `NOTION_TOKEN` | — | 회사 KB 자동 동기화(`pnpm sync`)용 |

## 사내 로그인 (간이 인증)
`APP_PASSWORD` 를 설정하면 **공유 비밀번호 로그인 게이트**가 켜집니다.
- 미들웨어가 모든 페이지·API 를 보호 → 미인증 시 `/login` 으로 이동(파일/정적 자산 제외).
- 로그인 성공 시 **HMAC 서명된 httpOnly 세션 쿠키**(기본 7일) 발급. 로그인 시도는 IP당 제한(무차별 대입 완화).
- 로그아웃: 헤더의 "로그아웃" 또는 `/api/logout`.
- `APP_PASSWORD` 미설정 시 게이트는 꺼져 있습니다(로컬 개발 편의). 사내 배포 시 반드시 설정하세요.

## 회사 지식베이스 자동 동기화
`pnpm sync` 가 GitHub README(+선택적으로 Notion)를 끌어와 `data/company-seed.md`(권위 큐레이션)와 합쳐
Claude 로 정제 → `data/company-kb.md` 를 갱신합니다. **민감/행정 자료는 합성 단계에서 제외**합니다.
- 대상은 `scripts/sync.config.json`(리포·노션 페이지·제외 키워드)에서 관리.
- 주기 실행(launchd/cron) 방법은 [scripts/SCHEDULE.md](scripts/SCHEDULE.md) 참고.
- 수집 원본(`data/company-sources/`, `data/company-raw.md`)은 `.gitignore` 처리되며, 결과물 `company-kb.md`·`company-seed.md`만 추적합니다.

## 구조

```
brand-studio/
├── app/
│   ├── page.tsx                 # 콘텐츠 생성 페이지
│   ├── knowledge/page.tsx       # 지식 열람 페이지
│   └── api/generate/route.ts    # Claude 스트리밍 생성 (서버, Node 런타임)
├── components/
│   ├── Studio.tsx               # 생성기 폼 + 스트리밍 결과
│   ├── KnowledgeBrowser.tsx     # 검색·목차·본문
│   ├── Markdown.tsx             # GFM 마크다운 렌더
│   └── Nav.tsx
├── lib/
│   ├── formats.ts               # 형식/톤/4사분면 + 입력 스키마(zod)
│   ├── prompts.ts               # system(역할+캐시 플레이북) + user 메시지
│   └── kb.ts                    # KB 로드·섹션 파싱·검색
└── data/
    ├── company-kb.md            # 회사 지식베이스(회사·제품·브랜드 사실 — 생성 시 최우선 근거 + 열람)
    ├── playbook.md              # 마케팅 기법 플레이북(생성 그라운딩, 캐시)
    └── marketing-kb.md          # 지식 열람용 전체 마케팅 KB
```

### 회사 지식베이스 (내부 자료 학습)
`data/company-kb.md` 는 사내 GitHub(README)·Notion(회사소개/전략/제품/마케팅설계)·오토플레이스 사이트에서
**마케팅 관련 사실만 선별**해 정리한 문서입니다. (재무·세무·급여·IR·정책자금·개인정보 등 민감/행정 자료는 제외)

- 생성기: 시스템 프롬프트에 **(A) 회사 지식베이스(최우선 근거) + (B) 마케팅 플레이북** 으로 함께 주입됩니다. 자사 제품(오토플레이스·openIoT·오픈플러그·카킹·LIROQ 등)은 브랜드명만 넣어도 정확히 작성됩니다.
- 지식 열람: "회사 지식베이스 (OpenIoT)" 파트로 함께 검색/열람됩니다.
- **갱신**: 내부 자료가 바뀌면 `data/company-kb.md` 를 직접 편집하면 즉시 반영됩니다(서버 재시작). 자동 동기화가 필요하면 별도 인제스트 스크립트를 추가할 수 있습니다.

## 동작 방식 (생성)
1. 폼 입력 → `POST /api/generate` (zod 검증).
2. 서버가 `system = [역할, 플레이북(cache_control)]` + `user = 브랜드/형식 지시`로 구성.
3. `claude-opus-4-8` + adaptive thinking + effort 로 **스트리밍** 호출, 텍스트 델타를 그대로 클라이언트로 전달.
4. 클라이언트는 스트리밍 표시 → 완료 후 마크다운 렌더, 복사/`.md` 저장 제공.

## 참고/한계
- 결과는 입력한 브랜드 정보 범위에서 생성되며 **없는 기능·허위 수치는 배제**하도록 프롬프트에 명시했지만, 게시 전 사실 확인을 권장합니다.
- 지식베이스는 자동자막 기반 종합본이라 일부 고유명사·수치는 원본 확인이 필요할 수 있습니다.
- `data/*.md` 를 갱신하려면 상위 폴더에서 KB를 다시 만든 뒤 복사하세요.
