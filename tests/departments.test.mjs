import { test } from "node:test";
import assert from "node:assert/strict";
import { DEPARTMENTS, DEPARTMENT_VALUES, departmentLabel } from "../lib/departments.ts";

test("18 แผนกจาก v1 ค่าไม่ซ้ำ และเก็บเป็นชื่อเต็มขึ้นต้นด้วย แผนกวิชา", () => {
  assert.equal(DEPARTMENTS.length, 18);
  assert.equal(new Set(DEPARTMENT_VALUES).size, 18);
  assert.ok(DEPARTMENT_VALUES.every((v) => v.startsWith("แผนกวิชา")));
});

test("departmentLabel คืนชื่อสั้น และคืนค่าเดิมเมื่อไม่รู้จัก", () => {
  assert.equal(departmentLabel("แผนกวิชาช่างยนต์"), "ช่างยนต์");
  assert.equal(departmentLabel("แผนกวิชาที่ยังไม่มี"), "แผนกวิชาที่ยังไม่มี");
});
