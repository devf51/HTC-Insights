import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ApprovalChart, DepartmentChart, DimensionChart, PRINT_PALETTE, TopCompanyChart } from "@/components/DashboardCharts";
import { ReportExport } from "@/components/ReportExport";
import { buttonClass } from "@/components/ui/Button";
import { requireSuperAdmin } from "@/lib/auth";
import { dashboardData, dateRange, type DashboardData } from "@/lib/dashboard";
import { toThaiDateInput } from "@/lib/review-rules";
import { dashboardParamsSchema } from "@/lib/validation";
import { thaiDateTime } from "@/lib/thai-time";

// แผ่นรายงานใช้สี hex ผ่าน style เท่านั้น — class สีของ Tailwind เป็น oklch ซึ่ง html2canvas อ่านไม่ออก (CLAUDE.md)
const C = { ink: "#15181b", muted: "#565b60", line: "#d9dbd5", paper: "#ffffff", head: "#0f6b52" };
const PAGES = 3;
// แถวกราฟแนวนอนในรายงาน — 18 แผนกและ 10 บริษัทต้องพอดีแผ่น 1123px (ตรวจด้วยข้อมูลกรณีเลวร้ายที่สุดแล้ว)
const ROW = 26;
const SHEET: CSSProperties = { width: 794, height: 1123, padding: 48, background: C.paper, color: C.ink, boxSizing: "border-box", overflow: "hidden" };
export default async function ReportPage({ searchParams }: PageProps<"/admin/dashboard/report">) {
  await requireSuperAdmin();
  const p = dashboardParamsSchema.parse(await searchParams);
  const d = await dashboardData(dateRange(p.from, p.to));
  const printedAt = new Date();
  const stamp = toThaiDateInput(printedAt).replaceAll("-", "");
  const back = new URLSearchParams({ ...(p.from && { from: toThaiDateInput(p.from) }), ...(p.to && { to: toThaiDateInput(p.to) }) }).toString();

  return (
    <div data-report className="flex flex-col items-center gap-6 px-4 py-8">
      <div className="no-print flex w-full max-w-[794px] flex-wrap items-center justify-between gap-4">
        <Link href={`/admin/dashboard${back ? `?${back}` : ""}`} className={buttonClass("ghost")}>
          กลับแดชบอร์ด
        </Link>
        <ReportExport filename={`htc-insights-report-${stamp}.pdf`} />
      </div>
      <div className="w-full max-w-full overflow-x-auto">
        <div className="mx-auto flex w-[794px] flex-col gap-6">
          <Sheet page={1} d={d} printedAt={printedAt}>
            <Section title="1. จำนวนรีวิวที่เผยแพร่แยกตามแผนกวิชา">
              {d.departments.length === 0 ? <Empty /> : <DepartmentChart data={d.departments} palette={PRINT_PALETTE} animate={false} row={ROW} />}
            </Section>
            <Section title="2. ค่าเฉลี่ยคะแนน 4 ด้าน (เต็ม 5)">
              {d.totals.reviews === 0 ? <Empty /> : <DimensionChart data={d.dimensions} palette={PRINT_PALETTE} animate={false} />}
            </Section>
          </Sheet>
          <Sheet page={2} d={d} printedAt={printedAt}>
            <Section title="3. สัดส่วนการอนุมัติเนื้อหา">
              {d.approval.every((r) => r.total === 0) ? (
                <Empty />
              ) : (
                <>
                  <ApprovalChart data={d.approval} palette={PRINT_PALETTE} animate={false} />
                  <PrintTable
                    head={["ชนิด", "อนุมัติ", "รอตรวจ", "ปฏิเสธ", "รวม"]}
                    rows={d.approval.map((r) => [r.label, r.APPROVED, r.PENDING, r.REJECTED, r.total])}
                  />
                </>
              )}
            </Section>
          </Sheet>
          <Sheet page={3} d={d} printedAt={printedAt}>
            <Section title={`4. สถานประกอบการยอดนิยม ${d.topCompanies.length} อันดับ`}>
              {d.topCompanies.length === 0 ? (
                <Empty />
              ) : (
                <>
                  <TopCompanyChart data={d.topCompanies} palette={PRINT_PALETTE} animate={false} row={ROW} />
                  <PrintTable
                    head={["อันดับ", "สถานประกอบการ", "รีวิว", "คะแนนเฉลี่ย"]}
                    rows={d.topCompanies.map((c, i) => [i + 1, c.name, c.reviews, c.avgScore?.toFixed(1) ?? "–"])}
                  />
                </>
              )}
            </Section>
          </Sheet>
        </div>
      </div>
    </div>
  );
}

function Sheet({ page, d, printedAt, children }: { page: number; d: DashboardData; printedAt: Date; children: ReactNode }) {
  return (
    <section data-report-sheet style={{ ...SHEET, boxShadow: "0 1px 4px rgba(0,0,0,0.12)" }} className="flex flex-col gap-6">
      <header style={{ borderBottom: `2px solid ${C.head}`, paddingBottom: 12 }} className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p style={{ color: C.head }} className="text-[13px]">
            วิทยาลัยเทคนิคหาดใหญ่
          </p>
          <p className="text-[22px] leading-8">รายงานสรุประบบฐานข้อมูลสถานประกอบการ</p>
          <p style={{ color: C.muted }} className="text-[13px]">{`ช่วงข้อมูล: ${d.range} · พิมพ์เมื่อ ${thaiDateTime(printedAt, "long")}`}</p>
        </div>
        <p style={{ color: C.muted }} className="text-[13px]">{`หน้า ${page}/${PAGES}`}</p>
      </header>
      {page === 1 && (
        <div className="grid grid-cols-3 gap-4">
          <Stat label="รีวิวที่เผยแพร่" value={d.totals.reviews.toLocaleString("th-TH")} />
          <Stat label="คะแนนเฉลี่ยรวม" value={d.totals.avgScore?.toFixed(1) ?? "–"} />
          <Stat label="เนื้อหารอตรวจ" value={d.totals.pending.toLocaleString("th-TH")} />
        </div>
      )}
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: `1px solid ${C.line}`, borderRadius: 8, padding: 12 }}>
      <p style={{ color: C.muted }} className="text-[12px]">
        {label}
      </p>
      <p className="text-[28px] leading-10">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-[15px] leading-6">{title}</h2>
      {children}
    </div>
  );
}

const Empty = () => (
  <p style={{ color: C.muted }} className="text-[13px]">
    ไม่มีข้อมูลในช่วงนี้
  </p>
);

function PrintTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  const cell: CSSProperties = { borderBottom: `1px solid ${C.line}`, padding: "4px 8px", textAlign: "left" };
  return (
    <table className="w-full text-[12px] leading-5" style={{ borderCollapse: "collapse" }}>
      <thead>
        <tr>
          {head.map((h) => (
            <th key={h} style={{ ...cell, color: C.muted, fontWeight: 500 }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((c, j) => (
              <td key={j} style={cell}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
