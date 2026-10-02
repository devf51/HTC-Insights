import { PageShell } from "@/components/PageShell";
import { PostForm } from "@/components/PostForm";
import { requireRole } from "@/lib/auth";

export default async function NewPostPage() {
  // layout ยอม ADMIN ด้วย แต่การตั้งกระทู้เป็นของนักศึกษา
  await requireRole("STUDENT");
  return (
    <PageShell eyebrow="ชุมชน" title="ตั้งกระทู้" lede="กระทู้ใหม่ผ่านการตรวจก่อนเผยแพร่">
      <PostForm />
    </PageShell>
  );
}
