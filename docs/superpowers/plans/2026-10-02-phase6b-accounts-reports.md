# Phase 6b — ยืนยันสิทธิ์ ข้อร้องเรียน และจัดการบัญชี Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** บุคคลภายนอกยื่นคำขอยืนยันสิทธิ์นักศึกษา (รหัส แผนก ระดับ รูปบัตร) และติดตามสถานะได้ · ผู้ใช้รายงานรีวิว กระทู้ ความคิดเห็น ประกาศงาน และสถานประกอบการที่ไม่เหมาะสม · ผู้ดูแลอนุมัติคำขอ จัดการข้อร้องเรียน (ถอนเนื้อหา ปิดเรื่อง หรือยก) ค้นหาบัญชี เปลี่ยนบทบาท และระงับบัญชี · แต่งตั้งและถอดถอนผู้ดูแลได้เฉพาะผู้ดูแลระดับสูง — ทุกการกระทำลงประวัติและแจ้งผู้เกี่ยวข้องในทรานแซกชันเดียว

**Architecture:** ต่อยอด 6a — ถอนเนื้อหาจากข้อร้องเรียนเรียก `applyDecision()` ตัวเดียวกับคิวตรวจ (แยกออกจาก `moderate()` ให้ทำงานในทรานแซกชันของผู้เรียก) · DAL ใหม่ `lib/reports.ts` (ผู้ใช้รายงาน) `lib/upgrades.ts` (คำขอ) `lib/users.ts` (บัญชี) · กฎสิทธิ์ของบัญชีอยู่ใน `lib/account-rules.ts` แบบ pure มีเทสต์ · กฎที่บังคับได้ที่ฐานข้อมูล (รายงานซ้ำ คำขอที่รอตรวจซ้ำ) บังคับด้วย unique index

**Tech Stack:** Next 16.3 · Prisma 7 + SQLite (preview `partialIndexes`) · zod 4 · Cloudinary · `node --test` · `node:sqlite`

**Spec:** แผนเต็ม `C:\Users\user\.claude\plans\htc-insights-synthetic-zephyr.md` หัวข้อ "Phase 6" + `docs/context.md` (หลักการโดเมน 1–4, สเปกข้อ 11–12, 14, 17–18, ข้อบังคับ "6b ต้องรักษา") + แผน 6a `docs/superpowers/plans/2026-10-02-phase6a-moderation.md`

### ตัดสินเองในแผนนี้

| เรื่อง | แผนนี้ทำ | เหตุผล |
|---|---|---|
| รายงานซ้ำ | `@@unique([reporterId, <เป้าหมาย>Id])` ห้าชุด — รายงานเนื้อหาเดียวกันได้ครั้งเดียวต่อบัญชี (รวมเรื่องที่ปิดแล้ว) | บังคับที่ฐานข้อมูล SQLite ยอม NULL ซ้ำ คอลัมน์ที่ไม่ใช้จึงไม่ชน · กันกดรายงานรัว |
| ใครรายงานได้ | ผู้ที่ล็อกอินและมองเห็นเนื้อหานั้น (เผยแพร่อยู่) · บุคคลภายนอกรายงานได้เฉพาะประกาศงาน · รายงานของตัวเองไม่ได้ | เห็นไม่ได้ = 404 เหมือนไม่มี ไม่ให้เดา id |
| จัดการข้อร้องเรียน | สามทาง: **ถอนเนื้อหา** (ผ่าน `applyDecision` + ปิดทุกข้อร้องเรียนที่รอของเนื้อหาชิ้นนั้น) · **ปิดเรื่อง** (จัดการแล้วนอกระบบ — ทางเดียวของสถานประกอบการ) · **ไม่ผิดกฎ** · ทุกทางต้องมีบันทึก 5–500 ตัวอักษรที่ผู้รายงานเห็น | หลักการข้อ 4 ผู้รายงานต้องรู้ผล · ไม่เขียนตรรกะถอนใหม่ (ข้อบังคับ 6a) |
| ถอนกระทู้แล้วความคิดเห็นในนั้นหาย | **ตั้งใจให้เป็นแบบนี้** — แจ้งเฉพาะเจ้าของกระทู้ ความคิดเห็นไม่ได้ถูกตัดสินจึงไม่แจ้ง | ข้อบังคับ 6a ให้ตัดสินก่อนเปิดปุ่มถอน · ความคิดเห็นไม่ผิด แค่บริบทหายไป |
| คำขอยืนยันสิทธิ์ | ยื่นได้เฉพาะ `EXTERNAL` · ที่รอตรวจได้ครั้งละหนึ่ง บังคับด้วย partial unique `UpgradeRequest_one_pending` · อนุมัติ = บทบาท `STUDENT` + ลง `studentId/department/educationLevel` · ระดับ ปวช./ปวส. (จาก v1) · รหัสนักศึกษาตัวเลข 5–15 หลัก | สเปกข้อ 11 |
| ไม่มีคีย์ Cloudinary | รูปบัตรบังคับ → หน้าแสดง "ยังเปิดรับคำขอไม่ได้" และ API ตอบ 400 · คำขอใน seed ใช้รูปตัวอย่างสาธารณะของ Cloudinary demo | แบบเดียวกับที่ระบบซ่อนฟีเจอร์อื่นเมื่อไม่มีคีย์ · **เส้นทางอัปโหลดจริงทดสอบไม่ได้ในเครื่องนี้ (ไม่มีคีย์)** |
| รูปบัตรนักศึกษา | ponytail: อัปโหลดเป็นรูปสาธารณะของ Cloudinary (URL เดาไม่ได้) แสดงเฉพาะผู้ดูแล | ถ้าต้องปิดจริงใช้ `type: "authenticated"` + signed URL |
| จัดการบัญชี | เปลี่ยนบทบาท STUDENT ⇄ EXTERNAL ได้ทุกผู้ดูแล · เกี่ยวกับ ADMIN (แต่งตั้ง ถอดถอน ระงับผู้ดูแล) เฉพาะ super admin · แก้ตัวเองและแก้ super admin ไม่ได้ · เปลี่ยนบทบาทแจ้งเจ้าของบัญชี ระงับ/ยกเลิกลงประวัติอย่างเดียว | สเปกข้อ 17–18 · คนถูกระงับเข้าระบบไม่ได้อยู่แล้ว (`getCurrentUser` คืน null ทันที) |
| `Employer.isApproved` | **ลบคอลัมน์** | ประกาศถูกตรวจรายชิ้นอยู่แล้ว ยืนยันบริษัทใช้ `Company.isVerified` (ข้อค้างจาก Phase 5) |
| `AuditLog.admin` | `onDelete: Restrict` | ข้อบังคับ 6a — ลบผู้ดูแลต้องไม่ลบประวัติ (หลักการข้อ 3) |
| เทสต์ห้ามเขียนแจ้งเตือน/ประวัติตรง | สแกนทุก `.ts/.tsx` ใน `lib/` และ `app/` (ยกเว้น `lib/admin.ts`, `app/generated/`) และจับ `create/createMany/upsert` | ข้อบังคับ 6a |
| `ModerationActions` | รับ `endpoint` แทน `kind`+`id` ใช้ซ้ำกับคำขอยืนยันสิทธิ์ | อนุมัติ/ปฏิเสธพร้อมเหตุผลเหมือนกันทุกอย่าง |

## Global Constraints

- อ่าน `AGENTS.md`: `PageProps`/`RouteContext` แบบ global · path ใหม่รัน `npx next typegen` ก่อน `tsc`
- Prisma Client ผ่าน `db` จาก `@/lib/db` เท่านั้น (ยกเว้น seed) · หลังแก้ schema ใช้ `migrate diff` + `migrate deploy` + `generate` แล้วรีสตาร์ต dev server
- **ทุก Route Handler เรียก guard เป็นบรรทัดแรก** · ทุก `export async function` ใน DAL เริ่มด้วย guard (เพิ่ม `lib/reports.ts`, `lib/upgrades.ts`, `lib/users.ts` ในเทสต์)
- **ทุกการกระทำของผู้ดูแล = เปลี่ยนข้อมูล + `notify()` + `logAdminAction()` ใน `db.$transaction` เดียว** ผ่าน `lib/admin.ts` เท่านั้น
- ข้อความจากผู้ดูแลถึงผู้ใช้ (เหตุผล บันทึก) 5–500 ตัวอักษร · ผู้ดูแลเห็นตัวตนผู้รายงานและผู้ยื่นคำขอ ผู้ใช้อื่นไม่เห็น
- เวลา `th-TH` + `Asia/Bangkok` · UI ไทย ไม่ใช้ emoji · ทดสอบ 375px · ปุ่มขนาดปกติ 40px ตาม design system
- เทสต์ `node --test` (ไม่ใส่ `tests/`) · ไฟล์ pure ห้าม import ค่าจริง ห้าม `@/`
- ภาษาไทยในคำสั่งอยู่ในไฟล์สคริปต์ · ข้อมูลทดสอบขึ้นต้น `P6BTEST`
- **ห้าม commit เอง**

## Review Focus

1. **ผู้ดูแลธรรมดาแต่งตั้ง/ถอดถอน/ระงับผู้ดูแล หรือแก้ตัวเอง/แก้ super admin** → 403 ไม่มีอะไรเปลี่ยน → เทสต์ `accountChangeError` Task 2 + สคริปต์ Task 4
2. **ถอนเนื้อหาจากข้อร้องเรียน** → เนื้อหาถูกปฏิเสธ เจ้าของได้แจ้ง ข้อร้องเรียนที่รอทั้งหมดของเนื้อหานั้นปิดพร้อมกัน ผู้รายงานทุกคนได้แจ้ง ประวัติสองแถว · จัดการซ้ำ 409 → สคริปต์ Task 4
3. **รายงานเนื้อหาที่มองไม่เห็น / ของตัวเอง / ซ้ำ / บุคคลภายนอกรายงานรีวิว** → 404/400/409/404 → สคริปต์ Task 4
4. **อนุมัติคำขอที่ตัดสินแล้ว / ผู้ยื่นไม่ใช่บุคคลภายนอกแล้ว / ยื่นซ้ำขณะรอ** → 409 และบทบาทไม่เปลี่ยน · ไม่มีคีย์ Cloudinary → ฟอร์มซ่อน API 400 → สคริปต์ Task 4
5. **ระงับบัญชีแล้วยังใช้งานได้** → คำขอถัดไปของคนนั้นได้ 401 ทันที ยกเลิกแล้วกลับมาใช้ได้ → สคริปต์ Task 4

---

## File Structure

```
prisma/schema.prisma + migration      ลบ Employer.isApproved · Report @@unique x5 · UpgradeRequest_one_pending ·
                                      AuditLog.admin Restrict                                            แก้ (T1)
prisma/seed.ts                        seed_super · คำขอ 2 · ข้อร้องเรียน 5 · คืนบทบาท/การระงับทุกรอบ          แก้ (T1)
lib/account-rules.ts                  ROLE_LABELS ROLE_VALUES EDUCATION_LEVELS canManage accountChangeError
                                      roleNotice upgradeNotice USERS_PER_PAGE (pure)                     ใหม่ (T2)
lib/moderation-rules.ts               targetLabel actionLabel(ขยาย) REPORT_KINDS REPORT_COLUMN reportTarget
                                      reportActionError reportNotice                                     แก้ (T2)
lib/validation.ts                     reportInputSchema reportDecisionSchema upgradeFieldsSchema
                                      upgradeDecisionSchema userChangeSchema userSearchSchema adminParams แก้ (T3)
lib/moderation.ts                     applyDecision (แยกจาก moderate) pendingReports resolveReport        แก้ (T3)
lib/reports.ts, lib/upgrades.ts, lib/users.ts   DAL                                                     ใหม่ (T3)
app/api/reports/route.ts · app/api/upgrades/route.ts · app/api/admin/reports/[id]/route.ts ·
app/api/admin/upgrades/[id]/route.ts · app/api/admin/users/[id]/route.ts                                ใหม่ (T4)
components/ReportButton.tsx · components/UpgradeForm.tsx · components/StatusBadge.tsx                    ใหม่ (T5)
app/insights/[id]/page.tsx · app/community/[id]/page.tsx · app/jobs/[id]/page.tsx  ปุ่มรายงาน            แก้ (T5)
app/profile/upgrade/page.tsx (เขียนใหม่) · app/profile/page.tsx (StatusBadge, ROLE_LABELS)              (T5)
components/ModerationActions.tsx (endpoint) · components/ReportActions.tsx · components/UserActions.tsx    (T6)
app/admin/page.tsx แท็บคำขอ/ข้อร้องเรียน · app/admin/users/page.tsx (เขียนใหม่)                          (T6)
docs/context.md                                                                                         แก้ (T7)
tests/account-rules.test.mjs ใหม่ · tests/moderation-rules.test.mjs แก้ (T2) · tests/route-guards.test.mjs แก้ (T3)
```

