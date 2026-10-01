# Phase 2 — ค้นหาสถานประกอบการ + แผนที่ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** นักศึกษาค้นหาสถานประกอบการจากชื่อ แผนกวิชา และคะแนน เห็นผลเป็นการ์ดพร้อมหมุดบนแผนที่ แล้วเปิดหน้ารายละเอียด (พิกัด ช่องทางติดต่อ เบี้ยเลี้ยง และรีวิวที่ผ่านการตรวจแล้ว) โดยตัวเลขทุกตัวนับจากรีวิว `APPROVED` เท่านั้น

**Architecture:** หน้า `/insights` และ `/insights/[id]` เป็น Server Component อ่าน query string ผ่าน zod แล้วเรียก data access layer `lib/companies.ts` ซึ่งเรียก guard เองก่อนแตะฐานข้อมูล และกรอง `status: "APPROVED"` ทุก query ตรรกะที่พังเงียบได้ (รวมคะแนน กฎการแสดงบริษัท ค้นหา แบ่งหน้า ซ่อนชื่อผู้รีวิวนิรนาม ตรวจ URL) อยู่ใน `lib/company-rules.ts` แบบ pure มีเทสต์ แผนที่ Leaflet เป็น client component โหลดด้วย `dynamic(..., { ssr: false })` ใช้ `CircleMarker` (SVG) ไม่ต้องมีไฟล์รูปหมุด

**Tech Stack:** Next 16.3 App Router · Prisma 7 + SQLite · zod 4 · leaflet 1.9 + react-leaflet 5 · ไทล์ OpenStreetMap · `node --test`

**Spec:** แผนเต็ม `C:\Users\user\.claude\plans\htc-insights-synthetic-zephyr.md` หัวข้อ "Phase 2" + `context.md` (หลักการโดเมนข้อ 1–2, สเปกข้อ 3–4)

### ต่างจากแผนเต็ม (ให้ผู้ใช้ทบทวน)

| แผนเต็มเขียนว่า | แผนนี้ทำ | เหตุผล |
|---|---|---|
| `GET /api/companies`, `GET /api/companies/[id]` | ไม่สร้าง Route Handler หน้าเป็น Server Component เรียก `lib/companies.ts` ตรง | ยังไม่มี client ไหนต้อง fetch เอง ตัดหนึ่งชั้น HTTP + JSON ทิ้ง Phase 3 (ช่องเลือกบริษัทในฟอร์มรีวิว) ค่อยเพิ่ม route ที่เรียกฟังก์ชันเดียวกันนี้ |
| `app/api/places-search/route.ts` (proxy SerpApi) | **เลื่อนไป Phase 3** | ผู้ใช้เดียวของมันคือฟอร์มรีวิวตอนปักหมุดบริษัทใหม่ ทำตอนนี้ทดสอบในเบราว์เซอร์ไม่ได้ |
| — | เพิ่ม `prisma/seed.ts` ข้อมูลตัวอย่าง | ยังไม่มีทางสร้างบริษัทหรือรีวิวจนกว่าจะถึง Phase 3 ต้องมีข้อมูลที่ผสมสถานะ `APPROVED/PENDING/REJECTED` ไว้พิสูจน์ว่าตัวกรองถูก |

## Global Constraints

- อ่าน `AGENTS.md`: Next 16 — `params`/`searchParams` เป็น Promise ใช้ `PageProps<'/x'>` แบบ global
- Prisma Client ใช้ผ่าน `db` จาก `@/lib/db` เท่านั้น (ยกเว้น `prisma/seed.ts` ซึ่งรันนอก Next — อธิบายในไฟล์)
- **ทุก query ที่ข้อมูลไปถึงหน้าสาธารณะมี `status: "APPROVED"`** รวม `_count` และ `_avg` — บั๊กที่ v1 พลาดสองรอบ
- **รีวิวไม่ระบุตัวตน ห้ามชื่อผู้เขียนหลุดออกจาก `lib/companies.ts`** ไม่ว่าคนดูเป็นใคร รวมถึง ADMIN
- input จากผู้ใช้ (query string, `params.id`) ผ่าน zod ใน `lib/validation.ts` ก่อนแตะฐานข้อมูล
- ทุกฟังก์ชันใน `lib/companies.ts` เรียก `await requireRole("STUDENT", "ADMIN")` เป็นบรรทัดแรก — layout ไม่ re-render ตอนเปลี่ยนหน้า (`node_modules/next/dist/docs/01-app/02-guides/authentication.md` หัวข้อ "Layouts and auth checks")
- Leaflet import ผ่าน `dynamic(..., { ssr: false })` ใน client component เท่านั้น
- UI ภาษาไทย ไม่ใช้ emoji ไอคอน Material Symbols primary หนึ่งปุ่มต่อหน้าจอ ทดสอบที่ 375px
- วันที่แสดงด้วย `timeZone: "Asia/Bangkok"` locale `th-TH`
- เทสต์รันด้วย `node --test` (ไม่ใส่ `tests/`) ไฟล์ที่เทสต์ import (`lib/departments.ts`, `lib/company-rules.ts`) ต้อง pure — ห้าม import ค่าจริง (`import type` ได้) ห้ามใช้ alias `@/`
- **ห้าม commit เอง** — CLAUDE.md ให้ commit เมื่อผู้ใช้สั่งเท่านั้น
- dev server: `preview_start` ชื่อ `next-dev` (`.claude/launch.json`) ที่ `localhost:3000`

## Review Focus

1. **บริษัทที่มีแต่รีวิว `PENDING`/`REJECTED` รั่วออกไป** ผ่านรายการ หมุด หรือพิมพ์ URL `/insights/<id>` ตรง → `isListed` มีเทสต์ใน Task 2, curl `seed_c3` ต้อง 404 ใน Task 5
2. **query string ขยะ** (`?page=abc&minScore=9&department=xyz`, ค่าซ้ำเป็นอาร์เรย์) ต้องได้หน้าปกติที่ไม่กรอง ไม่ใช่ 500 — ลิงก์ที่ส่งต่อกันในไลน์พังไม่ได้ → `.catch()` ใน zod, curl ใน Task 4
3. **ตัวเลขที่แสดงกับตัวกรองไม่ตรงกัน** — 3.96 แสดง "4.0" แต่หลุดจากตัวกรอง "4 ขึ้นไป" → กรองด้วยค่าที่ปัดแล้ว เทสต์ใน Task 2
4. **แผนที่ทับแถบนำทาง** — pane ของ Leaflet z-index 400–1000 แต่ TopNav/BottomNav เป็น z-40 พอเลื่อนจอ 375px แผนที่ลอยทับแถบล่าง (v1 เคย "แถบล่างหาย") → `isolate` ที่กล่องแผนที่ ตรวจด้วย `elementFromPoint` ใน Task 6
5. **เว็บไซต์บริษัทเป็น `javascript:`** (ข้อมูลจะมาจาก SerpApi และผู้ประกอบการกรอกเองใน Phase 3/5) → `safeUrl` มีเทสต์ใน Task 2, seed ใส่ `seed_c2` ไว้ตรวจว่าไม่มีลิงก์ใน Task 5

---

## File Structure

```
lib/departments.ts            18 แผนกจาก v1 + departmentLabel (pure)                         ใหม่
lib/validation.ts             companySearchSchema, companyIdSchema (zod)                       ใหม่
lib/company-rules.ts          summarize, isListed, searchCompanies, reviewAuthor, safeUrl (pure) ใหม่
lib/companies.ts              listCompanies, getCompany — DAL มี guard + กรอง APPROVED          ใหม่
prisma/seed.ts                ข้อมูลตัวอย่าง 6 บริษัท 8 รีวิวผสมสถานะ (dev เท่านั้น)              ใหม่
prisma.config.ts              migrations.seed                                                  แก้
components/CompanyMap.tsx     client wrapper: dynamic ssr:false + กล่อง isolate                 ใหม่
components/CompanyMapInner.tsx  MapContainer + CircleMarker + Popup                            ใหม่
app/globals.css               .kn-map-pin                                                      แก้
app/insights/page.tsx         ฟอร์มกรอง (GET) + แผนที่ + การ์ด + แบ่งหน้า                         เขียนใหม่
app/insights/[id]/page.tsx    รายละเอียด คะแนนรายด้าน ติดต่อ แผนที่ รีวิว                         เขียนใหม่
tests/departments.test.mjs, tests/company-rules.test.mjs                                       ใหม่
tests/route-guards.test.mjs   เพิ่มเทสต์ guard ใน DAL                                           แก้
CLAUDE.md, context.md         คำสั่ง seed + สถานะ Phase 2                                       แก้
```

