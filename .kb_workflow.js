export const meta = {
  name: 'marketing-kb-builder',
  description: '51개 마케팅 강의 대본을 누락 최소화로 추출하고 도메인별 종합해 마케팅 봇 학습용 단일 지식베이스(MD)로 조립',
  phases: [
    { title: 'Extract', detail: '대본 1개당 1 에이전트 — 실행지식 빠짐없이 추출', model: 'sonnet' },
    { title: 'Synthesize', detail: '전체 추출본을 3개 도메인으로 종합·중복제거·구조화' },
    { title: 'Assemble', detail: '핵심 플레이북 + 원본별 상세노트로 단일 MD 조립' },
  ],
}

const ROOT = '/Users/openiot/dev/999-유튜브대본추출/대본/'
const items = [
  {
    "file": "1000억 자산가들이랑 밥먹는법 (켈리최, 김승호) [D7g_XPHNJeM].txt",
    "title": "1000억 자산가들이랑 밥먹는법 (켈리최, 김승호)",
    "video_id": "D7g_XPHNJeM"
  },
  {
    "file": "10년하던 블로그 버렸습니다... 쓰레드로 월 100만 원씩 더 버세요 [4LmzY_5Zl24].txt",
    "title": "10년하던 블로그 버렸습니다... 쓰레드로 월 100만 원씩 더 버세요",
    "video_id": "4LmzY_5Zl24"
  },
  {
    "file": "2024 최신 마케팅 7가지 트렌드 총정리(자청) [BmUUWMOSg9w].txt",
    "title": "2024 최신 마케팅 7가지 트렌드 총정리(자청)",
    "video_id": "BmUUWMOSg9w"
  },
  {
    "file": "2024년 네이버 블로거 바사삭 사라질까 (CUE 알고리즘) [QLjNVPE7ohI].txt",
    "title": "2024년 네이버 블로거 바사삭 사라질까 (CUE 알고리즘)",
    "video_id": "QLjNVPE7ohI"
  },
  {
    "file": "2024년 이 시대에 대학을 가야 할까 [9kq27LpF2Qk].txt",
    "title": "2024년 이 시대에 대학을 가야 할까",
    "video_id": "9kq27LpF2Qk"
  },
  {
    "file": "2026년 네이버 블로그 전성기 찾아온다 [50-1l1kMyok].txt",
    "title": "2026년 네이버 블로그 전성기 찾아온다",
    "video_id": "50-1l1kMyok"
  },
  {
    "file": "4사분면만 이해하세요. 마케팅 고민 끝납니다 [8Cah0XMujQs].txt",
    "title": "4사분면만 이해하세요. 마케팅 고민 끝납니다",
    "video_id": "8Cah0XMujQs"
  },
  {
    "file": "5분만에 조회수, 구독자 3배 늘려드릴게요 [IYSInVWSEO8].txt",
    "title": "5분만에 조회수, 구독자 3배 늘려드릴게요",
    "video_id": "IYSInVWSEO8"
  },
  {
    "file": "U-I-S 3단계, 자청의 아이디어 생성법 [EFrsbYTkHkY].txt",
    "title": "U-I-S 3단계, 자청의 아이디어 생성법",
    "video_id": "EFrsbYTkHkY"
  },
  {
    "file": "나락 자청의 필살기 영상광고 (이상한마케팅) [sQo1hlFBdmI].txt",
    "title": "나락 자청의 필살기 영상광고 (이상한마케팅)",
    "video_id": "sQo1hlFBdmI"
  },
  {
    "file": "나만을 위한 AI 5분만에 만드는 법 (GPTS 클로드 프롬프트) [Bt0W2IxtfXo].txt",
    "title": "나만을 위한 AI 5분만에 만드는 법 (GPTS 클로드 프롬프트)",
    "video_id": "Bt0W2IxtfXo"
  },
  {
    "file": "네이버 지도 세가지만 기억하쇼..(클릭률, 반응률, 활용력) [z0cuELq4ND8].txt",
    "title": "네이버 지도 세가지만 기억하쇼..(클릭률, 반응률, 활용력)",
    "video_id": "z0cuELq4ND8"
  },
  {
    "file": "돈 버는 사장과 망하는 사장의 결정적 차이 4가지 [56YWH7BMRJ8].txt",
    "title": "돈 버는 사장과 망하는 사장의 결정적 차이 4가지",
    "video_id": "56YWH7BMRJ8"
  },
  {
    "file": "돈버는법 강의가 사기일 수 밖에 없는 2가지 이유 (퍼스널브랜딩) [NcrJlWaltxw].txt",
    "title": "돈버는법 강의가 사기일 수 밖에 없는 2가지 이유 (퍼스널브랜딩)",
    "video_id": "NcrJlWaltxw"
  },
  {
    "file": "마케팅 vs 브랜딩 7분 만에 총정리 [BTBWE-_fDUA].txt",
    "title": "마케팅 vs 브랜딩 7분 만에 총정리",
    "video_id": "BTBWE-_fDUA"
  },
  {
    "file": "마케팅 공부법 5가지만 따라하세요 [5flNxl5EpfM].txt",
    "title": "마케팅 공부법 5가지만 따라하세요",
    "video_id": "5flNxl5EpfM"
  },
  {
    "file": "마케팅 취업, 연봉상승 200% 하는법 [ZwvPpTTcVI4].txt",
    "title": "마케팅 취업, 연봉상승 200% 하는법",
    "video_id": "ZwvPpTTcVI4"
  },
  {
    "file": "매출 2배 높이고 순수익 5배 높이는 가격설정 (자청) [8LbDCKQhKfE].txt",
    "title": "매출 2배 높이고 순수익 5배 높이는 가격설정 (자청)",
    "video_id": "8LbDCKQhKfE"
  },
  {
    "file": "무료 마케팅인데 매출 2배 딱 높여주는 숏폼마케팅 (릴스, 쇼츠, 틱톡) [XrVMVyKuxR4].txt",
    "title": "무료 마케팅인데 매출 2배 딱 높여주는 숏폼마케팅 (릴스, 쇼츠, 틱톡)",
    "video_id": "XrVMVyKuxR4"
  },
  {
    "file": "베스트셀러 작가 4가지만 알아두세요(역행자 자청) [J04gxTU5gcg].txt",
    "title": "베스트셀러 작가 4가지만 알아두세요(역행자 자청)",
    "video_id": "J04gxTU5gcg"
  },
  {
    "file": "병원마케팅, 6가지 전략 때문에 상위1%가 될 수밖에 없지 [3MrUvm-IxjU].txt",
    "title": "병원마케팅, 6가지 전략 때문에 상위1%가 될 수밖에 없지",
    "video_id": "3MrUvm-IxjU"
  },
  {
    "file": "비밀인데, 사업은 이 두가지만 피하면 돈 벌죠(자청) [PZgo7qhzeHU].txt",
    "title": "비밀인데, 사업은 이 두가지만 피하면 돈 벌죠(자청)",
    "video_id": "PZgo7qhzeHU"
  },
  {
    "file": "빵원 릴스마케팅 자청의 4가지 공식 [vRkfjdjlkPY].txt",
    "title": "빵원 릴스마케팅 자청의 4가지 공식",
    "video_id": "vRkfjdjlkPY"
  },
  {
    "file": "사기꾼 마케팅 업체 거르고 좋은 곳 고르는 3가지 방법 [R7Gm1BeDTGI].txt",
    "title": "사기꾼 마케팅 업체 거르고 좋은 곳 고르는 3가지 방법",
    "video_id": "R7Gm1BeDTGI"
  },
  {
    "file": "사업자 성공을 위한 이상한마케팅 3가지 이론 [xwQS3kBh9AY].txt",
    "title": "사업자 성공을 위한 이상한마케팅 3가지 이론",
    "video_id": "xwQS3kBh9AY"
  },
  {
    "file": "사장.대표는 ㅈㅇㅅ만 알아도 망할수가 없어요 ㅜㅜ [pbVMGaiMN1I].txt",
    "title": "사장.대표는 ㅈㅇㅅ만 알아도 망할수가 없어요 ㅜㅜ",
    "video_id": "pbVMGaiMN1I"
  },
  {
    "file": "상위 1% 일잘러만 아는 CHAT GPT [aX7Y4dmvV0s].txt",
    "title": "상위 1% 일잘러만 아는 CHAT GPT",
    "video_id": "aX7Y4dmvV0s"
  },
  {
    "file": "스타트업 vs 경제적자유 vs 장사 (자청 관점) [_JtLumCco-Y].txt",
    "title": "스타트업 vs 경제적자유 vs 장사 (자청 관점)",
    "video_id": "_JtLumCco-Y"
  },
  {
    "file": "아무것도 몰라도 릴스 100만, 왕초보도 가능합니다 [Mt9oGbZwDpk].txt",
    "title": "아무것도 몰라도 릴스 100만, 왕초보도 가능합니다",
    "video_id": "Mt9oGbZwDpk"
  },
  {
    "file": "압구정 의사들이 절대 안 알려주는 2025년 병원마케팅 총정리 [s19V2HIlMUY].txt",
    "title": "압구정 의사들이 절대 안 알려주는 2025년 병원마케팅 총정리",
    "video_id": "s19V2HIlMUY"
  },
  {
    "file": "역행자 자청의 릴스 초대박내는 공식 3가지 (왕초보 가능) [pZLnT1W73iE].txt",
    "title": "역행자 자청의 릴스 초대박내는 공식 3가지 (왕초보 가능)",
    "video_id": "pZLnT1W73iE"
  },
  {
    "file": "열심히 일해도 망한다 2026년 사업하면 망하는 업종 5가지 [Eapqa00aamI].txt",
    "title": "열심히 일해도 망한다 2026년 사업하면 망하는 업종 5가지",
    "video_id": "Eapqa00aamI"
  },
  {
    "file": "요새 자영업자 힘들다고 아니 이 5개만 해봐 망할수가없음 ㅋㅋㅋㅋ [uQzoDw4wM9w].txt",
    "title": "요새 자영업자 힘들다고 아니 이 5개만 해봐 망할수가없음 ㅋㅋㅋㅋ",
    "video_id": "uQzoDw4wM9w"
  },
  {
    "file": "월 1000 못 벌면, 맡기지 말고 마케팅 교육 하세요 [nCVlm6PxP-8].txt",
    "title": "월 1000 못 벌면, 맡기지 말고 마케팅 교육 하세요",
    "video_id": "nCVlm6PxP-8"
  },
  {
    "file": "월1000 역대급 개소리가 퍼져나가는 원리 [JgGc20nxkQ4].txt",
    "title": "월1000 역대급 개소리가 퍼져나가는 원리",
    "video_id": "JgGc20nxkQ4"
  },
  {
    "file": "웹사이트 제작 문의 300번 넣고 깨달은 것 [h2LAJ3AVtbk].txt",
    "title": "웹사이트 제작 문의 300번 넣고 깨달은 것",
    "video_id": "h2LAJ3AVtbk"
  },
  {
    "file": "유튜브 조회수 3배 되는 4가지 공식 [QlGt5pQHIrc].txt",
    "title": "유튜브 조회수 3배 되는 4가지 공식",
    "video_id": "QlGt5pQHIrc"
  },
  {
    "file": "이 구별법으로 평생 우려먹으세요(잘되는 사업 vs 망하는 사업) [_I3FMqzeAwI].txt",
    "title": "이 구별법으로 평생 우려먹으세요(잘되는 사업 vs 망하는 사업)",
    "video_id": "_I3FMqzeAwI"
  },
  {
    "file": "이상한마케팅을 분석한 경비아저씨 [u5tkTX4fy2E].txt",
    "title": "이상한마케팅을 분석한 경비아저씨",
    "video_id": "u5tkTX4fy2E"
  },
  {
    "file": "이제 직원 0명으로 마케팅 가능(AI) [YDG1u_BaqCU].txt",
    "title": "이제 직원 0명으로 마케팅 가능(AI)",
    "video_id": "YDG1u_BaqCU"
  },
  {
    "file": "일 잘하는 사람 vs 일 못하는 사람, 한 가지 차이가 격차를 만든다 [AFmaL61rfrQ].txt",
    "title": "일 잘하는 사람 vs 일 못하는 사람, 한 가지 차이가 격차를 만든다",
    "video_id": "AFmaL61rfrQ"
  },
  {
    "file": "자신있습니다. 온라인마케팅 2시간만투자하세요 [0w0-KGSJipE].txt",
    "title": "자신있습니다. 온라인마케팅 2시간만투자하세요",
    "video_id": "0w0-KGSJipE"
  },
  {
    "file": "자청의 필살공식. 아..이걸로 잘되면 매달 100만원 입금해주세요 [yPbGptWNu6o].txt",
    "title": "자청의 필살공식. 아..이걸로 잘되면 매달 100만원 입금해주세요",
    "video_id": "yPbGptWNu6o"
  },
  {
    "file": "자청이 말하는 온라인 마케팅 대행사의 4가지 문제점 [FEQGg8_jHok].txt",
    "title": "자청이 말하는 온라인 마케팅 대행사의 4가지 문제점",
    "video_id": "FEQGg8_jHok"
  },
  {
    "file": "자청이 뷰트랩 써서 조회수 70만 찍기 [nuDtpfXDAVM].txt",
    "title": "자청이 뷰트랩 써서 조회수 70만 찍기",
    "video_id": "nuDtpfXDAVM"
  },
  {
    "file": "제안서 작성법만 알아도, 지금보다 두배는 벌텐데 [QM7FaY_kgig].txt",
    "title": "제안서 작성법만 알아도, 지금보다 두배는 벌텐데",
    "video_id": "QM7FaY_kgig"
  },
  {
    "file": "직원관리, 인사 가스라이팅 이것만 보면 됨 ㅋㅋ [Bnz3npqT00k].txt",
    "title": "직원관리, 인사 가스라이팅 이것만 보면 됨 ㅋㅋ",
    "video_id": "Bnz3npqT00k"
  },
  {
    "file": "진짜 안할 이유가 하나도 없어요 남들 안할 때 우리만 해야 돈 버는 겁니다. 지금 당장 카카오 숏폼 시작해야 되는 이유 [Ica-71J54Tw].txt",
    "title": "진짜 안할 이유가 하나도 없어요 남들 안할 때 우리만 해야 돈 버는 겁니다. 지금 당장 카카오 숏폼 시작해야 되는 이유",
    "video_id": "Ica-71J54Tw"
  },
  {
    "file": "초고가 사업컨설팅, 마케팅교육의 진짜 실체 [Q1Vdr_elpOk].txt",
    "title": "초고가 사업컨설팅, 마케팅교육의 진짜 실체",
    "video_id": "Q1Vdr_elpOk"
  },
  {
    "file": "클로바노트Ai, 회의끝나고 10초만에 회의록 작성하는 법 [USGvvBKZme4].txt",
    "title": "클로바노트Ai, 회의끝나고 10초만에 회의록 작성하는 법",
    "video_id": "USGvvBKZme4"
  },
  {
    "file": "한 달에 1억 이상 벌면 절대 보지마세요 (2025 마케팅 트렌드) [EnGtQIMLdI4].txt",
    "title": "한 달에 1억 이상 벌면 절대 보지마세요 (2025 마케팅 트렌드)",
    "video_id": "EnGtQIMLdI4"
  }
];

