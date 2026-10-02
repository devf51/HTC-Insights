import { test } from "node:test";
import assert from "node:assert/strict";
import {
  JOBS_PER_PAGE,
  MAX_DEPARTMENTS,
  departmentsError,
  freeDepartments,
  isOpen,
  mapsUrl,
  parseDepartments,
  pinError,
  telHref,
} from "../lib/job-rules.ts";

test("ค่าคงที่ — แผนกสูงสุดตาม v1", () => {
  assert.equal(MAX_DEPARTMENTS, 3);
  assert.equal(JOBS_PER_PAGE, 20);
});

test("isOpen ตรงกับเงื่อนไขของ unique index: เปิดรับและไม่ถูกปฏิเสธ", () => {
  assert.equal(isOpen({ status: "PENDING", isActive: true }), true);
  assert.equal(isOpen({ status: "APPROVED", isActive: true }), true);
  assert.equal(isOpen({ status: "APPROVED", isActive: false }), false);
  assert.equal(isOpen({ status: "REJECTED", isActive: true }), false);
});

test("departmentsError: อย่างน้อย 1 ไม่เกิน 3 ไม่ซ้ำ", () => {
  assert.equal(departmentsError(["a"]), null);
  assert.equal(departmentsError(["a", "b", "c"]), null);
  assert.match(departmentsError([]), /อย่างน้อย 1/);
  assert.match(departmentsError(["a", "b", "c", "d"]), /ไม่เกิน 3/);
  assert.match(departmentsError(["a", "a"]), /ซ้ำ/);
});

test("parseDepartments อ่าน Json แบบไม่เชื่อรูปร่าง", () => {
  assert.deepEqual(parseDepartments(["a", "b"]), ["a", "b"]);
  assert.deepEqual(parseDepartments(["a", 1, null]), ["a"]);
  assert.deepEqual(parseDepartments("a"), []);
  assert.deepEqual(parseDepartments(null), []);
});

test("freeDepartments: แผนกที่มีประกาศเปิดรับ (รวมรอตรวจ) ไม่ว่าง ที่ปิดหรือถูกปฏิเสธคืนโควตา", () => {
  const jobs = [
    { department: "a", status: "PENDING", isActive: true },
    { department: "b", status: "REJECTED", isActive: true },
    { department: "c", status: "APPROVED", isActive: false },
  ];
  assert.deepEqual(freeDepartments(["a", "b", "c"], jobs), ["b", "c"]);
  assert.deepEqual(freeDepartments(["a"], jobs), []);
  assert.deepEqual(freeDepartments(["a", "b"], []), ["a", "b"]);
});

test("pinError: ไม่ปักก็ได้ ปักต้องครบคู่และอยู่ในไทย", () => {
  assert.equal(pinError(null, null), null);
  assert.equal(pinError(7.0084, 100.4767), null);
  assert.ok(pinError(7.0084, null));
  assert.ok(pinError(null, 100.4767));
  assert.match(pinError(100.4767, 7.0084), /ประเทศไทย/); // สลับ lat/lng
  assert.match(pinError(35.68, 139.69), /ประเทศไทย/);
});

test("mapsUrl และ telHref", () => {
  assert.equal(mapsUrl(7.0084, 100.4767), "https://www.google.com/maps/search/?api=1&query=7.0084,100.4767");
  assert.equal(mapsUrl(null, 100.4767), null);
  assert.equal(telHref("074-000 004"), "tel:074000004");
  assert.equal(telHref("+66 74 000 004"), "tel:+6674000004");
});
