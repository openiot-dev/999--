import { getSections } from "@/lib/kb";
import { KnowledgeBrowser, type LiteSection } from "@/components/KnowledgeBrowser";

// 메타(제목)만 정적으로 싣고, 본문은 /api/knowledge?id= 로 온디맨드 로드한다.
export const dynamic = "force-static";

export default function KnowledgePage() {
  const sections: LiteSection[] = getSections().map((s) => ({
    id: s.id,
    part: s.part,
    title: s.title,
  }));
  return <KnowledgeBrowser sections={sections} />;
}
