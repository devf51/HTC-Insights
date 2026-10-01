import { EmptyState } from "@/components/EmptyState";
import { PageShell } from "@/components/PageShell";

export default function PostPage() {
  return (
    <PageShell eyebrow="ชุมชน" title="กระทู้">
      <EmptyState icon="chat">เนื้อหากระทู้และความคิดเห็นจะแสดงที่นี่</EmptyState>
    </PageShell>
  );
}
