"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const LINKS = [
  { href: "/", label: "콘텐츠 생성" },
  { href: "/knowledge", label: "지식 열람" },
];

export function Nav() {
  const path = usePathname();
  // 세션 쿠키 존재 여부로 로그아웃 노출(런타임 판단 — 정적 빌드 시점 env 의존 제거)
  const [loggedIn, setLoggedIn] = useState(false);
  useEffect(() => {
    setLoggedIn(document.cookie.split("; ").some((c) => c.startsWith("bs_session=")));
  }, [path]);
  return (
    <nav className="flex items-center gap-1">
      {LINKS.map((l) => {
        const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={
              "rounded-full px-3.5 py-1.5 text-sm font-medium transition " +
              (active
                ? "bg-[var(--color-ink)] text-white"
                : "text-[var(--color-ink-soft)] hover:bg-black/5")
            }
          >
            {l.label}
          </Link>
        );
      })}
      {loggedIn && (
        <form action="/api/logout" method="post" className="contents">
          <button
            type="submit"
            className="ml-1 rounded-full px-3 py-1.5 text-sm font-medium text-[var(--color-ink-soft)] hover:bg-black/5"
          >
            로그아웃
          </button>
        </form>
      )}
    </nav>
  );
}
