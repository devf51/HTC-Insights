import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EDUCATION_LEVEL_VALUES,
  ROLE_LABELS,
  ROLE_VALUES,
  USERS_PER_PAGE,
  accountChangeError,
  canManage,
  roleNotice,
  upgradeNotice,
} from "../lib/account-rules.ts";

const admin = { id: "a", isSuperAdmin: false };
const sup = { id: "s", isSuperAdmin: true };
const user = (extra = {}) => ({ id: "u", role: "STUDENT", isSuperAdmin: false, isBanned: false, ...extra });

test("ค่าคงที่", () => {
  assert.deepEqual(ROLE_VALUES, ["STUDENT", "EXTERNAL", "ADMIN"]);
  assert.equal(ROLE_LABELS.EXTERNAL, "บุคคลภายนอก");
  assert.deepEqual(EDUCATION_LEVEL_VALUES, ["ปวช.", "ปวส."]);
  assert.equal(USERS_PER_PAGE, 20);
});

test("canManage: ตัวเอง super admin และผู้ดูแลคนอื่น (เว้นแต่ผู้กระทำเป็นระดับสูง) แก้ไม่ได้", () => {
  assert.equal(canManage(admin, user()), true);
  assert.equal(canManage(admin, user({ id: "a", role: "ADMIN" })), false);
  assert.equal(canManage(sup, user({ isSuperAdmin: true, role: "ADMIN" })), false);
  assert.equal(canManage(admin, user({ role: "ADMIN" })), false);
  assert.equal(canManage(sup, user({ role: "ADMIN" })), true);
});

test("accountChangeError: สิทธิ์ 403", () => {
  assert.equal(accountChangeError(admin, user({ id: "a" }), { action: "ban" }).status, 403);
  assert.equal(accountChangeError(sup, user({ isSuperAdmin: true }), { action: "ban" }).status, 403);
  assert.equal(accountChangeError(admin, user(), { action: "set_role", role: "ADMIN" }).status, 403);
  assert.equal(accountChangeError(admin, user({ role: "ADMIN" }), { action: "set_role", role: "STUDENT" }).status, 403);
  assert.equal(accountChangeError(admin, user({ role: "ADMIN" }), { action: "ban" }).status, 403);
});

test("accountChangeError: ทำได้ และสถานะซ้ำ 409", () => {
  assert.equal(accountChangeError(admin, user(), { action: "set_role", role: "EXTERNAL" }), null);
  assert.equal(accountChangeError(admin, user(), { action: "ban" }), null);
  assert.equal(accountChangeError(sup, user(), { action: "set_role", role: "ADMIN" }), null);
  assert.equal(accountChangeError(sup, user({ role: "ADMIN" }), { action: "set_role", role: "STUDENT" }), null);
  assert.equal(accountChangeError(admin, user(), { action: "set_role", role: "STUDENT" }).status, 409);
  assert.equal(accountChangeError(admin, user({ isBanned: true }), { action: "ban" }).status, 409);
  assert.equal(accountChangeError(admin, user(), { action: "unban" }).status, 409);
});

test("ข้อความแจ้งบทบาทและคำขอ", () => {
  assert.deepEqual(roleNotice("EXTERNAL"), { type: "role_changed", message: "ผู้ดูแลเปลี่ยนบทบาทบัญชีของคุณเป็นบุคคลภายนอก", link: "/profile" });
  assert.equal(upgradeNotice("APPROVED", null).type, "upgrade_approved");
  const rej = upgradeNotice("REJECTED", "รูปไม่ชัด");
  assert.equal(rej.link, "/profile/upgrade");
  assert.match(rej.message, /รูปไม่ชัด/);
});