---

### Task 1: แผนกวิชาและ schema ของ query string

**Files:**
- Create: `lib/departments.ts`, `lib/validation.ts`
- Test: `tests/departments.test.mjs`

**Interfaces:**
- Produces:
  - `DEPARTMENTS: readonly { value: string; label: string }[]` — `value` คือค่าที่เก็บในฐานข้อมูล (ชื่อเต็ม "แผนกวิชา…") `label` คือชื่อสั้นไว้แสดง
  - `DEPARTMENT_VALUES: [string, ...string[]]`
  - `departmentLabel(value: string): string` — ไม่รู้จักคืนค่าเดิม
  - `companySearchSchema` → `{ q: string; department?: string; minScore?: number; page: number }`
  - `companyIdSchema` → `string`

- [ ] **Step 1: เขียนเทสต์ที่ล้มเหลว `tests/departments.test.mjs`**

```js
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
```

- [ ] **Step 2: รันให้เห็นว่าล้ม**

Run: `node --test`
Expected: FAIL ที่ `tests/departments.test.mjs` — `Cannot find module ... lib/departments.ts`

- [ ] **Step 3: สร้าง `lib/departments.ts`**

ค่า `value` คัดจาก `git -C ../htc show v1-archive:frontend/components/DepartmentDropdown.tsx` ตรงตัวอักษร

```ts
// ไฟล์นี้ต้อง pure — tests/departments.test.mjs import ตรงด้วย Node
// 18 แผนกจาก v1 สเปกบอก 20 — รออีก 2 แผนกจากผู้ใช้ แล้วเติมที่นี่จุดเดียว (context.md เรื่องที่ยังไม่ได้ข้อสรุป)
// value เก็บลงฐานข้อมูล ห้ามแก้ value ของแผนกที่มีข้อมูลแล้ว แก้ได้แค่ label

export const DEPARTMENTS = [
  { value: "แผนกวิชาช่างยนต์", label: "ช่างยนต์" },
  { value: "แผนกวิชาช่างกลโรงงาน", label: "ช่างกลโรงงาน" },
  { value: "แผนกวิชาช่างเชื่อมโลหะ", label: "ช่างเชื่อมโลหะ" },
  { value: "แผนกวิชาช่างไฟฟ้ากำลัง", label: "ช่างไฟฟ้ากำลัง" },
  { value: "แผนกวิชาช่างอิเล็กทรอนิกส์", label: "ช่างอิเล็กทรอนิกส์" },
  { value: "แผนกวิชาช่างก่อสร้าง", label: "ช่างก่อสร้าง" },
  { value: "แผนกวิชาช่างโยธา", label: "ช่างโยธา" },
  { value: "แผนกวิชาเทคนิคสถาปัตยกรรม", label: "เทคนิคสถาปัตยกรรม" },
  { value: "แผนกวิชาช่างสำรวจ", label: "ช่างสำรวจ" },
  { value: "แผนกวิชาเครื่องทำความเย็นและปรับอากาศ", label: "เครื่องทำความเย็นและปรับอากาศ" },
  { value: "แผนกวิชาช่างเครื่องเรือนและตกแต่งภายใน", label: "ช่างเครื่องเรือนและตกแต่งภายใน" },
  { value: "แผนกวิชาเมคคาทรอนิกส์และหุ่นยนต์", label: "เมคคาทรอนิกส์และหุ่นยนต์" },
  { value: "แผนกวิชาเทคนิคพลังงาน", label: "เทคนิคพลังงาน" },
  { value: "แผนกวิชาเทคนิคควบคุมและซ่อมบำรุงระบบขนส่งทางราง", label: "ซ่อมบำรุงระบบขนส่งทางราง" },
  { value: "แผนกวิชาเทคโนโลยีเครื่องมือวัดและควบคุมปิโตรเลียม", label: "เทคโนโลยีปิโตรเลียม" },
  { value: "แผนกวิชาเทคโนโลยีสารสนเทศ", label: "เทคโนโลยีสารสนเทศ" },
  { value: "แผนกวิชาการจัดการโลจิสติกส์และซัพลายเชน", label: "การจัดการโลจิสติกส์" },
  { value: "แผนกวิชาธุรกิจการบิน", label: "ธุรกิจการบิน" },
] as const satisfies readonly { value: string; label: string }[];

export const DEPARTMENT_VALUES = DEPARTMENTS.map((d) => d.value) as [string, ...string[]];

export function departmentLabel(value: string): string {
  return DEPARTMENTS.find((d) => d.value === value)?.label ?? value;
}
```

- [ ] **Step 4: สร้าง `lib/validation.ts`**

```ts
import { z } from "zod";
import { DEPARTMENT_VALUES } from "./departments";

// schema ของทุก input จากผู้ใช้ — ผ่านที่นี่ก่อนแตะฐานข้อมูล (CLAUDE.md)

/**
 * query string ของ /insights — ค่าผิดรูปแบบถูกเพิกเฉยด้วย catch ไม่ใช่ 500
 * ลิงก์ที่นักศึกษาส่งต่อกันต้องเปิดได้เสมอ แม้มีคนแก้ URL เล่น
 */
export const companySearchSchema = z.object({
  q: z.string().trim().transform((s) => s.slice(0, 100)).catch(""),
  department: z.enum(DEPARTMENT_VALUES).optional().catch(undefined),
  minScore: z.coerce.number().int().min(1).max(5).optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
});

/** id ใน URL — ไม่บังคับรูปแบบ cuid เพราะ seed ใช้ id อ่านง่าย (seed_c1) */
export const companyIdSchema = z.string().min(1).max(64);
```

- [ ] **Step 5: รันเทสต์และตรวจ type**

Run: `node --test` → Expected: PASS ทุกไฟล์
Run: `npx tsc --noEmit` → Expected: ไม่มี error

- [ ] **Step 6: Checkpoint** — ห้าม commit

---

### Task 2: กฎการค้นหาและแสดงผล (`lib/company-rules.ts`)

**Files:**
- Create: `lib/company-rules.ts`
- Test: `tests/company-rules.test.mjs`

**Interfaces:**
- Consumes: ไม่มี (pure)
- Produces:
  - types `ApprovedReviewRow`, `CompanyRow`, `CompanyStats`, `CompanyCardData`, `MapPin`, `SearchFilters`, `SearchResult` (ดูโค้ด Step 3)
  - `PAGE_SIZE = 12`
  - `round1(n: number): number`
  - `summarize(rows: ApprovedReviewRow[]): Map<string, CompanyStats>`
  - `isListed(c: { isVerified: boolean; reviewCount: number }): boolean`
  - `searchCompanies(companies: CompanyRow[], stats: Map<string, CompanyStats>, f: SearchFilters): SearchResult`
  - `reviewAuthor(r: { isAnonymous: boolean; user: { name: string | null } }): string`
  - `safeUrl(raw: string | null): string | null`

- [ ] **Step 1: เขียนเทสต์ที่ล้มเหลว `tests/company-rules.test.mjs`**

```js
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
```

- [ ] **Step 2: รันให้เห็นว่าล้ม**

Run: `node --test`
Expected: FAIL ที่ `tests/company-rules.test.mjs` — `Cannot find module ... lib/company-rules.ts`