const EXTRACT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    video_id: { type: 'string' },
    title: { type: 'string' },
    topics: { type: 'array', items: { type: 'string' } },
    knowledge_md: { type: 'string' },
  },
  required: ['video_id', 'title', 'topics', 'knowledge_md'],
}

const TOPIC_VOCAB = [
  '마케팅트렌드/큰그림', '네이버블로그', '네이버지도/플레이스', '숏폼/릴스/쇼츠/틱톡',
  '카카오숏폼', '유튜브/롱폼', '쓰레드', 'AI/프롬프트/툴', '카피라이팅/후킹', '영상광고',
  '가격설정', '세일즈/제안서', '브랜딩/퍼스널브랜딩', '업종전략(병원등)', '사업원칙/구별법',
  '아이디어생성', '대행사선택/마케팅교육', '마인드셋/일머리', '취업/커리어', '직원관리',
]

phase('Extract')

const extractions = await parallel(
  items.map((it, idx) => () =>
    agent(
      `너는 마케팅 지식 추출 전문가다. 아래 유튜브 강의 대본 파일을 읽고, '마케팅 봇 학습용' 지식 노트를 한국어 마크다운으로 만들어라.

[파일 경로] ${ROOT}${it.file}
[제목] ${it.title}
[video_id] ${it.video_id}

[읽기 지침]
- Read 도구로 파일을 처음부터 끝까지 모두 읽어라. 길어서 한 번에 안 보이면 offset 을 늘려 끝까지 읽어라(특히 3,000줄 이상 파일은 반드시 여러 번 나눠 전부 읽기).
- 첫 줄들의 #메타(제목/URL/출처)와 [HH:MM:SS] 타임스탬프는 무시.

[추출 원칙 — '누락 최소화'가 최우선]
- 마케팅/사업에 '실행 가능한' 정보는 하나도 빠뜨리지 말 것: 프레임워크·공식(이름+단계), 구체 전술/체크리스트, 수치·통계·사례, 고유명사(툴·알고리즘·서비스: 예 뷰트랩/CUE/클로바노트/GPTs), 후킹/카피/스크립트 예시(가능하면 원문 그대로), 핵심 원칙·인사이트·비유, 하지 말 것(안티패턴).
- 제거 대상은 오직: 타임스탬프, 인사/잡담/사담, 동일 내용 반복, 자동자막 명백한 오타(문맥상 교정), 노골적 광고성 군더더기.
- 자청 특유의 용어·표현은 살려라. 대본에 없는 내용을 지어내지 말 것.
- 분량은 원본 정보량에 비례.

[출력] knowledge_md 는 아래 소제목 구조(### 사용, 없으면 생략):
### 한 줄 요지
### 프레임워크·공식
### 실행 전술/체크리스트
### 수치·사례
### 후킹·카피·스크립트 예시
### 도구·고유명사
### 핵심 원칙·인사이트
### 주의(하지 말 것)

topics 는 통제어휘에서만(1~5개): ${TOPIC_VOCAB.join(', ')}`,
      {
        label: `extract:${it.video_id}`,
        phase: 'Extract',
        model: 'sonnet',
        schema: EXTRACT_SCHEMA,
        agentType: 'general-purpose',
      }
    ).then((r) => ({ ...r, _file: it.file, _idx: idx })).catch(() => null)
  )
).then((rs) => rs.filter(Boolean))