---

### Task 1: Schema + ข้อมูลตัวอย่าง

**Files:** Modify `prisma/schema.prisma`, `prisma/seed.ts` · Create migration `_phase6b_accounts`

**Interfaces — Produces (id คงที่):**

| id | คืออะไร |
|---|---|
| `seed_super` | ADMIN + `isSuperAdmin` `seed-super@example.invalid` |
| `seed_up1` | คำขอของ e2 PENDING รหัส `65201234567` IT ปวส. |
| `seed_up2` | คำขอของ e2 REJECTED (เก่ากว่า) เหตุผล "รูปบัตรไม่ชัด อ่านรหัสนักศึกษาไม่ได้" |
| `seed_rp1` | u1 รายงานรีวิว r2 (ของ u2) PENDING |
| `seed_rp2` | u3 รายงานรีวิว r2 PENDING |
| `seed_rp3` | u2 รายงานความคิดเห็น cm6 (ของ u1) PENDING |
| `seed_rp4` | u1 รายงานสถานประกอบการ c2 PENDING |
| `seed_rp5` | u4 รายงานกระทู้ post2 DISMISSED |

- [ ] **Step 1: แก้ `prisma/schema.prisma`**
  - `model Employer`: ลบบรรทัด `  isApproved   Boolean  @default(false)`
  - `model Report`: ก่อนบรรทัด `  @@index([status])` เพิ่ม

```prisma
  // รายงานเนื้อหาเดียวกันได้ครั้งเดียวต่อบัญชี — SQLite ยอม NULL ซ้ำ คอลัมน์เป้าหมายที่ไม่ใช้จึงไม่ชนกัน
  @@unique([reporterId, reviewId])
  @@unique([reporterId, postId])
  @@unique([reporterId, commentId])
  @@unique([reporterId, jobId])
  @@unique([reporterId, companyId])
```

  - `model AuditLog`: แทน `onDelete: Cascade)` ในบรรทัด `admin User @relation("AuditAdmin", ...)` ด้วย `onDelete: Restrict)` และเพิ่มคอมเมนต์เหนือบรรทัดนั้น `  // Restrict: ลบบัญชีผู้ดูแลต้องไม่ลบประวัติ (หลักการโดเมนข้อ 3)`
  - `model UpgradeRequest`: ก่อน `  @@index([status])` เพิ่ม

```prisma
  // คำขอที่รอตรวจได้ครั้งละหนึ่งต่อบัญชี — บังคับที่ฐานข้อมูล
  @@unique([userId], map: "UpgradeRequest_one_pending", where: raw("\"status\" = 'PENDING'"))
```

Run: `npx prisma validate` → valid · `grep -rn "isApproved" lib app components prisma/seed.ts --include=*.ts --include=*.tsx | grep -v generated` → ไม่มีผล

- [ ] **Step 2: migration**

```bash
dir="prisma/migrations/$(date -u +%Y%m%d%H%M%S)_phase6b_accounts"; mkdir -p "$dir"
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script -o "$dir/migration.sql"
grep -E "RESTRICT|UpgradeRequest_one_pending|Report_reporterId|isApproved" "$dir/migration.sql"
npx prisma migrate deploy && npx prisma generate
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script
```

Expected: SQL มี `ON DELETE RESTRICT` ของ AuditLog · `UpgradeRequest_one_pending ... WHERE "status" = 'PENDING'` · unique index ของ Report 5 ตัว · ตาราง Employer สร้างใหม่ไม่มี `isApproved` · diff สุดท้าย `-- This is an empty migration.`

- [ ] **Step 3: `prisma/seed.ts`**

แทนบรรทัด `const ADMIN_USER = ...;` ด้วย:

```ts
const ADMIN_USER = { id: "seed_admin", email: "seed-admin@example.invalid", name: "ผู้ดูแลทดสอบ", role: "ADMIN" as const, isSuperAdmin: false };
const SUPER_USER = { id: "seed_super", email: "seed-super@example.invalid", name: "ผู้ดูแลระดับสูงทดสอบ", role: "ADMIN" as const, isSuperAdmin: true };
```

แทนบรรทัด `  for (const u of [...USERS, ...EXTERNAL_USERS, ADMIN_USER]) ...` ด้วย:

```ts
  // คืนบทบาท การระงับ และข้อมูลนักศึกษาทุกรอบ — สคริปต์ทดสอบเปลี่ยนสิ่งเหล่านี้
  for (const u of [...USERS, ...EXTERNAL_USERS, ADMIN_USER, SUPER_USER]) {
    const data = { studentId: null, department: null, educationLevel: null, isSuperAdmin: false, ...u, isBanned: false };
    await db.user.upsert({ where: { id: u.id }, create: data, update: data });
  }
```

แทน `  await db.auditLog.deleteMany({ where: { adminId: ADMIN_USER.id } });` ด้วย:

```ts
  await db.auditLog.deleteMany({ where: { adminId: { in: [ADMIN_USER.id, SUPER_USER.id] } } });
```

ต่อจาก `const JOB_COMMON = {...};` เพิ่ม:

```ts
const CARD_URL = "https://res.cloudinary.com/demo/image/upload/sample.jpg";
const UPGRADES = [
  { id: "seed_up2", userId: "seed_e2", studentId: "65201234567", department: IT, educationLevel: "ปวส.", cardImageUrl: CARD_URL, status: "REJECTED" as const, rejectionReason: "รูปบัตรไม่ชัด อ่านรหัสนักศึกษาไม่ได้", createdAt: new Date("2026-09-20T09:00:00+07:00") },
  { id: "seed_up1", userId: "seed_e2", studentId: "65201234567", department: IT, educationLevel: "ปวส.", cardImageUrl: CARD_URL, status: "PENDING" as const, rejectionReason: null, createdAt: new Date("2026-10-01T09:00:00+07:00") },
];

type SeedReport = { id: string; reporterId: string; reason: string; status: "PENDING" | "DISMISSED"; resolution?: string; reviewId?: string; postId?: string; commentId?: string; companyId?: string };
const REPORTS: SeedReport[] = [
  { id: "seed_rp1", reporterId: "seed_u1", reviewId: "seed_r2", status: "PENDING", reason: "เบี้ยเลี้ยงในรีวิวไม่ตรงกับที่ได้จริง" },
  { id: "seed_rp2", reporterId: "seed_u3", reviewId: "seed_r2", status: "PENDING", reason: "ข้อมูลรถรับส่งไม่ถูกต้อง" },
  { id: "seed_rp3", reporterId: "seed_u2", commentId: "seed_cm6", status: "PENDING", reason: "ข้อมูลเอกสารไม่ครบ อาจทำให้รุ่นน้องเข้าใจผิด" },
  { id: "seed_rp4", reporterId: "seed_u1", companyId: "seed_c2", status: "PENDING", reason: "เว็บไซต์ที่แสดงเป็นลิงก์อันตราย" },
  { id: "seed_rp5", reporterId: "seed_u4", postId: "seed_post2", status: "DISMISSED", reason: "กระทู้โฆษณา", resolution: "ตรวจแล้วเป็นการเล่าประสบการณ์ ไม่ผิดกฎ" },
];
```

ในบล็อกงานของ Phase 5 ใน `main()` ต่อจาก loop `for (const { rejectionReason, ...j } of JOBS) {...}` เพิ่ม:

```ts
  // คำขอที่ถูกปฏิเสธมาก่อน — partial unique อนุญาต PENDING แค่หนึ่ง
  for (const u of UPGRADES) await db.upgradeRequest.upsert({ where: { id: u.id }, create: u, update: u });
  // ข้อร้องเรียนที่สคริปต์ทดสอบสร้างถูกลบก่อน ไม่งั้นชน unique รายงานซ้ำ
  await db.report.deleteMany({ where: { reporterId: { startsWith: "seed_" }, id: { not: { startsWith: "seed_" } } } });
  for (const { resolution, ...r } of REPORTS) {
    const data = { reviewId: null, postId: null, commentId: null, jobId: null, companyId: null, ...r, resolution: resolution ?? null };
    await db.report.upsert({ where: { id: r.id }, create: data, update: data });
  }
```

และต่อท้าย `main()`:

```ts
  console.log(`seed: ${UPGRADES.length} คำขอยืนยันสิทธิ์ ${REPORTS.length} ข้อร้องเรียน`);
```

- [ ] **Step 4: ตรวจ** — `npx jiti prisma/seed.ts` สองรอบ → สี่บรรทัด (บรรทัดใหม่ `seed: 2 คำขอยืนยันสิทธิ์ 5 ข้อร้องเรียน`) · `npx tsc --noEmit` · `node --test` → ผ่าน (73)

- [ ] **Step 5: Checkpoint** — ห้าม commit

---

### Task 2: กฎบัญชีและข้อร้องเรียน (pure)

**Files:** Create `lib/account-rules.ts`, `tests/account-rules.test.mjs` · Modify `lib/moderation-rules.ts`, `tests/moderation-rules.test.mjs`

**Interfaces — Produces:**
- `account-rules`: `ROLE_LABELS: Record<Role,string>` · `ROLE_VALUES` · `USERS_PER_PAGE = 20` · `EDUCATION_LEVELS` · `EDUCATION_LEVEL_VALUES` · `type AccountChange` · `canManage(actor, target): boolean` · `accountChangeError(actor, target, change): { status: 403 | 409; message } | null` · `roleNotice(role)` · `upgradeNotice(decision, reason)`
- `moderation-rules`: `targetLabel(type)` · `actionLabel` รองรับการกระทำใหม่ · `REPORT_KINDS` · `type ReportKind` · `REPORT_KIND_VALUES` · `type ReportColumn` · `REPORT_COLUMN` · `reportTarget(row)` · `type ReportAction` · `reportActionError(kind, action)` · `reportNotice(kind, action, note)`

- [ ] **Step 1: เทสต์ที่ล้มเหลว `tests/account-rules.test.mjs`**

```js
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
```

และต่อท้าย `tests/moderation-rules.test.mjs` (เพิ่มชื่อใน import: `REPORT_KIND_VALUES, reportActionError, reportNotice, reportTarget, targetLabel`):

```js
test("ข้อร้องเรียน: ชนิด เป้าหมาย และข้อห้าม", () => {
  assert.deepEqual(REPORT_KIND_VALUES, ["review", "post", "comment", "job", "company"]);
  const row = { reviewId: null, postId: null, commentId: "c1", jobId: null, companyId: null };
  assert.deepEqual(reportTarget(row), { kind: "comment", id: "c1" });
  assert.equal(reportTarget({ ...row, commentId: null }), null);
  assert.ok(reportActionError("company", "withdraw"));
  assert.equal(reportActionError("company", "resolve"), null);
  assert.equal(reportActionError("review", "withdraw"), null);
});

test("ข้อความแจ้งผู้รายงาน", () => {
  assert.deepEqual(reportNotice("review", "withdraw", "ข้อมูลเท็จ"), {
    type: "report_withdraw",
    message: "รายงานรีวิวของคุณได้รับการตรวจแล้ว ผู้ดูแลถอนเนื้อหานั้นออก: ข้อมูลเท็จ",
    link: null,
  });
  assert.match(reportNotice("company", "resolve", "แก้ลิงก์แล้ว").message, /^รายงานสถานประกอบการของคุณได้รับการจัดการแล้ว/);
  assert.match(reportNotice("post", "dismiss", "ไม่ผิดกฎ").message, /ไม่พบการละเมิดกฎ/);
});

test("ชื่อเป้าหมายและการกระทำในประวัติ", () => {
  assert.equal(targetLabel("user"), "บัญชี");
  assert.equal(targetLabel("comment"), "ความคิดเห็น");
  assert.equal(actionLabel("change_role"), "เปลี่ยนบทบาท");
  assert.equal(actionLabel("withdraw_report"), "ถอนเนื้อหาตามข้อร้องเรียน");
  assert.equal(actionLabel("approve_upgrade"), "อนุมัติคำขอยืนยันสิทธิ์");
  assert.equal(actionLabel("constructor"), "constructor");
});
```

Run: `node --test` → FAIL (`Cannot find module ... account-rules.ts`, และ `REPORT_KIND_VALUES` ไม่มี)

- [ ] **Step 2: `lib/account-rules.ts`**