- [ ] **Step 3: สร้าง `lib/company-rules.ts`**

```ts
// ไฟล์นี้ต้อง pure — tests/company-rules.test.mjs import ตรงด้วย Node ห้าม import ค่าจริงเพิ่ม (import type ได้)

/** รีวิวที่อนุมัติแล้วเท่านั้น — lib/companies.ts กรอง status: "APPROVED" ที่ query ก่อนส่งมา */
export type ApprovedReviewRow = { companyId: string; department: string; scoreOverall: number; dailyAllowance: number | null };
export type CompanyRow = {
  id: string;
  name: string;
  address: string | null;
  industry: string | null;
  lat: number | null;
  lng: number | null;
  isVerified: boolean;
};
export type CompanyStats = { reviewCount: number; avgScore: number | null; avgAllowance: number | null; departments: string[] };
export type CompanyCardData = CompanyRow & CompanyStats;
export type MapPin = { id: string; name: string; lat: number; lng: number; avgScore: number | null };
export type SearchFilters = { q: string; department?: string; minScore?: number; page: number };
export type SearchResult = { items: CompanyCardData[]; pins: MapPin[]; total: number; page: number; pageCount: number };

export const PAGE_SIZE = 12;

const NO_REVIEWS: CompanyStats = { reviewCount: 0, avgScore: null, avgAllowance: null, departments: [] };

/** ปัดทศนิยมหนึ่งตำแหน่ง — ตัวเลขที่แสดงกับที่ใช้กรองต้องเป็นค่าเดียวกัน */
export const round1 = (n: number) => Math.round(n * 10) / 10;

export function summarize(rows: ApprovedReviewRow[]): Map<string, CompanyStats> {
  const acc = new Map<string, { n: number; score: number; allowN: number; allow: number; depts: Set<string> }>();
  for (const r of rows) {
    const a = acc.get(r.companyId) ?? { n: 0, score: 0, allowN: 0, allow: 0, depts: new Set<string>() };
    a.n++;
    a.score += r.scoreOverall;
    a.depts.add(r.department);
    if (r.dailyAllowance !== null) {
      a.allowN++;
      a.allow += r.dailyAllowance;
    }
    acc.set(r.companyId, a);
  }
  return new Map(
    [...acc].map(([id, a]) => [
      id,
      {
        reviewCount: a.n,
        avgScore: round1(a.score / a.n),
        avgAllowance: a.allowN ? Math.round(a.allow / a.allowN) : null,
        departments: [...a.depts].sort((x, y) => x.localeCompare(y, "th")),
      },
    ]),
  );
}

/**
 * สาธารณะเห็นบริษัทเมื่อผู้ดูแลยืนยันแล้ว หรือมีรีวิวที่อนุมัติอย่างน้อยหนึ่ง
 * บริษัทที่มีแต่รีวิวรออนุมัติต้องไม่โผล่ ไม่งั้นแค่ชื่อก็บอกแล้วว่ามีคนกำลังรีวิว (หลักการโดเมนข้อ 1)
 */
export function isListed(c: { isVerified: boolean; reviewCount: number }): boolean {
  return c.isVerified || c.reviewCount > 0;
}

export function searchCompanies(companies: CompanyRow[], stats: Map<string, CompanyStats>, f: SearchFilters): SearchResult {
  const q = f.q.trim().toLowerCase();
  const matched = companies
    .map((c): CompanyCardData => ({ ...c, ...(stats.get(c.id) ?? NO_REVIEWS) }))
    .filter(isListed)
    .filter((c) => !q || [c.name, c.address, c.industry].some((s) => s?.toLowerCase().includes(q)))
    .filter((c) => !f.department || c.departments.includes(f.department))
    .filter((c) => f.minScore === undefined || (c.avgScore !== null && c.avgScore >= f.minScore))
    .sort(
      (a, b) =>
        b.reviewCount - a.reviewCount || (b.avgScore ?? 0) - (a.avgScore ?? 0) || a.name.localeCompare(b.name, "th"),
    );
  const pageCount = Math.max(1, Math.ceil(matched.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, f.page), pageCount);
  return {
    items: matched.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    // หมุดครบทุกผลที่ตรงตัวกรอง — แผนที่ไม่ได้แบ่งหน้าตามการ์ด
    pins: matched.flatMap((c) =>
      c.lat !== null && c.lng !== null ? [{ id: c.id, name: c.name, lat: c.lat, lng: c.lng, avgScore: c.avgScore }] : [],
    ),
    total: matched.length,
    page,
    pageCount,
  };
}

/** ชื่อผู้เขียนที่แสดงได้ — ไม่ระบุตัวตนซ่อนจากทุกคนรวมถึงผู้ดูแล (หลักการโดเมนข้อ 2) */
export function reviewAuthor(r: { isAnonymous: boolean; user: { name: string | null } }): string {
  if (r.isAnonymous) return "ไม่ระบุตัวตน";
  return r.user.name ?? "นักศึกษา";
}

/** URL ที่ใส่ใน href ได้ปลอดภัย — เว็บไซต์บริษัทมาจาก SerpApi และผู้ประกอบการกรอกเอง กัน javascript: */
export function safeUrl(raw: string | null): string | null {
  const s = raw?.trim();
  if (!s) return null;
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`);
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: รันเทสต์**

Run: `node --test`
Expected: PASS ทุกเทสต์ (เดิม + `departments` + `company-rules`)

- [ ] **Step 5: Checkpoint** — ห้าม commit

---

### Task 3: Data access layer + ข้อมูลตัวอย่าง

**Files:**
- Create: `lib/companies.ts`, `prisma/seed.ts`
- Modify: `prisma.config.ts`, `tests/route-guards.test.mjs`

**Interfaces:**
- Consumes: `requireRole` จาก `./auth` · `db` จาก `./db` · `summarize`, `searchCompanies`, `isListed`, `reviewAuthor`, `round1`, `SearchFilters`, `SearchResult` จาก `./company-rules`
- Produces:
  - `listCompanies(filters: SearchFilters): Promise<SearchResult>`
  - `getCompany(id: string): Promise<CompanyDetail | null>` — `null` เมื่อไม่มีหรือไม่ผ่าน `isListed`
    ```ts
    type CompanyDetail = {
      company: CompanyRow & { phone: string | null; website: string | null; description: string | null };
      stats: {
        reviewCount: number; avgScore: number | null; avgAllowance: number | null;
        dims: { scoreWork: number | null; scoreEnv: number | null; scoreMentor: number | null; scoreWelfare: number | null };
      };
      reviews: Array<{ id: string; department: string; periodStart: Date; periodEnd: Date; dailyAllowance: number | null;
        hasAccommodation: boolean; hasTransport: boolean; workStartTime: string | null; workEndTime: string | null;
        scoreOverall: number; textWork: string; textPros: string | null; textCons: string | null; textAdvice: string | null;
        isAnonymous: boolean; author: string }>;
    };
    ```
  - ข้อมูล seed (id คงที่): บริษัท `seed_c1`–`seed_c6`, ผู้ใช้ `seed_u1`–`seed_u4` (STUDENT ชื่อ "ผู้ทดสอบ N")

- [ ] **Step 1: เพิ่มเทสต์ที่ล้มเหลวใน `tests/route-guards.test.mjs`** (ต่อท้ายไฟล์)

```js
test("ทุกฟังก์ชันใน data access layer เรียก guard เอง — layout ไม่ re-render ตอนเปลี่ยนหน้า", () => {
  const src = existsSync("lib/companies.ts") ? readFileSync("lib/companies.ts", "utf8") : "";
  const fns = src.match(/^export async function/gm)?.length ?? 0;
  const guards = src.match(/await requireRole\("STUDENT", "ADMIN"\)/g)?.length ?? 0;
  assert.ok(fns > 0, "ไม่พบฟังก์ชันใน lib/companies.ts");
  assert.equal(guards, fns);
});
```

