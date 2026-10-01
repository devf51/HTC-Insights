import { test } from "node:test";
import assert from "node:assert/strict";
import { SETTINGS, actionFor, isActive, navFor } from "../lib/nav.ts";

const ROLES = [null, "STUDENT", "EXTERNAL", "ADMIN"];

test("เมนูแต่ละบทบาทตรงตามสเปก", () => {
  const hrefs = (r) => navFor(r).map((i) => i.href);
  assert.deepEqual(hrefs(null), ["/", "/jobs"]);
  assert.deepEqual(hrefs("STUDENT"), ["/", "/insights", "/community", "/jobs", "/profile"]);
  assert.deepEqual(hrefs("EXTERNAL"), ["/", "/jobs", "/employer/register", "/profile"]);
  assert.deepEqual(hrefs("ADMIN"), ["/", "/insights", "/community", "/jobs", "/admin"]);
});

test("ไม่มีบทบาทไหนมีลิงก์เกิน 5 (กฎ TopNav ของ Kernel และความกว้างแถบล่าง)", () => {
  for (const r of ROLES) assert.ok(navFor(r).length <= 5, String(r));
});

test("ตั้งค่าเป็นไอคอนในแถบบน ไม่กินช่องเมนูของบทบาทไหน", () => {
  assert.deepEqual(SETTINGS, { href: "/settings", label: "ตั้งค่า", icon: "settings" });
  for (const r of ROLES) assert.ok(!navFor(r).some((i) => i.href === SETTINGS.href), String(r));
});

test("ปุ่มขวาบน: ผู้เยี่ยมชมไปเข้าสู่ระบบ ผู้ดูแลไปโปรไฟล์ นอกนั้นไม่มี", () => {
  assert.equal(actionFor(null)?.href, "/login");
  assert.equal(actionFor("ADMIN")?.href, "/profile");
  assert.equal(actionFor("STUDENT"), null);
  assert.equal(actionFor("EXTERNAL"), null);
});

test("ป้ายบนแถบล่างไม่เกิน 8 ตัวอักษร ไม่งั้นล้นช่องที่ 375px", () => {
  for (const r of ROLES) {
    for (const i of navFor(r)) {
      const label = i.short ?? i.label;
      assert.ok([...label].length <= 8, `"${label}" ยาวเกิน`);
    }
  }
});

test("isActive: หน้าแรกต้องตรงเป๊ะ หน้าอื่นนับหน้าย่อยด้วย", () => {
  assert.equal(isActive("/", "/"), true);
  assert.equal(isActive("/jobs", "/"), false);
  assert.equal(isActive("/jobs", "/jobs"), true);
  assert.equal(isActive("/insights/123", "/insights"), true);
  assert.equal(isActive("/insightsx", "/insights"), false);
  assert.equal(isActive("/admin/users", "/admin"), true);
});