```ts
// ไฟล์นี้ต้อง pure — tests/account-rules.test.mjs import ตรงด้วย Node ห้าม import ค่าจริงเพิ่ม (import type ได้)
import type { Role } from "./nav";

export const ROLE_LABELS: Record<Role, string> = { STUDENT: "นักศึกษา", EXTERNAL: "บุคคลภายนอก", ADMIN: "ผู้ดูแลระบบ" };
export const ROLE_VALUES = ["STUDENT", "EXTERNAL", "ADMIN"] as const satisfies readonly Role[];
export const USERS_PER_PAGE = 20;

/** ระดับการศึกษาจาก v1 — ค่าเก็บลงฐานข้อมูล ห้ามแก้ value ที่มีข้อมูลแล้ว */
export const EDUCATION_LEVELS = [
  { value: "ปวช.", label: "ประกาศนียบัตรวิชาชีพ (ปวช.)" },
  { value: "ปวส.", label: "ประกาศนียบัตรวิชาชีพชั้นสูง (ปวส.)" },
] as const;
export const EDUCATION_LEVEL_VALUES = EDUCATION_LEVELS.map((l) => l.value) as [string, ...string[]];

type Actor = { id: string; isSuperAdmin: boolean };
type Target = { id: string; role: string; isSuperAdmin: boolean; isBanned: boolean };
export type AccountChange = { action: "set_role"; role: Role } | { action: "ban" } | { action: "unban" };

/** แสดงปุ่มจัดการบัญชีนี้ไหม — ตัวเอง super admin และผู้ดูแลคนอื่น (เว้นแต่ผู้กระทำเป็นระดับสูง) แก้ไม่ได้ */
export function canManage(actor: Actor, target: Target): boolean {
  return actor.id !== target.id && !target.isSuperAdmin && (target.role !== "ADMIN" || actor.isSuperAdmin);
}

/** ตัวตัดสินจริงฝั่งเซิร์ฟเวอร์ — แต่งตั้ง ถอดถอน และระงับผู้ดูแลได้เฉพาะ super admin (สเปกข้อ 18) */
export function accountChangeError(actor: Actor, target: Target, change: AccountChange): { status: 403 | 409; message: string } | null {
  if (actor.id === target.id) return { status: 403, message: "แก้ไขบัญชีของตัวเองไม่ได้" };
  if (target.isSuperAdmin) return { status: 403, message: "แก้ไขบัญชีผู้ดูแลระดับสูงไม่ได้" };
  const touchesAdmin = target.role === "ADMIN" || (change.action === "set_role" && change.role === "ADMIN");
  if (touchesAdmin && !actor.isSuperAdmin) return { status: 403, message: "แต่งตั้ง ถอดถอน หรือระงับผู้ดูแลได้เฉพาะผู้ดูแลระดับสูง" };
  if (change.action === "set_role" && change.role === target.role) return { status: 409, message: "บัญชีนี้มีบทบาทนี้อยู่แล้ว" };
  if (change.action === "ban" && target.isBanned) return { status: 409, message: "บัญชีนี้ถูกระงับอยู่แล้ว" };
  if (change.action === "unban" && !target.isBanned) return { status: 409, message: "บัญชีนี้ไม่ได้ถูกระงับ" };
  return null;
}

export function roleNotice(role: Role) {
  return { type: "role_changed", message: `ผู้ดูแลเปลี่ยนบทบาทบัญชีของคุณเป็น${ROLE_LABELS[role]}`, link: "/profile" };
}

/** หลักการโดเมนข้อ 4 — ผลคำขอยืนยันสิทธิ์ต้องแจ้งพร้อมเหตุผล */
export function upgradeNotice(decision: "APPROVED" | "REJECTED", reason: string | null) {
  return decision === "APPROVED"
    ? { type: "upgrade_approved", message: "คำขอยืนยันสิทธิ์นักศึกษาผ่านการตรวจแล้ว บัญชีของคุณเป็นนักศึกษาแล้ว", link: "/" }
    : { type: "upgrade_rejected", message: `คำขอยืนยันสิทธิ์นักศึกษาไม่ผ่านการตรวจ เหตุผล: ${reason ?? "ไม่ระบุ"}`, link: "/profile/upgrade" };
}
```

- [ ] **Step 3: `lib/moderation-rules.ts`** — แทนทั้งบล็อกตั้งแต่ `const VERBS: Record<string, string> = ...` จนจบไฟล์ด้วย:

```ts
const VERBS: Record<string, string> = { approve: "อนุมัติ", reject: "ปฏิเสธ" };

const ACTIONS: Record<string, string> = {
  approve_upgrade: "อนุมัติคำขอยืนยันสิทธิ์",
  reject_upgrade: "ปฏิเสธคำขอยืนยันสิทธิ์",
  withdraw_report: "ถอนเนื้อหาตามข้อร้องเรียน",
  resolve_report: "ปิดข้อร้องเรียน",
  dismiss_report: "ยกข้อร้องเรียน",
  change_role: "เปลี่ยนบทบาท",
  ban_user: "ระงับบัญชี",
  unban_user: "ยกเลิกการระงับบัญชี",
};

/** ชื่อการกระทำในประวัติผู้ดูแล — การกระทำที่รู้จัก หรือรูปแบบ <verb>_<kind> ที่ moderate() เขียน · อื่น ๆ คืนค่าเดิม */
export function actionLabel(action: string): string {
  if (Object.hasOwn(ACTIONS, action)) return ACTIONS[action];
  const [verb, kind, ...rest] = action.split("_");
  if (rest.length > 0 || !Object.hasOwn(VERBS, verb) || !CONTENT_KINDS.some((k) => k.value === kind)) return action;
  return VERBS[verb] + kindLabel(kind);
}

const TARGET_LABELS: Record<string, string> = { company: "สถานประกอบการ", upgrade: "คำขอยืนยันสิทธิ์", report: "ข้อร้องเรียน", user: "บัญชี" };

/** ชื่อ targetType ในประวัติและข้อความ */
export function targetLabel(type: string): string {
  return Object.hasOwn(TARGET_LABELS, type) ? TARGET_LABELS[type] : kindLabel(type);
}

// ---------- ข้อร้องเรียน ----------

export const REPORT_KINDS = [...CONTENT_KINDS, { value: "company", label: "สถานประกอบการ" }] as const;
export type ReportKind = (typeof REPORT_KINDS)[number]["value"];
export const REPORT_KIND_VALUES = REPORT_KINDS.map((k) => k.value) as [ReportKind, ...ReportKind[]];
export type ReportColumn = "reviewId" | "postId" | "commentId" | "jobId" | "companyId";
export const REPORT_COLUMN: Record<ReportKind, ReportColumn> = {
  review: "reviewId",
  post: "postId",
  comment: "commentId",
  job: "jobId",
  company: "companyId",
};

/** แถว Report → เป้าหมาย — มีคอลัมน์เป้าหมายได้คอลัมน์เดียว */
export function reportTarget(r: Record<ReportColumn, string | null>): { kind: ReportKind; id: string } | null {
  for (const k of REPORT_KINDS) {
    const id = r[REPORT_COLUMN[k.value]];
    if (id) return { kind: k.value, id };
  }
  return null;
}

export type ReportAction = "withdraw" | "resolve" | "dismiss";

/** สถานประกอบการไม่มีสถานะให้ถอน — ใช้ปิดเรื่องพร้อมบันทึกแทน */
export function reportActionError(kind: ReportKind, action: ReportAction): string | null {
  return action === "withdraw" && kind === "company" ? "สถานประกอบการถอนไม่ได้ ใช้ปิดเรื่องพร้อมบันทึกการจัดการแทน" : null;
}

/** หลักการโดเมนข้อ 4 — ผู้รายงานต้องรู้ผล */
export function reportNotice(kind: ReportKind, action: ReportAction, note: string) {
  const what = `รายงาน${targetLabel(kind)}ของคุณ`;
  const message =
    action === "withdraw"
      ? `${what}ได้รับการตรวจแล้ว ผู้ดูแลถอนเนื้อหานั้นออก: ${note}`
      : action === "resolve"
        ? `${what}ได้รับการจัดการแล้ว: ${note}`
        : `${what}ตรวจแล้วไม่พบการละเมิดกฎ: ${note}`;
  return { type: `report_${action}`, message, link: null };
}
```

- [ ] **Step 4: ตรวจ** — `node --test` → PASS ทั้งหมด · `npx tsc --noEmit` → ไม่มี error
- [ ] **Step 5: Checkpoint** — ห้าม commit

---

### Task 3: schema input + DAL

**Files:** Create `lib/reports.ts`, `lib/upgrades.ts`, `lib/users.ts` · Modify `lib/validation.ts`, `lib/moderation.ts`, `tests/route-guards.test.mjs`

**Interfaces — Produces:**
- `reportInputSchema → ReportInput { kind: ReportKind; id; reason }` · `reportDecisionSchema → ReportDecision { action: ReportAction; note }` · `upgradeFieldsSchema → UpgradeFields { studentId; department; educationLevel }` · `upgradeDecisionSchema → UpgradeDecision` · `userChangeSchema → AccountChange` · `userSearchSchema → { q; role?; page }` · `adminParamsSchema.tab` เพิ่ม `"upgrades" | "reports"`
- `createReport(input) → { id }` · `pendingReports()` · `resolveReport(id, input) → { status: "RESOLVED" | "DISMISSED" }`
- `myUpgradeRequests()` · `submitUpgrade(fields, card: File | null) → { id }` · `pendingUpgrades()` · `decideUpgrade(id, input) → { status }`
- `searchUsers(f) → { items; total; page; pageCount }` · `changeUser(id, change) → { ok: true }`

- [ ] **Step 1: เทสต์ guard ให้ล้มก่อน — `tests/route-guards.test.mjs`**

ใน `DAL` เพิ่ม:

```js
  "lib/reports.ts": [],
  "lib/upgrades.ts": [],
  "lib/users.ts": [],
```

แทน test `"การตัดสินของผู้ดูแลเขียนแจ้งเตือนและประวัติผ่าน helper กลางเท่านั้น"` ทั้งก้อนด้วย:

```js
test("Notification และ AuditLog ถูกเขียนผ่าน lib/admin.ts เท่านั้น และการกระทำของผู้ดูแลอยู่ในทรานแซกชัน", () => {
  const files = ["lib", "app"]
    .flatMap((d) => readdirSync(d, { recursive: true }).map((f) => `${d}/${String(f).replaceAll("\\", "/")}`))
    .filter((f) => /\.tsx?$/.test(f) && !f.startsWith("app/generated/") && f !== "lib/admin.ts");
  const direct = files.filter((f) => /\.(notification|auditLog)\.(create|createMany|upsert)\(/.test(readFileSync(f, "utf8")));
  assert.deepEqual(direct, []);
  for (const f of ["lib/moderation.ts", "lib/upgrades.ts", "lib/users.ts"]) {
    const src = readFileSync(f, "utf8");
    assert.match(src, /db\.\$transaction/, f);
    assert.match(src, /await logAdminAction\(tx,/, f);
  }
});
```

Run: `node --test` → FAIL (ไม่พบไฟล์ DAL ใหม่)

- [ ] **Step 2: `lib/validation.ts`**

แก้ import สองบรรทัด:

```ts
import { EDUCATION_LEVEL_VALUES, ROLE_VALUES } from "./account-rules";
import { CONTENT_KIND_VALUES, REPORT_KIND_VALUES } from "./moderation-rules";
```

(บรรทัดแรกเพิ่มใหม่ บรรทัดที่สองแทน `import { CONTENT_KIND_VALUES } from "./moderation-rules";`)

แทน `adminParamsSchema` ทั้งก้อนด้วย:

