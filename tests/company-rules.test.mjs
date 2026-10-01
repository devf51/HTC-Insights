import { test } from "node:test";
import assert from "node:assert/strict";
import { PAGE_SIZE, isListed, reviewAuthor, safeUrl, searchCompanies, summarize } from "../lib/company-rules.ts";

const co = (id, extra = {}) => ({ id, name: `บริษัท ${id}`, address: null, industry: null, lat: 7, lng: 100.5, isVerified: false, ...extra });
const rv = (companyId, scoreOverall, extra = {}) => ({ companyId, department: "แผนกวิชาช่างยนต์", scoreOverall, dailyAllowance: null, ...extra });
const search = (companies, reviews, f = {}) => searchCompanies(companies, summarize(reviews), { q: "", page: 1, ...f });
const ids = (r) => r.items.map((c) => c.id);

test("summarize: ค่าเฉลี่ยปัดหนึ่งตำแหน่ง นับจำนวน รวมแผนกไม่ซ้ำ", () => {
  const s = summarize([rv("a", 4), rv("a", 4.25, { department: "แผนกวิชาเทคโนโลยีสารสนเทศ" }), rv("a", 5)]);
  assert.deepEqual(s.get("a"), {
    reviewCount: 3,
    avgScore: 4.4,
    avgAllowance: null,
    departments: ["แผนกวิชาช่างยนต์", "แผนกวิชาเทคโนโลยีสารสนเทศ"],
  });
});

test("summarize: เบี้ยเลี้ยงเฉลี่ยข้ามรีวิวที่ไม่ได้กรอก ไม่นับเป็นศูนย์", () => {
  const s = summarize([rv("a", 4, { dailyAllowance: 200 }), rv("a", 4, { dailyAllowance: 301 }), rv("a", 4)]);
  assert.equal(s.get("a").avgAllowance, 251);
});

test("isListed: ยืนยันแล้ว หรือมีรีวิวที่อนุมัติอย่างน้อยหนึ่ง", () => {
  assert.equal(isListed({ isVerified: true, reviewCount: 0 }), true);
  assert.equal(isListed({ isVerified: false, reviewCount: 1 }), true);
  assert.equal(isListed({ isVerified: false, reviewCount: 0 }), false);
});

test("บริษัทที่มีแต่รีวิวรออนุมัติ ไม่โผล่ทั้งในรายการ ตัวนับ และหมุด", () => {
  // "pending" มีรีวิวแต่ยังไม่อนุมัติ — DAL กรอง APPROVED ไปแล้วจึงไม่มีแถวของมันส่งมา
  const r = search([co("shown"), co("pending"), co("verified", { isVerified: true })], [rv("shown", 4)]);
  assert.deepEqual(ids(r).sort(), ["shown", "verified"]);
  assert.deepEqual(r.pins.map((p) => p.id).sort(), ["shown", "verified"]);
  assert.equal(r.total, 2);
});

test("คำค้นหาจากชื่อ ที่อยู่ ประเภทธุรกิจ ไม่สนตัวพิมพ์ใหญ่เล็ก", () => {
  const cs = [
    co("a", { name: "ABC Motor", isVerified: true }),
    co("b", { address: "ถ.นิพัทธ์อุทิศ หาดใหญ่", isVerified: true }),
    co("c", { industry: "โลจิสติกส์", isVerified: true }),
  ];
  assert.deepEqual(ids(search(cs, [], { q: "abc MOTOR" })), ["a"]);
  assert.deepEqual(ids(search(cs, [], { q: "หาดใหญ่" })), ["b"]);
  assert.deepEqual(ids(search(cs, [], { q: "โลจิ" })), ["c"]);
  assert.equal(search(cs, [], { q: "" }).total, 3);
});

test("กรองแผนกจากรีวิวที่อนุมัติแล้ว", () => {
  const it = { department: "แผนกวิชาเทคโนโลยีสารสนเทศ" };
  const r = search([co("a"), co("b")], [rv("a", 4), rv("b", 4, it)], it);
  assert.deepEqual(ids(r), ["b"]);
});

test("คะแนนขั้นต่ำเทียบกับค่าที่ปัดแล้ว — ตัวเลขที่แสดงกับตัวกรองต้องตรงกัน", () => {
  // edge เฉลี่ย 3.96 แสดงเป็น 4.0 ต้องผ่าน "4 ขึ้นไป" · ไม่มีรีวิว = ไม่ผ่านตัวกรองคะแนน
  const cs = [co("edge"), co("low"), co("none", { isVerified: true })];
  const r = search(cs, [rv("edge", 4), rv("edge", 4), rv("edge", 3.88), rv("low", 3.9)], { minScore: 4 });
  assert.deepEqual(ids(r), ["edge"]);
  assert.equal(r.items[0].avgScore, 4);
});

test("เรียงตามจำนวนรีวิว แล้วคะแนน แล้วชื่อ", () => {
  const cs = [co("x", { name: "ข", isVerified: true }), co("y", { name: "ก", isVerified: true }), co("one"), co("two")];
  const r = search(cs, [rv("one", 5), rv("two", 3), rv("two", 3)]);
  assert.deepEqual(ids(r), ["two", "one", "y", "x"]);
});

test("แบ่งหน้า: หน้าเกินถูกดึงกลับมาหน้าสุดท้าย และหมุดครบทุกผล ไม่ใช่แค่หน้านี้", () => {
  const cs = Array.from({ length: PAGE_SIZE + 3 }, (_, i) => co(`c${i}`, { isVerified: true }));
  const r = search(cs, [], { page: 999 });
  assert.equal(r.page, 2);
  assert.equal(r.pageCount, 2);
  assert.equal(r.items.length, 3);
  assert.equal(r.pins.length, PAGE_SIZE + 3);
});

test("ไม่มีผลลัพธ์ = หน้า 1 จาก 1", () => {
  const r = search([], [], { page: 5 });
  assert.deepEqual({ page: r.page, pageCount: r.pageCount, total: r.total }, { page: 1, pageCount: 1, total: 0 });
});

test("หมุดข้ามบริษัทที่ไม่มีพิกัด แต่การ์ดยังแสดง", () => {
  const r = search([co("a", { isVerified: true }), co("b", { isVerified: true, lat: null, lng: null })], []);
  assert.deepEqual(r.pins.map((p) => p.id), ["a"]);
  assert.equal(r.total, 2);
});

test("reviewAuthor: ไม่ระบุตัวตนซ่อนชื่อเสมอ", () => {
  assert.equal(reviewAuthor({ isAnonymous: true, user: { name: "สมชาย" } }), "ไม่ระบุตัวตน");
  assert.equal(reviewAuthor({ isAnonymous: false, user: { name: "สมชาย" } }), "สมชาย");
  assert.equal(reviewAuthor({ isAnonymous: false, user: { name: null } }), "นักศึกษา");
});

test("safeUrl รับเฉพาะ http/https และเติม https ให้โดเมนเปล่า", () => {
  assert.equal(safeUrl("https://example.com/a"), "https://example.com/a");
  assert.equal(safeUrl("www.example.co.th"), "https://www.example.co.th/");
  assert.equal(safeUrl("javascript:alert(1)"), null);
  assert.equal(safeUrl("JavaScript:alert(1)"), null);
  assert.equal(safeUrl("  javascript:alert(1)"), null);
  assert.equal(safeUrl("data:text/html,x"), null);
  assert.equal(safeUrl(""), null);
  assert.equal(safeUrl(null), null);
});
