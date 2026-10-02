import { notFound } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { ReportButton } from "@/components/ReportButton";
import { Card } from "@/components/ui/Card";
import { departmentLabel } from "@/lib/departments";
import { mapsUrl, telHref } from "@/lib/job-rules";
import { getJob } from "@/lib/jobs";
import { getCurrentUser } from "@/lib/session";
import { idSchema } from "@/lib/validation";
import { thaiDate } from "@/lib/thai-time";

export default async function JobPage({ params }: PageProps<"/jobs/[id]">) {
  const id = idSchema.safeParse((await params).id);
  // ไม่พบ รอตรวจ ถูกปฏิเสธ ปิดรับ — 404 เหมือนกันหมด
  const job = id.success ? await getJob(id.data) : null;
  if (!job) notFound();
  const user = await getCurrentUser();
  const maps = mapsUrl(job.company.lat, job.company.lng);

  return (
    <PageShell eyebrow={departmentLabel(job.department)} title={job.title} lede={job.company.name}>
      <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-6">
          <Card title="หน้าที่และรายละเอียดงาน">
            <p className="whitespace-pre-line">{job.description}</p>
          </Card>
          {job.qualifications && (
            <Card title="คุณสมบัติ">
              <p className="whitespace-pre-line">{job.qualifications}</p>
            </Card>
          )}
          {job.benefits && (
            <Card title="สวัสดิการ">
              <p className="whitespace-pre-line">{job.benefits}</p>
            </Card>
          )}
        </div>
        <div className="flex flex-col gap-6">
          <Card title="เบี้ยเลี้ยง">
            {job.allowance === null ? "ไม่ระบุ" : `${job.allowance.toLocaleString("th-TH")} บาทต่อวัน`}
          </Card>
          <Card title="ติดต่อ">
            <span className="flex flex-col gap-2">
              <a href={`mailto:${job.contactEmail}`} className="kn-link break-all">
                {job.contactEmail}
              </a>
              {job.contactPhone && (
                <a href={telHref(job.contactPhone)} className="kn-link">
                  {job.contactPhone}
                </a>
              )}
            </span>
          </Card>
          <Card title="สถานที่">
            <span className="flex flex-col gap-2">
              <span>{job.company.address ?? "ไม่ระบุที่อยู่"}</span>
              {maps && (
                <a href={maps} target="_blank" rel="noopener noreferrer" className="kn-link">
                  เปิดใน Google Maps
                </a>
              )}
            </span>
          </Card>
        </div>
      </div>
      <p className="text-small text-ink-muted">{`ประกาศเมื่อ ${thaiDate(job.createdAt, "long")}`}</p>
      {user && user.role !== "ADMIN" && <ReportButton kind="job" id={job.id} />}
    </PageShell>
  );
}