log(`추출 완료: ${extractions.length}/${items.length}`)

phase('Synthesize')

const corpus = extractions
  .map((e, i) => `\n\n===== [${i + 1}] ${e.title} (id:${e.video_id}) | topics: ${(e.topics || []).join(', ')} =====\n${e.knowledge_md}`)
  .join('')

const DOMAINS = [
  { key: 'channels', title: '채널별 실전 마케팅 전략',
    scope: '네이버 블로그(+CUE 알고리즘), 네이버 지도/플레이스(클릭률·반응률·활용력), 숏폼(릴스·쇼츠·틱톡), 카카오 숏폼, 유튜브/롱폼, 쓰레드. 각 채널의 공식·단계·실전 전술·수치·툴(뷰트랩 등)·알고리즘·후킹/카피 예시를 채널별 소제목으로.' },
  { key: 'ai', title: 'AI·자동화·생산성 도구',
    scope: 'ChatGPT/클로드/GPTs 활용, 프롬프트 공식·기법, AI로 콘텐츠 자동화(블로그·릴스·유튜브 대본), 직원 0명 마케팅, 클로바노트 등 업무 자동화, 추천 툴과 사용법.' },
  { key: 'strategy', title: '카피·세일즈·가격·브랜딩·사업전략·마인드셋',
    scope: '후킹/카피라이팅/영상광고 공식, 가격설정 전략, 제안서·세일즈, 마케팅 vs 브랜딩·퍼스널브랜딩, 4사분면 등 전략 프레임워크, U-I-S 아이디어 생성법, 잘되는/망하는 사업 구별법·망하는 업종, 업종 전략(병원 등), 대행사 고르는 법·마케팅 교육의 실체, 마케팅 트렌드 큰 그림, 일머리/마인드셋/직원관리/커리어.' },
]

