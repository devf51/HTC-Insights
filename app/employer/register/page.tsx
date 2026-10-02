import { redirect } from "next/navigation";
import { EmployerForm } from "@/components/EmployerForm";
import { PageShell } from "@/components/PageShell";
import { requireRole } from "@/lib/auth";
import { myEmployer } from "@/lib/jobs";

export default async function EmployerRegisterPage() {
  // layout ยอม ADMIN ด้วย แต่การลงทะเบียนเป็นของบุคคลภายนอก
  await requireRole("EXTERNAL");
  // เมนู "ลงประกาศ" ชี้มาที่นี่ — ลงทะเบียนแล้วพาไปฟอร์มประกาศเลย
  if (await myEmployer()) redirect("/employer/jobs/new");
  return (
    <PageShell
      eyebrow="สถานประกอบการ"
      title="ลงทะเบียนสถานประกอบการ"
      lede="ลงทะเบียนครั้งเดียว แล้วลงประกาศรับนักศึกษาฝึกงานได้แผนกละหนึ่งประกาศ"
    >
      <EmployerForm />
    </PageShell>
  );
}
