import Link from "next/link";
import type { ReactNode } from "react";
import { ApprovalChart, DepartmentChart, DimensionChart, SCREEN_PALETTE, TopCompanyChart } from "@/components/DashboardCharts";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { PageShell } from "@/components/PageShell";
import { Button, buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";
import { requireSuperAdmin } from "@/lib/auth";
import { dashboardData, dateRange } from "@/lib/dashboard";
import { toThaiDateInput } from "@/lib/review-rules";
import { dashboardParamsSchema } from "@/lib/validation";

export default async function DashboardPage({ searchParams }: PageProps<"/admin/dashboard">) {
  // layout ยอมผู้ดูแลทุกคน แดชบอร์ดผู้บริหารเฉพาะ super admin
  await requireSuperAdmin();
  const p = dashboardParamsSchema.parse(await searchParams);
  const d = await dashboardData(dateRange(p.from, p.to));
  const query = new URLSearchParams({ ...(p.from && { from: toThaiDateInput(p.from) }), ...(p.to && { to: toThaiDateInput(p.to) }) }).toString();

  return (
    <PageShell
      eyebrow="ผู้ดูแล"
      title="แดชบอร์ดผู้บริหาร"
      lede={`รีวิวที่เผยแพร่ ค่าเฉลี่ย 4 ด้าน งานคัดกรอง และบริษัทยอดนิยม · ช่วง: ${d.range}`}
      actions={
        <Link href={`/admin/dashboard/report${query ? `?${query}` : ""}`} className={buttonClass("primary")}>
          รายงาน A4
        </Link>
      }
    >
      <form className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <DateField name="from" label="ตั้งแต่วันที่" value={p.from} />
        <DateField name="to" label="ถึงวันที่" value={p.to} />
        <Button type="submit" icon={<Icon name="filter_list" />}>
          แสดง
        </Button>
        {query && (
          <Link href="/admin/dashboard" className={buttonClass("ghost")}>
            ล้างช่วงวันที่
          </Link>
        )}
      </form>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card eyebrow="รีวิวที่เผยแพร่" metric={d.totals.reviews.toLocaleString("th-TH")} />
        <Card eyebrow="คะแนนเฉลี่ยรวม" metric={d.totals.avgScore?.toFixed(1) ?? "–"} />
        <Card eyebrow="เนื้อหารอตรวจ" metric={d.totals.pending.toLocaleString("th-TH")} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="รีวิวที่เผยแพร่แยกตามแผนก" empty={d.departments.length === 0}>
          <DepartmentChart data={d.departments} palette={SCREEN_PALETTE} animate />
          <NumberTable columns={["แผนก", "รีวิว"]} rows={d.departments.map((r) => [r.label, r.count])} />
        </ChartCard>
        <ChartCard title="ค่าเฉลี่ย 4 ด้าน (เต็ม 5)" empty={d.totals.reviews === 0}>
          <DimensionChart data={d.dimensions} palette={SCREEN_PALETTE} animate />
          <NumberTable columns={["ด้าน", "ค่าเฉลี่ย"]} rows={d.dimensions.map((r) => [r.label, r.avg?.toFixed(1) ?? "–"])} />
        </ChartCard>
        <ChartCard title="สัดส่วนการอนุมัติต่อชนิดเนื้อหา" empty={d.approval.every((r) => r.total === 0)}>
          <ApprovalChart data={d.approval} palette={SCREEN_PALETTE} animate />
          <NumberTable columns={["ชนิด", "อนุมัติ", "รอตรวจ", "ปฏิเสธ", "รวม"]} rows={d.approval.map((r) => [r.label, r.APPROVED, r.PENDING, r.REJECTED, r.total])} />
        </ChartCard>
        <ChartCard title={`บริษัทยอดนิยม ${d.topCompanies.length} อันดับ`} empty={d.topCompanies.length === 0}>
          <TopCompanyChart data={d.topCompanies} palette={SCREEN_PALETTE} animate />
          <NumberTable
            columns={["อันดับ", "บริษัท", "รีวิว", "คะแนนเฉลี่ย"]}
            rows={d.topCompanies.map((c, i) => [i + 1, c.name, c.reviews, c.avgScore?.toFixed(1) ?? "–"])}
          />
        </ChartCard>
      </div>
    </PageShell>
  );
}

function DateField({ name, label, value }: { name: string; label: string; value: Date | null }) {
  return (
    <div className="kn-field sm:w-48">
      <label className="kn-field-label" htmlFor={name}>
        {label}
      </label>
      <input id={name} name={name} type="date" className="kn-input" defaultValue={value ? toThaiDateInput(value) : ""} />
    </div>
  );
}

function ChartCard({ title, empty, children }: { title: string; empty: boolean; children: ReactNode }) {
  return (
    <Card title={title}>
      {empty ? <EmptyState icon="monitoring" title="ไม่มีข้อมูลในช่วงนี้" /> : <div className="flex flex-col gap-3">{children}</div>}
    </Card>
  );
}

/** ตัวเลขของกราฟ — สีไม่ใช่ทางเดียวที่บอกความหมาย และอ่านด้วยโปรแกรมอ่านหน้าจอได้ */
function NumberTable({ columns, rows }: { columns: string[]; rows: (string | number)[][] }) {
  return (
    <details className="text-small">
      <summary className="kn-link cursor-pointer">ดูตัวเลข</summary>
      <Table
        className="mt-2"
        columns={columns.map((label, i) => ({ key: String(i), label, numeric: i > 0 && i === columns.length - 1 }))}
        rows={rows.map((cells, r) => ({ id: r, ...Object.fromEntries(cells.map((c, i) => [String(i), c])) }))}
      />
    </details>
  );
}
