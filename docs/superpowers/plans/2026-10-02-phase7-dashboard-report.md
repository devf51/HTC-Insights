# Phase 7 — แดชบอร์ดผู้บริหาร + รายงาน A4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ผู้ดูแลระดับสูงเปิด `/admin/dashboard` เห็นกราฟ 4 ชุด (รีวิวแยกตามแผนก · ค่าเฉลี่ย 4 ด้าน · สัดส่วนการอนุมัติต่อชนิดเนื้อหา · อันดับบริษัทยอดนิยม) กรองช่วงวันที่ได้ และเปิด `/admin/dashboard/report` เป็นเอกสาร A4 สองหน้าที่พิมพ์ได้และส่งออก PDF ได้ ฟอนต์ไทยครบ — สองฟีเจอร์ที่ v1 ไม่เคยมี (สเปกข้อ 15–16)

**Architecture:** DAL `lib/dashboard.ts` ตัวเดียว (`requireSuperAdmin`) ให้ฐานข้อมูลนับด้วย `groupBy`/`aggregate` ทุกชุด กรอง `APPROVED` ทุกตัวเลขที่เป็นเนื้อหาสาธารณะ · แปลงผลเป็นซีรีส์ด้วยฟังก์ชัน pure ใน `lib/dashboard-rules.ts` (มีเทสต์) · กราฟ Recharts อยู่ใน client component ไฟล์เดียว โหลดผ่าน `dynamic(..., { ssr: false })` รับ `palette` และ `animate` จากผู้เรียก — แดชบอร์ดใช้ CSS variable (ตามธีม) หน้ารายงานใช้ hex ล้วนและปิด animation · ส่งออก PDF = `html2canvas` ทีละแผ่น A4 (794×1123px) → `jsPDF` หนึ่งแผ่นต่อหน้า ไม่ตัดกราฟกลางหน้า · `@media print` เป็นทางสำรองที่ข้อความคมชัด

**Tech Stack:** Next 16.3 · Prisma 7 + SQLite · Recharts 3.10 · html2canvas 1.4.1 · jsPDF 4.2 · `node --test`

**Spec:** แผนเต็ม `C:\Users\user\.claude\plans\htc-insights-synthetic-zephyr.md` หัวข้อ "Phase 7" + `docs/context.md` (ตารางบทบาท, หลักการข้อ 1, ข้อบังคับ "Phase 7 ต้องรักษา") + `CLAUDE.md` (ข้อควรระวัง html2canvas/oklch/ฟอนต์ไทย/Recharts) + skill `dataviz`

### ต่างจากแผนเต็ม / ตัดสินเองในแผนนี้

| แผนเต็มเขียนว่า | แผนนี้ทำ | เหตุผล |
|---|---|---|
| `GET /api/admin/dashboard` | หน้าเรียก DAL `dashboardData()` ตรง ไม่มี GET route | แบบเดียวกับ Phase 2–6 ไม่มี client ที่ต้องดึง JSON |
| — | **เฉพาะ super admin** (`requireSuperAdmin`) ปุ่ม "แดชบอร์ด" ในศูนย์คัดกรองแสดงเฉพาะ super admin | ตารางบทบาทใน `docs/context.md`: super admin "ดูแดชบอร์ดผู้บริหาร" |
| โดนัทสำหรับสัดส่วนอนุมัติ | **แท่งซ้อนแนวนอนต่อชนิดเนื้อหา** (รีวิว กระทู้ ความคิดเห็น ประกาศงาน × อนุมัติ/รอตรวจ/ปฏิเสธ) + ตารางตัวเลข | dataviz: ส่วนต่อทั้งหมดหลายกลุ่มอ่านจากแท่งได้แม่นกว่า และโดนัทรวมทุกชนิดซ่อนว่าชนิดไหนค้าง |
| — | สี: ซีรีส์เดียวใช้ช่อง 1 (ฟ้า) ของ reference palette · สถานะใช้ช่อง 1–3 (ฟ้า ส้ม เขียวน้ำทะเล) ตรวจด้วย `validate_palette.js --pairs all` ผ่านทั้งสว่าง (`#2a78d6,#eb6834,#1baf7a` บน `#ffffff`) และมืด (`#3987e5,#d95926,#199e70` บน `#14181c`) · ช่อง 3 สว่าง contrast 2.82 → ต้องมี legend + ตาราง (มีแล้ว) | สี `--signal` ของเว็บไม่ผ่าน chroma floor (0.09) และสี success/warning/danger แยกไม่ออกสำหรับตาบอดสี (ΔE 0.7) — เป็นสีตัวอักษร ไม่ใช่สีกราฟ |
| — | กรองช่วงวันที่ `?from=YYYY-MM-DD&to=YYYY-MM-DD` (เวลาไทย รวมวันสุดท้าย) ใช้กับทุกชุดตาม `createdAt` · ไม่ระบุ = ทั้งหมด · สลับให้ถ้า from > to | หัวรายงานต้องมี "ช่วงวันที่" |
| — | สัดส่วนอนุมัติของความคิดเห็นนับเฉพาะในกระทู้ที่ `APPROVED` | ข้อบังคับจาก Phase 6b |
| `groupBy(companyId)` `take: 10` | `groupBy` ทั้งหมดแล้วเรียงใน `topCompanySeries` (จำนวนรีวิว → คะแนนเฉลี่ย → id) ตัด 10 | ponytail: บริษัทหลักร้อย เรียงในแอปได้ลำดับเท่ากันที่แน่นอน ฐานข้อมูลตัด take ก่อนเรียงตัวเสมอไม่ได้ |
| หัวกระดาษโลโก้ | ชื่อวิทยาลัยและชื่อระบบเป็นตัวอักษร | ยังไม่มีไฟล์โลโก้ใน `public/` — เติมเมื่อได้ไฟล์ |
| ตัดหน้าตามความสูง | รายงานจัดเป็น **2 แผ่น A4 ความสูงคงที่** แผ่นละหนึ่งหน้า PDF | ไม่มีกราฟถูกตัดครึ่ง |
| — | `SCORE_DIMENSIONS` ย้ายจาก `app/insights/[id]/page.tsx` ไป `lib/review-rules.ts` | แดชบอร์ดใช้ป้าย 4 ด้านชุดเดียวกัน |