```ts
/** query string ของ /admin — ค่าผิดรูปแบบถูกเพิกเฉย */
export const adminParamsSchema = z.object({
  tab: z.enum(["pending", "upgrades", "reports", "history"]).catch("pending"),
  page: z.coerce.number().int().min(1).catch(1),
});

/** ข้อความจากคนถึงผู้ดูแลหรือจากผู้ดูแลถึงผู้ใช้ */
const adminText = (missing: string) =>
  z.string({ error: missing }).trim().min(5, "ข้อความอย่างน้อย 5 ตัวอักษร").max(500, "ข้อความไม่เกิน 500 ตัวอักษร");

export const reportInputSchema = z.object({
  kind: z.enum(REPORT_KIND_VALUES, { error: "ระบุสิ่งที่รายงาน" }),
  id: idSchema,
  reason: adminText("ระบุเหตุผลที่รายงาน"),
});
export type ReportInput = z.infer<typeof reportInputSchema>;

/** ทุกทางต้องมีบันทึก — ผู้รายงานเห็นในแจ้งเตือน (ถอน: เจ้าของเนื้อหาเห็นเป็นเหตุผลด้วย) */
export const reportDecisionSchema = z.object({
  action: z.enum(["withdraw", "resolve", "dismiss"], { error: "เลือกการจัดการ" }),
  note: adminText("เขียนบันทึกถึงผู้รายงาน"),
});
export type ReportDecision = z.infer<typeof reportDecisionSchema>;

/** multipart ของ /api/upgrades — รูปบัตรตรวจแยกด้วย photoError */
export const upgradeFieldsSchema = z.object({
  studentId: z.string({ error: "กรอกรหัสนักศึกษา" }).trim().regex(/^\d{5,15}$/, "รหัสนักศึกษาเป็นตัวเลข 5–15 หลัก"),
  department: z.enum(DEPARTMENT_VALUES, { error: "เลือกแผนกวิชา" }),
  educationLevel: z.enum(EDUCATION_LEVEL_VALUES, { error: "เลือกระดับการศึกษา" }),
});
export type UpgradeFields = z.infer<typeof upgradeFieldsSchema>;

export const upgradeDecisionSchema = z.discriminatedUnion(
  "decision",
  [z.object({ decision: z.literal("APPROVED") }), z.object({ decision: z.literal("REJECTED"), reason: adminText("ระบุเหตุผลที่ปฏิเสธ") })],
  { error: "เลือกอนุมัติหรือปฏิเสธ" },
);
export type UpgradeDecision = z.infer<typeof upgradeDecisionSchema>;

export const userChangeSchema = z.discriminatedUnion(
  "action",
  [
    z.object({ action: z.literal("set_role"), role: z.enum(ROLE_VALUES, { error: "เลือกบทบาท" }) }),
    z.object({ action: z.literal("ban") }),
    z.object({ action: z.literal("unban") }),
  ],
  { error: "เลือกการเปลี่ยนแปลง" },
);

/** query string ของ /admin/users — ค่าผิดรูปแบบถูกเพิกเฉย */
export const userSearchSchema = z.object({
  q: z.string().trim().transform((s) => s.slice(0, 100)).catch(""),
  role: z.enum(ROLE_VALUES).optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
});
```

- [ ] **Step 3: `lib/moderation.ts`** — แยก `applyDecision` และเพิ่มข้อร้องเรียน

แก้ import จาก `./moderation-rules` ให้เป็น:

```ts
import {
  AUDIT_PER_PAGE,
  CASCADE_REASON,
  REPORT_COLUMN,
  commentApproveError,
  commentSubtree,
  decisionNotice,
  excerpt,
  reportActionError,
  reportNotice,
  reportTarget,
  type ContentKind,
  type Decision,
  type NoticeTarget,
} from "./moderation-rules";
import type { ModerationInput, ReportDecision } from "./validation";
```

(ลบ `import type { ModerationInput } from "./validation";` เดิม)

แทนฟังก์ชัน `moderate` ทั้งก้อน (รวมคอมเมนต์เหนือมัน) ด้วย:

```ts
/** ตัดสินในทรานแซกชันของผู้เรียก — moderate() และ resolveReport() ใช้ตัวเดียวกัน ไม่มีตรรกะถอนชุดที่สอง */
async function applyDecision(tx: Tx, adminId: string, kind: ContentKind, id: string, input: ModerationInput) {
  const reason = input.decision === "REJECTED" ? input.reason : null;
  // ตัดสินได้เฉพาะเมื่อสถานะยังเป็นอย่างที่ผู้ดูแลเห็นตอนกด — ผู้ดูแลสองคนกดพร้อมกันหรือหน้าค้าง ไม่ตัดสินทับกัน
  const check = (cur: Current) => {
    if (cur.status !== input.from || cur.status === input.decision) throw new UserError(409, STALE);
  };
  const { affected, detail = reason } = await DECIDE[kind](tx, id, input.decision, reason, check);
  for (const a of affected) await notify(tx, a.userId, decisionNotice(a.target, input.decision, a.reason ?? reason));
  await logAdminAction(tx, adminId, `${input.decision === "APPROVED" ? "approve" : "reject"}_${kind}`, { type: kind, id }, detail);
}

/** ตัดสินเนื้อหาหนึ่งชิ้นจากคิวตรวจ — from ค่าเริ่มต้น PENDING */
export async function moderate(kind: ContentKind, id: string, input: ModerationInput): Promise<{ status: Decision }> {
  const admin = await requireAdmin();
  try {
    await db.$transaction((tx) => applyDecision(tx, admin.id, kind, id, input));
  } catch (e) {
    if (isPrismaError(e, "P2002")) throw new UserError(409, OPEN_TAKEN);
    throw e;
  }
  return { status: input.decision };
}
```

ต่อท้ายไฟล์:

```ts
// ---------- ข้อร้องเรียน ----------

export async function pendingReports() {
  await requireAdmin();
  return db.report.findMany({
    where: PENDING,
    ...QUEUE,
    select: {
      id: true,
      reason: true,
      createdAt: true,
      reporter: WHO,
      reviewId: true,
      postId: true,
      commentId: true,
      jobId: true,
      companyId: true,
      review: { select: { status: true, textWork: true, companyId: true, company: { select: { name: true } } } },
      post: { select: { status: true, title: true } },
      comment: { select: { status: true, body: true, postId: true } },
      job: { select: { status: true, title: true } },
      company: { select: { name: true } },
    },
  });
}

/** จัดการข้อร้องเรียน — ถอนเนื้อหาผ่าน applyDecision แล้วปิดทุกข้อร้องเรียนที่รอของเนื้อหาชิ้นนั้น · ทางอื่นปิดเฉพาะเรื่องนี้ */
export async function resolveReport(id: string, input: ReportDecision): Promise<{ status: "RESOLVED" | "DISMISSED" }> {
  const admin = await requireAdmin();
  const status = input.action === "dismiss" ? "DISMISSED" : "RESOLVED";
  try {
    await db.$transaction(async (tx) => {
      const r = await tx.report.findUnique({
        where: { id },
        select: { status: true, reporterId: true, reviewId: true, postId: true, commentId: true, jobId: true, companyId: true },
      });
      if (!r) throw new UserError(404, "ไม่พบข้อร้องเรียน");
      if (r.status !== "PENDING") throw new UserError(409, "ข้อร้องเรียนนี้ถูกจัดการไปแล้ว รีเฟรชหน้าเพื่อดูสถานะล่าสุด");
      const target = reportTarget(r);
      if (!target) throw new UserError(404, "ไม่พบเนื้อหาที่ถูกรายงาน");
      const err = reportActionError(target.kind, input.action);
      if (err) throw new UserError(400, err);

      let closing = [{ id, reporterId: r.reporterId }];
      if (input.action === "withdraw" && target.kind !== "company") {
        await applyDecision(tx, admin.id, target.kind, target.id, { decision: "REJECTED", from: "APPROVED", reason: input.note });
        closing = await tx.report.findMany({
          where: { status: "PENDING", [REPORT_COLUMN[target.kind]]: target.id } as Prisma.ReportWhereInput,
          select: { id: true, reporterId: true },
        });
      }
      await tx.report.updateMany({ where: { id: { in: closing.map((c) => c.id) } }, data: { status, resolution: input.note } });
      for (const c of closing) await notify(tx, c.reporterId, reportNotice(target.kind, input.action, input.note));
      await logAdminAction(tx, admin.id, `${input.action}_report`, { type: "report", id }, input.note);
    });
  } catch (e) {
    if (isPrismaError(e, "P2002")) throw new UserError(409, OPEN_TAKEN);
    throw e;
  }
  return { status };
}
```

- [ ] **Step 4: `lib/reports.ts`**

```ts
import type { Prisma } from "@/app/generated/prisma/client";
import { requireUser } from "./auth";
import { db, isPrismaError } from "./db";
import { UserError } from "./http";
import { REPORT_COLUMN, type ReportKind } from "./moderation-rules";
import type { ReportInput } from "./validation";

// ผู้ใช้รายงานเนื้อหาที่ตัวเองมองเห็นได้ — มองไม่เห็น = 404 เหมือนไม่มี ไม่ให้เดา id
// รายงานซ้ำบังคับด้วย @@unique([reporterId, <เป้าหมาย>Id]) ที่ฐานข้อมูล

const NOT_FOUND = "ไม่พบเนื้อหานี้";
const APPROVED = { status: "APPROVED" } as const;

function seen<T>(row: T | null): T {
  if (!row) throw new UserError(404, NOT_FOUND);
  return row;
}

/** เจ้าของเนื้อหาที่เผยแพร่อยู่ (สถานประกอบการไม่มีเจ้าของ = null) */
async function visibleOwner(kind: ReportKind, id: string): Promise<string | null> {
  switch (kind) {
    case "review":
      return seen(await db.review.findFirst({ where: { id, ...APPROVED }, select: { userId: true } })).userId;
    case "post":
      return seen(await db.communityPost.findFirst({ where: { id, ...APPROVED }, select: { userId: true } })).userId;
    case "comment":
      return seen(await db.communityComment.findFirst({ where: { id, ...APPROVED, post: APPROVED }, select: { userId: true } })).userId;
    case "job":
      return seen(await db.jobPosting.findFirst({ where: { id, ...APPROVED, isActive: true }, select: { employer: { select: { userId: true } } } }))
        .employer.userId;
    case "company":
      // เห็นได้เมื่อยืนยันแล้วหรือมีรีวิวที่เผยแพร่ (isListed ใน lib/company-rules.ts)
      seen(await db.company.findFirst({ where: { id, OR: [{ isVerified: true }, { reviews: { some: APPROVED } }] }, select: { id: true } }));
      return null;
  }
}

export async function createReport(input: ReportInput): Promise<{ id: string }> {
  const user = await requireUser();
  // รีวิว บอร์ด และหน้าสถานประกอบการเปิดเฉพาะนักศึกษาและผู้ดูแล — บุคคลภายนอกรายงานได้เฉพาะประกาศงาน
  if (user.role === "EXTERNAL" && input.kind !== "job") throw new UserError(404, NOT_FOUND);
  if ((await visibleOwner(input.kind, input.id)) === user.id) throw new UserError(400, "รายงานเนื้อหาของตัวเองไม่ได้");
  try {
    return await db.report.create({
      data: { reporterId: user.id, reason: input.reason, [REPORT_COLUMN[input.kind]]: input.id } as Prisma.ReportUncheckedCreateInput,
      select: { id: true },
    });
  } catch (e) {
    if (isPrismaError(e, "P2002")) throw new UserError(409, "คุณรายงานเนื้อหานี้แล้ว ผู้ดูแลกำลังตรวจสอบ");
    throw e;
  }
}
```

- [ ] **Step 5: `lib/upgrades.ts`**

