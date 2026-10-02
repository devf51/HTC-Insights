import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { SETTINGS, actionFor, navFor } from "../lib/nav.ts";

// ลิงก์ที่ไม่อยู่ในเมนู แต่หน้าต่าง ๆ ลิงก์ไปหา (spec ส่วนที่ 3) + หน้ารายละเอียด
// SETTINGS คือไอคอนเฟืองในแถบบน — ใช้ค่าเดียวกับที่ TopNav ใช้ ไม่พิมพ์ path ซ้ำ
const INNER = [
  SETTINGS.href,
  "/login",
  "/insights/write-review",
  "/insights/[id]",
  "/community/new",
  "/community/[id]",
  "/employer/jobs/new",
  "/jobs/[id]",
  "/profile/upgrade",
  "/admin/users",
  "/admin/dashboard",
];

const pageFile = (href) => `app${href === "/" ? "" : href}/page.tsx`;

test("ทุกลิงก์ในเมนูของทุกบทบาท และลิงก์ภายใน มีหน้ารองรับ — ไม่มี 404", () => {
  const hrefs = new Set(INNER);
  for (const role of [null, "STUDENT", "EXTERNAL", "ADMIN"]) {
    for (const item of navFor(role)) hrefs.add(item.href);
    const action = actionFor(role);
    if (action) hrefs.add(action.href);
  }
  const missing = [...hrefs].filter((h) => !existsSync(pageFile(h)));
  assert.deepEqual(missing, []);
});