## Global Constraints

- อ่าน `AGENTS.md` · path ใหม่รัน `npx next typegen` ก่อน `tsc`
- **ทุก `export async function` ใน DAL เริ่มด้วย guard** — `lib/dashboard.ts` ใช้ `requireSuperAdmin()` · หน้า `/admin/dashboard*` เรียก `requireSuperAdmin()` เองด้วย (layout ยอมผู้ดูแลทุกคน)
- **ตัวเลขที่มาจากเนื้อหาสาธารณะกรอง `APPROVED`** (แผนก ค่าเฉลี่ย อันดับบริษัท) · สัดส่วนอนุมัติเป็นตัวเลขงานคัดกรองจึงนับทุกสถานะ
- ฐานข้อมูลนับ (`groupBy`/`aggregate`) ไม่ดึงทุกแถวมานับในแอป
- **Recharts import ผ่าน `dynamic(..., { ssr: false })`** · `<ResponsiveContainer>` อยู่ในกล่องที่มีความสูงชัดเจน · หน้ารายงาน `isAnimationActive={false}`
- **หน้ารายงานใช้สี hex เท่านั้น** (html2canvas อ่าน `oklch` ไม่ออก) — ห้ามใช้ class สีของ Tailwind ในแผ่นรายงาน ใช้ class ได้เฉพาะ layout/ขนาดตัวอักษร · `await document.fonts.ready` ก่อนจับภาพ · `scale: 2` ไม่เกินนี้
- **ต้องเปิดไฟล์ PDF ดูด้วยตาจริง** — ไม่ error ไม่ได้แปลว่าถูก
- กราฟทุกตัวมีตารางตัวเลขให้ดู (`<details>`) — สีไม่ใช่ทางเดียวที่บอกความหมาย · มีหลายซีรีส์ = มี legend
- เวลา `th-TH` + `Asia/Bangkok` · UI ไทย ไม่ใช้ emoji · แดชบอร์ดใช้ได้ที่ 375px (หน้ารายงานกว้างคงที่ 794px เลื่อนแนวนอนในกล่องตัวเองได้)
- เทสต์ `node --test` · ไฟล์ pure ห้าม import ค่าจริง (`import type` ได้) ห้าม `@/`
- **ห้าม commit เอง**

## Review Focus

1. **ตัวเลขบนกราฟไม่ตรงฐานข้อมูล** (นับของที่ไม่อนุมัติ / ลืมกรองช่วงวันที่บางชุด / ปัดเศษผิด) → เทียบกับค่าที่คำนวณมือจาก seed ใน Task 3 ทั้งแบบทั้งหมดและแบบมีช่วง
2. **ผู้ดูแลธรรมดาหรือนักศึกษาเปิดแดชบอร์ด/รายงาน** → 403 · ไม่ล็อกอิน 401 → Task 3
3. **ช่วงวันที่ผิดรูปแบบ / from > to / วันสุดท้ายหลุด** → เพิกเฉยค่าที่ผิด สลับให้ รวมวันสุดท้ายทั้งวันเวลาไทย → เทสต์ `dateRange` Task 1
4. **PDF ฟอนต์ไทยเพี้ยน สระหาย กราฟว่างหรือขาด หรือไม่ใช่ A4** → เปิดไฟล์จริงดู Task 4
5. **ไม่มีข้อมูลในช่วงที่เลือก** → ทุกการ์ดแสดง "ไม่มีข้อมูลในช่วงนี้" ไม่มีกราฟว่างหรือ NaN → Task 3

---

## File Structure

```
prisma/seed.ts                        createdAt ของรีวิวตัวอย่างกระจาย มิ.ย.–ก.ย. 2569                 แก้ (T1)
lib/review-rules.ts                   SCORE_DIMENSIONS                                                  แก้ (T1)
app/insights/[id]/page.tsx            ใช้ SCORE_DIMENSIONS                                               แก้ (T1)
lib/dashboard-rules.ts                dateRange departmentSeries dimensionSeries approvalRows topCompanySeries (pure)  ใหม่ (T1)
lib/validation.ts                     dashboardParamsSchema                                              แก้ (T2)
lib/dashboard.ts                      DAL: dashboardData                                                 ใหม่ (T2)
components/DashboardChartsInner.tsx   กราฟ 4 ตัว (client, Recharts)                                       ใหม่ (T3)
components/DashboardCharts.tsx        dynamic ssr:false + palette สองชุด                                   ใหม่ (T3)
app/globals.css                       --viz-* สองธีม + @media print ของหน้ารายงาน                          แก้ (T3, T4)
app/admin/dashboard/page.tsx          เขียนใหม่ (T3) · app/admin/page.tsx ปุ่มแดชบอร์ดเฉพาะ super admin (T3)
app/admin/dashboard/report/page.tsx   ใหม่ (T4) · components/ReportExport.tsx (client) ใหม่ (T4)
docs/context.md                       แก้ (T5)
tests/dashboard-rules.test.mjs ใหม่ (T1) · tests/route-guards.test.mjs แก้ (T2) · tests/routes.test.mjs แก้ (T4)
```

---

### Task 1: กฎแดชบอร์ด (pure) + seed ที่มีวันที่

**Files:** Create `lib/dashboard-rules.ts`, `tests/dashboard-rules.test.mjs` · Modify `lib/review-rules.ts`, `app/insights/[id]/page.tsx`, `prisma/seed.ts`

