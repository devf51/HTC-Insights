// ไฟล์นี้ต้อง pure — tests/dashboard-rules.test.mjs import ตรงด้วย Node ห้าม import ค่าจริงเพิ่ม (import type ได้)
// แปลงผล groupBy/aggregate ของ lib/dashboard.ts เป็นซีรีส์ที่กราฟและตารางใช้

const DAY_MS = 24 * 60 * 60 * 1000;
/** ปัดทศนิยมหนึ่งตำแหน่ง — ตัวเลขบนกราฟ ตาราง และรายงานใช้ค่าเดียวกัน */
export const round1 = (n: number) => Math.round(n * 10) / 10;
const thaiDate = (d: Date) => d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" });

export type DateRange = { gte: Date | null; lt: Date | null; label: string };

/**
 * ช่วงวันที่แบบเวลาไทย — from/to คือเที่ยงคืนเวลาไทยของวันนั้น (parseThaiDate) รวมวันสุดท้ายทั้งวัน (lt = วันถัดไป)
 * กลับด้านก็สลับให้ ไม่ต้องให้ผู้ใช้กรอกใหม่
 */
export function dateRange(from: Date | null, to: Date | null): DateRange {
  const [a, b] = from && to && from > to ? [to, from] : [from, to];
  const label = a && b ? `${thaiDate(a)} – ${thaiDate(b)}` : a ? `ตั้งแต่ ${thaiDate(a)}` : b ? `ถึง ${thaiDate(b)}` : "ทั้งหมด";
  return { gte: a, lt: b ? new Date(b.getTime() + DAY_MS) : null, label };
}

export function departmentSeries(groups: { department: string; _count: { _all: number } }[], labelOf: (v: string) => string) {
  return groups
    .map((g) => ({ label: labelOf(g.department), count: g._count._all }))
    .sort((x, y) => y.count - x.count || x.label.localeCompare(y.label, "th"));
}

export function dimensionSeries(avg: Record<string, number | null>, dims: readonly (readonly [string, string])[]) {
  return dims.map(([key, label]) => ({ label, avg: avg[key] === null || avg[key] === undefined ? null : round1(avg[key]) }));
}

export type StatusGroups = { status: string; _count: { _all: number } }[];

/** นับตามสถานะต่อชนิดเนื้อหา — สถานะที่ไม่มีแถวเป็น 0 */
export function approvalRows(rows: { label: string; groups: StatusGroups }[]) {
  return rows.map(({ label, groups }) => {
    const of = (s: string) => groups.find((g) => g.status === s)?._count._all ?? 0;
    const row = { label, APPROVED: of("APPROVED"), PENDING: of("PENDING"), REJECTED: of("REJECTED") };
    return { ...row, total: row.APPROVED + row.PENDING + row.REJECTED };
  });
}

/** บริษัทยอดนิยม: จำนวนรีวิวที่เผยแพร่ → คะแนนเฉลี่ย → id (ลำดับคงที่เสมอ) */
export function topCompanySeries(
  groups: { companyId: string; _count: { _all: number }; _avg: { scoreOverall: number | null } }[],
  n: number,
) {
  return groups
    .map((g) => ({ companyId: g.companyId, reviews: g._count._all, avgScore: g._avg.scoreOverall === null ? null : round1(g._avg.scoreOverall) }))
    .sort((x, y) => y.reviews - x.reviews || (y.avgScore ?? -1) - (x.avgScore ?? -1) || x.companyId.localeCompare(y.companyId))
    .slice(0, n);
}
