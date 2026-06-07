"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Markdown } from "@/components/Markdown";

export type LiteSection = { id: string; part: string; title: string };

export function KnowledgeBrowser({ sections }: { sections: LiteSection[] }) {
  const [q, setQ] = useState("");
  const [list, setList] = useState<LiteSection[]>(sections);
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const cache = useRef<Map<string, string>>(new Map());

  // 검색 (디바운스) — 서버 전문검색으로 매칭 메타만 받아온다
  useEffect(() => {
    const term = q.trim();
    const t = setTimeout(async () => {
      if (!term) {
        setList(sections);
        return;
      }
      try {
        const res = await fetch(`/api/knowledge?q=${encodeURIComponent(term)}`);
        const data: LiteSection[] = await res.json();
        setList(data);
        if (data.length && !data.some((d) => d.id === activeId)) setActiveId(data[0].id);
      } catch {
        /* 무시 */
      }
    }, 250);
    return () => clearTimeout(t);
    // activeId 는 의도적으로 deps 제외(검색 입력에만 반응)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, sections]);

  // 선택 섹션 본문 로드 (캐시)
  useEffect(() => {
    if (!activeId) return;
    const cached = cache.current.get(activeId);
    if (cached !== undefined) {
      setBody(cached);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/knowledge?id=${encodeURIComponent(activeId)}`)
      .then((r) => r.json())
      .then((d: { markdown?: string }) => {
        if (cancelled) return;
        const md = d.markdown ?? "";
        cache.current.set(activeId, md);
        setBody(md);
      })
      .catch(() => !cancelled && setBody("(불러오지 못했습니다)"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  const groups = useMemo(() => {
    const m = new Map<string, LiteSection[]>();
    for (const s of list) {
      if (!m.has(s.part)) m.set(s.part, []);
      m.get(s.part)!.push(s);
    }
    return Array.from(m.entries());
  }, [list]);

  const activeMeta = sections.find((s) => s.id === activeId) ?? list[0];

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display text-2xl font-semibold tracking-tight">지식 열람</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
          마케팅 봇 지식베이스 — 자청/이상한마케팅 강의 51편 종합. 검색해서 프레임워크·전술·사례를 찾아보세요.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <input
            className="field"
            placeholder="검색 (예: 릴스 후킹, 플레이스, 가격설정)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="지식베이스 검색"
          />
          <div className="mt-2 text-[11px] text-[var(--color-ink-soft)]">{list.length}개 섹션</div>
          <div className="thin-scroll mt-2 max-h-[70vh] overflow-auto pr-1">
            {groups.map(([part, items]) => (
              <div key={part} className="mb-3">
                <div className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-soft)]">
                  {part}
                </div>
                <ul>
                  {items.map((it) => {
                    const on = it.id === activeId;
                    return (
                      <li key={it.id}>
                        <button
                          type="button"
                          onClick={() => setActiveId(it.id)}
                          aria-current={on ? "true" : undefined}
                          className={
                            "w-full truncate rounded-lg px-2.5 py-1.5 text-left text-[13px] transition " +
                            (on
                              ? "bg-[var(--color-ink)] text-white"
                              : "text-[var(--color-ink)] hover:bg-black/5")
                          }
                          title={it.title}
                        >
                          {it.title}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            {list.length === 0 && (
              <div className="px-2 py-4 text-sm text-[var(--color-ink-soft)]">검색 결과가 없습니다.</div>
            )}
          </div>
        </aside>

        <section className="card min-h-[60vh] p-6" aria-live="polite">
          {activeMeta ? (
            <article>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-coral-dark)]">
                {activeMeta.part}
              </div>
              {loading && !body ? (
                <div className="text-sm text-[var(--color-ink-soft)]">불러오는 중…</div>
              ) : (
                <Markdown>{`## ${activeMeta.title}\n\n${body}`}</Markdown>
              )}
            </article>
          ) : (
            <div className="text-sm text-[var(--color-ink-soft)]">왼쪽에서 섹션을 선택하세요.</div>
          )}
        </section>
      </div>
    </div>
  );
}
