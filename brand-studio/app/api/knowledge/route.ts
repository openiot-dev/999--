import { getSections, searchSections } from "@/lib/kb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

/**
 * GET /api/knowledge?id=sX   → { id, part, title, markdown }  (단일 섹션 본문)
 * GET /api/knowledge?q=...    → [{ id, part, title }]          (전문 검색 결과 메타)
 * GET /api/knowledge          → [{ id, part, title }]          (전체 메타)
 */
export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (id) {
    const s = getSections().find((x) => x.id === id);
    if (!s) return json({ error: "not found" });
    return json({ id: s.id, part: s.part, title: s.title, markdown: s.markdown });
  }

  const q = url.searchParams.get("q") ?? "";
  const list = (q.trim() ? searchSections(q) : getSections()).map((s) => ({
    id: s.id,
    part: s.part,
    title: s.title,
  }));
  return json(list);
}