Run: `node --test` → Expected: FAIL "ไม่พบฟังก์ชันใน lib/companies.ts"

- [ ] **Step 2: สร้าง `lib/companies.ts`**

```ts
import { requireRole } from "./auth";
import {
  isListed,
  reviewAuthor,
  round1,
  searchCompanies,
  summarize,
  type SearchFilters,
  type SearchResult,
} from "./company-rules";
import { db } from "./db";

// ทุกฟังก์ชันเริ่มด้วย guard เอง — Next 16 ให้ตรวจสิทธิ์ใกล้ข้อมูล เพราะ layout ไม่ re-render ตอนเปลี่ยนหน้า
// (node_modules/next/dist/docs/01-app/02-guides/authentication.md "Layouts and auth checks")
// ทุก query ที่นี่กรอง APPROVED รวมถึง aggregate — หลักการโดเมนข้อ 1

const APPROVED = { status: "APPROVED" } as const;
const COMPANY_ROW = { id: true, name: true, address: true, industry: true, lat: true, lng: true, isVerified: true } as const;

export async function listCompanies(filters: SearchFilters): Promise<SearchResult> {
  await requireRole("STUDENT", "ADMIN");
  // ponytail: ดึงบริษัทและรีวิวที่อนุมัติทั้งหมดมารวมในหน่วยความจำ — วิทยาลัยเดียวหลักร้อยบริษัทหลักพันรีวิว
  // ย้ายไป groupBy + where ใน SQL เมื่อรีวิวเกินหลักหมื่น
  const [companies, reviews] = await Promise.all([
    db.company.findMany({ select: COMPANY_ROW }),
    db.review.findMany({
      where: APPROVED,
      select: { companyId: true, department: true, scoreOverall: true, dailyAllowance: true },
    }),
  ]);
  return searchCompanies(companies, summarize(reviews), filters);
}

export async function getCompany(id: string) {
  await requireRole("STUDENT", "ADMIN");
  const where = { companyId: id, ...APPROVED };
  const [company, agg, reviews] = await Promise.all([
    db.company.findUnique({
      where: { id },
      select: { ...COMPANY_ROW, phone: true, website: true, description: true },
    }),
    db.review.aggregate({
      where,
      _count: true,
      _avg: {
        scoreOverall: true,
        scoreWork: true,
        scoreEnv: true,
        scoreMentor: true,
        scoreWelfare: true,
        dailyAllowance: true,
      },
    }),
    db.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      // ห้าม select anonIdentityEnc หรือ userId — ชื่อผู้เขียนออกจากฟังก์ชันนี้ผ่าน reviewAuthor เท่านั้น
      select: {
        id: true,
        department: true,
        periodStart: true,
        periodEnd: true,
        dailyAllowance: true,
        hasAccommodation: true,
        hasTransport: true,
        workStartTime: true,
        workEndTime: true,
        scoreOverall: true,
        textWork: true,
        textPros: true,
        textCons: true,
        textAdvice: true,
        isAnonymous: true,
        user: { select: { name: true } },
      },
    }),
  ]);
  if (!company || !isListed({ isVerified: company.isVerified, reviewCount: agg._count })) return null;

  const avg = agg._avg;
  const r1 = (n: number | null) => (n === null ? null : round1(n));
  return {
    company,
    stats: {
      reviewCount: agg._count,
      avgScore: r1(avg.scoreOverall),
      avgAllowance: avg.dailyAllowance === null ? null : Math.round(avg.dailyAllowance),
      dims: {
        scoreWork: r1(avg.scoreWork),
        scoreEnv: r1(avg.scoreEnv),
        scoreMentor: r1(avg.scoreMentor),
        scoreWelfare: r1(avg.scoreWelfare),
      },
    },
    reviews: reviews.map(({ user, ...r }) => ({ ...r, author: reviewAuthor({ isAnonymous: r.isAnonymous, user }) })),
  };
}

export type CompanyDetail = NonNullable<Awaited<ReturnType<typeof getCompany>>>;
```

- [ ] **Step 3: รันเทสต์ guard**

Run: `node --test` → Expected: PASS
Run: `npx tsc --noEmit` → Expected: ไม่มี error

- [ ] **Step 4: สร้าง `prisma/seed.ts`**

ตารางผลที่คาด (ใช้ตรวจใน Task 4–5):

| บริษัท | ยืนยัน | รีวิว | ต้องเห็นในหน้าสาธารณะ |
|---|---|---|---|
| `seed_c1` | ใช่ | r1, r2 APPROVED · r3 REJECTED · r4 PENDING | 2 รีวิว เฉลี่ย 4.1 เบี้ยเลี้ยง 300 |
| `seed_c2` | ไม่ | r5 APPROVED ไม่ระบุตัวตน · เว็บไซต์ `javascript:` | 1 รีวิว 4.3 ไม่มีลิงก์เว็บไซต์ ไม่มีชื่อ "ผู้ทดสอบ 1" |
| `seed_c3` | ไม่ | r6 PENDING เท่านั้น | **ไม่เห็นเลย** หน้ารายละเอียด 404 |
| `seed_c4` | ใช่ | ไม่มี | "ยังไม่มีรีวิว" |
| `seed_c5` | ไม่ | r7 APPROVED · ไม่มีพิกัด | การ์ดมี หมุดไม่มี |
| `seed_c6` | ไม่ | r8 APPROVED | 1 รีวิว 2.0 |

