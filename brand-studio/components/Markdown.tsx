"use client";

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** GFM 마크다운(표 포함)을 prose 스타일로 렌더링. (memo: 무관한 리렌더 시 재파싱 방지) */
export const Markdown = memo(function Markdown({ children }: { children: string }) {
  return (
    <div className="prose prose-sm max-w-none prose-headings:font-display prose-headings:tracking-tight prose-h1:text-2xl prose-h2:mt-7 prose-h2:border-b prose-h2:border-[var(--color-line)] prose-h2:pb-1 prose-a:text-[var(--color-coral-dark)] prose-strong:text-[var(--color-ink)] prose-table:text-[0.86em] prose-th:bg-black/[0.03] prose-code:rounded prose-code:bg-black/[0.05] prose-code:px-1 prose-code:py-0.5 prose-code:before:content-[''] prose-code:after:content-[''] prose-blockquote:border-l-[var(--color-coral)] prose-blockquote:text-[var(--color-ink-soft)] prose-li:my-0.5">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
});
