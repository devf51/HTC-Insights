import { EmptyState } from "@/components/EmptyState";
import { PageShell } from "@/components/PageShell";

export default function NewPostPage() {
  return (
    <PageShell eyebrow="ชุมชน" title="ตั้งกระทู้" lede="กระทู้ใหม่ผ่านการตรวจก่อนเผยแพร่">
      <EmptyState icon="edit_square" title="ยังเปิดใช้ไม่ได้">
        ฟอร์มตั้งกระทู้อยู่ระหว่างพัฒนา
      </EmptyState>
    </PageShell>
  );
}
