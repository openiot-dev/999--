import { z } from "zod";

/** 생성 가능한 콘텐츠 형식. spec 은 모델에게 주는 형식별 지시문. */
export type FormatDef = {
  id: string;
  label: string;
  emoji: string;
  blurb: string;
  spec: string;
};

export const FORMATS: FormatDef[] = [
  {
    id: "reels",
    label: "릴스/쇼츠 스크립트",
    emoji: "🎬",
    blurb: "세로 숏폼 15~35초, 서로 다른 훅 3편",
    spec: `세로 숏폼(15~35초) 스크립트 3편을 서로 다른 훅 각도로.
편1=페인포인트 훅, 편2=비포/애프터, 편3=숫자/시연.
각 편: [시간대]|[화면/연출]|[자막(굵게)]|[내레이션] 표 + 캡션(해시태그) + 음원/편집 팁 1줄.`,
  },
  {
    id: "youtube",
    label: "유튜브 롱폼 대본",
    emoji: "📺",
    blurb: "5~8분 정보형 대본 + 제목/썸네일",
    spec: `5~8분 정보형 롱폼 대본 1편: (1)첫 15초 후킹 (2)트렌드로 정당화 (3)문제 공감 (4)해결책 시연식 설명(전문성=신뢰) (5)가치 증명(허위 수치 금지) (6)CTA. 구어체, [화면: …] 지시 삽입. 제목 후보 5개 + 썸네일 문구 3개.`,
  },
  {
    id: "blog",
    label: "네이버 블로그 글",
    emoji: "📝",
    blurb: "검색 최적화 정보형 글 + 제목/태그",
    spec: `네이버 검색 노출형 블로그 글 1편(1,500~2,200자). 마인드리딩 도입→문제정의→해결책(소제목)→도입방법→CTA. 검색 키워드 자연 삽입, 추상어 금지·수치로 입증. 제목 후보 5개 + 추천 태그 10개.`,
  },
  {
    id: "ads",
    label: "광고·랜딩 카피",
    emoji: "🎯",
    blurb: "메타/구글 헤드라인 + 랜딩 히어로",
    spec: `성과형 광고+랜딩 카피: (a)메타 헤드라인 8개+본문 3종(짧/중/긴) (b)구글 제목 10개(각15자내)·설명 4개 (c)랜딩 히어로 헤드라인 3안+서브+CTA 3안 (d)페인→베네핏 3쌍 (e)반론처리 3개. 거짓 수치 금지.`,
  },
  {
    id: "place",
    label: "네이버 플레이스 문구",
    emoji: "📍",
    blurb: "지도 소개글·메뉴·리뷰 답글",
    spec: `네이버 플레이스(지도) 최적화 묶음: (a)소개(상세정보) 글 — 타깃 키워드 2~3회 자연 삽입 + 경력/수치 (b)대표 사진 컨셉 가이드 5컷 (c)대표 메뉴/상품 카피 5개 (d)리뷰 답글 템플릿 3종(만족/불만/일반). 어뷰징 금지·진정성 위주.`,
  },
  {
    id: "thread",
    label: "스레드(Threads) 글",
    emoji: "🧵",
    blurb: "리포스트 노리는 짧은 글 5편",
    spec: `스레드(Threads)용 짧은 글 5편: 각 글은 첫 줄 강한 훅 + 본문(공감/인사이트/사례) + 리포스트·저장 유도 마무리. 글마다 길이·톤 다르게(짧은 한 방/리스트형/스토리형 섞기). 광고티 최소화, 가치 먼저.`,
  },
];

export const FORMAT_IDS = FORMATS.map((f) => f.id) as [string, ...string[]];

export const TONES = [
  { id: "jacheong", label: "자청 스타일(직설·후킹)" },
  { id: "warm", label: "친근·따뜻하게" },
  { id: "pro", label: "전문가·신뢰형" },
  { id: "punchy", label: "도발·임팩트" },
] as const;

export const LANGS = [
  { id: "ko", label: "한국어" },
  { id: "ko-casual", label: "한국어(반말/캐주얼)" },
] as const;

/** 4사분면: 도달범위 × 사업속성 → 추천 채널 */
export const REACH = [
  { id: "local", label: "지역(동네 상권)" },
  { id: "national", label: "전국(어디서나 고객)" },
] as const;

export const NATURE = [
  { id: "info", label: "정보 비대칭(전문성·설명 필요)" },
  { id: "image", label: "이미지(감성·비주얼 중요)" },
] as const;

export function recommendChannels(reach: string, nature: string): string {
  if (reach === "local" && nature === "info") return "네이버 블로그 (+ 플레이스 보조)";
  if (reach === "local" && nature === "image") return "네이버 플레이스(지도) + 블로그";
  if (reach === "national" && nature === "info") return "유튜브 롱폼 + 릴스";
  return "릴스·쇼츠·숏폼 + 퍼포먼스 광고";
}

/** 폼 입력 스키마 (클라이언트·서버 공유) */
export const GenerateInput = z.object({
  format: z.enum(FORMAT_IDS),
  brand: z.string().min(1, "브랜드/제품명을 입력하세요").max(120),
  description: z.string().min(1, "한 줄 설명을 입력하세요").max(2000),
  target: z.string().max(400).optional().default(""),
  reach: z.enum(["local", "national"]).default("national"),
  nature: z.enum(["info", "image"]).default("info"),
  tone: z.enum(["jacheong", "warm", "pro", "punchy"]).default("jacheong"),
  lang: z.enum(["ko", "ko-casual"]).default("ko"),
  notes: z.string().max(2000).optional().default(""),
  // 결과 끝에 '작성 근거(지식베이스 매칭)' 해설 섹션 포함 여부
  explain: z.boolean().default(true),
});

export type GenerateInput = z.infer<typeof GenerateInput>;