**Interfaces — Produces:**
- `SCORE_DIMENSIONS` (ใน review-rules): `readonly [["scoreWork","ลักษณะงาน"], ["scoreEnv","สภาพแวดล้อม"], ["scoreMentor","พี่เลี้ยง"], ["scoreWelfare","เบี้ยเลี้ยงและสวัสดิการ"]]`
- `type DateRange = { gte: Date | null; lt: Date | null; label: string }` · `dateRange(from: Date | null, to: Date | null): DateRange`
- `departmentSeries(groups: { department: string; _count: { _all: number } }[], labelOf: (v: string) => string): { label: string; count: number }[]`
- `dimensionSeries(avg: Record<string, number | null>, dims: readonly (readonly [string, string])[]): { label: string; avg: number | null }[]`
- `type StatusGroups = { status: string; _count: { _all: number } }[]` · `approvalRows(rows: { label: string; groups: StatusGroups }[]): { label: string; APPROVED: number; PENDING: number; REJECTED: number; total: number }[]`
- `topCompanySeries(groups: { companyId: string; _count: { _all: number }; _avg: { scoreOverall: number | null } }[], n: number): { companyId: string; reviews: number; avgScore: number | null }[]`
- seed: `createdAt` ของรีวิว — r1 2026-06-20 · r2 07-15 · r3 07-20 · r4 09-25 · r5 08-05 · r6 09-10 · r7 08-25 · r8 09-15 (10:00 เวลาไทย)

- [ ] **Step 1: เทสต์ที่ล้มเหลว `tests/dashboard-rules.test.mjs`**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { approvalRows, dateRange, departmentSeries, dimensionSeries, topCompanySeries } from "../lib/dashboard-rules.ts";

const th = (s) => new Date(`${s}T00:00:00+07:00`);

test("dateRange: ไม่ระบุ = ทั้งหมด", () => {
  assert.deepEqual(dateRange(null, null), { gte: null, lt: null, label: "ทั้งหมด" });
});

test("dateRange: รวมวันสุดท้ายทั้งวันตามเวลาไทย และสลับเมื่อกลับด้าน", () => {
  const r = dateRange(th("2026-07-01"), th("2026-08-31"));
  assert.equal(r.gte.toISOString(), "2026-06-30T17:00:00.000Z");
  assert.equal(r.lt.toISOString(), "2026-08-31T17:00:00.000Z");
  assert.equal(r.label, "1 ก.ค. 2569 – 31 ส.ค. 2569");
  assert.deepEqual(dateRange(th("2026-08-31"), th("2026-07-01")), r);
});

test("dateRange: ด้านเดียว", () => {
  assert.equal(dateRange(th("2026-07-01"), null).label, "ตั้งแต่ 1 ก.ค. 2569");
  assert.equal(dateRange(null, th("2026-07-01")).lt.toISOString(), "2026-07-01T17:00:00.000Z");
  assert.equal(dateRange(null, th("2026-07-01")).label, "ถึง 1 ก.ค. 2569");
});

test("departmentSeries: เรียงมากไปน้อย แล้วตามชื่อ", () => {
  const groups = [
    { department: "b", _count: { _all: 1 } },
    { department: "a", _count: { _all: 3 } },
    { department: "c", _count: { _all: 1 } },
  ];
  assert.deepEqual(departmentSeries(groups, (v) => v.toUpperCase()), [
    { label: "A", count: 3 },
    { label: "B", count: 1 },
    { label: "C", count: 1 },
  ]);
});

test("dimensionSeries: ปัดทศนิยมหนึ่งตำแหน่ง ไม่มีข้อมูล = null", () => {
  const dims = [["x", "เอ็กซ์"], ["y", "วาย"]];
  assert.deepEqual(dimensionSeries({ x: 3.8499, y: null }, dims), [
    { label: "เอ็กซ์", avg: 3.8 },
    { label: "วาย", avg: null },
  ]);
});

test("approvalRows: เติมสถานะที่ไม่มีเป็น 0 และรวม", () => {
  assert.deepEqual(
    approvalRows([
      { label: "รีวิว", groups: [{ status: "APPROVED", _count: { _all: 5 } }, { status: "REJECTED", _count: { _all: 1 } }] },
      { label: "กระทู้", groups: [] },
    ]),
    [
      { label: "รีวิว", APPROVED: 5, PENDING: 0, REJECTED: 1, total: 6 },
      { label: "กระทู้", APPROVED: 0, PENDING: 0, REJECTED: 0, total: 0 },
    ],
  );
});

test("topCompanySeries: จำนวนรีวิว → คะแนน → id แล้วตัด n", () => {
  const g = (companyId, n, avg) => ({ companyId, _count: { _all: n }, _avg: { scoreOverall: avg } });
  const out = topCompanySeries([g("c5", 1, 3), g("c1", 2, 4.125), g("c2", 1, 4.25), g("c0", 1, 3)], 3);
  assert.deepEqual(out, [
    { companyId: "c1", reviews: 2, avgScore: 4.1 },
    { companyId: "c2", reviews: 1, avgScore: 4.3 },
    { companyId: "c0", reviews: 1, avgScore: 3 },
  ]);
});
```

Run: `node --test` → FAIL `Cannot find module ... dashboard-rules.ts`

- [ ] **Step 2: `lib/dashboard-rules.ts`**

```ts
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
```

- [ ] **Step 3: `SCORE_DIMENSIONS`**
  - `lib/review-rules.ts` ต่อจาก `export type Scores = ...;` เพิ่ม

```ts

