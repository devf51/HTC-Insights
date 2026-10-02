import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { PageShell } from "@/components/PageShell";
import { Button, buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/TextField";
import { DEPARTMENTS, departmentLabel } from "@/lib/departments";
import { listJobs } from "@/lib/jobs";
import { jobListParamsSchema } from "@/lib/validation";
import { thaiDate } from "@/lib/thai-time";

type Filters = { q: string; department?: string; page: number };

export default async function JobsPage({ searchParams }: PageProps<"/jobs">) {
  const f = jobListParamsSchema.parse(await searchParams);
  const { items, page, pageCount } = await listJobs(f);
  const filtered = Boolean(f.q || f.department);

  return (
    <PageShell title="ตำแหน่งงาน" lede="ตำแหน่งฝึกงานที่สถานประกอบการเปิดรับ ผ่านการตรวจโดยผู้ดูแลแล้ว">
      <form className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <TextField name="q" label="ค้นหา" placeholder="ชื่อตำแหน่งหรือสถานประกอบการ" defaultValue={f.q} maxLength={100} className="sm:flex-1" />
        <div className="kn-field sm:w-72">
          <label className="kn-field-label" htmlFor="department">
            แผนกวิชา
          </label>
          <select id="department" name="department" className="kn-input" defaultValue={f.department ?? ""}>
            <option value="">ทุกแผนก</option>
            {DEPARTMENTS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" icon={<Icon name="search" />}>
          ค้นหา
        </Button>
      </form>

      {items.length === 0 ? (
        <EmptyState icon="work" title={filtered ? "ไม่พบตำแหน่งงาน" : "ยังไม่มีประกาศ"}>
          {filtered ? "ลองเปลี่ยนคำค้นหรือแผนก" : "ประกาศรับนักศึกษาฝึกงานที่ผ่านการตรวจแล้วจะแสดงที่นี่"}
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-4">
          {items.map((j) => (
            <li key={j.id}>
              <Card
                eyebrow={departmentLabel(j.department)}
                title={
                  <Link href={`/jobs/${j.id}`} className="kn-link">
                    {j.title}
                  </Link>
                }
                footer={
                  <span className="flex flex-wrap items-center gap-x-4 gap-y-2 text-small text-ink-muted">
                    <span>{j.company.name}</span>
                    <span>{j.allowance === null ? "ไม่ระบุเบี้ยเลี้ยง" : `เบี้ยเลี้ยง ${j.allowance.toLocaleString("th-TH")} บาท/วัน`}</span>
                    <span>{thaiDate(j.createdAt)}</span>
                  </span>
                }
              />
            </li>
          ))}
        </ul>
      )}

      {pageCount > 1 && (
        <nav aria-label="เปลี่ยนหน้า" className="flex items-center justify-between gap-4">
          {page > 1 ? (
            <Link href={listHref({ ...f, page: page - 1 })} className={buttonClass("secondary")}>
              ก่อนหน้า
            </Link>
          ) : (
            <span />
          )}
          <span className="text-small text-ink-muted">{`หน้า ${page} จาก ${pageCount}`}</span>
          {page < pageCount ? (
            <Link href={listHref({ ...f, page: page + 1 })} className={buttonClass("secondary")}>
              ถัดไป
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </PageShell>
  );
}

function listHref(f: Filters): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.department) p.set("department", f.department);
  if (f.page > 1) p.set("page", String(f.page));
  const s = p.toString();
  return s ? `/jobs?${s}` : "/jobs";
}
