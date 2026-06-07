#!/usr/bin/env node
/**
 * 회사 지식베이스 자동 동기화.
 *  1) GitHub README 수집 (GITHUB_TOKEN 또는 gh CLI)
 *  2) Notion 페이지 수집 (NOTION_TOKEN 있을 때만)
 *  3) data/company-seed.md(권위 있는 큐레이션) + 수집 원본을 Claude 로 종합 → data/company-kb.md
 *     (ANTHROPIC_API_KEY 없으면 합치기만)
 *
 * 실행:  node scripts/sync-company-kb.mjs   (또는 pnpm sync)
 * 민감/행정 자료는 합성 단계에서 제외하도록 지시합니다.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const execFileP = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "data");
const SRC = path.join(DATA, "company-sources");

const log = (...a) => console.log("[sync]", ...a);

async function readConfig() {
  const raw = await fs.readFile(path.join(ROOT, "scripts", "sync.config.json"), "utf8");
  return JSON.parse(raw);
}

// ───────────────── GitHub ─────────────────
async function ghReadme(repo) {
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    const r = await fetch(`https://api.github.com/repos/${repo}/readme`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.raw",
        "User-Agent": "brand-studio-sync",
      },
      signal: AbortSignal.timeout(30_000),
    });
    return r.ok ? await r.text() : null;
  }
  try {
    const { stdout } = await execFileP(
      "gh",
      ["api", `repos/${repo}/readme`, "-H", "Accept: application/vnd.github.raw"],
      { maxBuffer: 16 * 1024 * 1024 },
    );
    return stdout;
  } catch {
    return null;
  }
}

// ───────────────── Notion ─────────────────
const NOTION_VER = "2022-06-28";
function rt(arr) {
  return (arr || []).map((t) => t.plain_text ?? "").join("");
}
async function notionGet(url) {
  const r = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
      "Notion-Version": NOTION_VER,
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (!r.ok) throw new Error(`notion ${r.status}`);
  return r.json();
}
async function notionChildren(id) {
  let out = [];
  let cursor;
  do {
    const u = new URL(`https://api.notion.com/v1/blocks/${id}/children`);
    u.searchParams.set("page_size", "100");
    if (cursor) u.searchParams.set("start_cursor", cursor);
    const data = await notionGet(u.toString());
    out = out.concat(data.results || []);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return out;
}
async function renderBlocks(blocks, depth = 0) {
  const lines = [];
  const ind = "  ".repeat(depth);
  for (const b of blocks) {
    const t = b.type;
    const d = b[t] || {};
    const txt = rt(d.rich_text);
    switch (t) {
      case "heading_1": lines.push(`# ${txt}`); break;
      case "heading_2": lines.push(`## ${txt}`); break;
      case "heading_3": lines.push(`### ${txt}`); break;
      case "paragraph": if (txt) lines.push(`${ind}${txt}`); break;
      case "bulleted_list_item": lines.push(`${ind}- ${txt}`); break;
      case "numbered_list_item": lines.push(`${ind}1. ${txt}`); break;
      case "to_do": lines.push(`${ind}- [${d.checked ? "x" : " "}] ${txt}`); break;
      case "toggle": lines.push(`${ind}- ${txt}`); break;
      case "quote": case "callout": lines.push(`> ${txt}`); break;
      case "code": lines.push("```\n" + txt + "\n```"); break;
      case "divider": lines.push("---"); break;
      case "table_row": lines.push(`${ind}| ` + (d.cells || []).map((c) => rt(c)).join(" | ") + " |"); break;
      default: if (txt) lines.push(`${ind}${txt}`);
    }
    if (b.has_children && depth < 3) {
      try {
        const kids = await notionChildren(b.id);
        const sub = await renderBlocks(kids, depth + 1);
        if (sub.trim()) lines.push(sub);
      } catch { /* skip */ }
    }
  }
  return lines.join("\n");
}
async function notionPage(id) {
  if (!process.env.NOTION_TOKEN) return null;
  try {
    const page = await notionGet(`https://api.notion.com/v1/pages/${id}`);
    let title = "(제목 없음)";
    for (const p of Object.values(page.properties || {})) {
      if (p?.type === "title") { title = rt(p.title) || title; break; }
    }
    const blocks = await notionChildren(id);
    const body = await renderBlocks(blocks);
    return `# ${title}\n\n${body}`;
  } catch (e) {
    log(`  notion ${id} 실패: ${e.message}`);
    return null;
  }
}

