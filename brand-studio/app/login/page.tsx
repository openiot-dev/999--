"use client";

import { useState } from "react";

export default function LoginPage() {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setErr(j.error || "로그인에 실패했습니다.");
        setLoading(false);
        return;
      }
      // 새 쿠키로 미들웨어를 다시 통과하도록 전체 새로고침.
      // 오픈리다이렉트 방지: 같은 출처로 정규화(역슬래시·프로토콜상대 URL 차단) + /login 제외.
      const fromRaw = new URLSearchParams(window.location.search).get("from") || "/";
      let target = "/";
      try {
        const u = new URL(fromRaw, window.location.origin);
        if (u.origin === window.location.origin && u.pathname !== "/login") {
          target = u.pathname + u.search + u.hash;
        }
      } catch {
        target = "/";
      }
      window.location.href = target;
    } catch {
      setErr("네트워크 오류가 발생했습니다.");
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-[70vh] place-items-center">
      <form onSubmit={submit} className="card w-full max-w-sm p-6">
        <div className="mb-1 flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-ink)] text-[var(--color-coral)]">
            <span className="font-display text-lg leading-none">B</span>
          </span>
          <h1 className="font-display text-lg font-semibold tracking-tight">브랜드 스튜디오</h1>
        </div>
        <p className="mb-4 text-sm text-[var(--color-ink-soft)]">사내 전용 — 접속 비밀번호를 입력하세요.</p>

        <label htmlFor="pw" className="block text-xs font-semibold text-[var(--color-ink-soft)]">
          비밀번호
        </label>
        <input
          id="pw"
          name="password"
          type="password"
          required
          autoFocus
          autoComplete="current-password"
          aria-invalid={!!err}
          aria-describedby={err ? "pw-err" : undefined}
          className="field mt-1.5"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />

        {err && (
          <div id="pw-err" role="alert" className="mt-3 rounded-lg bg-[var(--color-coral)]/10 px-3 py-2 text-sm text-[var(--color-coral-dark)]">
            {err}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-5 w-full rounded-xl bg-[#bf3318] px-4 py-2.5 font-semibold text-white transition hover:bg-[#a52c12] disabled:opacity-50"
        >
          {loading ? "확인 중…" : "로그인"}
        </button>
      </form>
    </div>
  );
}