```ts
// ข้อมูลตัวอย่างสำหรับเครื่อง dev — `npx prisma db seed` (ตั้งไว้ใน prisma.config.ts)
// รันซ้ำได้: upsert ด้วย id คงที่ขึ้นต้น seed_ · ชื่อบริษัทเป็นชื่อสมมติทั้งหมด
// สร้าง PrismaClient เองเพราะ jiti (ตัวรัน .ts ที่มากับ prisma) ไม่รู้จัก alias @/ ที่ lib/db.ts ใช้
// โค้ดแอปยังใช้ db จาก lib/db.ts เท่านั้น
import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient, type ContentStatus } from "../app/generated/prisma/client";

if (process.env.NODE_ENV === "production") throw new Error("ห้าม seed ข้อมูลตัวอย่างบนเซิร์ฟเวอร์จริง");

const db = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! }) });

const USERS = [1, 2, 3, 4].map((n) => ({
  id: `seed_u${n}`,
  email: `seed-${n}@example.invalid`,
  name: `ผู้ทดสอบ ${n}`,
  role: "STUDENT" as const,
}));

const COMPANIES = [
  { id: "seed_c1", name: "บริษัท หาดใหญ่ออโต้เซอร์วิส จำกัด", industry: "ซ่อมบำรุงรถยนต์", address: "ถ.เพชรเกษม อ.หาดใหญ่ จ.สงขลา", lat: 7.0067, lng: 100.471, phone: "074-000-001", website: "https://example.com", isVerified: true },
  { id: "seed_c2", name: "บริษัท สงขลาไอทีโซลูชั่น จำกัด", industry: "เทคโนโลยีสารสนเทศ", address: "ถ.นิพัทธ์อุทิศ 3 อ.หาดใหญ่", lat: 7.0089, lng: 100.4745, phone: null, website: "javascript:alert(1)", isVerified: false },
  { id: "seed_c3", name: "ห้างหุ้นส่วนจำกัด ควนลังการไฟฟ้า", industry: "ติดตั้งระบบไฟฟ้า", address: "ต.ควนลัง อ.หาดใหญ่", lat: 6.9853, lng: 100.4489, phone: null, website: null, isVerified: false },
  { id: "seed_c4", name: "บริษัท ทักษิณโลจิสติกส์ จำกัด", industry: "โลจิสติกส์", address: "ถ.กาญจนวนิช อ.หาดใหญ่", lat: 7.0301, lng: 100.4812, phone: "074-000-004", website: "www.example.org", isVerified: true },
  { id: "seed_c5", name: "บริษัท หาดใหญ่ซีเอ็นซี จำกัด", industry: "งานกลึงและซีเอ็นซี", address: null, lat: null, lng: null, phone: null, website: null, isVerified: false },
  { id: "seed_c6", name: "บริษัท คอหงส์อิเล็กทรอนิกส์ จำกัด", industry: "ซ่อมอุปกรณ์อิเล็กทรอนิกส์", address: "ต.คอหงส์ อ.หาดใหญ่", lat: 7.0176, lng: 100.5021, phone: null, website: null, isVerified: false },
];

type SeedReview = {
  id: string;
  companyId: string;
  userId: string;
  department: string;
  status: ContentStatus;
  scores: [work: number, env: number, mentor: number, welfare: number];
  allowance: number | null;
  text: string;
  isAnonymous?: boolean;
};

const REVIEWS: SeedReview[] = [
  { id: "seed_r1", companyId: "seed_c1", userId: "seed_u1", department: "แผนกวิชาช่างยนต์", status: "APPROVED", scores: [4, 4, 5, 3], allowance: 250, text: "ได้ซ่อมเครื่องยนต์จริง พี่เลี้ยงสอนละเอียด" },
  { id: "seed_r2", companyId: "seed_c1", userId: "seed_u2", department: "แผนกวิชาช่างยนต์", status: "APPROVED", scores: [5, 4, 4, 4], allowance: 350, text: "งานตรงสาขา มีรถรับส่ง" },
  { id: "seed_r3", companyId: "seed_c1", userId: "seed_u3", department: "แผนกวิชาช่างยนต์", status: "REJECTED", scores: [1, 1, 1, 1], allowance: 1000, text: "ข้อความรีวิวที่ถูกปฏิเสธ" },
  { id: "seed_r4", companyId: "seed_c1", userId: "seed_u4", department: "แผนกวิชาช่างยนต์", status: "PENDING", scores: [5, 5, 5, 5], allowance: 500, text: "ข้อความรีวิวที่รออนุมัติ" },
  { id: "seed_r5", companyId: "seed_c2", userId: "seed_u1", department: "แผนกวิชาเทคโนโลยีสารสนเทศ", status: "APPROVED", scores: [5, 5, 4, 3], allowance: 300, text: "ได้เขียนเว็บให้ลูกค้าจริง", isAnonymous: true },
  { id: "seed_r6", companyId: "seed_c3", userId: "seed_u2", department: "แผนกวิชาช่างไฟฟ้ากำลัง", status: "PENDING", scores: [4, 4, 4, 4], allowance: 300, text: "ข้อความรีวิวที่รออนุมัติ" },
  { id: "seed_r7", companyId: "seed_c5", userId: "seed_u2", department: "แผนกวิชาช่างกลโรงงาน", status: "APPROVED", scores: [3, 4, 3, 2], allowance: null, text: "ได้ใช้เครื่องกลึงซีเอ็นซี" },
  { id: "seed_r8", companyId: "seed_c6", userId: "seed_u4", department: "แผนกวิชาช่างอิเล็กทรอนิกส์", status: "APPROVED", scores: [2, 2, 3, 1], allowance: 150, text: "งานซ้ำ ๆ ไม่ค่อยได้เรียนรู้" },
];

async function main() {
  for (const u of USERS) await db.user.upsert({ where: { id: u.id }, create: u, update: u });
  for (const c of COMPANIES) await db.company.upsert({ where: { id: c.id }, create: c, update: c });
  for (const { scores, allowance, text, ...r } of REVIEWS) {
    const [scoreWork, scoreEnv, scoreMentor, scoreWelfare] = scores;
    const data = {
      ...r,
      isAnonymous: r.isAnonymous ?? false,
      gender: "PREFER_NOT" as const,
      periodStart: new Date("2026-05-01T00:00:00+07:00"),
      periodEnd: new Date("2026-09-30T00:00:00+07:00"),
      workStartTime: "08:30",
      workEndTime: "17:00",
      scoreWork,
      scoreEnv,
      scoreMentor,
      scoreWelfare,
      scoreOverall: (scoreWork + scoreEnv + scoreMentor + scoreWelfare) / 4,
      dailyAllowance: allowance,
      textWork: text,
    };
    await db.review.upsert({ where: { id: r.id }, create: data, update: data });
  }
  const byStatus = await db.review.groupBy({ by: ["status"], where: { id: { startsWith: "seed_" } }, _count: { _all: true } });
  console.log(`seed: ${COMPANIES.length} บริษัท`, byStatus.map((s) => `${s.status}=${s._count._all}`).join(" "));
}

main().finally(() => db.$disconnect());
```

- [ ] **Step 5: ตั้งคำสั่ง seed ใน `prisma.config.ts`**

```ts
  migrations: {
    path: "prisma/migrations",
    // jiti มากับ prisma อยู่แล้ว (โหลดไฟล์นี้เองก็ใช้มัน) — ไม่ต้องลง tsx เพิ่ม
    seed: "npx jiti prisma/seed.ts",
  },
```

- [ ] **Step 6: รัน seed สองรอบ — ต้องได้ผลเท่าเดิม (รันซ้ำได้)**

Run: `npx prisma db seed` (สองครั้ง)
Expected ทั้งสองครั้ง: บรรทัด `seed: 6 บริษัท APPROVED=5 PENDING=2 REJECTED=1` (ลำดับสถานะอาจต่าง)

- [ ] **Step 7: Checkpoint** — ห้าม commit

---

### Task 4: หน้ารายการ `/insights` — ฟอร์มกรอง การ์ด แบ่งหน้า

**Files:**
- Modify (เขียนใหม่): `app/insights/page.tsx`

**Interfaces:**
- Consumes: `listCompanies` จาก `@/lib/companies` · `companySearchSchema` จาก `@/lib/validation` · `DEPARTMENTS`, `departmentLabel` จาก `@/lib/departments` · type `CompanyCardData`, `SearchFilters` จาก `@/lib/company-rules` · `PageShell`, `EmptyState`, `Icon`, `Card`, `Badge`, `Button`, `buttonClass`, `TextField`
- Produces: ช่องว่างสำหรับแผนที่ใน Task 6 (คอมเมนต์ `{/* แผนที่: Task 6 */}`)

- [ ] **Step 1: เขียน `app/insights/page.tsx`**

ฟอร์มเป็น `<form>` GET ธรรมดา ไม่มี JS — กดค้นหาแล้ว query string เปลี่ยน หน้า render ใหม่บนเซิร์ฟเวอร์ (และไม่ส่ง `page` ไปด้วย จึงกลับหน้า 1 เอง)