// ───────────────── 합성 ─────────────────
async function synthesize(seed, raw, excludeHints = []) {
  if (!process.env.ANTHROPIC_API_KEY) {
    log("ANTHROPIC_API_KEY 없음 → 합성 생략, seed + 원본 합치기만 수행");
    return `${seed}\n\n---\n\n# 최신 수집 원본 (미합성)\n\n${raw}`;
  }
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic();
  const model = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";
  const maxTokens = Number(process.env.ANTHROPIC_MAX_TOKENS) || 32000;
  const effort = process.env.ANTHROPIC_EFFORT || "medium";
  const excludeLine = excludeHints.length
    ? ` 특히 다음 키워드와 연관된 정보는 절대 포함하지 말 것: ${excludeHints.join(", ")}.`
    : "";
  const system =
    "너는 사내 마케팅 콘텐츠 생성기를 위한 '회사 지식베이스(company-kb.md)' 편집자다. " +
    "주어진 SEED(권위 있는 큐레이션)와 RAW(GitHub README·Notion 최신 수집본)를 종합해 하나의 한국어 마크다운 문서를 만든다. " +
    "규칙: ① SEED의 구조·섹션(회사 개요/브랜드 메시지·톤/제품/가치제안/고객사/기술/마케팅 채널/타깃/유의/출처)을 유지하고 RAW의 최신 사실로 보강·갱신한다. " +
    "② 민감·행정 정보(재무·세무·급여·IR·투자·정책자금·융자·개인정보·비밀키·API 키 등)는 절대 포함하지 않는다." + excludeLine + " " +
    "③ 추측으로 없는 사실을 만들지 않는다. 중복은 통합한다. " +
    "출력은 완성된 company-kb.md 마크다운 '본문만'.";
  const user = `[SEED — 권위 있는 큐레이션]\n${seed}\n\n[RAW — 최신 수집 원본]\n${raw}\n\n위 둘을 종합해 company-kb.md 전체를 출력하라.`;

  let text = "";
  const stream = client.messages.stream(
    {
      model,
      max_tokens: maxTokens,
      thinking: { type: "adaptive" },
      output_config: { effort },
      system,
      messages: [{ role: "user", content: user }],
    },
    { timeout: 180_000 },
  );
  for await (const ev of stream) {
    if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") text += ev.delta.text;
  }
  // 잘린 출력으로 KB 를 덮어쓰지 않도록 stop_reason 확인
  const final = await stream.finalMessage();
  if (final.stop_reason === "max_tokens") {
    throw new Error("합성 출력이 max_tokens 로 잘렸습니다 → company-kb.md 미변경. ANTHROPIC_MAX_TOKENS 를 늘리세요.");
  }
  return text.trim();
}

// ───────────────── main ─────────────────
async function main() {
  const cfg = await readConfig();
  await fs.mkdir(path.join(SRC, "github"), { recursive: true });
  await fs.mkdir(path.join(SRC, "notion"), { recursive: true });

  const parts = [];

  const repoRe = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
  log(`GitHub README ${cfg.github?.repos?.length ?? 0}개 수집…`);
  for (const repo of cfg.github?.repos ?? []) {
    if (!repoRe.test(repo)) {
      log(`  skip(형식오류) ${repo}`);
      continue;
    }
    const md = await ghReadme(repo);
    if (md && md.trim()) {
      const file = path.join(SRC, "github", repo.replace(/\//g, "__") + ".md");
      await fs.writeFile(file, md, "utf8");
      parts.push(`\n\n===== [GitHub] ${repo} =====\n${md}`);
      log(`  OK ${repo} (${md.length}자)`);
    } else {
      log(`  none ${repo}`);
    }
  }

  if (process.env.NOTION_TOKEN) {
    const idRe = /^[0-9a-fA-F]{32}$|^[0-9a-fA-F-]{36}$/;
    log(`Notion 페이지 ${cfg.notion?.pageIds?.length ?? 0}개 수집…`);
    for (const id of cfg.notion?.pageIds ?? []) {
      if (!idRe.test(id)) {
        log(`  skip(형식오류) notion ${id}`);
        continue;
      }
      const md = await notionPage(id);
      if (md && md.trim()) {
        await fs.writeFile(path.join(SRC, "notion", id + ".md"), md, "utf8");
        parts.push(`\n\n===== [Notion] ${id} =====\n${md}`);
        log(`  OK notion ${id} (${md.length}자)`);
      }
    }
  } else {
    log("NOTION_TOKEN 미설정 → Notion 수집 생략 (seed의 노션 유래 사실은 유지됨)");
  }

  const raw = parts.join("\n");
  await fs.writeFile(path.join(DATA, "company-raw.md"), raw, "utf8");

  // seed 우선순위: company-seed.md > 기존 company-kb.md
  let seed = "";
  try {
    seed = await fs.readFile(path.join(DATA, "company-seed.md"), "utf8");
  } catch {
    seed = await fs.readFile(path.join(DATA, "company-kb.md"), "utf8").catch(() => "");
  }

  log("Claude 로 company-kb.md 합성 중…");
  const out = await synthesize(seed, raw, cfg.excludeHints || []);
  if (!out || out.length < 200) {
    log("합성 결과가 비었습니다. company-kb.md 를 변경하지 않습니다.");
    process.exit(1);
  }
  await fs.writeFile(path.join(DATA, "company-kb.md"), out, "utf8");
  log(`완료 → data/company-kb.md (${out.length}자)`);
}

main().catch((e) => {
  console.error("[sync] 실패:", e);
  process.exit(1);
});
