import "./globals.css";
import type { Metadata } from "next";
import { Fraunces } from "next/font/google";
import { Nav } from "@/components/Nav";

// 디스플레이 폰트는 next/font 로 셀프호스팅(레이아웃 시프트·구글 런타임 요청 제거).
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: "브랜드 스튜디오 — 마케팅 콘텐츠 생성기",
  description:
    "자청·이상한마케팅 강의 51편을 종합한 지식베이스 기반 브랜드 마케팅 콘텐츠 생성기 (릴스·블로그·광고·유튜브).",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={fraunces.variable}>
      <head>
        {/* 본문 한글 폰트(Pretendard)는 CDN. 완전 셀프호스팅이 필요하면 패키지로 교체 가능. */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body className="min-h-screen">
        <header className="sticky top-0 z-30 border-b border-[var(--color-line)] bg-[var(--color-paper)]/85 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
            <a href="/" className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-ink)] text-[var(--color-coral)]">
                <span className="font-display text-lg leading-none">B</span>
              </span>
              <span className="flex flex-col leading-tight">
                <span className="font-display text-[1.05rem] font-semibold tracking-tight">
                  브랜드 스튜디오
                </span>
                <span className="text-[11px] text-[var(--color-ink-soft)]">
                  마케팅 지식베이스 × AI 콘텐츠
                </span>
              </span>
            </a>
            <Nav />
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-5 py-7">{children}</main>
        <footer className="mx-auto max-w-6xl px-5 py-10 text-xs text-[var(--color-ink-soft)]">
          근거: 자청/이상한마케팅 유튜브 강의 51편 종합 지식베이스 · 생성 결과는 사실 확인 후 사용하세요.
        </footer>
      </body>
    </html>
  );
}
