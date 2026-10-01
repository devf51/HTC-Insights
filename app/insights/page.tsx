import Link from "next/link";
import { CompanyMap } from "@/components/CompanyMap";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { PageShell } from "@/components/PageShell";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/TextField";
import { listCompanies } from "@/lib/companies";
import type { CompanyCardData, SearchFilters } from "@/lib/company-rules";
import { DEPARTMENTS, departmentLabel } from "@/lib/departments";
import { companySearchSchema } from "@/lib/validation";

export default async function InsightsPage({ searchParams }: PageProps<"/insights">) {
  const filters = companySearchSchema.parse(await searchParams);
  const { items, pins, total, page, pageCount } = await listCompanies(filters);
  const filtered = Boolean(filters.q || filters.department || filters.minScore);

  return (
    <PageShell
      title="สถานประกอบการ"
      lede="ค้นหาที่ฝึกงานบนแผนที่ กรองตามแผนกวิชาและคะแนน ทุกคะแนนมาจากรีวิวที่ผ่านการตรวจแล้ว"
      actions={
        <Link href="/insights/write-review" className={buttonClass("primary")}>
          เขียนรีวิว
        </Link>
      }
    >
      <form role="search" className="grid gap-4 md:grid-cols-[2fr_1fr_1fr_auto] md:items-end">
        <TextField name="q" label="ค้นหา" placeholder="ชื่อ ที่อยู่ หรือประเภทธุรกิจ" defaultValue={filters.q} />
        <div className="kn-field">
          <label className="kn-field-label" htmlFor="department">
            แผนกวิชา
          </label>
          <select id="department" name="department" className="kn-input" defaultValue={filters.department ?? ""}>
            <option value="">ทุกแผนก</option>
            {DEPARTMENTS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div className="kn-field">
          <label className="kn-field-label" htmlFor="minScore">
            คะแนน
          </label>
          <select id="minScore" name="minScore" className="kn-input" defaultValue={filters.minScore ?? ""}>
            <option value="">ทุกคะแนน</option>
            {[4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} ขึ้นไป
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" icon={<Icon name="search" />}>
          ค้นหา
        </Button>
      </form>

      <p className="text-small text-ink-muted">
        พบ {total} แห่ง
        {filtered && (
          <>
            {" · "}
            <Link href="/insights" className="kn-link">
              ล้างตัวกรอง
            </Link>
          </>
        )}
      </p>

      {pins.length > 0 && <CompanyMap pins={pins} className="h-[320px] md:h-[440px]" />}

      {items.length === 0 ? (
        <EmptyState icon="search_off" title={filtered ? "ไม่พบสถานประกอบการ" : "ยังไม่มีสถานประกอบการ"}>
          {filtered ? "ลองเปลี่ยนคำค้นหรือล้างตัวกรอง" : "สถานประกอบการจะแสดงเมื่อมีรีวิวที่ผ่านการตรวจแล้ว"}
        </EmptyState>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <CompanyCard key={c.id} c={c} />
          ))}
        </div>
      )}

      {pageCount > 1 && (
        <nav aria-label="เปลี่ยนหน้า" className="flex items-center justify-between gap-4">
          {page > 1 ? (
            <Link href={pageHref(filters, page - 1)} className={buttonClass("secondary", "sm")}>
              ก่อนหน้า
            </Link>
          ) : (
            <span />
          )}
          <span className="text-small text-ink-muted">
            หน้า {page} จาก {pageCount}
          </span>
          {page < pageCount ? (
            <Link href={pageHref(filters, page + 1)} className={buttonClass("secondary", "sm")}>
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

function CompanyCard({ c }: { c: CompanyCardData }) {
  return (
    <Card
      eyebrow={c.industry ?? "สถานประกอบการ"}
      metric={c.avgScore !== null ? c.avgScore.toFixed(1) : "–"}
      title={
        <Link href={`/insights/${c.id}`} className="kn-link">
          {c.name}
        </Link>
      }
      footer={c.isVerified ? <Badge tone="success">ยืนยันแล้ว</Badge> : undefined}
    >
      {/* สตริงเดียว — text node ที่ติดกันใน JSX ได้ <!-- --> คั่นใน HTML */}
      <p>
        {[
          c.reviewCount > 0 ? `${c.reviewCount} รีวิว` : "ยังไม่มีรีวิว",
          c.avgAllowance !== null && `เบี้ยเลี้ยงเฉลี่ย ${c.avgAllowance.toLocaleString("th-TH")} บาท/วัน`,
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
      {c.address && <p className="text-ink-muted">{c.address}</p>}
      {c.departments.length > 0 && (
        <p className="text-small text-ink-muted">{c.departments.map(departmentLabel).join(" · ")}</p>
      )}
    </Card>
  );
}

function pageHref(f: SearchFilters, page: number): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.department) p.set("department", f.department);
  if (f.minScore) p.set("minScore", String(f.minScore));
  if (page > 1) p.set("page", String(page));
  const s = p.toString();
  return s ? `/insights?${s}` : "/insights";
}