const sections = await parallel(
  DOMAINS.map((dm) => () =>
    agent(
      `너는 마케팅 지식 큐레이터다. 아래는 51개 강의에서 추출한 지식 노트 모음(코퍼스)이다. 이 중 '${dm.title}' 도메인에 해당하는 내용만 골라 중복을 제거하고 체계적으로 재구성한 마크다운 섹션을 작성하라.

[도메인 범위] ${dm.scope}

[작성 원칙]
- '누락 최소화': 이 도메인의 서로 다른 프레임워크/공식/전술/수치/툴/예시를 하나도 빠뜨리지 말 것. 단 여러 영상의 동일 내용은 한 번으로 통합(더 구체적인 버전 채택).
- 마케팅 봇이 바로 쓰도록 구조화: 소제목(####)·불릿·단계번호·표. 공식은 '이름 → 단계 → 설명'.
- 출처를 (출처: 제목 일부)로 가볍게 표기.
- 코퍼스에 있는 내용만. 자청 용어 유지. 무관한 내용 배제.

출력은 '## ${dm.title}' 로 시작하는 마크다운 섹션 본문만.

[코퍼스]${corpus}`,
      { label: `synth:${dm.key}`, phase: 'Synthesize' }
    ).then((mdtext) => ({ key: dm.key, title: dm.title, md: mdtext }))
  )
).then((rs) => rs.filter(Boolean))

