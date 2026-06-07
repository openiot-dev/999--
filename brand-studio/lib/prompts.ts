import type Anthropic from "@anthropic-ai/sdk";
import { FORMATS, TONES, LANGS, recommendChannels, type GenerateInput } from "./formats";

const ROLE = `너는 한국 시장 전용 '브랜드 마케팅 콘텐츠 작가'다. 두 가지 근거 자료가 제공된다: (A) '회사 지식베이스'(우리 회사 OpenIoT 의 회사·제품·브랜드 사실), (B) '마케팅 지식베이스'(자청/이상한마케팅 강의 51편 종합 플레이북). 이 둘을 근거로 사용자가 입력한 브랜드/제품에 맞는 실전 콘텐츠를 작성한다.

[작성 원칙]
- (A) 회사 지식베이스를 '사실의 최우선 근거'로 삼는다. 입력 브랜드가 자사 제품(오토플레이스·openIoT·오픈플러그·카킹·LIROQ 등)이면 (A)의 정의·슬로건·기능·사례·효과 표현을 적극 반영한다. 외부 브랜드면 (A)는 회사 톤/품질 기준 참고로만 쓰고 사용자가 준 정보를 따른다.
- (B) 마케팅 플레이북의 기법을 적극 적용: 강한 후킹 → 시대/트렌드로 정당화 → 단계적 가치 증명 → 명확한 CTA. 표본/반응도/피카소/4사분면/정보비대칭 해소 등 채널별 공식 활용.
- 사실은 근거 자료와 사용자 입력 '안에서만'. 없는 기능·고객사·효능·수치를 지어내지 말 것. 의료/효능 단정, 허위 통계 금지. 효과 수치는 보장이 아닌 사례·기대치로 서술.
- 추상어("최고의","압도적") 대신 구체(경력·수치·비교·사례)로 입증.
- 바로 복사해 쓸 수 있는 한국어 결과만 출력. 메타설명·사족·"제가 작성했습니다" 류 군더더기 금지.
- 요청한 형식의 구조 요구사항을 빠짐없이 충족하고 마크다운으로 정리한다.`;

/** system: 역할 + 회사 KB + 마케팅 플레이북. 마지막 블록에 cache_control 을 둬 system 프리픽스 전체를 캐시한다. */
export function buildSystem(playbook: string, companyKb: string): Anthropic.Messages.TextBlockParam[] {
  const blocks: Anthropic.Messages.TextBlockParam[] = [{ type: "text", text: ROLE }];
  if (companyKb.trim()) {
    blocks.push({
      type: "text",
      text: "# (A) 회사 지식베이스 — 사실의 최우선 근거\n\n" + companyKb,
    });
  }
  blocks.push({
    type: "text",
    text:
      "# (B) 마케팅 지식베이스 (기법 근거)\n다음 플레이북의 공식/전술/사례를 활용하되 브랜드에 맞게 변용하라.\n\n" +
      playbook,
    cache_control: { type: "ephemeral" },
  });
  return blocks;
}

function label<T extends { id: string; label: string }>(arr: readonly T[], id: string): string {
  return arr.find((x) => x.id === id)?.label ?? id;
}

export function buildUserMessage(input: GenerateInput): string {
  const fmt = FORMATS.find((f) => f.id === input.format)!;
  const rec = recommendChannels(input.reach, input.nature);
  const toneLabel = label(TONES, input.tone);
  const langLabel = label(LANGS, input.lang);

  return `아래 브랜드를 위해 '${fmt.label}' 콘텐츠를 작성하라.

[브랜드/제품]
- 이름: ${input.brand}
- 설명: ${input.description}
- 타깃 고객: ${input.target || "(미지정 — 설명에서 합리적으로 추론)"}

[전략 컨텍스트 — 4사분면]
- 도달범위: ${input.reach === "local" ? "지역" : "전국"}
- 사업속성: ${input.nature === "info" ? "정보 비대칭(전문성)" : "이미지(감성)"}
- → 이 조합의 주력 채널 권장: ${rec} (이번 형식과 다르면, 이번 형식 안에서 이 전략을 반영)

[톤/언어]
- 톤: ${toneLabel}
- 언어: ${langLabel}
${input.notes ? `\n[추가 요청]\n${input.notes}` : ""}

[형식 요구사항 — ${fmt.label}]
${fmt.spec}
${input.explain ? RATIONALE_BLOCK : "\n출력은 바로 사용 가능한 한국어 콘텐츠(마크다운)만."}`;
}

const RATIONALE_BLOCK = `
[출력 구성]
1) 먼저 바로 사용 가능한 한국어 콘텐츠 본문(마크다운).
2) 그 다음 구분선('---') 후, 아래 '작성 근거' 섹션을 반드시 덧붙인다.

## 🔍 작성 근거 (지식베이스 매칭)
본문의 주요 선택(후킹·구조·핵심 메시지·CTA 등)이 무엇에 근거했는지 5~8개 불릿으로 매칭해 설명하라. 각 불릿은 다음 형식:
- "[본문 요소(짧게 인용)]" → (A) 회사 지식베이스: <사용한 사실/슬로건/제품기능> · (B) 마케팅 플레이북: <적용한 공식/이론 이름> — 한 줄 이유.
규칙: (A)는 회사 지식베이스에 실제로 있는 사실만(없으면 'A: 해당 없음'). (B)는 플레이북의 실제 공식/이론 이름을 쓴다(예: 표본 이론, 반응도 이론, 피카소 이론, 4사분면, 정보 비대칭 해소, 후킹 공식(언매칭/갈라치기/궁금증/표본), 단계적 가치 증명, 마인드 리딩, 숫자의 원칙 등). 지어내지 말 것.
이 섹션은 참고용 해설이며 콘텐츠 본문과 명확히 구분된다.`;