```ts
import { upgradeNotice } from "./account-rules";
import { logAdminAction, notify } from "./admin";
import { requireAdmin, requireRole, requireUser } from "./auth";
import { uploadImage, uploadsEnabled } from "./cloudinary";
import { db, isPrismaError } from "./db";
import { UserError } from "./http";
import { photoError } from "./review-rules";
import type { UpgradeDecision, UpgradeFields } from "./validation";

// คำขอยืนยันสิทธิ์นักศึกษา (สเปกข้อ 11) — ยื่นได้เฉพาะบุคคลภายนอก ที่รอตรวจได้ครั้งละหนึ่ง (UpgradeRequest_one_pending)
// ponytail: รูปบัตรอัปโหลดเป็นรูปสาธารณะของ Cloudinary (URL เดาไม่ได้) แสดงเฉพาะผู้ดูแล — ถ้าต้องปิดจริงใช้ type "authenticated" + signed URL

const CARD_FOLDER = "htc-insights/student-cards";
const PENDING_EXISTS = "คุณมีคำขอที่รอตรวจอยู่แล้ว ติดตามสถานะได้ที่หน้านี้";

/** คำขอทุกสถานะของผู้ใช้เอง — ให้ติดตามผล */
export async function myUpgradeRequests() {
  const user = await requireUser();
  return db.upgradeRequest.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, studentId: true, department: true, educationLevel: true, status: true, rejectionReason: true, createdAt: true },
  });
}

export async function submitUpgrade(fields: UpgradeFields, card: File | null): Promise<{ id: string }> {
  const user = await requireRole("EXTERNAL");
  if (!uploadsEnabled()) throw new UserError(400, "ระบบยังไม่เปิดรับคำขอยืนยันสิทธิ์ ติดต่อผู้ดูแล");
  if (!card) throw new UserError(400, "แนบรูปบัตรนักศึกษา");
  const err = photoError([card]);
  if (err) throw new UserError(400, err);
  // เช็คก่อนอัปโหลดกันรูปค้าง — ตัวตัดสินจริงคือ unique index ที่จับ P2002 ข้างล่าง
  if (await db.upgradeRequest.findFirst({ where: { userId: user.id, status: "PENDING" }, select: { id: true } })) {
    throw new UserError(409, PENDING_EXISTS);
  }
  const cardImageUrl = await uploadImage(card, CARD_FOLDER);
  try {
    return await db.upgradeRequest.create({ data: { ...fields, userId: user.id, cardImageUrl }, select: { id: true } });
  } catch (e) {
    if (isPrismaError(e, "P2002")) throw new UserError(409, PENDING_EXISTS);
    throw e;
  }
}

export async function pendingUpgrades() {
  await requireAdmin();
  // ponytail: 50 คำขอเก่าสุดก่อน เหมือนคิวเนื้อหา
  return db.upgradeRequest.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: 50,
    select: {
      id: true,
      studentId: true,
      department: true,
      educationLevel: true,
      cardImageUrl: true,
      createdAt: true,
      user: { select: { name: true, email: true, role: true } },
    },
  });
}

/** อนุมัติ = บทบาทนักศึกษา + ข้อมูลนักศึกษา · ทั้งหมดพร้อมแจ้งเตือนและประวัติในทรานแซกชันเดียว */
export async function decideUpgrade(id: string, input: UpgradeDecision): Promise<{ status: "APPROVED" | "REJECTED" }> {
  const admin = await requireAdmin();
  const reason = input.decision === "REJECTED" ? input.reason : null;
  await db.$transaction(async (tx) => {
    const r = await tx.upgradeRequest.findUnique({
      where: { id },
      select: { status: true, userId: true, studentId: true, department: true, educationLevel: true, user: { select: { role: true } } },
    });
    if (!r) throw new UserError(404, "ไม่พบคำขอ");
    if (r.status !== "PENDING") throw new UserError(409, "คำขอนี้ถูกตัดสินไปแล้ว รีเฟรชหน้าเพื่อดูสถานะล่าสุด");
    if (input.decision === "APPROVED") {
      if (r.user.role !== "EXTERNAL") throw new UserError(409, "บัญชีนี้ไม่ใช่บุคคลภายนอกแล้ว ปฏิเสธคำขอแทน");
      await tx.user.update({
        where: { id: r.userId },
        data: { role: "STUDENT", studentId: r.studentId, department: r.department, educationLevel: r.educationLevel },
      });
    }
    await tx.upgradeRequest.update({ where: { id }, data: { status: input.decision, rejectionReason: reason } });
    await notify(tx, r.userId, upgradeNotice(input.decision, reason));
    await logAdminAction(tx, admin.id, `${input.decision === "APPROVED" ? "approve" : "reject"}_upgrade`, { type: "upgrade", id }, reason ?? `${r.studentId} ${r.educationLevel}`);
  });
  return { status: input.decision };
}
```

- [ ] **Step 6: `lib/users.ts`**

```ts
import { USERS_PER_PAGE, accountChangeError, roleNotice, type AccountChange } from "./account-rules";
import { logAdminAction, notify } from "./admin";
import { requireAdmin } from "./auth";
import { pageWindow } from "./community-rules";
import { db } from "./db";
import { UserError } from "./http";
import type { Role } from "./nav";

// จัดการบัญชี (สเปกข้อ 17–18) — สิทธิ์ตัดสินที่ accountChangeError ตัวเดียว
// คนถูกระงับเข้าระบบไม่ได้ทันที: getCurrentUser คืน null เมื่อ isBanned (lib/session.ts)

export async function searchUsers(f: { q: string; role?: Role; page: number }) {
  await requireAdmin();
  // SQLite ไม่มี mode: "insensitive" — LIKE ไม่สนตัวพิมพ์เล็กใหญ่ของอังกฤษอยู่แล้ว
  const where = { role: f.role, ...(f.q ? { OR: [{ name: { contains: f.q } }, { email: { contains: f.q } }] } : {}) };
  const total = await db.user.count({ where });
  const w = pageWindow(f.page, total, USERS_PER_PAGE);
  const items = await db.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: w.skip,
    take: w.take,
    select: { id: true, name: true, email: true, role: true, isSuperAdmin: true, isBanned: true, studentId: true, department: true, createdAt: true },
  });
  return { items, total, page: w.page, pageCount: w.pageCount };
}

export async function changeUser(id: string, change: AccountChange): Promise<{ ok: true }> {
  const admin = await requireAdmin();
  await db.$transaction(async (tx) => {
    const target = await tx.user.findUnique({ where: { id }, select: { id: true, role: true, isSuperAdmin: true, isBanned: true } });
    if (!target) throw new UserError(404, "ไม่พบบัญชี");
    const err = accountChangeError(admin, target, change);
    if (err) throw new UserError(err.status, err.message);
    if (change.action === "set_role") {
      await tx.user.update({ where: { id }, data: { role: change.role } });
      await notify(tx, id, roleNotice(change.role));
      await logAdminAction(tx, admin.id, "change_role", { type: "user", id }, `${target.role} → ${change.role}`);
    } else {
      await tx.user.update({ where: { id }, data: { isBanned: change.action === "ban" } });
      await logAdminAction(tx, admin.id, `${change.action}_user`, { type: "user", id });
    }
  });
  return { ok: true };
}
```

- [ ] **Step 7: ตรวจ** — `npx tsc --noEmit` · `node --test` → PASS ทั้งหมด
- [ ] **Step 8: Checkpoint** — ห้าม commit

---

### Task 4: Route Handler 5 ตัว + ตรวจกับฐานข้อมูลจริง

**Files:** Create routes ตาม File Structure

- [ ] **Step 1: `app/api/reports/route.ts`**

```ts
import { requireUser } from "@/lib/auth";
import { parseJson, userErrorResponse } from "@/lib/http";
import { createReport } from "@/lib/reports";
import { reportInputSchema } from "@/lib/validation";

/** รายงานเนื้อหาไม่เหมาะสม — ผู้ดูแลตรวจที่แท็บข้อร้องเรียน */
export async function POST(req: Request) {
  await requireUser();
  const input = await parseJson(req, reportInputSchema);
  if (input instanceof Response) return input;
  try {
    return Response.json(await createReport(input), { status: 201 });
  } catch (e) {
    return userErrorResponse(e);
  }
}
```

- [ ] **Step 2: `app/api/upgrades/route.ts`**

```ts
import { requireRole } from "@/lib/auth";
import { badRequest, userErrorResponse } from "@/lib/http";
import { submitUpgrade } from "@/lib/upgrades";
import { upgradeFieldsSchema } from "@/lib/validation";

/** ยื่นคำขอยืนยันสิทธิ์นักศึกษา — multipart: studentId department educationLevel + card */
export async function POST(req: Request) {
  await requireRole("EXTERNAL");
  const fd = await req.formData().catch(() => null);
  if (!fd) return badRequest("รูปแบบข้อมูลไม่ถูกต้อง");
  const fields = upgradeFieldsSchema.safeParse(Object.fromEntries([...fd].filter(([, v]) => typeof v === "string")));
  if (!fields.success) return badRequest(fields.error.issues[0].message);
  // ช่องไฟล์ที่ไม่ได้เลือกรูป เบราว์เซอร์ส่งไฟล์ว่างขนาด 0 มา
  const card = fd.get("card");
  try {
    return Response.json(await submitUpgrade(fields.data, card instanceof File && card.size > 0 ? card : null), { status: 201 });
  } catch (e) {
    return userErrorResponse(e);
  }
}
```

- [ ] **Step 3: `app/api/admin/reports/[id]/route.ts`**

```ts
import { requireAdmin } from "@/lib/auth";
import { parseJson, userErrorResponse } from "@/lib/http";
import { resolveReport } from "@/lib/moderation";
import { idSchema, reportDecisionSchema } from "@/lib/validation";

/** ผู้ดูแลจัดการข้อร้องเรียน — ถอนเนื้อหา ปิดเรื่อง หรือไม่ผิดกฎ */
export async function POST(req: Request, ctx: RouteContext<"/api/admin/reports/[id]">) {
  await requireAdmin();
  const id = idSchema.safeParse((await ctx.params).id);
  if (!id.success) return Response.json({ error: "ไม่พบข้อร้องเรียน" }, { status: 404 });
  const input = await parseJson(req, reportDecisionSchema);
  if (input instanceof Response) return input;
  try {
    return Response.json(await resolveReport(id.data, input));
  } catch (e) {
    return userErrorResponse(e);
  }
}
```

- [ ] **Step 4: `app/api/admin/upgrades/[id]/route.ts`**

```ts
import { requireAdmin } from "@/lib/auth";
import { parseJson, userErrorResponse } from "@/lib/http";
import { decideUpgrade } from "@/lib/upgrades";
import { idSchema, upgradeDecisionSchema } from "@/lib/validation";

/** ผู้ดูแลอนุมัติหรือปฏิเสธคำขอยืนยันสิทธิ์นักศึกษา */
export async function POST(req: Request, ctx: RouteContext<"/api/admin/upgrades/[id]">) {
  await requireAdmin();
  const id = idSchema.safeParse((await ctx.params).id);
  if (!id.success) return Response.json({ error: "ไม่พบคำขอ" }, { status: 404 });
  const input = await parseJson(req, upgradeDecisionSchema);
  if (input instanceof Response) return input;
  try {
    return Response.json(await decideUpgrade(id.data, input));
  } catch (e) {
    return userErrorResponse(e);
  }
}
```

- [ ] **Step 5: `app/api/admin/users/[id]/route.ts`**

```ts
import { requireAdmin } from "@/lib/auth";
import { parseJson, userErrorResponse } from "@/lib/http";
import { changeUser } from "@/lib/users";
import { idSchema, userChangeSchema } from "@/lib/validation";

/** เปลี่ยนบทบาท ระงับ หรือยกเลิกการระงับบัญชี — สิทธิ์ตัดสินใน accountChangeError */
export async function POST(req: Request, ctx: RouteContext<"/api/admin/users/[id]">) {
  await requireAdmin();
  const id = idSchema.safeParse((await ctx.params).id);
  if (!id.success) return Response.json({ error: "ไม่พบบัญชี" }, { status: 404 });
  const input = await parseJson(req, userChangeSchema);
  if (input instanceof Response) return input;
  try {
    return Response.json(await changeUser(id.data, input));
  } catch (e) {
    return userErrorResponse(e);
  }
}
```

Run: `npx next typegen` → `npx tsc --noEmit` · `node --test` → ผ่าน

- [ ] **Step 6: รีสตาร์ต dev server + seed + session**

`preview_stop` แล้ว `preview_start` `next-dev` (client ใหม่หลัง generate) แล้ว:

```bash
npx jiti prisma/seed.ts
npx prisma db execute --stdin <<'EOF'
INSERT OR REPLACE INTO "Session" (id, sessionToken, userId, expires) VALUES
  ('dev_s_b1', 'dev-p6b-admin', 'seed_admin', '2099-01-01T00:00:00.000Z'),
  ('dev_s_b2', 'dev-p6b-super', 'seed_super', '2099-01-01T00:00:00.000Z'),
  ('dev_s_b3', 'dev-p6b-u1', 'seed_u1', '2099-01-01T00:00:00.000Z'),
  ('dev_s_b4', 'dev-p6b-u2', 'seed_u2', '2099-01-01T00:00:00.000Z'),
  ('dev_s_b5', 'dev-p6b-u3', 'seed_u3', '2099-01-01T00:00:00.000Z'),
  ('dev_s_b6', 'dev-p6b-e1', 'seed_e1', '2099-01-01T00:00:00.000Z'),
  ('dev_s_b7', 'dev-p6b-e2', 'seed_e2', '2099-01-01T00:00:00.000Z');
EOF
```

- [ ] **Step 7: สคริปต์ `phase6b-api.mjs`** (ใน workspace ของแผน) — รันหลัง seed ทุกครั้ง

```js
import { DatabaseSync } from "node:sqlite";

const BASE = "http://localhost:3000";
const S = { admin: "dev-p6b-admin", superA: "dev-p6b-super", u1: "dev-p6b-u1", u2: "dev-p6b-u2", u3: "dev-p6b-u3", e1: "dev-p6b-e1", e2: "dev-p6b-e2" };
const sq = new DatabaseSync("prisma/dev.db", { readOnly: true });
const one = (sql, ...p) => sq.prepare(sql).get(...p);
const all = (sql, ...p) => sq.prepare(sql).all(...p);
const notes = (userId, type) => one(`SELECT count(*) c FROM "Notification" WHERE userId = ? AND type = ?`, userId, type).c;
const audits = (action) => one(`SELECT count(*) c FROM "AuditLog" WHERE action = ?`, action).c;
const cookie = (token) => (token ? { cookie: `authjs.session-token=${token}` } : {});

async function call(method, path, token, body) {
  const res = await fetch(BASE + path, { method, headers: { "content-type": "application/json", ...cookie(token) }, body: JSON.stringify(body) });
  return { status: res.status, json: await res.json().catch(() => null) };
}
async function page(path, token) {
  const res = await fetch(BASE + path, { headers: cookie(token) });
  return { status: res.status, html: await res.text() };
}
function check(label, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? "PASS" : "FAIL"} ${label}: ${JSON.stringify(got)}${ok ? "" : ` (ต้องการ ${JSON.stringify(want)})`}`);
  if (!ok) process.exitCode = 1;
}
const report = (token, kind, id, reason = "P6BTEST เนื้อหาไม่เหมาะสมกับเว็บนี้") => call("POST", "/api/reports", token, { kind, id, reason });
const resolve = (id, action, note = "P6BTEST ตรวจสอบแล้วตามข้อร้องเรียน", token = S.admin) => call("POST", `/api/admin/reports/${id}`, token, { action, note });
const decide = (id, body, token = S.admin) => call("POST", `/api/admin/upgrades/${id}`, token, body);
const change = (id, body, token = S.admin) => call("POST", `/api/admin/users/${id}`, token, body);

