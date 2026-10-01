import { test } from "node:test";
import assert from "node:assert/strict";
import { canSignIn, hasRole, initialAccess, loginErrorMessage } from "../lib/auth-rules.ts";

const DOMAIN = "htc.ac.th";
const ADMIN = "boss@gmail.com";
const access = (email, domain = DOMAIN, admin = ADMIN) => initialAccess(email, domain, admin);

test("อีเมลโดเมนวิทยาลัยได้ STUDENT", () => {
  assert.deepEqual(access("somchai@htc.ac.th"), { role: "STUDENT", isSuperAdmin: false });
  assert.deepEqual(access("SomChai@HTC.AC.TH"), { role: "STUDENT", isSuperAdmin: false });
});

test("โดเมนหลอกหรือโดเมนย่อยไม่ได้ STUDENT", () => {
  assert.equal(access("x@evil-htc.ac.th").role, "EXTERNAL");
  assert.equal(access("x@htc.ac.th.evil.com").role, "EXTERNAL");
  assert.equal(access("x@mail.htc.ac.th").role, "EXTERNAL");
  assert.equal(access("htc.ac.th@gmail.com").role, "EXTERNAL");
});

test("อีเมลทั่วไปได้ EXTERNAL", () => {
  assert.deepEqual(access("someone@gmail.com"), { role: "EXTERNAL", isSuperAdmin: false });
});

test("ค่า env โดเมนที่มี @ นำหน้าหรือช่องว่างยังใช้ได้", () => {
  assert.equal(access("a@htc.ac.th", " @htc.ac.th ").role, "STUDENT");
});

test("ไม่ได้ตั้งโดเมน = ไม่มีใครได้ STUDENT อัตโนมัติ", () => {
  assert.equal(initialAccess("a@htc.ac.th", undefined, ADMIN).role, "EXTERNAL");
  assert.equal(access("a@htc.ac.th", "").role, "EXTERNAL");
  assert.equal(access("a@htc.ac.th", "   ").role, "EXTERNAL");
});

test("SUPER_ADMIN_EMAIL ได้ ADMIN ระดับสูง ไม่สนตัวพิมพ์และช่องว่าง และชนะกฎโดเมน", () => {
  assert.deepEqual(access("Boss@Gmail.com"), { role: "ADMIN", isSuperAdmin: true });
  assert.deepEqual(access("boss@gmail.com", DOMAIN, " boss@gmail.com "), { role: "ADMIN", isSuperAdmin: true });
  assert.deepEqual(access("head@htc.ac.th", DOMAIN, "head@htc.ac.th"), { role: "ADMIN", isSuperAdmin: true });
});

test("ไม่ได้ตั้ง SUPER_ADMIN_EMAIL = ไม่มีใครเป็นผู้ดูแลอัตโนมัติ", () => {
  assert.equal(initialAccess("boss@gmail.com", DOMAIN, undefined).role, "EXTERNAL");
  assert.equal(access("", DOMAIN, "").role, "EXTERNAL");
});

test("hasRole ตรวจว่าบทบาทอยู่ในรายการที่อนุญาต", () => {
  assert.equal(hasRole("ADMIN", ["STUDENT", "ADMIN"]), true);
  assert.equal(hasRole("EXTERNAL", ["STUDENT", "ADMIN"]), false);
  assert.equal(hasRole("STUDENT", []), false);
});

test("canSignIn ต้องอีเมลยืนยันแล้ว (true จริง) และไม่ถูกระงับ", () => {
  assert.equal(canSignIn({ emailVerified: true, isBanned: false }), true);
  assert.equal(canSignIn({ emailVerified: true, isBanned: undefined }), true);
  assert.equal(canSignIn({ emailVerified: true, isBanned: true }), false);
  assert.equal(canSignIn({ emailVerified: false, isBanned: false }), false);
  assert.equal(canSignIn({ emailVerified: undefined, isBanned: false }), false);
  assert.equal(canSignIn({ emailVerified: "true", isBanned: false }), false);
});

test("loginErrorMessage แปลรหัสจาก Auth.js เป็นข้อความไทย", () => {
  assert.match(loginErrorMessage("AccessDenied"), /ถูกระงับ/);
  assert.match(loginErrorMessage("Configuration"), /ตั้งค่าไม่ครบ/);
  assert.equal(loginErrorMessage("Whatever"), "เข้าสู่ระบบไม่สำเร็จ ลองอีกครั้ง");
  assert.equal(loginErrorMessage(undefined), null);
});

test("loginErrorMessage ไม่หลุดไปอ่าน property ของ Object", () => {
  assert.equal(loginErrorMessage("constructor"), "เข้าสู่ระบบไม่สำเร็จ ลองอีกครั้ง");
  assert.equal(loginErrorMessage("toString"), "เข้าสู่ระบบไม่สำเร็จ ลองอีกครั้ง");
  assert.equal(loginErrorMessage(["AccessDenied", "x"]), "เข้าสู่ระบบไม่สำเร็จ ลองอีกครั้ง");
});