```tsx
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { PageShell } from "@/components/PageShell";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/TextField";
import { listCompanies } from "@/lib/companies";
import type { CompanyCardData, SearchFilters } from "@/lib/company-rules";
import { DEPARTMENTS, departmentLabel } from "@/lib/departments";
import { companySearchSchema } from "@/lib/validation";

export default async function InsightsPage({ searchParams }: PageProps<"/insights">) {
  const filters = companySearchSchema.parse(await searchParams);
  const { items, total, page, pageCount } = await listCompanies(filters);
  const filtered = Boolean(filters.q || filters.department || filters.minScore);

  return (
    <PageShell
      title="สถานประกอบการ"
      lede="ค้นหาที่ฝึกงานบนแผนที่ กรองตามแผนกวิชาและคะแนน ทุกคะแนนมาจากรีวิวที่ผ่านการตรวจแล้ว"
      actions={
        <Link href="/insights/write-review" className={buttonClass("primary")}>
          เขียนรีวิว
        </Link>
      }
    >
      <form role="search" className="grid gap-4 md:grid-cols-[2fr_1fr_1fr_auto] md:items-end">
        <TextField name="q" label="ค้นหา" placeholder="ชื่อ ที่อยู่ หรือประเภทธุรกิจ" defaultValue={filters.q} />
        <div className="kn-field">
          <label className="kn-field-label" htmlFor="department">
            แผนกวิชา
          </label>
          <select id="department" name="department" className="kn-input" defaultValue={filters.department ?? ""}>
            <option value="">ทุกแผนก</option>
            {DEPARTMENTS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div className="kn-field">
          <label className="kn-field-label" htmlFor="minScore">
            คะแนน
          </label>
          <select id="minScore" name="minScore" className="kn-input" defaultValue={filters.minScore ?? ""}>
            <option value="">ทุกคะแนน</option>
            {[4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} ขึ้นไป
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" icon={<Icon name="search" />}>
          ค้นหา
        </Button>
      </form>

      <p className="text-small text-ink-muted" aria-live="polite">
        พบ {total} แห่ง
        {filtered && (
          <>
            {" · "}
            <Link href="/insights" className="kn-link">
              ล้างตัวกรอง
            </Link>
          </>
        )}
      </p>

      {/* แผนที่: Task 6 */}

      {items.length === 0 ? (
        <EmptyState icon="search_off" title={filtered ? "ไม่พบสถานประกอบการ" : "ยังไม่มีสถานประกอบการ"}>
          {filtered ? "ลองเปลี่ยนคำค้นหรือล้างตัวกรอง" : "สถานประกอบการจะแสดงเมื่อมีรีวิวที่ผ่านการตรวจแล้ว"}
        </EmptyState>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <CompanyCard key={c.id} c={c} />
          ))}
        </div>
      )}

      {pageCount > 1 && (
        <nav aria-label="เปลี่ยนหน้า" className="flex items-center justify-between gap-4">
          {page > 1 ? (
            <Link href={pageHref(filters, page - 1)} className={buttonClass("secondary", "sm")}>
              ก่อนหน้า
            </Link>
          ) : (
            <span />
          )}
          <span className="text-small text-ink-muted">
            หน้า {page} จาก {pageCount}
          </span>
          {page < pageCount ? (
            <Link href={pageHref(filters, page + 1)} className={buttonClass("secondary", "sm")}>
              ถัดไป
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </PageShell>
  );
}

function CompanyCard({ c }: { c: CompanyCardData }) {
  return (
    <Card
      eyebrow={c.industry ?? "สถานประกอบการ"}
      metric={c.avgScore !== null ? c.avgScore.toFixed(1) : "–"}
      title={
        <Link href={`/insights/${c.id}`} className="kn-link">
          {c.name}
        </Link>
      }
      footer={c.isVerified ? <Badge tone="success">ยืนยันแล้ว</Badge> : undefined}
    >
      {/* สตริงเดียว — text node ที่ติดกันใน JSX ได้ <!-- --> คั่นใน HTML */}
      <p>
        {[
          c.reviewCount > 0 ? `${c.reviewCount} รีวิว` : "ยังไม่มีรีวิว",
          c.avgAllowance !== null && `เบี้ยเลี้ยงเฉลี่ย ${c.avgAllowance.toLocaleString("th-TH")} บาท/วัน`,
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
      {c.address && <p className="text-ink-muted">{c.address}</p>}
      {c.departments.length > 0 && (
        <p className="text-small text-ink-muted">{c.departments.map(departmentLabel).join(" · ")}</p>
      )}
    </Card>
  );
}

function pageHref(f: SearchFilters, page: number): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.department) p.set("department", f.department);
  if (f.minScore) p.set("minScore", String(f.minScore));
  if (page > 1) p.set("page", String(page));
  const s = p.toString();
  return s ? `/insights?${s}` : "/insights";
}
```

- [ ] **Step 2: เปิด dev server และสร้าง session ทดสอบ**

`preview_start` ชื่อ `next-dev` แล้ว:

```bash
npx prisma db execute --stdin <<'EOF'
INSERT OR REPLACE INTO "Session" (id, sessionToken, userId, expires)
VALUES ('dev_s_p2', 'dev-p2', 'seed_u3', '2099-01-01T00:00:00.000Z');
EOF
```

Expected: `Script executed successfully.` (session นี้ต้องลบใน Task 7)

ใช้ `seed_u3` (มีแต่รีวิว REJECTED) ไม่ใช่ `seed_u1` — ถ้าแถบบนแสดงชื่อคนที่ล็อกอิน ชื่อ "ผู้ทดสอบ 1" จะปนกับเทสต์ชื่อนิรนามใน Task 5

- [ ] **Step 3: ตรวจผลกรองด้วย curl**

```bash
C="authjs.session-token=dev-p2"
cards() { curl -s -b "$C" -G "localhost:3000/insights" "$@" | grep -o 'href="/insights/seed_c[0-9]"' | grep -o 'seed_c[0-9]' | tr '\n' ' '; echo; }
cards
cards --data-urlencode "minScore=4"
cards --data-urlencode "department=แผนกวิชาช่างยนต์"
cards --data-urlencode "q=ไอที"
cards --data-urlencode "q=ไม่มีบริษัทนี้"
curl -s -o /dev/null -w '%{http_code}\n' -b "$C" "localhost:3000/insights?page=abc&minScore=9&department=xyz&q=a&q=b"
cards --data-urlencode "page=abc" --data-urlencode "minScore=9" --data-urlencode "department=xyz"
```

Expected ตามลำดับ:
- `seed_c1 seed_c2 seed_c5 seed_c6 seed_c4` (ไม่มี `seed_c3` เรียงตามจำนวนรีวิว → คะแนน)
- `seed_c1 seed_c2`
- `seed_c1`
- `seed_c2`
- (บรรทัดว่าง)
- `200`
- `seed_c1 seed_c2 seed_c5 seed_c6 seed_c4` (ตัวกรองขยะถูกเพิกเฉย)

- [ ] **Step 4: ตรวจว่ารีวิวที่ไม่อนุมัติไม่กระทบตัวเลขบนการ์ด**

```bash
curl -s -b "authjs.session-token=dev-p2" localhost:3000/insights | grep -o '2 รีวิว[^<]*'
```

Expected: `2 รีวิว · เบี้ยเลี้ยงเฉลี่ย 300 บาท/วัน` (การ์ด seed_c1 — ถ้านับ REJECTED/PENDING ด้วยจะเป็น 4 รีวิว 525 บาท)

- [ ] **Step 5: Checkpoint** — ห้าม commit

---

### Task 5: หน้ารายละเอียด `/insights/[id]`

**Files:**
- Modify (เขียนใหม่): `app/insights/[id]/page.tsx`

**Interfaces:**
- Consumes: `getCompany`, type `CompanyDetail` จาก `@/lib/companies` · `safeUrl` จาก `@/lib/company-rules` · `departmentLabel` · `companyIdSchema` · `PageShell`, `EmptyState`, `Card`, `Badge`, `SectionHeader`, `buttonClass`
- Produces: ช่องว่างสำหรับแผนที่ใน Task 6 (คอมเมนต์ `{/* แผนที่: Task 6 */}`)