// --- รายงาน (ผู้ใช้) ---
check("ไม่ล็อกอินรายงาน", (await report(null, "job", "seed_j1")).status, 401);
check("kind มั่ว", (await report(S.u1, "user", "seed_u2")).status, 400);
check("เหตุผลสั้นเกิน", (await report(S.u1, "post", "seed_post2", "สั้น")).status, 400);
check("รายงานรีวิวของตัวเอง", (await report(S.u1, "review", "seed_r1")).status, 400);
check("รายงานซ้ำ (มี rp1 แล้ว)", (await report(S.u1, "review", "seed_r2")).status, 409);
check("รีวิวที่รอตรวจ", (await report(S.u1, "review", "seed_r4")).status, 404);
check("ความคิดเห็นที่รอตรวจ", (await report(S.u1, "comment", "seed_cm3")).status, 404);
check("ประกาศที่ปิดรับ", (await report(S.u1, "job", "seed_j5")).status, 404);
check("รายงานกระทู้", (await report(S.u3, "post", "seed_post2")).status, 201);
check("รายงานกระทู้ซ้ำ", (await report(S.u3, "post", "seed_post2")).status, 409);
check("บุคคลภายนอกรายงานรีวิว", (await report(S.e2, "review", "seed_r2")).status, 404);
check("บุคคลภายนอกรายงานประกาศของตัวเอง", (await report(S.e1, "job", "seed_j2")).status, 400);
check("บุคคลภายนอกรายงานประกาศ", (await report(S.e2, "job", "seed_j1")).status, 201);
check("รายงานสถานประกอบการ", (await report(S.u3, "company", "seed_c4")).status, 201);

// --- ข้อร้องเรียน (ผู้ดูแล) ---
check("นักศึกษาจัดการข้อร้องเรียน", (await resolve("seed_rp1", "dismiss", undefined, S.u1)).status, 403);
check("บันทึกสั้นเกิน", (await resolve("seed_rp1", "dismiss", "สั้น")).status, 400);
check("ถอนสถานประกอบการ", (await resolve("seed_rp4", "withdraw")).status, 400);
check("ปิดเรื่องสถานประกอบการ", (await resolve("seed_rp4", "resolve")).status, 200);
check("แจ้ง u1 ว่าปิดเรื่องแล้ว", notes("seed_u1", "report_resolve"), 1);
check("ถอนรีวิว r2 จาก rp1", (await resolve("seed_rp1", "withdraw")).status, 200);
check("r2 ถูกปฏิเสธ", one(`SELECT status FROM "Review" WHERE id='seed_r2'`).status, "REJECTED");
check("rp1 rp2 ปิดพร้อมกัน", all(`SELECT status FROM "Report" WHERE id IN ('seed_rp1','seed_rp2') ORDER BY id`).map((r) => r.status), ["RESOLVED", "RESOLVED"]);
check("แจ้งเจ้าของรีวิว u2", notes("seed_u2", "review_rejected"), 1);
check("แจ้งผู้รายงานทั้งสอง", [notes("seed_u1", "report_withdraw"), notes("seed_u3", "report_withdraw")], [1, 1]);
check("ประวัติ reject_review + withdraw_report", [audits("reject_review"), audits("withdraw_report")], [1, 1]);
check("จัดการ rp2 ซ้ำ", (await resolve("seed_rp2", "dismiss")).status, 409);
check("ไม่ผิดกฎ rp3", (await resolve("seed_rp3", "dismiss")).status, 200);
check("cm6 ยังเผยแพร่", one(`SELECT status FROM "CommunityComment" WHERE id='seed_cm6'`).status, "APPROVED");
check("แจ้ง u2 ว่าไม่ผิดกฎ", notes("seed_u2", "report_dismiss"), 1);

// --- คำขอยืนยันสิทธิ์ ---
async function sendCard(token) {
  const fd = new FormData();
  fd.append("studentId", "65201234567");
  fd.append("department", "แผนกวิชาเทคโนโลยีสารสนเทศ");
  fd.append("educationLevel", "ปวส.");
  fd.append("card", new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: "image/jpeg" }), "card.jpg");
  const res = await fetch(BASE + "/api/upgrades", { method: "POST", headers: cookie(token), body: fd });
  return { status: res.status, json: await res.json().catch(() => null) };
}
check("นักศึกษายื่นคำขอ", (await sendCard(S.u1)).status, 403);
const noKeys = await sendCard(S.e1);
check("ไม่มีคีย์ Cloudinary ปิดรับคำขอ", [noKeys.status, Boolean(noKeys.json?.error?.includes("ยังไม่เปิดรับ"))], [400, true]);
check("หน้า upgrade ของ e1 บอกว่ายังเปิดรับไม่ได้", (await page("/profile/upgrade", S.e1)).html.includes("ยังเปิดรับคำขอไม่ได้"), true);
check("e2 เห็นคำขอที่รอตรวจ", (await page("/profile/upgrade", S.e2)).html.includes("65201234567"), true);
check("อนุมัติคำขอที่ถูกปฏิเสธแล้ว", (await decide("seed_up2", { decision: "APPROVED" })).status, 409);
check("ปฏิเสธไม่มีเหตุผล", (await decide("seed_up1", { decision: "REJECTED" })).status, 400);
check("นักศึกษาอนุมัติคำขอ", (await decide("seed_up1", { decision: "APPROVED" }, S.u1)).status, 403);
check("อนุมัติ up1", (await decide("seed_up1", { decision: "APPROVED" })).status, 200);
const e2 = one(`SELECT role, studentId, educationLevel FROM "User" WHERE id='seed_e2'`);
check("e2 เป็นนักศึกษาพร้อมข้อมูล", [e2.role, e2.studentId, e2.educationLevel], ["STUDENT", "65201234567", "ปวส."]);
check("แจ้ง e2", notes("seed_e2", "upgrade_approved"), 1);
check("อนุมัติซ้ำ", (await decide("seed_up1", { decision: "APPROVED" })).status, 409);
check("e2 เข้าชุมชนได้แล้ว", (await page("/community", S.e2)).status, 200);

// --- จัดการบัญชี ---
check("นักศึกษาจัดการบัญชี", (await change("seed_u2", { action: "ban" }, S.u1)).status, 403);
check("บทบาทมั่ว", (await change("seed_u1", { action: "set_role", role: "OWNER" })).status, 400);
check("บัญชีไม่มีจริง", (await change("nope", { action: "ban" })).status, 404);
check("แก้บัญชีตัวเอง", (await change("seed_admin", { action: "set_role", role: "STUDENT" })).status, 403);
check("แก้ผู้ดูแลระดับสูง", (await change("seed_super", { action: "ban" })).status, 403);
check("เปลี่ยน u1 เป็นบุคคลภายนอก", (await change("seed_u1", { action: "set_role", role: "EXTERNAL" })).status, 200);
check("u1 เป็น EXTERNAL", one(`SELECT role FROM "User" WHERE id='seed_u1'`).role, "EXTERNAL");
check("แจ้ง u1 เรื่องบทบาท", notes("seed_u1", "role_changed"), 1);
check("u1 เข้าชุมชนไม่ได้แล้ว", (await page("/community", S.u1)).status, 403);
check("เปลี่ยนซ้ำ", (await change("seed_u1", { action: "set_role", role: "EXTERNAL" })).status, 409);
check("ผู้ดูแลธรรมดาแต่งตั้งผู้ดูแล", (await change("seed_u3", { action: "set_role", role: "ADMIN" })).status, 403);
check("ผู้ดูแลระดับสูงแต่งตั้ง u3", (await change("seed_u3", { action: "set_role", role: "ADMIN" }, S.superA)).status, 200);
check("u3 เข้า /admin ได้", (await page("/admin", S.u3)).status, 200);
check("ผู้ดูแลธรรมดาระงับผู้ดูแล u3", (await change("seed_u3", { action: "ban" })).status, 403);
check("ผู้ดูแลระดับสูงถอดถอน u3", (await change("seed_u3", { action: "set_role", role: "STUDENT" }, S.superA)).status, 200);
check("ระงับ u2", (await change("seed_u2", { action: "ban" })).status, 200);
check("u2 ถูกระงับ = เหมือนออกจากระบบ", (await page("/profile", S.u2)).status, 401);
check("ระงับซ้ำ", (await change("seed_u2", { action: "ban" })).status, 409);
check("ยกเลิกระงับ u2", (await change("seed_u2", { action: "unban" })).status, 200);
check("u2 กลับมาใช้ได้", (await page("/profile", S.u2)).status, 200);
check("ประวัติบัญชี", [audits("change_role"), audits("ban_user"), audits("unban_user")], [3, 1, 1]);
check("ค้นหาบัญชี", (await page(`/admin/users?q=${encodeURIComponent("seed-e")}`, S.admin)).html.includes("seed-e1@example.invalid"), true);
check("กรองบทบาทผู้ดูแล", (await page("/admin/users?role=ADMIN", S.admin)).html.includes("seed-1@example.invalid"), false);
```

Expected: ทุกบรรทัด PASS (บรรทัดสองบรรทัดสุดท้ายผ่านหลัง Task 6 — ใน Task นี้ `/admin/users` ยังเป็นหน้าเดิม)

- [ ] **Step 8: Checkpoint** — ห้าม commit

---

### Task 5: ฝั่งผู้ใช้ — ปุ่มรายงาน + หน้ายืนยันสิทธิ์

**Files:** Create `components/ReportButton.tsx`, `components/UpgradeForm.tsx`, `components/StatusBadge.tsx` · Modify `app/insights/[id]/page.tsx`, `app/community/[id]/page.tsx`, `app/jobs/[id]/page.tsx`, `app/profile/page.tsx` · Rewrite `app/profile/upgrade/page.tsx`

- [ ] **Step 1: `components/StatusBadge.tsx`**

```tsx
import { Badge } from "@/components/ui/Badge";

const STATUS = {
  PENDING: { tone: "warning", label: "รอตรวจ" },
  APPROVED: { tone: "success", label: "เผยแพร่แล้ว" },
  REJECTED: { tone: "danger", label: "ไม่ผ่านการตรวจ" },
} as const;

/** ป้ายสถานะการตรวจ — approvedLabel ใช้กับสิ่งที่ไม่ได้ "เผยแพร่" เช่นคำขอยืนยันสิทธิ์ */
export function StatusBadge({ status, approvedLabel }: { status: keyof typeof STATUS; approvedLabel?: string }) {
  const s = STATUS[status];
  return <Badge tone={s.tone}>{status === "APPROVED" && approvedLabel ? approvedLabel : s.label}</Badge>;
}
```

- [ ] **Step 2: `app/profile/page.tsx`** — ใช้ของกลาง
  - ลบบล็อก `const ROLE_LABEL: Record<Role, string> = {...};` และ `const STATUS = {...} as const;` และบรรทัด `import type { Role } from "@/lib/nav";`
  - เพิ่ม import `import { StatusBadge } from "@/components/StatusBadge";` และ `import { ROLE_LABELS } from "@/lib/account-rules";`
  - `{ROLE_LABEL[user.role]}` → `{ROLE_LABELS[user.role]}`
  - ทุก `<Badge tone={STATUS[X.status].tone}>{STATUS[X.status].label}</Badge>` (สามที่: r p j) → `<StatusBadge status={X.status} />`

- [ ] **Step 3: `components/ReportButton.tsx`**

```tsx
"use client";

import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import type { ReportKind } from "@/lib/moderation-rules";

