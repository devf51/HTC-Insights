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