phase('Assemble')

const yt = (id) => `https://www.youtube.com/watch?v=${id}`
const today = '2026-06-06'
let md = ''
md += `# 마케팅 봇 지식베이스 (자청 · 이상한마케팅 강의 ${extractions.length}편 기반)\n\n`
md += `> 목적: 마케팅 봇 학습/RAG용 지식 코퍼스. 유튜브 강의 ${extractions.length}편의 자동자막을 추출·정제·종합.\n`
md += `> 생성일: ${today}. 출처: 자청/이상한마케팅 유튜브.\n`
md += `> 주의: 자동자막 기반이라 일부 고유명사·수치는 원본 확인 권장. 모든 내용은 대본 근거(추측 추가 배제).\n\n`
md += `## 목차\n- Part 1. 핵심 플레이북(도메인별 종합)\n`
DOMAINS.forEach((dm) => { md += `  - ${dm.title}\n` })
md += `- Part 2. 원본별 상세 지식노트 (${extractions.length}편)\n- 부록. 출처 목록\n\n---\n\n`
md += `# Part 1. 핵심 플레이북(도메인별 종합)\n\n> 반복 핵심을 도메인별로 중복 제거·재구성. 세부·원문 뉘앙스는 Part 2 참조.\n\n`
for (const s of sections) {
  let body = (s.md || '').trim()
  if (!body.startsWith('## ')) body = `## ${s.title}\n\n${body}`
  md += body + '\n\n---\n\n'
}
md += `# Part 2. 원본별 상세 지식노트\n\n> 각 강의에서 누락 최소화로 추출한 노트.\n\n`
const ordered = extractions.slice().sort((a, b) => a._idx - b._idx)
ordered.forEach((e, i) => {
  md += `## ${i + 1}. ${e.title}\n`
  md += `- video_id: \`${e.video_id}\` · URL: ${yt(e.video_id)}\n`
  md += `- topics: ${(e.topics || []).join(', ')}\n\n`
  md += (e.knowledge_md || '').trim() + '\n\n---\n\n'
})
md += `# 부록. 출처 목록\n\n| # | 제목 | video_id | URL |\n|---|---|---|---|\n`
ordered.forEach((e, i) => {
  md += `| ${i + 1} | ${e.title.replace(/\|/g, '/')} | ${e.video_id} | ${yt(e.video_id)} |\n`
})

return { final_md: md, stats: { requested: items.length, extracted: extractions.length, domains: sections.length, md_chars: md.length } }
