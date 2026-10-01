import { EmptyState } from "@/components/EmptyState";
import { PageShell } from "@/components/PageShell";

export default function WriteReviewPage() {
  return (
    <PageShell
      eyebrow="สถานประกอบการ"
      title="เขียนรีวิว"
      lede="คะแนน 4 ด้าน เวลาทำงาน และคำแนะนำถึงรุ่นน้อง ทุกรีวิวผ่านการตรวจก่อนเผยแพร่"
    >
      <EmptyState icon="edit_note" title="ยังเปิดใช้ไม่ได้">
        ฟอร์มเขียนรีวิวอยู่ระหว่างพัฒนา
      </EmptyState>
    </PageShell>
  );
}
