import { EmptyState } from "@/components/EmptyState";
import { PageShell } from "@/components/PageShell";

export default function EmployerRegisterPage() {
  return (
    <PageShell
      eyebrow="สถานประกอบการ"
      title="ลงทะเบียนและลงประกาศ"
      lede="ลงทะเบียนสถานประกอบการ ปักหมุดที่ตั้ง แล้วสร้างประกาศรับนักศึกษาฝึกงาน"
    >
      <EmptyState icon="add_business" title="ยังเปิดใช้ไม่ได้">
        การลงทะเบียนสถานประกอบการอยู่ระหว่างพัฒนา
      </EmptyState>
    </PageShell>
  );
}
