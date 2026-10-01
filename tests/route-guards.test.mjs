import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

// ตารางสิทธิ์ใน docs/superpowers/specs/2026-10-01-phase1-auth-design.md ส่วนที่ 3
// เทสต์นี้กันไม่ให้ guard หายจาก layout เงียบ ๆ ตอนมีคนแก้หน้า
const GUARDS = {
  "app/insights/layout.tsx": 'requireRole("STUDENT", "ADMIN")',
  "app/community/layout.tsx": 'requireRole("STUDENT", "ADMIN")',
  "app/employer/layout.tsx": 'requireRole("EXTERNAL", "ADMIN")',
  "app/profile/layout.tsx": "requireUser()",
  "app/admin/layout.tsx": "requireAdmin()",
};

test("ทุกส่วนที่ต้องกันสิทธิ์มี layout ที่เรียก guard ถูกตัว", () => {
  const wrong = Object.entries(GUARDS)
    .filter(([file, call]) => !existsSync(file) || !readFileSync(file, "utf8").includes(`await ${call}`))
    .map(([file]) => file);
  assert.deepEqual(wrong, []);
});

test("มีหน้า 401 และ 403", () => {
  assert.ok(existsSync("app/unauthorized.tsx"));
  assert.ok(existsSync("app/forbidden.tsx"));
});
