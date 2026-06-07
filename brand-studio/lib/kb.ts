import fs from "node:fs";
import path from "node:path";

const DATA = path.join(process.cwd(), "data");

let _full: string | null = null;
let _play: string | null = null;
let _company: string | null = null;

/** 마케팅 봇 지식베이스 전체 (지식 열람용) */
export function getFullKb(): string {
  if (_full === null) _full = fs.readFileSync(path.join(DATA, "marketing-kb.md"), "utf8");
  return _full;
}

/** Part 1 핵심 플레이북 (콘텐츠 생성 그라운딩용 — 시스템 프롬프트에 캐시) */
export function getPlaybook(): string {
  if (_play === null) _play = fs.readFileSync(path.join(DATA, "playbook.md"), "utf8");
  return _play;
}

/** 회사 지식베이스 (회사·제품·브랜드 사실 — 생성 시 최우선 근거 + 열람용) */
export function getCompanyKb(): string {
  if (_company === null) {
    try {
      _company = fs.readFileSync(path.join(DATA, "company-kb.md"), "utf8");
    } catch {
      _company = ""; // 회사 KB 미구성 시에도 동작
    }
  }
  return _company;
}

export type KbSection = {
  id: string;
  part: string; // 상위 '# Part …' 그룹
  title: string; // '## …'
  markdown: string; // 이 섹션 본문(하위 #### 포함)
  text: string; // 검색용 소문자 평문
};

let _sections: KbSection[] | null = null;

/** 마크다운을 '## ' 단위 섹션으로 분해 (각 섹션은 하위 #### 포함). '# ' 는 part 그룹. */
function parseSections(md: string, idPrefix: string, defaultPart: string): KbSection[] {
  const lines = md.split("\n");
  const out: KbSection[] = [];
  let part = defaultPart;
  let cur: { title: string; buf: string[] } | null = null;
  let idx = 0;

  const flush = () => {
    if (cur) {
      const markdown = cur.buf.join("\n").trim();
      if (markdown.length > 0) {
        out.push({
          id: `${idPrefix}${idx++}`,
          part,
          title: cur.title,
          markdown,
          text: (cur.title + "\n" + markdown).toLowerCase(),
        });
      }
    }
    cur = null;
  };

  for (const line of lines) {
    if (/^# (?!#)/.test(line)) {
      flush();
      part = line.replace(/^#\s+/, "").trim();
      continue;
    }
    if (/^## (?!#)/.test(line)) {
      flush();
      cur = { title: line.replace(/^##\s+/, "").trim(), buf: [] };
      continue;
    }
    if (cur) cur.buf.push(line);
  }
  flush();
  return out;
}

/** 회사 KB(먼저) + 마케팅 KB 를 합친 열람용 섹션. */
export function getSections(): KbSection[] {
  if (_sections) return _sections;
  const company = getCompanyKb()
    ? parseSections(getCompanyKb(), "c", "회사 지식베이스 (OpenIoT)")
    : [];
  const marketing = parseSections(getFullKb(), "m", "개요");
  _sections = [...company, ...marketing];
  return _sections;
}

export function searchSections(q: string): KbSection[] {
  const sections = getSections();
  const query = q.trim().toLowerCase();
  if (!query) return sections;
  const terms = query.split(/\s+/);
  return sections.filter((s) => terms.every((t) => s.text.includes(t)));
}