/** รายงานเนื้อหาไม่เหมาะสม (สเปกข้อ 12) — พับไว้จนกดเปิด เซิร์ฟเวอร์ตรวจสิทธิ์และรายงานซ้ำเอง */
export function ReportButton({ kind, id }: { kind: ReportKind; id: string }) {
  const fieldId = useId();
  const [reason, setReason] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function send(e: FormEvent) {
    e.preventDefault();
    setState("sending");
    setError(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, id, reason }),
      });
      if (res.ok) {
        setState("sent");
        return;
      }
      setError(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "ส่งไม่สำเร็จ ลองอีกครั้ง");
    } catch {
      setError("เชื่อมต่อไม่ได้ ลองอีกครั้ง");
    }
    setState("idle");
  }

  if (state === "sent") {
    return (
      <p role="status" className="text-small text-ink-muted">
        ส่งรายงานแล้ว ผู้ดูแลจะตรวจสอบและแจ้งผลให้ทราบ
      </p>
    );
  }
  return (
    <details className="text-small">
      <summary className="kn-link cursor-pointer">รายงาน</summary>
      <form onSubmit={send} className="mt-2 flex flex-col gap-2">
        <label className="kn-field-label" htmlFor={fieldId}>
          เหตุผลที่รายงาน (ผู้ดูแลเห็นคนเดียว)
        </label>
        <textarea
          id={fieldId}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
          minLength={5}
          maxLength={500}
          rows={3}
          className="kn-input h-auto py-3"
        />
        {error && (
          <p role="alert" className="text-danger">
            {error}
          </p>
        )}
        <div>
          <Button type="submit" disabled={state === "sending" || reason.trim().length < 5}>
            ส่งรายงาน
          </Button>
        </div>
      </form>
    </details>
  );
}
```

- [ ] **Step 4: วางปุ่มรายงาน**
  - `app/insights/[id]/page.tsx`: import `ReportButton` · ต่อจากบล็อก `{c.isVerified && (...ยืนยันโดยวิทยาลัยแล้ว...)}` เพิ่ม `<ReportButton kind="company" id={c.id} />` · ใน `ReviewCard` ก่อน `    </Card>` สุดท้าย เพิ่ม `      <ReportButton kind="review" id={r.id} />`
  - `app/community/[id]/page.tsx`: import `ReportButton` · แทนบรรทัด `{approved && <LikeButton target={{ postId: post.id }} ... />}` ด้วย

```tsx
      {approved && (
        <div className="flex flex-wrap items-center gap-4">
          <LikeButton target={{ postId: post.id }} liked={post.liked} count={post.likeCount} disabled={!canAct} />
          {canAct && post.userId !== viewerId && <ReportButton kind="post" id={post.id} />}
        </div>
      )}
```

    และต่อจากบรรทัด `{ctx.canPickBest && ... <BestAnswerButton .../>}` เพิ่ม `{ctx.canAct && c.userId !== ctx.viewerId && <ReportButton kind="comment" id={c.id} />}`
  - `app/jobs/[id]/page.tsx`: import `ReportButton` และ `getCurrentUser` จาก `@/lib/session` · ต่อจาก `if (!job) notFound();` เพิ่ม `const user = await getCurrentUser();` · ต่อจากบรรทัด `ประกาศเมื่อ` เพิ่ม `{user && user.role !== "ADMIN" && <ReportButton kind="job" id={job.id} />}`

- [ ] **Step 5: `components/UpgradeForm.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { EDUCATION_LEVELS } from "@/lib/account-rules";
import { DEPARTMENTS } from "@/lib/departments";
import { PHOTO_TYPES } from "@/lib/review-rules";