/** ป้าย 4 ด้านที่ใช้ทั้งหน้าสถานประกอบการและแดชบอร์ด */
export const SCORE_DIMENSIONS = [
  ["scoreWork", "ลักษณะงาน"],
  ["scoreEnv", "สภาพแวดล้อม"],
  ["scoreMentor", "พี่เลี้ยง"],
  ["scoreWelfare", "เบี้ยเลี้ยงและสวัสดิการ"],
] as const;
```

  - `app/insights/[id]/page.tsx`: ลบบล็อก `const DIMENSIONS = [...] as const;` · เพิ่ม `import { SCORE_DIMENSIONS } from "@/lib/review-rules";` · `DIMENSIONS.map(` → `SCORE_DIMENSIONS.map(`

- [ ] **Step 4: `prisma/seed.ts`** — ต่อจาก `const REVIEWS: SeedReview[] = [...];` เพิ่ม

```ts
// วันที่สร้างกระจายหลายเดือน — ใช้ตรวจตัวกรองช่วงวันที่ของแดชบอร์ด
const REVIEW_CREATED: Record<string, string> = {
  seed_r1: "2026-06-20",
  seed_r2: "2026-07-15",
  seed_r3: "2026-07-20",
  seed_r4: "2026-09-25",
  seed_r5: "2026-08-05",
  seed_r6: "2026-09-10",
  seed_r7: "2026-08-25",
  seed_r8: "2026-09-15",
};
```

และใน `const data = {` ของ loop รีวิว เพิ่มบรรทัด `      createdAt: new Date(`${REVIEW_CREATED[r.id]}T10:00:00+07:00`),`

- [ ] **Step 5: ตรวจ** — `node --test` PASS · `npx tsc --noEmit` · `npx jiti prisma/seed.ts` สองรอบ → บรรทัด seed เดิมไม่เปลี่ยน
- [ ] **Step 6: Checkpoint** — ห้าม commit

---

### Task 2: DAL แดชบอร์ด

**Files:** Create `lib/dashboard.ts` · Modify `lib/validation.ts`, `tests/route-guards.test.mjs`

**Interfaces:**
- Consumes: Task 1 · `departmentLabel` · `kindLabel` · `SCORE_DIMENSIONS`
- Produces: `dashboardParamsSchema → { from: Date | null; to: Date | null }` · `dashboardData(range: DateRange) → DashboardData` และ `export type DashboardData`:

```ts
{
  range: string;                                   // ป้ายช่วงวันที่
  totals: { reviews: number; avgScore: number | null; pending: number };
  departments: { label: string; count: number }[];
  dimensions: { label: string; avg: number | null }[];
  approval: { label: string; APPROVED: number; PENDING: number; REJECTED: number; total: number }[];
  topCompanies: { companyId: string; name: string; reviews: number; avgScore: number | null }[];
}
```

- [ ] **Step 1: เทสต์ guard ให้ล้มก่อน** — ใน `DAL` ของ `tests/route-guards.test.mjs` เพิ่ม `"lib/dashboard.ts": [],` และต่อท้ายไฟล์

```js
test("แดชบอร์ดเฉพาะ super admin และตัวเลขเนื้อหาสาธารณะกรอง APPROVED", () => {
  const src = readFileSync("lib/dashboard.ts", "utf8");
  assert.match(src, /^ {2}await requireSuperAdmin\(\);/m);
  assert.match(src, /const approvedReviews = \{ \.\.\.created, status: "APPROVED" \} as const/);
  // ความคิดเห็นนับเฉพาะในกระทู้ที่เผยแพร่ (ข้อบังคับ Phase 6b)
  assert.match(src, /post: \{ status: "APPROVED" \}/);
  for (const f of ["app/admin/dashboard/page.tsx", "app/admin/dashboard/report/page.tsx"]) {
    assert.match(existsSync(f) ? readFileSync(f, "utf8") : "", /await requireSuperAdmin\(\)/, f);
  }
});
```

Run: `node --test` → FAIL

- [ ] **Step 2: `lib/validation.ts`** — เพิ่ม `toThaiDateInput` ไม่ต้อง · แก้ import `import { parseThaiDate, periodError, workTimeError } from "./review-rules";` (มีอยู่แล้ว) · ต่อท้ายไฟล์

```ts
/** query string ของ /admin/dashboard — วันที่ผิดรูปแบบถูกเพิกเฉย (= ไม่จำกัดด้านนั้น) */
const dashboardDate = z
  .string()
  .optional()
  .transform((s) => (s ? parseThaiDate(s) : null))
  .catch(null);

export const dashboardParamsSchema = z.object({ from: dashboardDate, to: dashboardDate });
```

- [ ] **Step 3: `lib/dashboard.ts`**

```ts
import { requireSuperAdmin } from "./auth";
import { approvalRows, dateRange, departmentSeries, dimensionSeries, round1, topCompanySeries, type DateRange } from "./dashboard-rules";
import { db } from "./db";
import { departmentLabel } from "./departments";
import { kindLabel } from "./moderation-rules";
import { SCORE_DIMENSIONS } from "./review-rules";

// แดชบอร์ดผู้บริหาร (สเปกข้อ 15) — เฉพาะ super admin · ฐานข้อมูลนับทุกชุดด้วย groupBy/aggregate
// ตัวเลขที่มาจากเนื้อหาสาธารณะ (แผนก ค่าเฉลี่ย อันดับบริษัท) นับเฉพาะ APPROVED — หลักการโดเมนข้อ 1
// สัดส่วนการอนุมัติเป็นตัวเลขงานคัดกรอง จึงนับทุกสถานะ

const TOP_N = 10;

export async function dashboardData(range: DateRange) {
  await requireSuperAdmin();
  const created = range.gte || range.lt ? { createdAt: { gte: range.gte ?? undefined, lt: range.lt ?? undefined } } : {};
  const approvedReviews = { ...created, status: "APPROVED" } as const;
  const COUNT = { _count: { _all: true } } as const;
  const [deptGroups, avg, companyGroups, reviewStatus, postStatus, commentStatus, jobStatus] = await Promise.all([
    db.review.groupBy({ by: ["department"], where: approvedReviews, ...COUNT }),
    db.review.aggregate({
      where: approvedReviews,
      _count: true,
      _avg: { scoreOverall: true, scoreWork: true, scoreEnv: true, scoreMentor: true, scoreWelfare: true },
    }),
    // ponytail: ทุกบริษัทที่มีรีวิวแล้วเรียงใน topCompanySeries — หลักร้อยแถว ลำดับเท่ากันแน่นอนกว่าตัดที่ฐานข้อมูล
    db.review.groupBy({ by: ["companyId"], where: approvedReviews, ...COUNT, _avg: { scoreOverall: true } }),
    db.review.groupBy({ by: ["status"], where: created, ...COUNT }),
    db.communityPost.groupBy({ by: ["status"], where: created, ...COUNT }),
    // ความคิดเห็นในกระทู้ที่ไม่เผยแพร่หายจากสาธารณะไปแล้ว ไม่นับ (ข้อบังคับ Phase 6b)
    db.communityComment.groupBy({ by: ["status"], where: { ...created, post: { status: "APPROVED" } }, ...COUNT }),
    db.jobPosting.groupBy({ by: ["status"], where: created, ...COUNT }),
  ]);

  const top = topCompanySeries(companyGroups, TOP_N);
  const names = new Map(
    (await db.company.findMany({ where: { id: { in: top.map((t) => t.companyId) } }, select: { id: true, name: true } })).map((c) => [c.id, c.name]),
  );
  const approval = approvalRows([
    { label: kindLabel("review"), groups: reviewStatus },
    { label: kindLabel("post"), groups: postStatus },
    { label: kindLabel("comment"), groups: commentStatus },
    { label: kindLabel("job"), groups: jobStatus },
  ]);

  return {
    range: range.label,
    totals: {
      reviews: avg._count,
      avgScore: avg._avg.scoreOverall === null ? null : round1(avg._avg.scoreOverall),
      pending: approval.reduce((n, r) => n + r.PENDING, 0),
    },
    departments: departmentSeries(deptGroups, departmentLabel),
    dimensions: dimensionSeries(avg._avg, SCORE_DIMENSIONS),
    approval,
    topCompanies: top.map((t) => ({ ...t, name: names.get(t.companyId) ?? "ไม่พบชื่อ" })),
  };
}

export type DashboardData = Awaited<ReturnType<typeof dashboardData>>;
export { dateRange };
```

- [ ] **Step 4: ตรวจ** — `npx tsc --noEmit` · `node --test` → เหลือ FAIL เฉพาะเงื่อนไขหน้า `app/admin/dashboard*` ที่ยังไม่มี `requireSuperAdmin` (Task 3–4 แก้)
- [ ] **Step 5: Checkpoint** — ห้าม commit

---

### Task 3: กราฟ + หน้าแดชบอร์ด

**Files:** Create `components/DashboardChartsInner.tsx`, `components/DashboardCharts.tsx` · Modify `app/globals.css`, `app/admin/page.tsx` · Rewrite `app/admin/dashboard/page.tsx`

**Interfaces — Produces:** `type ChartPalette = { series: [string, string, string]; ink: string; muted: string; grid: string; surface: string }` · `SCREEN_PALETTE` (CSS variables) · `PRINT_PALETTE` (hex) · กราฟ `DepartmentChart`, `DimensionChart`, `ApprovalChart`, `TopCompanyChart` รับ `{ data, palette, animate }`

- [ ] **Step 1: `app/globals.css`** — ใน `:root { ... }` เพิ่มบรรทัดท้าย

```css
  /* กราฟ: reference palette ของ skill dataviz ช่อง 1–3 (ตรวจด้วย validate_palette --pairs all แล้ว) */
  --viz-1: #2a78d6;
  --viz-2: #eb6834;
  --viz-3: #1baf7a;
```

และใน `[data-theme="night"] { ... }` เพิ่ม

```css
  --viz-1: #3987e5;
  --viz-2: #d95926;
  --viz-3: #199e70;
```

- [ ] **Step 2: `components/DashboardChartsInner.tsx`**

```tsx
"use client";

import { Bar, BarChart, CartesianGrid, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// กราฟทั้งหมดของแดชบอร์ดและรายงาน A4 — โหลดผ่าน components/DashboardCharts.tsx (dynamic ssr:false) เท่านั้น
// palette มาจากผู้เรียก: หน้าจอใช้ CSS variable ตามธีม · รายงานใช้ hex ล้วน (html2canvas อ่าน oklch ไม่ออก)

export type ChartPalette = { series: [string, string, string]; ink: string; muted: string; grid: string; surface: string };
type Props<T> = { data: T[]; palette: ChartPalette; animate: boolean };

const ROW = 32;
const tick = (p: ChartPalette) => ({ fill: p.muted, fontSize: 12 });
const tooltip = (p: ChartPalette) => ({
  contentStyle: { background: p.surface, border: `1px solid ${p.grid}`, borderRadius: 8, color: p.ink, fontSize: 13 },
  labelStyle: { color: p.ink },
  cursor: { fill: p.grid, opacity: 0.4 },
});

/** รีวิวที่เผยแพร่ต่อแผนก — แท่งแนวนอน ซีรีส์เดียว */
export function DepartmentChart({ data, palette, animate }: Props<{ label: string; count: number }>) {
  return (
    <ResponsiveContainer width="100%" height={data.length * ROW + 24}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 0 }}>
        <CartesianGrid horizontal={false} stroke={palette.grid} />
        <XAxis type="number" allowDecimals={false} tick={tick(palette)} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="label" width={150} tick={tick(palette)} axisLine={false} tickLine={false} />
        <Tooltip {...tooltip(palette)} formatter={(v) => [`${v} รีวิว`, "จำนวน"]} />
        <Bar dataKey="count" fill={palette.series[0]} radius={[0, 4, 4, 0]} barSize={14} isAnimationActive={animate}>
          <LabelList dataKey="count" position="right" fill={palette.ink} fontSize={12} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** ค่าเฉลี่ย 4 ด้าน (เต็ม 5) — แท่งตั้ง ซีรีส์เดียว */
export function DimensionChart({ data, palette, animate }: Props<{ label: string; avg: number | null }>) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 24, right: 8, bottom: 0, left: -24 }}>
        <CartesianGrid vertical={false} stroke={palette.grid} />
        <XAxis dataKey="label" tick={tick(palette)} axisLine={false} tickLine={false} interval={0} />
        <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} tick={tick(palette)} axisLine={false} tickLine={false} />
        <Tooltip {...tooltip(palette)} formatter={(v) => [`${v} / 5`, "ค่าเฉลี่ย"]} />
        <Bar dataKey="avg" fill={palette.series[0]} radius={[4, 4, 0, 0]} barSize={36} isAnimationActive={animate}>
          <LabelList dataKey="avg" position="top" fill={palette.ink} fontSize={12} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

const STATUSES = [
  ["APPROVED", "อนุมัติ"],
  ["PENDING", "รอตรวจ"],
  ["REJECTED", "ปฏิเสธ"],
] as const;

/** สัดส่วนสถานะต่อชนิดเนื้อหา — แท่งซ้อนแนวนอน สามสถานะ เว้น 2px ระหว่างช่วง */
export function ApprovalChart({ data, palette, animate }: Props<{ label: string; APPROVED: number; PENDING: number; REJECTED: number }>) {
  return (
    <ResponsiveContainer width="100%" height={data.length * 44 + 56}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid horizontal={false} stroke={palette.grid} />
        <XAxis type="number" allowDecimals={false} tick={tick(palette)} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="label" width={88} tick={tick(palette)} axisLine={false} tickLine={false} />
        <Tooltip {...tooltip(palette)} />
        {/* ข้อความใช้สีตัวอักษร ไม่ใช้สีซีรีส์ (dataviz) */}
        <Legend wrapperStyle={{ fontSize: 13 }} formatter={(v) => <span style={{ color: palette.ink }}>{v}</span>} />
        {STATUSES.map(([key, name], i) => (
          <Bar
            key={key}
            dataKey={key}
            name={name}
            stackId="status"
            fill={palette.series[i]}
            stroke={palette.surface}
            strokeWidth={2}
            barSize={18}
            isAnimationActive={animate}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/** บริษัทยอดนิยม — จำนวนรีวิวที่เผยแพร่ แท่งแนวนอน ซีรีส์เดียว */
export function TopCompanyChart({ data, palette, animate }: Props<{ name: string; reviews: number }>) {
  return (
    <ResponsiveContainer width="100%" height={data.length * ROW + 24}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 0 }}>
        <CartesianGrid horizontal={false} stroke={palette.grid} />
        <XAxis type="number" allowDecimals={false} tick={tick(palette)} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={180}
          tick={tick(palette)}
          axisLine={false}
          tickLine={false}
          tickFormatter={(s: string) => (s.length > 24 ? `${s.slice(0, 24)}…` : s)}
        />
        <Tooltip {...tooltip(palette)} formatter={(v) => [`${v} รีวิว`, "จำนวน"]} />
        <Bar dataKey="reviews" fill={palette.series[0]} radius={[0, 4, 4, 0]} barSize={14} isAnimationActive={animate}>
          <LabelList dataKey="reviews" position="right" fill={palette.ink} fontSize={12} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 3: `components/DashboardCharts.tsx`**

```tsx
"use client";

import dynamic from "next/dynamic";
import type { ChartPalette } from "./DashboardChartsInner";

// Recharts แตะ window — ssr: false ใช้ได้เฉพาะใน client component (CLAUDE.md)
const loading = () => <div className="h-40 w-full rounded-md bg-surface-200" />;
export const DepartmentChart = dynamic(() => import("./DashboardChartsInner").then((m) => m.DepartmentChart), { ssr: false, loading });
export const DimensionChart = dynamic(() => import("./DashboardChartsInner").then((m) => m.DimensionChart), { ssr: false, loading });
export const ApprovalChart = dynamic(() => import("./DashboardChartsInner").then((m) => m.ApprovalChart), { ssr: false, loading });
export const TopCompanyChart = dynamic(() => import("./DashboardChartsInner").then((m) => m.TopCompanyChart), { ssr: false, loading });

/** หน้าจอ: ตามธีมผ่าน CSS variable */
export const SCREEN_PALETTE: ChartPalette = {
  series: ["var(--viz-1)", "var(--viz-2)", "var(--viz-3)"],
  ink: "var(--ink)",
  muted: "var(--ink-muted)",
  grid: "var(--line)",
  surface: "var(--surface-100)",
};

/** รายงาน A4: hex ล้วน พื้นขาวเสมอ — ค่าเดียวกับธีมสว่าง */
export const PRINT_PALETTE: ChartPalette = {
  series: ["#2a78d6", "#eb6834", "#1baf7a"],
  ink: "#15181b",
  muted: "#565b60",
  grid: "#d9dbd5",
  surface: "#ffffff",
};
```

- [ ] **Step 4: เขียน `app/admin/dashboard/page.tsx` ใหม่**

```tsx
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
        <Card eyebrow="รอตรวจทั้งหมด" metric={d.totals.pending.toLocaleString("th-TH")} />
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
```

- [ ] **Step 5: `app/admin/page.tsx`** — ปุ่มแดชบอร์ดเฉพาะ super admin
  - เพิ่ม import `import { requireAdmin } from "@/lib/auth";`
  - บรรทัดแรกในฟังก์ชัน `AdminPage` เพิ่ม `const admin = await requireAdmin();` (layout เรียกแล้ว — `getCurrentUser` cache ไม่ query ซ้ำ)
  - ครอบลิงก์ `/admin/dashboard` ด้วย `{admin.isSuperAdmin && (...)}`

- [ ] **Step 6: ตรวจ** — `npx next typegen` · `npx tsc --noEmit` · `node --test` (เหลือ FAIL เฉพาะหน้า report) · eslint
- [ ] **Step 7: ตรวจสิทธิ์และตัวเลขกับฐานข้อมูลจริง** — seed + session (`dev-p7-super` seed_super, `dev-p7-admin` seed_admin, `dev-p7-u1` seed_u1):
  - `curl -s -o /dev/null -w '%{http_code}'` `/admin/dashboard`: super 200 · admin 403 · u1 403 · ไม่ล็อกอิน 401
  - เบราว์เซอร์ cookie super เปิด `/admin/dashboard` เปิด `<details>` ทั้งหมดแล้วอ่านตาราง (`javascript_tool`) เทียบค่าที่คำนวณจาก seed:
    - ทั้งหมด: รีวิว 5 · เฉลี่ยรวม 3.5 · แผนก ช่างยนต์ 2 / เทคโนโลยีสารสนเทศ 1 / ช่างกลโรงงาน 1 / ช่างอิเล็กทรอนิกส์ 1 · 4 ด้าน 3.8 / 3.8 / 3.8 / 2.6 · อนุมัติ: รีวิว 5/2/1 · กระทู้ 3/1/1 · ความคิดเห็น 4/2/1 · ประกาศงาน 3/1/1 · รอตรวจรวม 6 · บริษัท: หาดใหญ่ออโต้เซอร์วิส 2 (4.1) / สงขลาไอทีโซลูชั่น 1 (4.3) / หาดใหญ่ซีเอ็นซี 1 (3.0) / คอหงส์อิเล็กทรอนิกส์ 1 (2.0)
    - `?from=2026-07-01&to=2026-08-31`: รีวิว 3 (r2 r5 r7) · แผนก ช่างยนต์ 1 / IT 1 / กลโรงงาน 1 · อนุมัติรีวิว 3/0/1 · กระทู้ ความคิดเห็น ประกาศงาน 0 · ป้ายช่วง "1 ก.ค. 2569 – 31 ส.ค. 2569"
    - `?from=2027-01-01`: ทุกการ์ด "ไม่มีข้อมูลในช่วงนี้" · สถิติ 0 / – / 0
    - `?from=abc&to=2026-02-30`: ป้าย "ทั้งหมด" ไม่ error
  - กราฟวาดครบ 4 ตัว ไม่มี error console · ชี้เมาส์ที่แท่งมี tooltip · ธีมมืด (`localStorage.theme="night"` แล้วรีเฟรช) สีกราฟเปลี่ยนตามธีม ตัวอักษรอ่านออก
  - 375px: `scrollWidth <= innerWidth` · screenshot
  - cookie admin: `/admin` ไม่มีปุ่ม "แดชบอร์ด" · cookie super: มี
- [ ] **Step 8: Checkpoint** — ห้าม commit

---

### Task 4: รายงาน A4 + ส่งออก PDF

**Files:** Create `app/admin/dashboard/report/page.tsx`, `components/ReportExport.tsx` · Modify `app/globals.css`, `tests/routes.test.mjs`

- [ ] **Step 1: เทสต์เส้นทาง** — `INNER` ของ `tests/routes.test.mjs` เพิ่ม `"/admin/dashboard/report",` → `node --test` FAIL

- [ ] **Step 2: `app/globals.css`** — ต่อท้ายไฟล์

```css
/* รายงาน A4 (/admin/dashboard/report) — แผ่นละ 794×1123px = A4 ที่ 96dpi พิมพ์แผ่นละหน้า ซ่อนเมนูและท้ายเว็บ */
/* named page — ขอบกระดาษ 0 เฉพาะแผ่นรายงาน หน้าอื่นพิมพ์ตามปกติ */
@page report {
  size: A4;
  margin: 0;
}
[data-report-sheet] {
  page: report;
}
@media print {
  body:has([data-report]) > :not(main) {
    display: none !important;
  }
  body:has([data-report]) {
    padding: 0 !important;
    background: #ffffff !important;
  }
  [data-report] .no-print {
    display: none !important;
  }
  [data-report-sheet] {
    break-after: page;
    box-shadow: none !important;
    margin: 0 !important;
  }
}
```

- [ ] **Step 3: `components/ReportExport.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui/Button";

const A4_MM = { w: 210, h: 297 };

/**
 * ส่งออก PDF: จับภาพแต่ละแผ่น [data-report-sheet] ด้วย html2canvas แล้ววางเต็มหน้า A4 ของ jsPDF หนึ่งแผ่นต่อหน้า
 * ต้องรอฟอนต์ไทยโหลดครบก่อน ไม่งั้นสระและวรรณยุกต์หาย (CLAUDE.md) · scale 2 ไม่เกินนี้ ไฟล์บวมและค้าง
 * พิมพ์ (window.print) เป็นทางสำรองที่ข้อความคมชัดจริง
 */
export function ReportExport({ filename }: { filename: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function exportPdf() {
    setBusy(true);
    setError(null);
    try {
      await document.fonts.ready;
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const sheets = [...document.querySelectorAll<HTMLElement>("[data-report-sheet]")];
      for (const [i, sheet] of sheets.entries()) {
        const canvas = await html2canvas(sheet, { scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false });
        if (i > 0) pdf.addPage();
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, A4_MM.w, A4_MM.h);
      }
      pdf.save(filename);
    } catch {
      setError("ส่งออก PDF ไม่สำเร็จ ลองใช้ปุ่มพิมพ์แล้วเลือกบันทึกเป็น PDF");
    }
    setBusy(false);
  }

  return (
    <div className="no-print flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" icon={<Icon name="picture_as_pdf" />} disabled={busy} onClick={exportPdf}>
          {busy ? "กำลังสร้าง PDF…" : "ส่งออก PDF"}
        </Button>
        <Button variant="secondary" icon={<Icon name="print" />} onClick={() => window.print()}>
          พิมพ์
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-small text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: `app/admin/dashboard/report/page.tsx`**

```tsx
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ApprovalChart, DepartmentChart, DimensionChart, PRINT_PALETTE, TopCompanyChart } from "@/components/DashboardCharts";
import { ReportExport } from "@/components/ReportExport";
import { buttonClass } from "@/components/ui/Button";
import { requireSuperAdmin } from "@/lib/auth";
import { dashboardData, dateRange, type DashboardData } from "@/lib/dashboard";
import { toThaiDateInput } from "@/lib/review-rules";
import { dashboardParamsSchema } from "@/lib/validation";

// แผ่นรายงานใช้สี hex ผ่าน style เท่านั้น — class สีของ Tailwind เป็น oklch ซึ่ง html2canvas อ่านไม่ออก (CLAUDE.md)
const C = { ink: "#15181b", muted: "#565b60", line: "#d9dbd5", paper: "#ffffff", head: "#0f6b52" };
const SHEET: CSSProperties = { width: 794, height: 1123, padding: 48, background: C.paper, color: C.ink, boxSizing: "border-box", overflow: "hidden" };
const thaiDateTime = (d: Date) =>
  d.toLocaleString("th-TH", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });

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
              {d.departments.length === 0 ? <Empty /> : <DepartmentChart data={d.departments} palette={PRINT_PALETTE} animate={false} />}
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
            <Section title={`4. สถานประกอบการยอดนิยม ${d.topCompanies.length} อันดับ`}>
              {d.topCompanies.length === 0 ? (
                <Empty />
              ) : (
                <>
                  <TopCompanyChart data={d.topCompanies} palette={PRINT_PALETTE} animate={false} />
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
          <p style={{ color: C.muted }} className="text-[13px]">{`ช่วงข้อมูล: ${d.range} · พิมพ์เมื่อ ${thaiDateTime(printedAt)}`}</p>
        </div>
        <p style={{ color: C.muted }} className="text-[13px]">{`หน้า ${page}/2`}</p>
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
```

- [ ] **Step 5: ตรวจ** — typegen · tsc · `node --test` PASS ทั้งหมด · eslint
- [ ] **Step 6: เบราว์เซอร์ + PDF จริง**
  - cookie super เปิด `/admin/dashboard/report` → เห็นสองแผ่น กราฟวาดครบ ไม่มี error console · ไม่มี element ใดในแผ่นที่ computed color มี `oklch` (`javascript_tool` ไล่ `getComputedStyle` ของทุก element ใน `[data-report-sheet]` ตรวจ `color`, `background-color`, `border-color`, `fill`, `stroke`)
  - กด "ส่งออก PDF" → ได้ไฟล์ `htc-insights-report-YYYYMMDD.pdf` · หาไฟล์ใน Downloads แล้ว**แปลงแต่ละหน้าเป็นภาพแล้วเปิดดู**: 2 หน้า ขนาด A4 (595×842 pt) · ตัวอักษรไทยมีสระบนล่างและวรรณยุกต์ครบ (เช่น "ค่าเฉลี่ย", "ปฏิเสธ", "สถานประกอบการ") · กราฟทั้ง 4 มีแท่งและตัวเลข · ไม่มีอะไรถูกตัดขอบ
  - ถ้าส่งออกไม่ได้เพราะ html2canvas อ่านสีไม่ออก: แก้ด้วย `onclone` ที่ลบ `<link rel=stylesheet>`/`<style>` นอกแผ่นในเอกสารที่ clone (บันทึก ruling) — ห้ามปล่อยผ่าน
  - พิมพ์: `emulateMedia print` ไม่มีในเครื่องมือ — ตรวจด้วยการอ่าน CSS ว่า `body:has([data-report]) > :not(main)` ซ่อน TopNav/BottomNav/Footer และ `.no-print` ซ่อนปุ่ม
  - 375px: หน้าไม่ล้น (`scrollWidth <= innerWidth`) แผ่นเลื่อนแนวนอนในกล่องของตัวเอง
- [ ] **Step 7: Checkpoint** — ห้าม commit

---

### Task 5: เอกสาร + เก็บกวาด + ตรวจสุดท้าย

- [ ] **Step 1: `docs/context.md`** — ตาราง Phase แถว 7 → `เสร็จ` · บรรทัดสถานะ → `Phase 0–7 เสร็จแล้ว — ครบทั้ง 18 ข้อของสเปก` · เพิ่มย่อหน้า:

```markdown
Phase 7: แดชบอร์ด `/admin/dashboard` และรายงาน `/admin/dashboard/report` เฉพาะ super admin · DAL `dashboardData()` ใน `lib/dashboard.ts` ให้ฐานข้อมูลนับทุกชุด แปลงด้วย `lib/dashboard-rules.ts` (มีเทสต์) · ตัวเลขเนื้อหาสาธารณะกรอง `APPROVED` สัดส่วนอนุมัตินับทุกสถานะ ความคิดเห็นนับเฉพาะในกระทู้ที่เผยแพร่ · กรองช่วงวันที่ `?from=&to=` เวลาไทยรวมวันสุดท้าย · กราฟ Recharts ไฟล์เดียว (`components/DashboardChartsInner.tsx`) รับ palette — หน้าจอใช้ `--viz-*` ตามธีม รายงานใช้ hex · รายงาน = 2 แผ่น A4 ความสูงคงที่ ส่งออก PDF แผ่นละหน้า (html2canvas + jsPDF) และพิมพ์ได้ · สัดส่วนอนุมัติใช้แท่งซ้อนแทนโดนัท · ยังไม่มีไฟล์โลโก้ — หัวรายงานเป็นตัวอักษร
```

- [ ] **Step 2: เก็บกวาด** — ลบ session `dev-p7-%` · seed ใหม่
- [ ] **Step 3: ตรวจสุดท้าย** — `node --test` · `npx tsc --noEmit` · `npm run build` · `git status --short` เฉพาะไฟล์ใน File Structure
- [ ] **Step 4: หยุดให้ผู้ใช้รีวิว** (แผนเต็มกำหนดจุดหยุดหลังจบ Phase 7) — ห้าม commit จนผู้ใช้สั่ง