- [ ] **Step 1: เขียน `app/insights/[id]/page.tsx`**

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { PageShell } from "@/components/PageShell";
import { Badge } from "@/components/ui/Badge";
import { buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { getCompany, type CompanyDetail } from "@/lib/companies";
import { safeUrl } from "@/lib/company-rules";
import { departmentLabel } from "@/lib/departments";
import { companyIdSchema } from "@/lib/validation";

const DIMENSIONS = [
  ["scoreWork", "ลักษณะงาน"],
  ["scoreEnv", "สภาพแวดล้อม"],
  ["scoreMentor", "พี่เลี้ยง"],
  ["scoreWelfare", "เบี้ยเลี้ยงและสวัสดิการ"],
] as const;

// เวลาไทยทั้งระบบ (บทเรียน v1) — th-TH แสดงปี พ.ศ.
const monthYear = (d: Date) => d.toLocaleDateString("th-TH", { month: "short", year: "numeric", timeZone: "Asia/Bangkok" });

export default async function CompanyPage({ params }: PageProps<"/insights/[id]">) {
  const id = companyIdSchema.safeParse((await params).id);
  if (!id.success) notFound();
  const data = await getCompany(id.data);
  if (!data) notFound();
  const { company: c, stats, reviews } = data;
  const website = safeUrl(c.website);

  return (
    <PageShell
      eyebrow={c.industry ?? "สถานประกอบการ"}
      title={c.name}
      lede={c.address ?? undefined}
      actions={
        <Link href="/insights/write-review" className={buttonClass("primary")}>
          เขียนรีวิว
        </Link>
      }
    >
      {c.isVerified && (
        <Badge tone="success" className="self-start">
          ยืนยันโดยวิทยาลัยแล้ว
        </Badge>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <Card eyebrow="คะแนนรวม" metric={stats.avgScore?.toFixed(1) ?? "–"}>
          จาก {stats.reviewCount} รีวิวที่ผ่านการตรวจ
        </Card>
        <Card
          eyebrow="เบี้ยเลี้ยงเฉลี่ย"
          metric={stats.avgAllowance !== null ? stats.avgAllowance.toLocaleString("th-TH") : "–"}
        >
          บาทต่อวัน
        </Card>
        <Card eyebrow="ช่องทางติดต่อ">
          {c.phone && (
            <p>
              <a className="kn-link" href={`tel:${c.phone.replace(/[^\d+]/g, "")}`}>
                {c.phone}
              </a>
            </p>
          )}
          {website && (
            <p className="break-all">
              <a className="kn-link" href={website} target="_blank" rel="noopener noreferrer">
                {website}
              </a>
            </p>
          )}
          {!c.phone && !website && <p className="text-ink-muted">ยังไม่มีข้อมูลติดต่อ</p>}
        </Card>
      </div>

      {c.description && <p className="max-w-prose whitespace-pre-line">{c.description}</p>}

      {/* แผนที่: Task 6 */}

      {stats.reviewCount > 0 && (
        <section className="flex flex-col gap-4">
          <SectionHeader title="คะแนนรายด้าน" />
          <dl className="grid max-w-xl gap-3">
            {DIMENSIONS.map(([key, label]) => {
              const v = stats.dims[key];
              return (
                <div key={key} className="grid grid-cols-[7.5rem_1fr_2.5rem] items-center gap-3 text-small">
                  <dt>{label}</dt>
                  <dd className="h-2 overflow-hidden rounded-full bg-surface-200">
                    <div className="h-full bg-signal" style={{ width: `${(v ?? 0) * 20}%` }} />
                  </dd>
                  <dd className="text-right tabular-nums">{v?.toFixed(1) ?? "–"}</dd>
                </div>
              );
            })}
          </dl>
        </section>
      )}

      <section className="flex flex-col gap-4">
        <SectionHeader title={`รีวิว (${stats.reviewCount})`} />
        {reviews.length === 0 ? (
          <EmptyState icon="rate_review" title="ยังไม่มีรีวิว">
            เป็นคนแรกที่เล่าประสบการณ์ฝึกงานที่นี่
          </EmptyState>
        ) : (
          reviews.map((r) => <ReviewCard key={r.id} r={r} />)
        )}
      </section>
    </PageShell>
  );
}

function ReviewCard({ r }: { r: CompanyDetail["reviews"][number] }) {
  return (
    <Card
      eyebrow={`${departmentLabel(r.department)} · ${monthYear(r.periodStart)} – ${monthYear(r.periodEnd)}`}
      metric={r.scoreOverall.toFixed(1)}
      title={r.author}
      footer={
        <div className="flex flex-wrap gap-2">
          {r.dailyAllowance !== null && <Badge>{`เบี้ยเลี้ยง ${r.dailyAllowance.toLocaleString("th-TH")} บาท/วัน`}</Badge>}
          {r.hasAccommodation && <Badge>มีที่พัก</Badge>}
          {r.hasTransport && <Badge>มีรถรับส่ง</Badge>}
          {r.workStartTime && r.workEndTime && <Badge>{`เวลางาน ${r.workStartTime}–${r.workEndTime} น.`}</Badge>}
        </div>
      }
    >
      <ReviewText label="ลักษณะงาน" text={r.textWork} />
      <ReviewText label="ข้อดี" text={r.textPros} />
      <ReviewText label="ข้อควรรู้" text={r.textCons} />
      <ReviewText label="คำแนะนำถึงรุ่นน้อง" text={r.textAdvice} />
    </Card>
  );
}

function ReviewText({ label, text }: { label: string; text: string | null }) {
  if (!text) return null;
  return (
    <p className="whitespace-pre-line">
      <span className="text-ink-muted">{label}: </span>
      {text}
    </p>
  );
}
```

- [ ] **Step 2: ตรวจด้วย curl**

```bash
C="authjs.session-token=dev-p2"
code() { curl -s -o /dev/null -w "%{http_code} " -b "$C" "localhost:3000/insights/$1"; }
code seed_c1; code seed_c3; code nonexistent; echo
P1=$(curl -s -b "$C" localhost:3000/insights/seed_c1)
echo "$P1" | grep -c "ผู้ทดสอบ 1"
echo "$P1" | grep -c "ข้อความรีวิวที่ถูกปฏิเสธ\|ข้อความรีวิวที่รออนุมัติ"
echo "$P1" | grep -o 'รีวิว (2)\|4\.1\|>300<' | sort -u | tr '\n' ' '; echo
P2=$(curl -s -b "$C" localhost:3000/insights/seed_c2)
echo "$P2" | grep -c "ผู้ทดสอบ 1"
echo "$P2" | grep -c "ไม่ระบุตัวตน"
echo "$P2" | grep -ci 'href="javascript'
curl -s -b "$C" localhost:3000/insights/seed_c4 | grep -o 'href="https://www.example.org/"'
```

Expected ตามลำดับ:
- `200 404 404`
- `1` (รีวิว seed_r1 ระบุชื่อ)
- `0` (ไม่มีข้อความจากรีวิว REJECTED/PENDING)
- `4.1 >300< รีวิว (2)`
- `0` (seed_r5 ไม่ระบุตัวตน — ชื่อห้ามหลุด)
- `1` หรือมากกว่า
- `0` (เว็บไซต์ `javascript:` ไม่กลายเป็นลิงก์)
- `href="https://www.example.org/"` (โดเมนเปล่าถูกเติม https)

- [ ] **Step 3: Checkpoint** — ห้าม commit

---

### Task 6: แผนที่ Leaflet

**Files:**
- Create: `components/CompanyMap.tsx`, `components/CompanyMapInner.tsx`
- Modify: `app/globals.css` (ต่อท้าย), `app/insights/page.tsx`, `app/insights/[id]/page.tsx` (แทนคอมเมนต์ `{/* แผนที่: Task 6 */}`)

**Interfaces:**
- Consumes: type `MapPin` จาก `@/lib/company-rules` · `cx` จาก `@/lib/cx`
- Produces: `CompanyMap({ pins: MapPin[]; className?: string })` — `className` ต้องกำหนดความสูง

- [ ] **Step 1: สร้าง `components/CompanyMapInner.tsx`**

```tsx
"use client";

import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import type { MapPin } from "@/lib/company-rules";

const HAT_YAI: [number, number] = [7.0084, 100.4767];

/** CircleMarker เป็น SVG — ไม่ต้องมีไฟล์รูปหมุด (รูปหมุด default ของ Leaflet พังเมื่อผ่าน bundler) */
export default function CompanyMapInner({ pins }: { pins: MapPin[] }) {
  const single = pins.length === 1 ? pins[0] : null;
  return (
    <MapContainer
      // props ของ MapContainer ไม่อัปเดตหลัง mount — key ให้สร้างใหม่เมื่อชุดหมุดเปลี่ยนตามตัวกรอง
      key={pins.map((p) => p.id).join()}
      center={single ? [single.lat, single.lng] : HAT_YAI}
      zoom={single ? 15 : 12}
      bounds={pins.length > 1 ? pins.map((p) => [p.lat, p.lng] as [number, number]) : undefined}
      boundsOptions={{ padding: [32, 32], maxZoom: 15 }}
      scrollWheelZoom={false}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {pins.map((p) => (
        <CircleMarker key={p.id} center={[p.lat, p.lng]} radius={9} pathOptions={{ className: "kn-map-pin" }}>
          <Popup>
            <Link href={`/insights/${p.id}`}>{p.name}</Link>
            {p.avgScore !== null && ` · ${p.avgScore.toFixed(1)}`}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
```

- [ ] **Step 2: สร้าง `components/CompanyMap.tsx`**

```tsx
"use client";

import dynamic from "next/dynamic";
import type { MapPin } from "@/lib/company-rules";
import { cx } from "@/lib/cx";

// Leaflet แตะ window ตอน import — ssr: false ใช้ได้เฉพาะใน client component
const CompanyMapInner = dynamic(() => import("./CompanyMapInner"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-surface-200" />,
});

/** isolate: z-index ของ Leaflet (400–1000) ต้องอยู่ใต้ TopNav/BottomNav (z-40) — v1 เคยแถบล่างหาย */
export function CompanyMap({ pins, className }: { pins: MapPin[]; className?: string }) {
  return (
    <div className={cx("isolate overflow-hidden rounded-lg border border-line", className)}>
      <CompanyMapInner pins={pins} />
    </div>
  );
}
```

- [ ] **Step 3: ต่อท้าย `app/globals.css`**

```css
/* หมุดแผนที่ — CircleMarker ของ Leaflet เป็น SVG path กฎ CSS ชนะ attribute สีที่ Leaflet ใส่ให้ */
.kn-map-pin {
  fill: var(--signal);
  fill-opacity: 0.9;
  stroke: var(--surface-100);
  stroke-width: 2;
}
```

- [ ] **Step 4: ใส่แผนที่ในสองหน้า**

`app/insights/page.tsx` — เพิ่ม import `import { CompanyMap } from "@/components/CompanyMap";` เปลี่ยน destructure เป็น `const { items, pins, total, page, pageCount } = await listCompanies(filters);` แล้วแทนคอมเมนต์ด้วย:

```tsx
      {pins.length > 0 && <CompanyMap pins={pins} className="h-[320px] md:h-[440px]" />}
```

`app/insights/[id]/page.tsx` — เพิ่ม import เดียวกัน แล้วแทนคอมเมนต์ด้วย:

```tsx
      {c.lat !== null && c.lng !== null && (
        <CompanyMap
          pins={[{ id: c.id, name: c.name, lat: c.lat, lng: c.lng, avgScore: stats.avgScore }]}
          className="h-[240px] md:h-[320px]"
        />
      )}
```

- [ ] **Step 5: ตรวจในเบราว์เซอร์**

ตั้ง cookie แล้วเปิดหน้า (`javascript_tool` ในแท็บของ preview):

```js
document.cookie = "authjs.session-token=dev-p2; path=/"; location.href = "/insights";
```

จากนั้น:
- `read_console_messages` onlyErrors → Expected: ไม่มี error (โดยเฉพาะ `window is not defined` หรือ hydration)
- `javascript_tool`: `document.querySelectorAll(".kn-map-pin").length` → Expected: `4` (c1 c2 c4 c6 — c5 ไม่มีพิกัด c3 ไม่สาธารณะ)
- คลิกหมุดหนึ่งอัน popup ต้องมีลิงก์ไปหน้ารายละเอียด คลิกแล้วไปถึงจริง
- เปิด `/insights?minScore=4` → `.kn-map-pin` ต้องเหลือ `2` (แผนที่สร้างใหม่ตามตัวกรอง)
- เปิด `/insights/seed_c1` → หมุด `1` อัน ซูมเข้าที่บริษัท

- [ ] **Step 6: ตรวจที่ 375px ว่าแผนที่ไม่ทับแถบนำทาง**

`resize_window` preset `mobile` → reload `/insights` แล้ว:

```js
const map = document.querySelector(".leaflet-container");
window.scrollTo(0, map.getBoundingClientRect().top + scrollY - innerHeight + 40);
const atBottom = document.elementFromPoint(innerWidth / 2, innerHeight - 20);
const atTop = (window.scrollTo(0, map.getBoundingClientRect().top + scrollY - 20), document.elementFromPoint(innerWidth / 2, 10));
({ bottomIsNav: !!atBottom.closest("nav"), topIsHeader: !!atTop.closest("header"), overflowX: document.documentElement.scrollWidth > innerWidth });
```

Expected: `{ bottomIsNav: true, topIsHeader: true, overflowX: false }` — แล้ว `screenshot` เก็บเป็นหลักฐาน จากนั้น `resize_window` preset `desktop`

- [ ] **Step 7: Checkpoint** — ห้าม commit

---

### Task 7: ตรวจทั้งระบบ เก็บกวาด อัปเดตเอกสาร

**Files:**
- Modify: `CLAUDE.md` (ส่วนคำสั่ง), `context.md` (ตารางสถานะ)

- [ ] **Step 1: เทสต์ lint build**

Run: `node --test` → Expected: PASS ทั้งหมด
Run: `npm run lint` → Expected: ไม่มี error
Run: `npm run build` → Expected: build ผ่าน

- [ ] **Step 2: ตรวจว่าคนนอกเข้าไม่ได้**

```bash
for t in "" dev-p2; do
  echo "[${t:-guest}] $(curl -s -o /dev/null -w '%{http_code} ' -b "authjs.session-token=$t" localhost:3000/insights)$(curl -s -o /dev/null -w '%{http_code}' -b "authjs.session-token=$t" localhost:3000/insights/seed_c1)"
done
```

Expected: `[guest] 401 401` และ `[dev-p2] 200 200`

- [ ] **Step 3: ไล่หน้าจอที่ 375px ด้วยตา**

`resize_window` preset `mobile` → screenshot `/insights` (ฟอร์ม แผนที่ การ์ด) และ `/insights/seed_c1` (การ์ดสถิติ แถบคะแนน รีวิว) ตรวจว่า: ไม่มีอะไรล้นแนวนอน, ป้ายคะแนนรายด้าน "เบี้ยเลี้ยงและสวัสดิการ" ไม่ดันแถบหาย, select แผนกไม่ล้นจอ, การ์ดสุดท้ายไม่ถูก BottomNav บัง จากนั้น `resize_window` preset `desktop`

- [ ] **Step 4: ลบ session ทดสอบ**

```bash
npx prisma db execute --stdin <<'EOF'
DELETE FROM "Session" WHERE sessionToken = 'dev-p2';
EOF
curl -s -o /dev/null -w '%{http_code}\n' -b "authjs.session-token=dev-p2" localhost:3000/insights
```

Expected: `Script executed successfully.` แล้ว `401` — token ที่รู้กันทั่วต้องใช้ไม่ได้อีก (ข้อมูล seed เก็บไว้ได้ ไฟล์ `.db` ไม่เข้า git)

- [ ] **Step 5: อัปเดต `CLAUDE.md` ส่วนคำสั่ง** — เพิ่มบรรทัดหลัง `npx prisma studio`

```bash
npx prisma db seed           # ข้อมูลตัวอย่าง 6 บริษัท (dev เท่านั้น รันซ้ำได้)
```

- [ ] **Step 6: อัปเดต `context.md`** — แถว Phase 2 ในตารางสถานะเป็น `เสร็จ` และเปลี่ยน "ถัดไปคือ **Phase 2**" เป็น **Phase 3** พร้อมบรรทัดหมายเหตุ:

```
Phase 2 ไม่มี Route Handler (หน้าเรียก `lib/companies.ts` ตรง) และเลื่อน proxy SerpApi (`/api/places-search`) ไป Phase 3
```

- [ ] **Step 7: Checkpoint** — สรุปผลให้ผู้ใช้ ห้าม commit จนกว่าผู้ใช้สั่ง