export function UpgradeForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.reportValidity()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/upgrades", { method: "POST", body: new FormData(form) });
      if (res.ok) {
        form.reset();
        router.refresh();
      } else {
        setError(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "ส่งไม่สำเร็จ ลองอีกครั้ง");
      }
    } catch {
      setError("เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง");
    }
    setSending(false);
  }

  return (
    <form onSubmit={submit} className="flex max-w-2xl flex-col gap-6">
      <TextField name="studentId" label="รหัสนักศึกษา" inputMode="numeric" pattern="\d{5,15}" maxLength={15} required />
      <div className="kn-field">
        <label className="kn-field-label" htmlFor="department">
          แผนกวิชา
        </label>
        <select id="department" name="department" required className="kn-input" defaultValue="">
          <option value="" disabled>
            เลือกแผนก
          </option>
          {DEPARTMENTS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </div>
      <div className="kn-field">
        <label className="kn-field-label" htmlFor="educationLevel">
          ระดับการศึกษา
        </label>
        <select id="educationLevel" name="educationLevel" required className="kn-input" defaultValue="">
          <option value="" disabled>
            เลือกระดับ
          </option>
          {EDUCATION_LEVELS.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
      </div>
      <div className="kn-field">
        <label className="kn-field-label" htmlFor="card">
          รูปบัตรนักศึกษา
        </label>
        <input id="card" name="card" type="file" accept={PHOTO_TYPES.join(",")} required className="text-small" />
        <p className="kn-field-hint">JPG PNG หรือ WEBP ไม่เกิน 5 MB ใช้ตรวจสอบเท่านั้น ผู้ดูแลเห็นคนเดียว</p>
      </div>
      {error && (
        <p role="alert" className="text-small text-danger">
          {error}
        </p>
      )}
      <div>
        <Button type="submit" variant="primary" disabled={sending}>
          {sending ? "กำลังส่ง…" : "ส่งคำขอ"}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 6: เขียน `app/profile/upgrade/page.tsx` ใหม่**

```tsx
import { EmptyState } from "@/components/EmptyState";
import { PageShell } from "@/components/PageShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { UpgradeForm } from "@/components/UpgradeForm";
import { requireUser } from "@/lib/auth";
import { uploadsEnabled } from "@/lib/cloudinary";
import { departmentLabel } from "@/lib/departments";
import { myUpgradeRequests } from "@/lib/upgrades";

const thaiDate = (d: Date) => d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" });

export default async function UpgradePage() {
  const user = await requireUser();
  const requests = await myUpgradeRequests();
  const pending = requests.some((r) => r.status === "PENDING");

  return (
    <PageShell eyebrow="โปรไฟล์" title="ยืนยันสิทธิ์นักศึกษา" lede="กรอกรหัสนักศึกษา แผนก ระดับการศึกษา และแนบรูปบัตรนักศึกษา แล้วติดตามสถานะได้ที่นี่">
      {user.role !== "EXTERNAL" ? (
        <EmptyState icon="verified" title={user.role === "STUDENT" ? "บัญชีของคุณเป็นนักศึกษาแล้ว" : "ผู้ดูแลไม่ต้องยืนยันสิทธิ์"} />
      ) : pending ? (
        <p role="status" className="rounded-lg border border-line bg-signal-tint px-4 py-3">
          คำขอของคุณกำลังรอตรวจ ผลจะแจ้งที่กระดิ่งแจ้งเตือน
        </p>
      ) : !uploadsEnabled() ? (
        <EmptyState icon="badge" title="ยังเปิดรับคำขอไม่ได้">
          ระบบอัปโหลดรูปบัตรยังไม่ได้ตั้งค่า ติดต่อผู้ดูแล
        </EmptyState>
      ) : (
        <UpgradeForm />
      )}
      {requests.length > 0 && (
        <section className="flex flex-col gap-4">
          <SectionHeader title="คำขอของฉัน" />
          {requests.map((r) => (
            <Card
              key={r.id}
              eyebrow={thaiDate(r.createdAt)}
              title={`รหัส ${r.studentId}`}
              footer={<StatusBadge status={r.status} approvedLabel="อนุมัติแล้ว" />}
            >
              <p>{`${departmentLabel(r.department)} · ${r.educationLevel}`}</p>
              {r.status === "REJECTED" && <p>{`เหตุผล: ${r.rejectionReason ?? "ไม่ระบุ"}`}</p>}
            </Card>
          ))}
        </section>
      )}
    </PageShell>
  );
}
```

- [ ] **Step 7: ตรวจ** — `npx tsc --noEmit` · `node --test` · eslint ไฟล์ที่แตะ → ผ่าน · เบราว์เซอร์ (cookie u3): `/insights/seed_c1` มี "รายงาน" ที่บริษัทและทุกรีวิว · กดเปิด กรอก `P6BTEST ...` ส่ง → "ส่งรายงานแล้ว" · ส่งซ้ำที่เดิม (รีเฟรชก่อน) → ข้อความ 409 · `/community/seed_post1` ไม่มีปุ่มรายงานที่กระทู้ของตัวเอง (u1 เป็นเจ้าของ ใช้ cookie u1) · `/jobs/seed_j1` ไม่ล็อกอินไม่มีปุ่ม · cookie e1 `/profile/upgrade` "ยังเปิดรับคำขอไม่ได้" · cookie e2 เห็นคำขอสองใบ (รอตรวจ + ไม่ผ่านพร้อมเหตุผล) · 375px ไม่ล้น

- [ ] **Step 8: Checkpoint** — ห้าม commit

---

### Task 6: ฝั่งผู้ดูแล — แท็บคำขอ/ข้อร้องเรียน + จัดการบัญชี

**Files:** Modify `components/ModerationActions.tsx`, `app/admin/page.tsx` · Create `components/ReportActions.tsx`, `components/UserActions.tsx` · Rewrite `app/admin/users/page.tsx`

- [ ] **Step 1: `components/ModerationActions.tsx`** — รับ `endpoint`
  - signature → `export function ModerationActions({ endpoint }: { endpoint: string }) {` และเพิ่ม `const fieldId = useId();` (import `useId` จาก react)
  - `fetch(\`/api/admin/moderation/${kind}/${id}\`` → `fetch(endpoint`
  - `id={\`reason-${id}\`}` และ `htmlFor={\`reason-${id}\`}` → `fieldId`
  - ลบ `import type { ContentKind } ...`
  - ใน `app/admin/page.tsx` สี่ที่: `<ModerationActions kind="review" id={r.id} />` → `<ModerationActions endpoint={\`/api/admin/moderation/review/${r.id}\`} />` (post comment job เช่นกัน)

- [ ] **Step 2: `components/ReportActions.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";

const ACTIONS = {
  withdraw: { button: "ถอนเนื้อหา", label: "เหตุผลที่ถอน (เจ้าของเนื้อหาและผู้รายงานจะเห็น)" },
  resolve: { button: "ปิดเรื่อง", label: "บันทึกการจัดการ (ผู้รายงานจะเห็น)" },
  dismiss: { button: "ไม่ผิดกฎ", label: "เหตุผลที่ไม่ผิดกฎ (ผู้รายงานจะเห็น)" },
} as const;
type Action = keyof typeof ACTIONS;

/** จัดการข้อร้องเรียน — ทุกทางต้องมีบันทึก 5–500 ตัวอักษร เซิร์ฟเวอร์ตรวจซ้ำ */
export function ReportActions({ id, canWithdraw }: { id: string; canWithdraw: boolean }) {
  const router = useRouter();
  const fieldId = useId();
  const [action, setAction] = useState<Action | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const choices = (Object.keys(ACTIONS) as Action[]).filter((a) => a !== "withdraw" || canWithdraw);

  async function send(a: Action) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: a, note }),
      });
      if (res.ok) router.refresh();
      else setError(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "บันทึกไม่สำเร็จ");
    } catch {
      setError("เชื่อมต่อไม่ได้ ลองอีกครั้ง");
    }
    setBusy(false);
  }

  return (
    <div className="flex w-full flex-col gap-3">
      {action ? (
        <>
          <div className="kn-field">
            <label className="kn-field-label" htmlFor={fieldId}>
              {ACTIONS[action].label}
            </label>
            <textarea id={fieldId} value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={500} className="kn-input h-auto py-3" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant={action === "withdraw" ? "danger" : "secondary"} disabled={busy || note.trim().length < 5} onClick={() => send(action)}>
              {`ยืนยัน${ACTIONS[action].button}`}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setAction(null)}>
              ยกเลิก
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap gap-2">
          {choices.map((a) => (
            <Button key={a} variant={a === "withdraw" ? "danger" : "secondary"} onClick={() => setAction(a)}>
              {ACTIONS[a].button}
            </Button>
          ))}
        </div>
      )}
      {error && (
        <p role="alert" className="text-small text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: `components/UserActions.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui/Button";
import { ROLE_LABELS, ROLE_VALUES } from "@/lib/account-rules";
import type { Role } from "@/lib/nav";

/** เปลี่ยนบทบาทและระงับบัญชี — allowAdmin เฉพาะ super admin (สเปกข้อ 18) เซิร์ฟเวอร์ตรวจซ้ำใน accountChangeError */
export function UserActions({ id, role, isBanned, allowAdmin }: { id: string; role: Role; isBanned: boolean; allowAdmin: boolean }) {
  const router = useRouter();
  const fieldId = useId();
  const [next, setNext] = useState<Role>(role);
  const [confirmBan, setConfirmBan] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const roles = ROLE_VALUES.filter((r) => r !== "ADMIN" || allowAdmin);

  async function send(body: object) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setConfirmBan(false);
        router.refresh();
      } else {
        setError(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "บันทึกไม่สำเร็จ");
      }
    } catch {
      setError("เชื่อมต่อไม่ได้ ลองอีกครั้ง");
    }
    setBusy(false);
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="kn-field">
          <label className="kn-field-label" htmlFor={fieldId}>
            บทบาท
          </label>
          <select id={fieldId} className="kn-input" value={next} onChange={(e) => setNext(e.target.value as Role)}>
            {roles.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
        <Button variant="secondary" disabled={busy || next === role} onClick={() => send({ action: "set_role", role: next })}>
          บันทึกบทบาท
        </Button>
      </div>
      {isBanned ? (
        <div>
          <Button variant="secondary" disabled={busy} onClick={() => send({ action: "unban" })}>
            ยกเลิกการระงับ
          </Button>
        </div>
      ) : confirmBan ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="danger" disabled={busy} onClick={() => send({ action: "ban" })}>
            ยืนยันระงับบัญชี
          </Button>
          <Button variant="ghost" disabled={busy} onClick={() => setConfirmBan(false)}>
            ยกเลิก
          </Button>
        </div>
      ) : (
        <div>
          <Button variant="ghost" icon={<Icon name="block" />} onClick={() => setConfirmBan(true)}>
            ระงับบัญชี
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-small text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: `app/admin/page.tsx`** — สองแท็บใหม่
  - import เพิ่ม: `ReportActions` · `ROLE_LABELS` จาก `@/lib/account-rules` · `excerpt, targetLabel, type ReportKind` จาก `@/lib/moderation-rules` (คง `actionLabel, kindLabel`) · `pendingReports` จาก `@/lib/moderation` · `pendingUpgrades` จาก `@/lib/upgrades`
  - `TABS` → `[{pending รอตรวจ}, {upgrades คำขอยืนยันสิทธิ์}, {reports ข้อร้องเรียน}, {history ประวัติผู้ดูแล}]`
  - แทน `{p.tab === "history" ? <History page={p.page} /> : <Pending />}` ด้วย

```tsx
      {p.tab === "history" ? <History page={p.page} /> : p.tab === "upgrades" ? <Upgrades /> : p.tab === "reports" ? <Reports /> : <Pending />}
```

  - ใน `History` แทน `kindLabel(a.targetType)` ด้วย `targetLabel(a.targetType)`
  - ต่อท้ายไฟล์:

```tsx
async function Upgrades() {
  const items = await pendingUpgrades();
  if (items.length === 0) return <EmptyState icon="badge" title="ไม่มีคำขอรอตรวจ" />;
  return (
    <ul className="flex flex-col gap-4">
      {items.map((u) => (
        <li key={u.id}>
          <Card eyebrow={thaiDateTime(u.createdAt)} title={`รหัสนักศึกษา ${u.studentId}`} footer={<ModerationActions endpoint={`/api/admin/upgrades/${u.id}`} />}>
            <Who user={u.user} />
            <p>{`${departmentLabel(u.department)} · ${u.educationLevel} · บทบาทปัจจุบัน ${ROLE_LABELS[u.user.role]}`}</p>
            <a href={u.cardImageUrl} target="_blank" rel="noopener noreferrer" className="kn-link">
              ดูรูปบัตรนักศึกษา
            </a>
          </Card>
        </li>
      ))}
    </ul>
  );
}

type PendingReport = Awaited<ReturnType<typeof pendingReports>>[number];

/** เป้าหมายของข้อร้องเรียนสำหรับแสดง — status null = ไม่มีสถานะการตรวจ (สถานประกอบการ) */
function reportPreview(r: PendingReport): { kind: ReportKind; title: string; href: string | null; status: string | null } {
  if (r.review) return { kind: "review", title: `${r.review.company.name}: ${excerpt(r.review.textWork)}`, href: `/insights/${r.review.companyId}`, status: r.review.status };
  if (r.post) return { kind: "post", title: r.post.title, href: `/community/${r.postId}`, status: r.post.status };
  if (r.comment) return { kind: "comment", title: excerpt(r.comment.body), href: `/community/${r.comment.postId}`, status: r.comment.status };
  if (r.job) return { kind: "job", title: r.job.title, href: `/jobs/${r.jobId}`, status: r.job.status };
  return { kind: "company", title: r.company?.name ?? "ไม่พบเนื้อหา", href: r.companyId ? `/insights/${r.companyId}` : null, status: null };
}

async function Reports() {
  const items = await pendingReports();
  if (items.length === 0) return <EmptyState icon="flag" title="ไม่มีข้อร้องเรียนรอตรวจ" />;
  return (
    <ul className="flex flex-col gap-4">
      {items.map((r) => {
        const t = reportPreview(r);
        return (
          <li key={r.id}>
            <Card
              eyebrow={`${targetLabel(t.kind)} · ${thaiDateTime(r.createdAt)}`}
              title={
                t.href ? (
                  <Link href={t.href} className="kn-link">
                    {t.title}
                  </Link>
                ) : (
                  t.title
                )
              }
              footer={<ReportActions id={r.id} canWithdraw={t.kind !== "company" && t.status === "APPROVED"} />}
            >
              <p className="text-small text-ink-muted">ผู้รายงาน</p>
              <Who user={r.reporter} />
              <Text label="เหตุผล">{r.reason}</Text>
              {t.status !== null && t.status !== "APPROVED" && <Badge tone="warning">เนื้อหานี้ไม่ได้เผยแพร่แล้ว</Badge>}
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 5: เขียน `app/admin/users/page.tsx` ใหม่**

```tsx
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { PageShell } from "@/components/PageShell";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/TextField";
import { UserActions } from "@/components/UserActions";
import { ROLE_LABELS, ROLE_VALUES, canManage } from "@/lib/account-rules";
import { requireAdmin } from "@/lib/auth";
import { departmentLabel } from "@/lib/departments";
import { searchUsers } from "@/lib/users";
import { userSearchSchema } from "@/lib/validation";

type Filters = { q: string; role?: string; page: number };

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  const actor = await requireAdmin();
  const f = userSearchSchema.parse(await searchParams);
  const { items, total, page, pageCount } = await searchUsers(f);

  return (
    <PageShell eyebrow="ผู้ดูแล" title="จัดการบัญชี" lede="ค้นหา เปลี่ยนบทบาท และระงับบัญชี — แต่งตั้งหรือถอดถอนผู้ดูแลได้เฉพาะผู้ดูแลระดับสูง">
      <form className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <TextField name="q" label="ค้นหา" placeholder="ชื่อหรืออีเมล" defaultValue={f.q} maxLength={100} className="sm:flex-1" />
        <div className="kn-field sm:w-56">
          <label className="kn-field-label" htmlFor="role">
            บทบาท
          </label>
          <select id="role" name="role" className="kn-input" defaultValue={f.role ?? ""}>
            <option value="">ทุกบทบาท</option>
            {ROLE_VALUES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" icon={<Icon name="search" />}>
          ค้นหา
        </Button>
      </form>
      <p className="text-small text-ink-muted">{`พบ ${total.toLocaleString("th-TH")} บัญชี`}</p>
      {items.length === 0 ? (
        <EmptyState icon="group" title="ไม่พบบัญชี" />
      ) : (
        <ul className="flex flex-col gap-4">
          {items.map((u) => (
            <li key={u.id}>
              <Card
                title={u.name ?? u.email}
                footer={
                  canManage(actor, u) ? (
                    <UserActions id={u.id} role={u.role} isBanned={u.isBanned} allowAdmin={actor.isSuperAdmin} />
                  ) : (
                    <span className="text-small text-ink-muted">
                      {u.id === actor.id ? "บัญชีของคุณ" : "แก้ไขได้เฉพาะผู้ดูแลระดับสูง"}
                    </span>
                  )
                }
              >
                <span className="flex flex-wrap items-center gap-2">
                  <span className="break-all">{u.email}</span>
                  <Badge tone="signal">{`${ROLE_LABELS[u.role]}${u.isSuperAdmin ? " ระดับสูง" : ""}`}</Badge>
                  {u.isBanned && <Badge tone="danger">ถูกระงับ</Badge>}
                </span>
                {u.studentId && <p>{`รหัส ${u.studentId}${u.department ? ` · ${departmentLabel(u.department)}` : ""}`}</p>}
              </Card>
            </li>
          ))}
        </ul>
      )}
      {pageCount > 1 && (
        <nav aria-label="เปลี่ยนหน้า" className="flex items-center justify-between gap-4">
          {page > 1 ? (
            <Link href={listHref({ ...f, page: page - 1 })} className={buttonClass("secondary")}>
              ก่อนหน้า
            </Link>
          ) : (
            <span />
          )}
          <span className="text-small text-ink-muted">{`หน้า ${page} จาก ${pageCount}`}</span>
          {page < pageCount ? (
            <Link href={listHref({ ...f, page: page + 1 })} className={buttonClass("secondary")}>
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

function listHref(f: Filters): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.role) p.set("role", f.role);
  if (f.page > 1) p.set("page", String(f.page));
  const s = p.toString();
  return s ? `/admin/users?${s}` : "/admin/users";
}
```

- [ ] **Step 6: ตรวจ** — tsc · node --test · eslint · seed + สคริปต์ Task 4 ผ่านครบทุกบรรทัด
- [ ] **Step 7: เบราว์เซอร์** (seed ใหม่) — cookie admin: `/admin?tab=upgrades` เห็นคำขอ up1 พร้อมลิงก์รูปบัตร · อนุมัติ → หาย · `/admin?tab=reports` เห็น rp1–rp4 · rp4 (สถานประกอบการ) ไม่มีปุ่มถอน · ถอน rp1 (พิมพ์เหตุผล) → rp1 และ rp2 หายพร้อมกัน · `/admin/users` ค้นหา `seed-u`… · การ์ดของตัวเองแสดง "บัญชีของคุณ" · ผู้ดูแลอื่น (seed_super) แสดง "แก้ไขได้เฉพาะผู้ดูแลระดับสูง" · ตัวเลือกบทบาทไม่มี "ผู้ดูแลระบบ" · ระงับ u2 สองขั้นตอน → ป้าย "ถูกระงับ" · cookie super: ตัวเลือกมี "ผู้ดูแลระบบ" · 375px ทั้ง `/admin?tab=reports` และ `/admin/users` ไม่ล้น · ไม่มี error console
- [ ] **Step 8: Checkpoint** — ห้าม commit

---

### Task 7: เอกสาร + เก็บกวาด + ตรวจสุดท้าย

- [ ] **Step 1: `docs/context.md`** — ตาราง Phase แถว 6 → `เสร็จ` · บรรทัดสถานะ → `Phase 0–6 เสร็จแล้ว ถัดไปคือ **Phase 7**` · ย่อหน้า Phase 6a: ลบวลี `(ยังค้าง: ตัดสินเรื่อง \`Employer.isApproved\`)` และย่อส่วน "6b ต้องรักษา" ที่ทำแล้วออก · เพิ่มย่อหน้า:

```markdown
Phase 6b: ข้อร้องเรียนถอนเนื้อหาผ่าน `applyDecision()` ตัวเดียวกับคิวตรวจ แล้วปิดทุกข้อร้องเรียนที่รอของเนื้อหานั้น · รายงานซ้ำบังคับด้วย `@@unique([reporterId, <เป้าหมาย>Id])` · คำขอยืนยันสิทธิ์ที่รอได้ครั้งละหนึ่ง (`UpgradeRequest_one_pending`) ต้องมีคีย์ Cloudinary (ไม่มี = ปิดรับ) · สิทธิ์จัดการบัญชีตัดสินใน `accountChangeError` (`lib/account-rules.ts`) — เกี่ยวกับผู้ดูแลต้องเป็น super admin · ลบ `Employer.isApproved` แล้ว · `AuditLog.admin` เป็น `Restrict` · ถอนกระทู้แล้วความคิดเห็นในนั้นหายโดยไม่แจ้งผู้เขียนความคิดเห็น (ตั้งใจ) · **Phase 7 ต้องรักษา:** ตัวนับความคิดเห็นในแดชบอร์ดต้องกรองกระทู้ `APPROVED` ด้วย
```

- [ ] **Step 2: เก็บกวาด**

```bash
npx prisma db execute --stdin <<'EOF'
DELETE FROM "Session" WHERE sessionToken LIKE 'dev-p6b-%';
EOF
npx jiti prisma/seed.ts
```

- [ ] **Step 3: ตรวจสุดท้าย** — `node --test` · `npx tsc --noEmit` · `npm run build` → ผ่าน · `git status --short` เห็นเฉพาะไฟล์ใน File Structure
- [ ] **Step 4: หยุดให้ผู้ใช้รีวิว** — ห้าม commit จนผู้ใช้สั่ง
