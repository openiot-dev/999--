"use client";

import { useMemo, useRef, useState } from "react";
import {
  FORMATS,
  TONES,
  LANGS,
  REACH,
  NATURE,
  recommendChannels,
} from "@/lib/formats";
import { Markdown } from "@/components/Markdown";

type State = {
  format: string;
  brand: string;
  description: string;
  target: string;
  reach: string;
  nature: string;
  tone: string;
  lang: string;
  notes: string;
  explain: boolean;
};

const INITIAL: State = {
  format: "reels",
  brand: "",
  description: "",
  target: "",
  reach: "national",
  nature: "info",
  tone: "jacheong",
  lang: "ko",
  notes: "",
  explain: true,
};

export function Studio() {
  const [s, setS] = useState<State>(INITIAL);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const set = <K extends keyof State>(k: K, v: State[K]) => setS((p) => ({ ...p, [k]: v }));
  const rec = useMemo(() => recommendChannels(s.reach, s.nature), [s.reach, s.nature]);
  const activeFormat = FORMATS.find((f) => f.id === s.format)!;

  async function onGenerate() {
    if (!s.brand.trim() || !s.description.trim()) {
      setError("브랜드/제품명과 한 줄 설명은 필수입니다.");
      return;
    }
    setError("");
    setResult("");
    setLoading(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(s),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        let msg = `요청 실패 (${res.status})`;
        try {
          const j = await res.json();
          if (j?.error) msg = j.error;
        } catch {
          /* ignore */
        }
        setError(msg);
        setLoading(false);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        setResult((prev) => prev + decoder.decode(value, { stream: true }));
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setError((e as Error).message || "알 수 없는 오류");
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  function onStop() {
    abortRef.current?.abort();
  }

  async function onCopy() {
    if (!result) return;
    try {
      if (!navigator.clipboard) throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("클립보드 복사에 실패했습니다. 결과를 직접 선택해 복사해 주세요.");
    }
  }

  function onDownload() {
    if (!result) return;
    const safe = (s.brand || "content").replace(/[^\p{L}\p{N}_-]+/gu, "_").slice(0, 40);
    const blob = new Blob([result], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safe}_${s.format}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      {/* ── 폼 ─────────────────────────────────── */}
      <section className="card p-5">
        <h1 className="font-display text-xl font-semibold tracking-tight">콘텐츠 생성</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
          브랜드 정보를 넣으면 마케팅 지식베이스 기반으로 콘텐츠를 만들어 드립니다.
        </p>

        {/* 형식 선택 */}
        <label className="mt-5 block text-xs font-semibold text-[var(--color-ink-soft)]">콘텐츠 형식</label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {FORMATS.map((f) => {
            const on = f.id === s.format;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => set("format", f.id)}
                className={
                  "rounded-xl border p-2.5 text-left transition " +
                  (on
                    ? "border-[var(--color-coral)] bg-[var(--color-coral)]/8 ring-1 ring-[var(--color-coral)]"
                    : "border-[var(--color-line)] bg-white hover:border-[var(--color-ink-soft)]")
                }
              >
                <div className="text-sm font-semibold">
                  {f.emoji} {f.label}
                </div>
                <div className="mt-0.5 text-[11px] leading-snug text-[var(--color-ink-soft)]">
                  {f.blurb}
                </div>
              </button>
            );
          })}
        </div>

        {/* 브랜드 */}
        <label htmlFor="f-brand" className="mt-5 block text-xs font-semibold text-[var(--color-ink-soft)]">
          브랜드 / 제품명 *
        </label>
        <input
          id="f-brand"
          aria-required="true"
          className="field mt-1.5"
          value={s.brand}
          onChange={(e) => set("brand", e.target.value)}
          placeholder="예: 오토플레이스"
        />

        <label htmlFor="f-desc" className="mt-4 block text-xs font-semibold text-[var(--color-ink-soft)]">
          한 줄 설명 (무엇을 해주는 서비스/제품인가) *
        </label>
        <textarea
          id="f-desc"
          aria-required="true"
          className="field mt-1.5 min-h-[72px] resize-y"
          value={s.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="예: 무인 공간 운영을 IoT로 자동화하는 통합 관리 SaaS. 예약·결제·입실·정산까지 자동."
        />

        <label htmlFor="f-target" className="mt-4 block text-xs font-semibold text-[var(--color-ink-soft)]">
          타깃 고객 (선택)
        </label>
        <input
          id="f-target"
          className="field mt-1.5"
          value={s.target}
          onChange={(e) => set("target", e.target.value)}
          placeholder="예: 무인 파티룸·스터디룸 운영 소상공인"
        />

        {/* 4사분면 */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Segmented
            label="도달범위"
            options={REACH}
            value={s.reach}
            onChange={(v) => set("reach", v)}
          />
          <Segmented
            label="사업속성"
            options={NATURE}
            value={s.nature}
            onChange={(v) => set("nature", v)}
          />
        </div>
        <div className="mt-2 rounded-lg bg-[var(--color-moss)]/8 px-3 py-2 text-[11px] text-[var(--color-moss)]">
          추천 주력 채널: <b>{rec}</b>
        </div>

        {/* 톤 / 언어 */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="f-tone" className="block text-xs font-semibold text-[var(--color-ink-soft)]">톤</label>
            <select
              id="f-tone"
              className="field mt-1.5"
              value={s.tone}
              onChange={(e) => set("tone", e.target.value)}
            >
              {TONES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="f-lang" className="block text-xs font-semibold text-[var(--color-ink-soft)]">언어</label>
            <select
              id="f-lang"
              className="field mt-1.5"
              value={s.lang}
              onChange={(e) => set("lang", e.target.value)}
            >
              {LANGS.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label htmlFor="f-notes" className="mt-4 block text-xs font-semibold text-[var(--color-ink-soft)]">
          추가 요청 (선택)
        </label>
        <textarea
          id="f-notes"
          className="field mt-1.5 min-h-[56px] resize-y"
          value={s.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="예: 무료 체험 강조, 특정 이벤트 언급, 특정 해시태그 포함 등"
        />

        <label className="mt-4 flex items-start gap-2.5 rounded-xl border border-[var(--color-line)] bg-white p-3 text-sm">
          <input
            type="checkbox"
            checked={s.explain}
            onChange={(e) => set("explain", e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[var(--color-coral)]"
          />
          <span>
            <span className="font-medium">작성 근거(지식베이스 매칭) 포함</span>
            <span className="mt-0.5 block text-[12px] text-[var(--color-ink-soft)]">
              결과 끝에 🔍 각 카피가 어떤 회사 사실·마케팅 공식에 근거했는지 설명을 덧붙입니다.
            </span>
          </span>
        </label>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-lg bg-[var(--color-coral)]/10 px-3 py-2 text-sm text-[var(--color-coral-dark)]"
          >
            {error}
          </div>
        )}

        <div className="mt-5 flex gap-2">
          {!loading ? (
            <button
              type="button"
              onClick={onGenerate}
              className="flex-1 rounded-xl bg-[#bf3318] px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-[#a52c12]"
            >
              ✦ 생성하기
            </button>
          ) : (
            <button
              type="button"
              onClick={onStop}
              className="flex-1 rounded-xl border border-[var(--color-line)] bg-white px-4 py-2.5 font-semibold text-[var(--color-ink)] transition hover:bg-black/5"
            >
              ■ 중지
            </button>
          )}
        </div>
      </section>

      {/* ── 결과 ───────────────────────────────── */}
      <section className="card flex min-h-[60vh] flex-col p-0">
        <div className="flex items-center justify-between border-b border-[var(--color-line)] px-5 py-3">
          <div className="text-sm font-semibold" aria-live="polite">
            {activeFormat.emoji} {activeFormat.label}
            {loading && <span className="ml-2 text-xs font-normal text-[var(--color-coral)]">생성 중…</span>}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCopy}
              disabled={!result}
              className="rounded-lg border border-[var(--color-line)] bg-white px-2.5 py-1 text-xs font-medium disabled:opacity-40 hover:bg-black/5"
            >
              {copied ? "복사됨 ✓" : "복사"}
            </button>
            <button
              type="button"
              onClick={onDownload}
              disabled={!result}
              className="rounded-lg border border-[var(--color-line)] bg-white px-2.5 py-1 text-xs font-medium disabled:opacity-40 hover:bg-black/5"
            >
              .md 저장
            </button>
          </div>
        </div>

        <div className="thin-scroll flex-1 overflow-auto px-6 py-5">
          {!result && !loading && (
            <div className="grid h-full place-items-center text-center text-sm text-[var(--color-ink-soft)]">
              <div>
                <div className="font-display text-3xl text-[var(--color-line)]">✎</div>
                <p className="mt-2">왼쪽에 브랜드 정보를 넣고 생성하기를 누르세요.</p>
              </div>
            </div>
          )}
          {loading ? (
            <pre className="cursor-blink whitespace-pre-wrap break-words font-sans text-[0.92rem] leading-relaxed">
              {result}
            </pre>
          ) : (
            result && <Markdown>{result}</Markdown>
          )}
        </div>
      </section>
    </div>
  );
}

function Segmented({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { id: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[var(--color-ink-soft)]">{label}</label>
      <div className="mt-1.5 flex overflow-hidden rounded-xl border border-[var(--color-line)]">
        {options.map((o) => {
          const on = o.id === value;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onChange(o.id)}
              className={
                "flex-1 px-2 py-2 text-[11px] font-medium leading-tight transition " +
                (on ? "bg-[var(--color-ink)] text-white" : "bg-white hover:bg-black/5")
              }
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
