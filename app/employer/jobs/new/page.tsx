import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { JobForm } from "@/components/JobForm";
import { PageShell } from "@/components/PageShell";
import { requireRole } from "@/lib/auth";
import { freeDepartments } from "@/lib/job-rules";
import { myEmployer } from "@/lib/jobs";

export default async function NewJobPage() {
  // layout ยอม ADMIN ด้วย แต่การลงประกาศเป็นของบุคคลภายนอกที่ลงทะเบียนแล้ว
  await requireRole("EXTERNAL");
  const employer = await myEmployer();
  if (!employer) redirect("/employer/register");
  const free = freeDepartments(employer.departments, employer.jobs);
  return (
    <PageShell
      eyebrow={employer.companyName}
      title="ลงประกาศรับนักศึกษาฝึกงาน"
      lede="แผนกละหนึ่งประกาศที่เปิดรับ ประกาศเผยแพร่หลังผู้ดูแลตรวจแล้ว"
    >
      {free.length === 0 ? (
        <EmptyState icon="work" title="ทุกแผนกมีประกาศที่เปิดรับอยู่แล้ว">
          <Link href="/profile" className="kn-link">
            ปิดรับประกาศเดิมที่หน้าโปรไฟล์ก่อนลงใหม่
          </Link>
        </EmptyState>
      ) : (
        <JobForm departments={free} contactEmail={employer.contactEmail} contactPhone={employer.phone} />
      )}
    </PageShell>
  );
}
