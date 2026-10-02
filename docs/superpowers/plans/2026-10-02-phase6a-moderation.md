# Phase 6a — ศูนย์คัดกรอง แจ้งเตือน และประวัติผู้ดูแล Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ผู้ดูแลอนุมัติหรือปฏิเสธ (พร้อมเหตุผล) รีวิว กระทู้ ความคิดเห็น และประกาศงานที่รอตรวจได้จากศูนย์คัดกรอง `/admin` ทุกการตัดสินแจ้งเจ้าของเนื้อหาผ่าน `Notification` และเขียน `AuditLog` ในทรานแซกชันเดียวกัน ผู้ใช้เห็นแจ้งเตือนที่กระดิ่งในแถบบนและหน้า `/notifications` ผู้ดูแลดูประวัติการกระทำย้อนหลังได้

**Architecture:** helper กลางสองตัว `logAdminAction()` และ `notify()` ใน `lib/admin.ts` รับ `tx` จากผู้เรียก · DAL `lib/moderation.ts` มีฟังก์ชันเดียว `moderate(kind, id, input)` ที่ทุกชนิดเนื้อหาผ่าน — อ่านสถานะ ตรวจกฎ เปลี่ยนสถานะ แจ้ง และลงประวัติในทรานแซกชันเดียว · Route Handler เดียว `POST /api/admin/moderation/[kind]/[id]` · กฎที่พังเงียบได้ (ตัดกิ่งความคิดเห็น ข้อความแจ้ง ลิงก์) อยู่ใน `lib/moderation-rules.ts` แบบ pure มีเทสต์

**Tech Stack:** Next 16.3 App Router · Prisma 7 + SQLite · zod 4 · `node --test` · `node:sqlite` (อ่านฐานข้อมูลในสคริปต์ตรวจ)

**Spec:** แผนเต็ม `C:\Users\user\.claude\plans\htc-insights-synthetic-zephyr.md` หัวข้อ "Phase 6" + `docs/context.md` (หลักการโดเมนข้อ 1–4, สเปกข้อ 12–13, ข้อตกลง "Phase 6 ต้องรักษา" ของ Phase 4 และ 5)

### แบ่ง Phase 6 เป็นสองแผน

| แผน | ขอบเขต | เหตุผล |
|---|---|---|
| **6a (แผนนี้)** | `logAdminAction` + `notify` · ศูนย์คัดกรองแท็บ "รอตรวจ" และ "ประวัติผู้ดูแล" · ศูนย์แจ้งเตือน + กระดิ่ง · ข้อตกลงค้างของ Phase 4–5 | เป็นแกนที่ทุกส่วนของ 6b เรียกใช้ ส่งมอบแล้วใช้งานได้เองทันที (เนื้อหาที่ค้าง PENDING ทั้งระบบเผยแพร่ได้) |
| 6b (แผนถัดไป) | ยื่นคำขอยืนยันสิทธิ์นักศึกษา + แท็บคำขอ · ปุ่มรายงาน + แท็บข้อร้องเรียน (ถอนเนื้อหาผ่าน `moderate()` ตัวเดียวกัน) · จัดการบัญชี (ค้นหา เปลี่ยนบทบาท ระงับ) · แต่งตั้ง/ถอดถอนผู้ดูแล (super admin) | ทุกข้อใช้ `logAdminAction`/`notify` จาก 6a |

### ตัดสินเองในแผนนี้

| เรื่อง | แผนนี้ทำ | เหตุผล |
|---|---|---|
| แท็บ "รีวิวทั้งหมด / กระทู้ / ประกาศงาน" ในแผนเต็ม | 6a มีแท็บ **รอตรวจ** (รวมทุกชนิด แยกหัวข้อ) และ **ประวัติผู้ดูแล** · การถอนเนื้อหาที่เผยแพร่แล้วรองรับใน `moderate()` แล้ว (ปฏิเสธของที่ `APPROVED` ได้) แต่ปุ่มมาพร้อมแท็บข้อร้องเรียนใน 6b | ผู้ดูแลถอนเนื้อหาเพราะมีคนร้องเรียน ไม่ใช่ไล่อ่านทั้งระบบ |
| ตัดสินซ้ำสถานะเดิม | 409 "เนื้อหานี้อยู่ในสถานะนั้นแล้ว" | กันแจ้งเตือนซ้ำและประวัติซ้ำเมื่อผู้ดูแลสองคนกดพร้อมกัน |
| ปฏิเสธความคิดเห็น | ปฏิเสธทั้งกิ่ง (คำตอบใต้มันทุกชั้นที่ยังไม่ถูกปฏิเสธ เหตุผล "ความคิดเห็นต้นทางถูกปฏิเสธ") แจ้งผู้เขียนทุกคนในกิ่ง · ล้าง `bestAnswerId` ถ้าอยู่ในกิ่ง · ประวัติหนึ่งแถวระบุจำนวน | ข้อตกลง Phase 4 + หลักการข้อ 4 (คนที่คำตอบหายต้องรู้ผล) |
| อนุมัติความคิดเห็น | 409 ถ้ากระทู้หรือต้นทางยังไม่ `APPROVED` | ข้อตกลง Phase 4 |
| คิวประกาศงาน | แสดงเฉพาะ `PENDING` ที่ `isActive` · อนุมัติประกาศที่ชน index แผนกละหนึ่ง → 409 | ข้อตกลง Phase 5 |
| ถอนกระทู้ | `toggleLike` ของความคิดเห็นต้องเช็คว่ากระทู้ยัง `APPROVED` | ข้อตกลง Phase 4 |
| ลิงก์ในแจ้งเตือน | รีวิวถูกปฏิเสธ → `/insights/write-review?edit=<id>` (หน้าแก้ไขส่งใหม่ที่มีอยู่แล้ว) · อนุมัติ → หน้าเนื้อหา · กระทู้/ประกาศถูกปฏิเสธ → `/profile` | พาไปที่ที่ทำอะไรต่อได้ |
| กระดิ่งในแถบบน | ไอคอน `notifications` หน้าเฟือง พร้อมตัวเลขยังไม่อ่าน (เกิน 9 แสดง 9+) · เข้า `/notifications` แล้วทำเครื่องหมายอ่านทั้งหมด | เมนูหลักเต็ม 5 ช่องแล้ว แบบเดียวกับเฟือง |
| ตัวเลขบนกระดิ่ง | อัปเดตเมื่อโหลดหน้าใหม่หรือ `router.refresh()` ไม่ push แบบเรียลไทม์ | ponytail: แจ้งเตือนเกิดตอนผู้ดูแลตรวจ ไม่ใช่แชต |

## Global Constraints

- อ่าน `AGENTS.md`: Next 16 — `params`/`searchParams` เป็น Promise ใช้ `PageProps<'/x'>` / `RouteContext<'/x'>` แบบ global ไม่ต้อง import · path ใหม่ต้องรัน `npx next typegen` ก่อน `tsc`
- Prisma Client ใช้ผ่าน `db` จาก `@/lib/db` เท่านั้น (ยกเว้น `prisma/seed.ts`)
- **ทุก Route Handler เรียก guard เป็นบรรทัดแรก** · ทุก `export async function` ใน DAL (`lib/moderation.ts`, `lib/notifications.ts`) เริ่มด้วย guard — `tests/route-guards.test.mjs` ตรวจ · `lib/admin.ts` ไม่มี guard เพราะรับ `tx` จาก DAL ที่ผ่าน `requireAdmin` แล้วเท่านั้น และไม่ export async function
- **ทุกการตัดสินของผู้ดูแล = เปลี่ยนสถานะ + `notify()` ถึงทุกคนที่ได้รับผล + `logAdminAction()` ใน `db.$transaction` เดียว** — ห้ามเขียน `tx.notification.create` / `tx.auditLog.create` ตรงที่อื่น
- ปฏิเสธต้องมีเหตุผล 5–500 ตัวอักษร (zod) อนุมัติไม่มีเหตุผลและล้าง `rejectionReason`
- ผู้ดูแลเห็นชื่อและอีเมลผู้เขียนในคิวเสมอ รวมรีวิวไม่ระบุตัวตน (หลักการข้อ 2) — แสดงป้าย "ผู้เขียนเลือกไม่ระบุตัวตน" กำกับ
- เวลาแสดงด้วย locale `th-TH` และ `timeZone: "Asia/Bangkok"`
- UI ภาษาไทย ไม่ใช้ emoji ไอคอน Material Symbols ทดสอบที่ 375px — คิวเป็นการ์ด ประวัติเป็น `Table` (เลื่อนแนวนอนได้อยู่แล้ว)
- เทสต์ `node --test` (ไม่ใส่ `tests/`) ไฟล์ที่เทสต์ import (`lib/moderation-rules.ts`) ต้องไม่ import ค่าจริง ห้าม alias `@/`
- ภาษาไทยในคำสั่งให้อยู่ในไฟล์สคริปต์ (Git Bash ส่ง argv ไทยให้ node เพี้ยน)
- `prisma migrate dev` ใช้ไม่ได้ในโหมด non-interactive — แผนนี้ไม่แก้ schema
- dev server ที่พอร์ต 3000 อาจเป็นของแชตอื่น และ Next 16 ไม่ยอมรันซ้อน — ใช้ตัวที่รันอยู่ได้ (แผนนี้ไม่ generate client ใหม่)
- ข้อมูลทดสอบขึ้นต้น `P6TEST` · seed ล้าง `Notification` ของบัญชี `seed_*` และ `AuditLog` ของ `seed_admin` ทุกรอบ
- **ห้าม commit เอง** — commit เมื่อผู้ใช้สั่งเท่านั้น

## Review Focus

1. **ตัดสินแล้วไม่มีแจ้งเตือนหรือไม่มีประวัติ / มีแต่สถานะไม่เปลี่ยน** (ทรานแซกชันขาด) → ทุกการตัดสินที่สำเร็จมี Notification ≥ 1 และ AuditLog = 1 · ล้มกลางทาง (409) ไม่มีอะไรถูกเขียน → สคริปต์ Task 3 นับแถวจากฐานข้อมูลจริง
2. **ปฏิเสธความคิดเห็นที่มีคำตอบซ้อน** → ทั้งกิ่งถูกปฏิเสธ ตัวนับบนการ์ดกระทู้ตรงกับที่แสดง `bestAnswerId` ถูกล้าง ผู้เขียนทุกคนในกิ่งได้แจ้งเตือน → เทสต์ `commentSubtree` Task 1 + สคริปต์ Task 3
3. **อนุมัติคำตอบที่ต้นทางถูกปฏิเสธ / อนุมัติประกาศที่ชนโควตาแผนก / ตัดสินซ้ำ** → 409 ไม่มีอะไรเปลี่ยน → สคริปต์ Task 3
4. **ไม่ใช่ผู้ดูแลยิง API คัดกรอง / kind หรือ id มั่ว / ปฏิเสธไม่มีเหตุผล** → 401/403/404/400 → สคริปต์ Task 3
5. **การ์ดคิวที่มีข้อความยาวและรูปบนจอ 375px / กระดิ่งกับเฟืองในแถบบนมือถือ** → ไม่ล้นแนวนอน ปุ่มกดได้ ≥ 44px → เบราว์เซอร์ Task 4 และ 5

---

## File Structure

```
prisma/seed.ts                        บัญชี seed_admin · ล้างแจ้งเตือน/ประวัติของบัญชีทดสอบ           แก้ (T1)
lib/moderation-rules.ts               CONTENT_KINDS kindLabel excerpt commentSubtree commentApproveError
                                      decisionNotice actionLabel AUDIT_PER_PAGE (pure)                 ใหม่ (T1)
lib/validation.ts                     contentKindSchema moderationInputSchema adminParamsSchema        แก้ (T2)
lib/admin.ts                          logAdminAction notify                                            ใหม่ (T2)
lib/moderation.ts                     DAL: pendingQueue moderate auditLog                              ใหม่ (T2)
lib/notifications.ts                  DAL: myNotifications unreadCount markAllRead                     ใหม่ (T2)
lib/community.ts                      toggleLike เช็คกระทู้ของความคิดเห็น                                 แก้ (T2)
app/api/admin/moderation/[kind]/[id]/route.ts   POST                                                   ใหม่ (T3)
app/api/notifications/read/route.ts             POST                                                   ใหม่ (T3)
app/notifications/page.tsx, components/MarkAllRead.tsx                                                 ใหม่ (T4)
components/TopNav.tsx, app/layout.tsx กระดิ่ง + ตัวนับ                                                  แก้ (T4)
components/ModerationActions.tsx      ปุ่มอนุมัติ/ปฏิเสธ+เหตุผล (client)                                   ใหม่ (T5)
app/admin/page.tsx                    แท็บรอตรวจ / ประวัติผู้ดูแล                                          เขียนใหม่ (T5)
docs/context.md                       สถานะ + ข้อตกลงถึง 6b                                              แก้ (T6)
tests/moderation-rules.test.mjs ใหม่ (T1) · tests/route-guards.test.mjs แก้ (T2) · tests/routes.test.mjs แก้ (T4)
```

---

### Task 1: กฎการคัดกรอง (pure) + บัญชีผู้ดูแลทดสอบ

**Files:**
- Create: `lib/moderation-rules.ts`, `tests/moderation-rules.test.mjs`
- Modify: `prisma/seed.ts`

**Interfaces:**
- Produces:
  - `CONTENT_KINDS` · `type ContentKind = "review" | "post" | "comment" | "job"` · `CONTENT_KIND_VALUES` · `kindLabel(k: string): string`
  - `type Decision = "APPROVED" | "REJECTED"` · `CASCADE_REASON = "ความคิดเห็นต้นทางถูกปฏิเสธ"` · `AUDIT_PER_PAGE = 50`
  - `excerpt(s: string, n = 40): string`
  - `commentSubtree(rows: { id: string; parentId: string | null }[], rootId: string): string[]`
  - `commentApproveError(c: { postStatus: string; parentStatus: string | null }): string | null`
  - `type NoticeTarget = { kind: ContentKind; id: string; title: string; companyId?: string; postId?: string }`
  - `decisionNotice(t: NoticeTarget, decision: Decision, reason: string | null): { type: string; message: string; link: string }`
  - `actionLabel(action: string): string` — `"approve_review"` → `"อนุมัติรีวิว"`
- บัญชี seed ใหม่: `seed_admin` (ADMIN, `seed-admin@example.invalid`)

- [ ] **Step 1: เขียนเทสต์ที่ล้มเหลว `tests/moderation-rules.test.mjs`**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AUDIT_PER_PAGE,
  CASCADE_REASON,
  CONTENT_KIND_VALUES,
  actionLabel,
  commentApproveError,
  commentSubtree,
  decisionNotice,
  excerpt,
  kindLabel,
} from "../lib/moderation-rules.ts";

test("ชนิดเนื้อหาที่ผ่านการคัดกรอง", () => {
  assert.deepEqual(CONTENT_KIND_VALUES, ["review", "post", "comment", "job"]);
  assert.equal(kindLabel("job"), "ประกาศงาน");
  assert.equal(kindLabel("x"), "x");
  assert.equal(AUDIT_PER_PAGE, 50);
});

test("excerpt ตัดข้อความยาวและเติม …", () => {
  assert.equal(excerpt("สั้น"), "สั้น");
  assert.equal(excerpt("ก".repeat(45)), "ก".repeat(40) + "…");
  assert.equal(excerpt("  มีช่องว่าง\nขึ้นบรรทัด  "), "มีช่องว่าง ขึ้นบรรทัด");
});

test("commentSubtree คืนต้นทางและคำตอบทุกชั้น ไม่รวมกิ่งอื่น", () => {
  const rows = [
    { id: "a", parentId: null },
    { id: "a1", parentId: "a" },
    { id: "a1x", parentId: "a1" },
    { id: "a2", parentId: "a" },
    { id: "b", parentId: null },
    { id: "b1", parentId: "b" },
  ];
  assert.deepEqual(commentSubtree(rows, "a").sort(), ["a", "a1", "a1x", "a2"]);
  assert.deepEqual(commentSubtree(rows, "b1"), ["b1"]);
  assert.deepEqual(commentSubtree(rows, "missing"), ["missing"]);
});

test("commentApproveError: กระทู้และต้นทางต้องเผยแพร่แล้ว", () => {
  assert.equal(commentApproveError({ postStatus: "APPROVED", parentStatus: null }), null);
  assert.equal(commentApproveError({ postStatus: "APPROVED", parentStatus: "APPROVED" }), null);
  assert.match(commentApproveError({ postStatus: "PENDING", parentStatus: null }), /กระทู้/);
  assert.match(commentApproveError({ postStatus: "APPROVED", parentStatus: "REJECTED" }), /ต้นทาง/);
  assert.match(commentApproveError({ postStatus: "APPROVED", parentStatus: "PENDING" }), /ต้นทาง/);
});

test("decisionNotice: ข้อความมีชื่อเนื้อหาและเหตุผล ลิงก์พาไปที่ทำต่อได้", () => {
  const review = { kind: "review", id: "r1", title: "บริษัท ก", companyId: "c1" };
  assert.deepEqual(decisionNotice(review, "APPROVED", null), {
    type: "review_approved",
    message: 'รีวิว "บริษัท ก" ผ่านการตรวจและเผยแพร่แล้ว',
    link: "/insights/c1",
  });
  const rej = decisionNotice(review, "REJECTED", "ข้อมูลไม่ครบ");
  assert.equal(rej.type, "review_rejected");
  assert.equal(rej.message, 'รีวิว "บริษัท ก" ไม่ผ่านการตรวจ เหตุผล: ข้อมูลไม่ครบ');
  assert.equal(rej.link, "/insights/write-review?edit=r1");
  assert.equal(decisionNotice({ kind: "post", id: "p1", title: "t" }, "APPROVED", null).link, "/community/p1");
  assert.equal(decisionNotice({ kind: "post", id: "p1", title: "t" }, "REJECTED", "x x x").link, "/profile");
  assert.equal(decisionNotice({ kind: "comment", id: "c9", title: "t", postId: "p1" }, "REJECTED", "x x x").link, "/community/p1");
  assert.equal(decisionNotice({ kind: "job", id: "j1", title: "t" }, "APPROVED", null).link, "/jobs/j1");
  assert.equal(decisionNotice({ kind: "job", id: "j1", title: "t" }, "REJECTED", "x x x").link, "/profile");
  assert.equal(CASCADE_REASON, "ความคิดเห็นต้นทางถูกปฏิเสธ");
});

test("actionLabel แปลงชื่อการกระทำในประวัติเป็นภาษาไทย", () => {
  assert.equal(actionLabel("approve_review"), "อนุมัติรีวิว");
  assert.equal(actionLabel("reject_comment"), "ปฏิเสธความคิดเห็น");
  assert.equal(actionLabel("toggle_ban_user"), "toggle_ban_user");
});
```

- [ ] **Step 2: รันให้เห็นว่าล้ม**

Run: `node --test` → Expected: FAIL ที่ `tests/moderation-rules.test.mjs` — `Cannot find module ... lib/moderation-rules.ts`

- [ ] **Step 3: สร้าง `lib/moderation-rules.ts`**

```ts
// ไฟล์นี้ต้อง pure — tests/moderation-rules.test.mjs import ตรงด้วย Node ห้าม import ค่าจริงเพิ่ม (import type ได้)

/** เนื้อหาที่ผ่านศูนย์คัดกรอง — ลำดับนี้คือลำดับหัวข้อในคิว */
export const CONTENT_KINDS = [
  { value: "review", label: "รีวิว" },
  { value: "post", label: "กระทู้" },
  { value: "comment", label: "ความคิดเห็น" },
  { value: "job", label: "ประกาศงาน" },
] as const;
export type ContentKind = (typeof CONTENT_KINDS)[number]["value"];
export const CONTENT_KIND_VALUES = CONTENT_KINDS.map((k) => k.value) as [ContentKind, ...ContentKind[]];

export function kindLabel(kind: string): string {
  return CONTENT_KINDS.find((k) => k.value === kind)?.label ?? kind;
}

export type Decision = "APPROVED" | "REJECTED";
export const CASCADE_REASON = "ความคิดเห็นต้นทางถูกปฏิเสธ";
export const AUDIT_PER_PAGE = 50;

/** ข้อความสั้นสำหรับแจ้งเตือนและประวัติ — ยุบช่องว่างและขึ้นบรรทัด */
export function excerpt(s: string, n = 40): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

/** id ของความคิดเห็นต้นทางและคำตอบใต้มันทุกชั้น — ปฏิเสธต้นทางต้องปฏิเสธทั้งกิ่ง (ข้อตกลง Phase 4) */
export function commentSubtree(rows: { id: string; parentId: string | null }[], rootId: string): string[] {
  const children = new Map<string, string[]>();
  for (const r of rows) {
    if (r.parentId) children.set(r.parentId, [...(children.get(r.parentId) ?? []), r.id]);
  }
  const out: string[] = [];
  const stack = [rootId];
  while (stack.length > 0) {
    const id = stack.pop()!;
    out.push(id);
    stack.push(...(children.get(id) ?? []));
  }
  return out;
}

/** อนุมัติความคิดเห็นได้เมื่อกระทู้และต้นทาง (ถ้ามี) เผยแพร่แล้ว — คำตอบใต้ต้นทางที่มองไม่เห็นหลุดบริบท */
export function commentApproveError(c: { postStatus: string; parentStatus: string | null }): string | null {
  if (c.postStatus !== "APPROVED") return "กระทู้ของความคิดเห็นนี้ยังไม่เผยแพร่";
  if (c.parentStatus !== null && c.parentStatus !== "APPROVED") return "ความคิดเห็นต้นทางยังไม่เผยแพร่ ตรวจต้นทางก่อน";
  return null;
}

export type NoticeTarget = { kind: ContentKind; id: string; title: string; companyId?: string; postId?: string };

function noticeLink(t: NoticeTarget, decision: Decision): string {
  const ok = decision === "APPROVED";
  switch (t.kind) {
    case "review":
      // ถูกปฏิเสธ → หน้าแก้ไขแล้วส่งใหม่ที่มีอยู่แล้ว
      return ok ? `/insights/${t.companyId}` : `/insights/write-review?edit=${t.id}`;
    case "post":
      return ok ? `/community/${t.id}` : "/profile";
    case "comment":
      return `/community/${t.postId}`;
    case "job":
      return ok ? `/jobs/${t.id}` : "/profile";
  }
}

/** ข้อความแจ้งเจ้าของเนื้อหา — หลักการโดเมนข้อ 4: ทุกผลการตรวจต้องแจ้งพร้อมเหตุผล */
export function decisionNotice(t: NoticeTarget, decision: Decision, reason: string | null) {
  const what = `${kindLabel(t.kind)} "${t.title}"`;
  return {
    type: `${t.kind}_${decision === "APPROVED" ? "approved" : "rejected"}`,
    message: decision === "APPROVED" ? `${what} ผ่านการตรวจและเผยแพร่แล้ว` : `${what} ไม่ผ่านการตรวจ เหตุผล: ${reason ?? "ไม่ระบุ"}`,
    link: noticeLink(t, decision),
  };
}

const VERBS: Record<string, string> = { approve: "อนุมัติ", reject: "ปฏิเสธ" };

/** ชื่อการกระทำในประวัติผู้ดูแล — รูปแบบ <verb>_<kind> ที่ moderate() เขียน · รูปแบบอื่นคืนค่าเดิม */
export function actionLabel(action: string): string {
  const [verb, kind, ...rest] = action.split("_");
  if (rest.length > 0 || !VERBS[verb] || !CONTENT_KINDS.some((k) => k.value === kind)) return action;
  return VERBS[verb] + kindLabel(kind);
}
```

- [ ] **Step 4: เพิ่มบัญชีผู้ดูแลและการล้างใน `prisma/seed.ts`**

ต่อจาก `const EXTERNAL_USERS = ...;` เพิ่ม:

```ts
const ADMIN_USER = { id: "seed_admin", email: "seed-admin@example.invalid", name: "ผู้ดูแลทดสอบ", role: "ADMIN" as const };
```

แทนบรรทัด `for (const u of [...USERS, ...EXTERNAL_USERS]) ...` ด้วย:

```ts
  for (const u of [...USERS, ...EXTERNAL_USERS, ADMIN_USER]) await db.user.upsert({ where: { id: u.id }, create: u, update: u });
  // seed คืนสถานะเนื้อหาทุกรอบ — แจ้งเตือนและประวัติของบัญชีทดสอบจากรอบก่อนจะไม่ตรงกับความจริง จึงล้างด้วย
  await db.notification.deleteMany({ where: { userId: { startsWith: "seed_" } } });
  await db.auditLog.deleteMany({ where: { adminId: ADMIN_USER.id } });
```

- [ ] **Step 5: ตรวจ**

Run: `node --test` → PASS ทั้งหมด · `npx tsc --noEmit` → ไม่มี error · `npx jiti prisma/seed.ts` → สามบรรทัด seed เดิมไม่เปลี่ยน

- [ ] **Step 6: Checkpoint** — ห้าม commit

---

### Task 2: helper ผู้ดูแล + DAL คัดกรองและแจ้งเตือน

**Files:**
- Create: `lib/admin.ts`, `lib/moderation.ts`, `lib/notifications.ts`
- Modify: `lib/validation.ts`, `lib/community.ts`, `tests/route-guards.test.mjs`

**Interfaces:**
- Consumes: ทั้งหมดจาก Task 1 · `pageWindow` จาก `./community-rules` · `UserError` · `db`, `isPrismaError`
- Produces:
  - `logAdminAction(tx, adminId, action, target: { type: string; id: string }, detail?: string | null)` · `notify(tx, userId, n: { type; message; link: string | null })`
  - `contentKindSchema` · `moderationInputSchema` → `ModerationInput = { decision: "APPROVED" } | { decision: "REJECTED"; reason: string }` · `adminParamsSchema` → `{ tab: "pending" | "history"; page: number }`
  - `pendingQueue() → { reviews; posts; comments; jobs }` (แต่ละตัวเป็นอาร์เรย์ เก่าสุดก่อน ไม่เกิน 50)
  - `moderate(kind: ContentKind, id: string, input: ModerationInput) → { status: Decision }` — 404 ไม่พบ · 409 สถานะเดิม/ต้นทางยังไม่เผยแพร่/ชนโควตาแผนก
  - `auditLog(page: number) → { items: { id; action; targetType; targetId; detail; createdAt; admin: { name; email } }[]; page; pageCount }`
  - `myNotifications() → { id; type; message; link; isRead; createdAt }[]` · `unreadCount() → number` · `markAllRead() → void`

- [ ] **Step 1: เทสต์ guard ให้ล้มก่อน — `tests/route-guards.test.mjs`**

ในอ็อบเจกต์ `DAL` เพิ่มสองบรรทัด:

```js
  "lib/moderation.ts": [],
  "lib/notifications.ts": [],
```

และต่อท้ายไฟล์:

```js
test("การตัดสินของผู้ดูแลเขียนแจ้งเตือนและประวัติผ่าน helper กลางเท่านั้น", () => {
  const files = ["lib/moderation.ts", ...readdirSync("app/api", { recursive: true }).map((f) => `app/api/${String(f).replaceAll("\\", "/")}`)];
  const direct = files.filter((f) => f.endsWith(".ts") && /\.(notification|auditLog)\.create\(/.test(readFileSync(f, "utf8")));
  assert.deepEqual(direct, []);
  const src = readFileSync("lib/moderation.ts", "utf8");
  assert.match(src, /db\.\$transaction/);
  assert.match(src, /await notify\(tx,/);
  assert.match(src, /await logAdminAction\(tx,/);
});
```

Run: `node --test` → Expected: FAIL (`ไม่พบฟังก์ชันใน lib/moderation.ts`, ENOENT)

- [ ] **Step 2: schema ใน `lib/validation.ts`**

เพิ่ม import:

```ts
import { CONTENT_KIND_VALUES } from "./moderation-rules";
```

ต่อท้ายไฟล์:

```ts
// ---------- ผู้ดูแล ----------

export const contentKindSchema = z.enum(CONTENT_KIND_VALUES);

/** ปฏิเสธต้องบอกเหตุผล — ผู้เขียนเห็นข้อความนี้ในแจ้งเตือน (หลักการโดเมนข้อ 4) */
export const moderationInputSchema = z.discriminatedUnion(
  "decision",
  [
    z.object({ decision: z.literal("APPROVED") }),
    z.object({
      decision: z.literal("REJECTED"),
      reason: z
        .string({ error: "ระบุเหตุผลที่ปฏิเสธ" })
        .trim()
        .min(5, "เหตุผลอย่างน้อย 5 ตัวอักษร")
        .max(500, "เหตุผลไม่เกิน 500 ตัวอักษร"),
    }),
  ],
  { error: "เลือกอนุมัติหรือปฏิเสธ" },
);
export type ModerationInput = z.infer<typeof moderationInputSchema>;

/** query string ของ /admin — ค่าผิดรูปแบบถูกเพิกเฉย */
export const adminParamsSchema = z.object({
  tab: z.enum(["pending", "history"]).catch("pending"),
  page: z.coerce.number().int().min(1).catch(1),
});
```

- [ ] **Step 3: สร้าง `lib/admin.ts`**

```ts
import type { Prisma } from "@/app/generated/prisma/client";

// helper กลางของการกระทำผู้ดูแล (CLAUDE.md) — เรียกในทรานแซกชันเดียวกับการกระทำเสมอ
// ไม่มี guard ในไฟล์นี้: รับ tx จากฟังก์ชัน DAL ที่ผ่าน requireAdmin มาแล้วเท่านั้น
// tests/route-guards.test.mjs กันไม่ให้ที่อื่นเขียน Notification/AuditLog ตรง

type Tx = Prisma.TransactionClient;

/** หลักการโดเมนข้อ 3 — ทุกการกระทำของผู้ดูแลตรวจสอบย้อนหลังได้ */
export function logAdminAction(tx: Tx, adminId: string, action: string, target: { type: string; id: string }, detail: string | null = null) {
  return tx.auditLog.create({ data: { adminId, action, targetType: target.type, targetId: target.id, detail } });
}

/** หลักการโดเมนข้อ 4 — ผู้ใช้ต้องรู้ผลเสมอ */
export function notify(tx: Tx, userId: string, n: { type: string; message: string; link: string | null }) {
  return tx.notification.create({ data: { userId, ...n } });
}
```

- [ ] **Step 4: สร้าง `lib/moderation.ts`**

```ts
import type { Prisma } from "@/app/generated/prisma/client";
import { logAdminAction, notify } from "./admin";
import { requireAdmin } from "./auth";
import { pageWindow } from "./community-rules";
import { db, isPrismaError } from "./db";
import { UserError } from "./http";
import {
  AUDIT_PER_PAGE,
  CASCADE_REASON,
  commentApproveError,
  commentSubtree,
  decisionNotice,
  excerpt,
  type ContentKind,
  type Decision,
  type NoticeTarget,
} from "./moderation-rules";
import type { ModerationInput } from "./validation";

// ทุกฟังก์ชัน export async เริ่มด้วย requireAdmin — tests/route-guards.test.mjs ตรวจ
// การตัดสินทุกครั้ง: เปลี่ยนสถานะ + notify ถึงทุกคนที่ได้รับผล + logAdminAction ในทรานแซกชันเดียว (หลักการโดเมนข้อ 3–4)

type Tx = Prisma.TransactionClient;
type Affected = { userId: string; target: NoticeTarget; reason?: string | null };
type Outcome = { affected: Affected[]; detail?: string | null };
type Decide = (tx: Tx, id: string, decision: Decision, reason: string | null) => Promise<Outcome>;

const PENDING = { status: "PENDING" } as const;
// ผู้ดูแลเห็นตัวตนผู้เขียนเสมอ รวมรีวิวไม่ระบุตัวตน (หลักการโดเมนข้อ 2)
const WHO = { select: { name: true, email: true } } as const;
// ponytail: คิวละไม่เกิน 50 รายการ เก่าสุดก่อน — วิทยาลัยเดียว ถ้าค้างเกินนี้บ่อยค่อยแบ่งหน้า
const QUEUE = { orderBy: { createdAt: "asc" }, take: 50 } as const;
const ALREADY = "เนื้อหานี้อยู่ในสถานะนั้นแล้ว";
const OPEN_TAKEN = "สถานประกอบการนี้มีประกาศที่เปิดรับในแผนกเดียวกันอยู่แล้ว";

export async function pendingQueue() {
  await requireAdmin();
  const [reviews, posts, comments, jobs] = await Promise.all([
    db.review.findMany({
      where: PENDING,
      ...QUEUE,
      select: {
        id: true,
        department: true,
        createdAt: true,
        scoreOverall: true,
        dailyAllowance: true,
        textWork: true,
        textPros: true,
        textCons: true,
        textAdvice: true,
        isAnonymous: true,
        photos: { select: { id: true, url: true } },
        user: WHO,
        company: { select: { name: true, address: true } },
      },
    }),
    db.communityPost.findMany({
      where: PENDING,
      ...QUEUE,
      select: { id: true, type: true, department: true, title: true, body: true, createdAt: true, user: WHO },
    }),
    db.communityComment.findMany({
      where: PENDING,
      ...QUEUE,
      select: {
        id: true,
        body: true,
        createdAt: true,
        user: WHO,
        post: { select: { id: true, title: true, status: true } },
        parent: { select: { body: true, status: true } },
      },
    }),
    // ประกาศที่เจ้าของปิดรับระหว่างรอตรวจไม่ต้องตรวจ (ข้อตกลง Phase 5)
    db.jobPosting.findMany({
      where: { ...PENDING, isActive: true },
      ...QUEUE,
      select: {
        id: true,
        title: true,
        department: true,
        description: true,
        qualifications: true,
        benefits: true,
        allowance: true,
        contactEmail: true,
        contactPhone: true,
        createdAt: true,
        company: { select: { name: true, address: true } },
        employer: { select: { user: WHO } },
      },
    }),
  ]);
  return { reviews, posts, comments, jobs };
}

const decideReview: Decide = async (tx, id, decision, reason) => {
  const r = await tx.review.findUnique({ where: { id }, select: { status: true, userId: true, companyId: true, company: { select: { name: true } } } });
  if (!r) throw new UserError(404, "ไม่พบรีวิว");
  if (r.status === decision) throw new UserError(409, ALREADY);
  await tx.review.update({ where: { id }, data: { status: decision, rejectionReason: reason } });
  return { affected: [{ userId: r.userId, target: { kind: "review", id, title: r.company.name, companyId: r.companyId } }] };
};

const decidePost: Decide = async (tx, id, decision, reason) => {
  const p = await tx.communityPost.findUnique({ where: { id }, select: { status: true, userId: true, title: true } });
  if (!p) throw new UserError(404, "ไม่พบกระทู้");
  if (p.status === decision) throw new UserError(409, ALREADY);
  await tx.communityPost.update({ where: { id }, data: { status: decision, rejectionReason: reason } });
  return { affected: [{ userId: p.userId, target: { kind: "post", id, title: excerpt(p.title) } }] };
};

const decideComment: Decide = async (tx, id, decision, reason) => {
  const c = await tx.communityComment.findUnique({
    where: { id },
    select: { status: true, userId: true, postId: true, body: true, post: { select: { status: true } }, parent: { select: { status: true } } },
  });
  if (!c) throw new UserError(404, "ไม่พบความคิดเห็น");
  if (c.status === decision) throw new UserError(409, ALREADY);
  const target = (cid: string, body: string): NoticeTarget => ({ kind: "comment", id: cid, title: excerpt(body), postId: c.postId });

  if (decision === "APPROVED") {
    const err = commentApproveError({ postStatus: c.post.status, parentStatus: c.parent?.status ?? null });
    if (err) throw new UserError(409, err);
    await tx.communityComment.update({ where: { id }, data: { status: "APPROVED", rejectionReason: null } });
    return { affected: [{ userId: c.userId, target: target(id, c.body) }] };
  }

  // ปฏิเสธทั้งกิ่ง — ไม่งั้นตัวนับบนการ์ดเกินจำนวนที่แสดงในกระทู้ (บั๊กแบบ v1) · ล้างคำตอบที่ดีที่สุดถ้าอยู่ในกิ่ง
  const rows = await tx.communityComment.findMany({ where: { postId: c.postId }, select: { id: true, parentId: true, status: true, userId: true, body: true } });
  const branch = new Set(commentSubtree(rows, id));
  const below = rows.filter((r) => r.id !== id && branch.has(r.id) && r.status !== "REJECTED");
  await tx.communityComment.update({ where: { id }, data: { status: "REJECTED", rejectionReason: reason } });
  await tx.communityComment.updateMany({
    where: { id: { in: below.map((r) => r.id) } },
    data: { status: "REJECTED", rejectionReason: CASCADE_REASON },
  });
  await tx.communityPost.updateMany({ where: { bestAnswerId: { in: [...branch] } }, data: { bestAnswerId: null } });
  return {
    affected: [
      { userId: c.userId, target: target(id, c.body) },
      ...below.map((r) => ({ userId: r.userId, target: target(r.id, r.body), reason: CASCADE_REASON })),
    ],
    detail: below.length > 0 ? `${reason} (และคำตอบใต้มัน ${below.length} รายการ)` : reason,
  };
};

const decideJob: Decide = async (tx, id, decision, reason) => {
  const j = await tx.jobPosting.findUnique({ where: { id }, select: { status: true, title: true, employer: { select: { userId: true } } } });
  if (!j) throw new UserError(404, "ไม่พบประกาศ");
  if (j.status === decision) throw new UserError(409, ALREADY);
  // ย้ายออกจาก REJECTED อาจชน unique index JobPosting_open_per_department → P2002 (จับใน moderate)
  await tx.jobPosting.update({ where: { id }, data: { status: decision, rejectionReason: reason } });
  return { affected: [{ userId: j.employer.userId, target: { kind: "job", id, title: excerpt(j.title) } }] };
};

const DECIDE: Record<ContentKind, Decide> = { review: decideReview, post: decidePost, comment: decideComment, job: decideJob };

/** ตัดสินเนื้อหาหนึ่งชิ้น — ใช้ทั้งตรวจของที่รอ และถอนของที่เผยแพร่แล้ว (ปฏิเสธของที่ APPROVED) */
export async function moderate(kind: ContentKind, id: string, input: ModerationInput): Promise<{ status: Decision }> {
  const admin = await requireAdmin();
  const reason = input.decision === "REJECTED" ? input.reason : null;
  try {
    await db.$transaction(async (tx) => {
      const { affected, detail = reason } = await DECIDE[kind](tx, id, input.decision, reason);
      for (const a of affected) await notify(tx, a.userId, decisionNotice(a.target, input.decision, a.reason ?? reason));
      await logAdminAction(tx, admin.id, `${input.decision === "APPROVED" ? "approve" : "reject"}_${kind}`, { type: kind, id }, detail);
    });
  } catch (e) {
    if (isPrismaError(e, "P2002")) throw new UserError(409, OPEN_TAKEN);
    throw e;
  }
  return { status: input.decision };
}

export async function auditLog(page: number) {
  await requireAdmin();
  const total = await db.auditLog.count();
  const w = pageWindow(page, total, AUDIT_PER_PAGE);
  const items = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    skip: w.skip,
    take: w.take,
    select: { id: true, action: true, targetType: true, targetId: true, detail: true, createdAt: true, admin: WHO },
  });
  return { items, page: w.page, pageCount: w.pageCount };
}
```

- [ ] **Step 5: สร้าง `lib/notifications.ts`**

```ts
import { requireUser } from "./auth";
import { db } from "./db";

// ทุกฟังก์ชันเริ่มด้วย guard — เห็นและแก้ได้เฉพาะแจ้งเตือนของตัวเอง
// แจ้งเตือนถูกสร้างผ่าน notify() ใน lib/admin.ts เท่านั้น

export async function myNotifications() {
  const user = await requireUser();
  // ponytail: 50 รายการล่าสุด — แจ้งเตือนเกิดเฉพาะตอนผู้ดูแลตรวจ ต่อคนไม่มาก
  return db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, type: true, message: true, link: true, isRead: true, createdAt: true },
  });
}

export async function unreadCount(): Promise<number> {
  const user = await requireUser();
  return db.notification.count({ where: { userId: user.id, isRead: false } });
}

export async function markAllRead(): Promise<void> {
  const user = await requireUser();
  await db.notification.updateMany({ where: { userId: user.id, isRead: false }, data: { isRead: true } });
}
```

- [ ] **Step 6: แก้ `toggleLike` ใน `lib/community.ts`** (ข้อตกลง Phase 4: ถอนกระทู้ต้องปิดการถูกใจความคิดเห็นในกระทู้นั้นด้วย)

แทนบรรทัด

```ts
      : await db.communityComment.findUnique({ where: { id: input.commentId }, select: { status: true } });
```

ด้วย

```ts
      : // ความคิดเห็นในกระทู้ที่ถูกถอนต้องกดถูกใจไม่ได้เหมือนตัวกระทู้
        await db.communityComment.findUnique({ where: { id: input.commentId, post: APPROVED }, select: { status: true } });
```

- [ ] **Step 7: ตรวจ**

Run: `npx tsc --noEmit` → ไม่มี error · `node --test` → PASS ทั้งหมด

- [ ] **Step 8: Checkpoint** — ห้าม commit

---

### Task 3: Route Handler + ตรวจกับฐานข้อมูลจริง

**Files:**
- Create: `app/api/admin/moderation/[kind]/[id]/route.ts`, `app/api/notifications/read/route.ts`

**Interfaces:**
- Consumes: `moderate`, `markAllRead`, `contentKindSchema`, `idSchema`, `moderationInputSchema`, `parseJson`, `userErrorResponse`
- Produces: `POST /api/admin/moderation/[kind]/[id]` body `ModerationInput` → 200 `{ status }` · `POST /api/notifications/read` → 200 `{ ok: true }`

- [ ] **Step 1: สร้างไฟล์**

`app/api/admin/moderation/[kind]/[id]/route.ts`:

```ts
import { requireAdmin } from "@/lib/auth";
import { parseJson, userErrorResponse } from "@/lib/http";
import { moderate } from "@/lib/moderation";
import { contentKindSchema, idSchema, moderationInputSchema } from "@/lib/validation";

/** ผู้ดูแลอนุมัติหรือปฏิเสธเนื้อหาหนึ่งชิ้น — แจ้งเจ้าของและลงประวัติในทรานแซกชันเดียว */
export async function POST(req: Request, ctx: RouteContext<"/api/admin/moderation/[kind]/[id]">) {
  await requireAdmin();
  const params = await ctx.params;
  const kind = contentKindSchema.safeParse(params.kind);
  const id = idSchema.safeParse(params.id);
  if (!kind.success || !id.success) return Response.json({ error: "ไม่พบเนื้อหา" }, { status: 404 });
  const input = await parseJson(req, moderationInputSchema);
  if (input instanceof Response) return input;
  try {
    return Response.json(await moderate(kind.data, id.data, input));
  } catch (e) {
    return userErrorResponse(e);
  }
}
```

`app/api/notifications/read/route.ts`:

```ts
import { requireUser } from "@/lib/auth";
import { markAllRead } from "@/lib/notifications";

/** ทำเครื่องหมายว่าอ่านแจ้งเตือนของตัวเองทั้งหมดแล้ว */
export async function POST() {
  await requireUser();
  await markAllRead();
  return Response.json({ ok: true });
}
```

Run: `npx next typegen` → `npx tsc --noEmit` → ไม่มี error · `node --test` → PASS (เทสต์ guard ครอบไฟล์ใหม่อัตโนมัติ)

- [ ] **Step 2: seed + session ทดสอบ**

```bash
npx jiti prisma/seed.ts
npx prisma db execute --stdin <<'EOF'
INSERT OR REPLACE INTO "Session" (id, sessionToken, userId, expires) VALUES
  ('dev_s_p6a', 'dev-p6-admin', 'seed_admin', '2099-01-01T00:00:00.000Z'),
  ('dev_s_p6u1', 'dev-p6-u1', 'seed_u1', '2099-01-01T00:00:00.000Z'),
  ('dev_s_p6u3', 'dev-p6-u3', 'seed_u3', '2099-01-01T00:00:00.000Z');
EOF
```

- [ ] **Step 3: สคริปต์ `phase6a-api.mjs`** (นอก git — ใน workspace ของแผน)

```js
import { DatabaseSync } from "node:sqlite";

const BASE = "http://localhost:3000";
const A = "dev-p6-admin", U1 = "dev-p6-u1", U3 = "dev-p6-u3";
const sq = new DatabaseSync("prisma/dev.db", { readOnly: true });
const one = (sql, ...p) => sq.prepare(sql).get(...p);
const all = (sql, ...p) => sq.prepare(sql).all(...p);
const counts = () => ({
  n: one(`SELECT count(*) c FROM "Notification" WHERE userId LIKE 'seed_%'`).c,
  a: one(`SELECT count(*) c FROM "AuditLog" WHERE adminId = 'seed_admin'`).c,
});

async function call(method, path, token, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "content-type": "application/json", ...(token ? { cookie: `authjs.session-token=${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}
const page = async (path, token) =>
  (await fetch(BASE + path, { headers: token ? { cookie: `authjs.session-token=${token}` } : {} })).text();
function check(label, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? "PASS" : "FAIL"} ${label}: ${JSON.stringify(got)}${ok ? "" : ` (ต้องการ ${JSON.stringify(want)})`}`);
  if (!ok) process.exitCode = 1;
}
const mod = (kind, id, body, token = A) => call("POST", `/api/admin/moderation/${kind}/${id}`, token, body);
const OK = { decision: "APPROVED" };
const NO = (reason) => ({ decision: "REJECTED", reason });

// --- สิทธิ์และ input ---
check("ไม่ล็อกอิน", (await mod("review", "seed_r4", OK, null)).status, 401);
check("นักศึกษา", (await mod("review", "seed_r4", OK, U1)).status, 403);
check("kind มั่ว", (await mod("user", "seed_r4", OK)).status, 404);
check("id ไม่มีจริง", (await mod("review", "nope", OK)).status, 404);
check("ปฏิเสธไม่มีเหตุผล", (await mod("review", "seed_r4", { decision: "REJECTED" })).status, 400);
check("เหตุผลสั้นเกิน", (await mod("review", "seed_r4", NO("สั้น"))).status, 400);
check("decision มั่ว", (await mod("review", "seed_r4", { decision: "DELETE" })).status, 400);
check("ยังไม่มีอะไรถูกเขียน", counts(), { n: 0, a: 0 });

// --- รีวิว ---
check("อนุมัติรีวิว r4", (await mod("review", "seed_r4", OK)).status, 200);
check("อนุมัติซ้ำ", (await mod("review", "seed_r4", OK)).status, 409);
check("สถานะ r4", one(`SELECT status FROM "Review" WHERE id='seed_r4'`).status, "APPROVED");
const n4 = one(`SELECT type, message, link FROM "Notification" WHERE userId='seed_u4' ORDER BY createdAt DESC`);
check("แจ้ง u4", [n4.type, n4.link], ["review_approved", "/insights/seed_c1"]);
check("ประวัติ 1 แถว แจ้ง 1 แถว", counts(), { n: 1, a: 1 });
check("ถอนรีวิว r1 ที่เผยแพร่แล้ว", (await mod("review", "seed_r1", { ...NO("ข้อมูลเบี้ยเลี้ยงไม่ตรงความจริง"), from: "APPROVED" })).status, 200);
const n1 = one(`SELECT message, link FROM "Notification" WHERE userId='seed_u1' ORDER BY createdAt DESC`);
check("แจ้ง u1 พร้อมเหตุผล", n1.message.includes("ข้อมูลเบี้ยเลี้ยงไม่ตรงความจริง"), true);
check("ลิงก์ไปแก้ไขส่งใหม่", n1.link, "/insights/write-review?edit=seed_r1");

// --- ผู้ดูแลสองคน: หน้าค้างตัดสินทับคนอื่นไม่ได้ ---
check("ถอนโดยไม่บอก from (ค่าเริ่มต้น PENDING)", (await mod("review", "seed_r2", NO("ถอนโดยไม่ตั้งใจจากหน้าค้าง"))).status, 409);
check("r2 ยังเผยแพร่", one(`SELECT status FROM "Review" WHERE id='seed_r2'`).status, "APPROVED");
check("from นอกรายการ", (await mod("review", "seed_r2", { ...OK, from: "REJECTED" })).status, 400);
check("ปฏิเสธ r6 (คนที่หนึ่ง)", (await mod("review", "seed_r6", NO("ยังไม่ได้เล่าลักษณะงานจริง"))).status, 200);
const stale = counts();
check("อนุมัติ r6 จากหน้าค้าง (คนที่สอง)", (await mod("review", "seed_r6", OK)).status, 409);
check("r6 ยังถูกปฏิเสธ ไม่มีอะไรถูกเขียน", [one(`SELECT status FROM "Review" WHERE id='seed_r6'`).status, counts()], ["REJECTED", stale]);

// --- กระทู้ ---
check("อนุมัติกระทู้ post3", (await mod("post", "seed_post3", OK)).status, 200);
check("post3 ขึ้นบอร์ด", (await page("/community", U1)).includes("เทคนิคเขียนรายงานฝึกงานให้เสร็จเร็ว"), true);

// --- ความคิดเห็น: ตัดทั้งกิ่ง ---
const before = counts();
check("ปฏิเสธ cm1 (มีคำตอบ cm2 อนุมัติแล้ว + cm5 รอตรวจ)", (await mod("comment", "seed_cm1", { ...NO("ให้ข้อมูลเบี้ยเลี้ยงผิด"), from: "APPROVED" })).status, 200);
check(
  "ทั้งกิ่งถูกปฏิเสธ",
  all(`SELECT id, status FROM "CommunityComment" WHERE id IN ('seed_cm1','seed_cm2','seed_cm5') ORDER BY id`).map((r) => r.status),
  ["REJECTED", "REJECTED", "REJECTED"],
);
check("เหตุผลของคำตอบ", one(`SELECT rejectionReason r FROM "CommunityComment" WHERE id='seed_cm2'`).r, "ความคิดเห็นต้นทางถูกปฏิเสธ");
check("ล้างคำตอบที่ดีที่สุด", one(`SELECT bestAnswerId b FROM "CommunityPost" WHERE id='seed_post1'`).b, null);
const after = counts();
check("แจ้ง 3 คน ประวัติ 1 แถว", [after.n - before.n, after.a - before.a], [3, 1]);
check("ประวัติระบุจำนวนคำตอบ", one(`SELECT detail FROM "AuditLog" WHERE targetId='seed_cm1'`).detail.includes("2 รายการ"), true);
check("การ์ด post1 นับ 0 ความคิดเห็น", (await page("/community", U1)).includes("0 ความคิดเห็น"), true);
check("อนุมัติ cm5 ที่ต้นทางถูกปฏิเสธ", (await mod("comment", "seed_cm5", OK)).status, 409);
check("409 ไม่เขียนอะไร", counts(), after);
check("อนุมัติ cm3 ระดับบน", (await mod("comment", "seed_cm3", OK)).status, 200);

// --- ถอนกระทู้แล้วกดถูกใจความคิดเห็นในนั้นไม่ได้ ---
check("ถอนกระทู้ post5", (await mod("post", "seed_post5", { ...NO("กระทู้ซ้ำกับกระทู้อื่น"), from: "APPROVED" })).status, 200);
check("ถูกใจ cm6 ในกระทู้ที่ถูกถอน", (await call("POST", "/api/community/likes", U1, { commentId: "seed_cm6" })).status, 404);

// --- ประกาศงาน ---
check("อนุมัติ j3", (await mod("job", "seed_j3", OK)).status, 200);
check("j3 ขึ้น /jobs", (await page("/jobs")).includes("ผู้ช่วยช่างไฟฟ้าในคลังสินค้า"), true);
check("แจ้งเจ้าของประกาศ e1", one(`SELECT type FROM "Notification" WHERE userId='seed_e1' ORDER BY createdAt DESC`).type, "job_approved");
const beforeJob = counts();
check("อนุมัติ j4 ที่ชนโควตาแผนก IT", (await mod("job", "seed_j4", OK)).status, 409);
check("ชนโควตาไม่เขียนอะไร", counts(), beforeJob);
check("j4 ยังถูกปฏิเสธ", one(`SELECT status FROM "JobPosting" WHERE id='seed_j4'`).status, "REJECTED");

// --- แจ้งเตือนของผู้ใช้ ---
const unread = one(`SELECT count(*) c FROM "Notification" WHERE userId='seed_u3' AND isRead=0`).c;
check("u3 มีแจ้งเตือนยังไม่อ่าน (post3 + cm2 + cm5 + ถอน post5)", unread, 4);
check("ทำเครื่องหมายอ่าน (ไม่ล็อกอิน)", (await call("POST", "/api/notifications/read", null)).status, 401);
check("ทำเครื่องหมายอ่าน", (await call("POST", "/api/notifications/read", U3)).status, 200);
check("u3 อ่านหมดแล้ว", one(`SELECT count(*) c FROM "Notification" WHERE userId='seed_u3' AND isRead=0`).c, 0);
check("ของคนอื่นไม่ถูกแตะ", one(`SELECT count(*) c FROM "Notification" WHERE userId='seed_u1' AND isRead=0`).c > 0, true);
```

Run: `node <workspace>/phase6a-api.mjs` → Expected: ทุกบรรทัด `PASS` exit 0

- [ ] **Step 4: Checkpoint** — ห้าม commit

---

### Task 4: ศูนย์แจ้งเตือน + กระดิ่งในแถบบน

**Files:**
- Create: `app/notifications/page.tsx`, `components/MarkAllRead.tsx`
- Modify: `components/TopNav.tsx`, `app/layout.tsx`, `tests/routes.test.mjs`

**Interfaces:**
- Consumes: `myNotifications`, `unreadCount` · `POST /api/notifications/read`
- Produces: `TopNav` รับ prop ใหม่ `unread: number | null` (null = ไม่ได้ล็อกอิน ไม่แสดงกระดิ่ง)

- [ ] **Step 1: เทสต์เส้นทางให้ล้มก่อน** — ใน `INNER` ของ `tests/routes.test.mjs` เพิ่ม `"/notifications",` → `node --test` FAIL missing `/notifications`

- [ ] **Step 2: `components/MarkAllRead.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** เปิดหน้าแจ้งเตือนแล้วถือว่าอ่านหมด — refresh ให้ตัวเลขบนกระดิ่งใน layout อัปเดต */
export function MarkAllRead() {
  const router = useRouter();
  useEffect(() => {
    fetch("/api/notifications/read", { method: "POST" })
      .then((res) => res.ok && router.refresh())
      .catch(() => {});
  }, [router]);
  return null;
}
```

- [ ] **Step 3: `app/notifications/page.tsx`**

```tsx
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { MarkAllRead } from "@/components/MarkAllRead";
import { PageShell } from "@/components/PageShell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { myNotifications } from "@/lib/notifications";

const thaiDateTime = (d: Date) =>
  d.toLocaleString("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });

export default async function NotificationsPage() {
  // myNotifications เรียก requireUser — ไม่ล็อกอินได้หน้า 401
  const items = await myNotifications();
  return (
    <PageShell title="แจ้งเตือน" lede="ผลการตรวจรีวิว กระทู้ ความคิดเห็น และประกาศของคุณ">
      {items.some((n) => !n.isRead) && <MarkAllRead />}
      {items.length === 0 ? (
        <EmptyState icon="notifications" title="ยังไม่มีแจ้งเตือน">
          เมื่อผู้ดูแลตรวจเนื้อหาของคุณ ผลจะแจ้งที่นี่
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-4">
          {items.map((n) => (
            <li key={n.id}>
              <Card eyebrow={thaiDateTime(n.createdAt)} footer={!n.isRead && <Badge tone="signal">ใหม่</Badge>}>
                {n.link ? (
                  <Link href={n.link} className="kn-link">
                    {n.message}
                  </Link>
                ) : (
                  n.message
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
```

- [ ] **Step 4: กระดิ่งใน `components/TopNav.tsx`**

แก้ signature:

```tsx
export function TopNav({ links, action, unread }: { links: NavItem[]; action: NavAction | null; unread: number | null }) {
```

ต่อจาก `const onSettings = ...;` เพิ่ม:

```tsx
  const onBell = isActive(pathname, "/notifications");
```

ใน `<div className="ml-auto flex items-center gap-2">` เพิ่มก่อน `<Link href={SETTINGS.href} ...>`:

```tsx
          {unread !== null && (
            <Link
              href="/notifications"
              aria-label={unread > 0 ? `แจ้งเตือน ยังไม่อ่าน ${unread} รายการ` : "แจ้งเตือน"}
              title="แจ้งเตือน"
              aria-current={onBell ? "page" : undefined}
              className={buttonClass("ghost", "sm", cx("relative w-8 px-0", onBell ? "text-signal" : "text-ink-muted"))}
            >
              <Icon name="notifications" filled={onBell} />
              {unread > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute -right-1 -top-1 min-w-4 rounded-full bg-signal px-1 text-center text-[11px] leading-4 text-surface-000"
                >
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
          )}
```

- [ ] **Step 5: `app/layout.tsx`**

เพิ่ม import `import { unreadCount } from "@/lib/notifications";` · ต่อจาก `const links = navFor(role);` เพิ่ม:

```tsx
  // ไม่ล็อกอิน = ไม่มีกระดิ่ง · unreadCount มี guard เองจึงเรียกเฉพาะเมื่อมีผู้ใช้
  const unread = user ? await unreadCount() : null;
```

และแก้ `<TopNav links={links} action={actionFor(role)} />` เป็น `<TopNav links={links} action={actionFor(role)} unread={unread} />`

- [ ] **Step 6: ตรวจ**

Run: `npx next typegen` · `npx tsc --noEmit` · `node --test` → PASS ทั้งหมด

- [ ] **Step 7: เบราว์เซอร์** — seed ใหม่ แล้วรันสคริปต์ Task 3 อีกรอบเพื่อให้มีแจ้งเตือน (ไม่สนผล 409 ซ้ำ) · cookie `dev-p6-u1`:
  1. หน้าแรก: กระดิ่งมีตัวเลข (u1 มีแจ้งถอนรีวิว r1 = 1) · ไม่มี error ใน console
  2. คลิกกระดิ่ง → `/notifications` เห็นข้อความพร้อมเหตุผล ลิงก์ไป `/insights/write-review?edit=seed_r1` · หลังโหลดเสร็จตัวเลขบนกระดิ่งหาย
  3. ไม่มี cookie → ไม่มีกระดิ่ง · `/notifications` ได้ 401
  4. `resize_window` mobile → แถบบนมีกระดิ่ง + เฟือง ไม่ล้น (`scrollWidth <= innerWidth`) · screenshot · กลับ desktop

- [ ] **Step 8: Checkpoint** — ห้าม commit

---

### Task 5: ศูนย์คัดกรอง `/admin`

**Files:**
- Create: `components/ModerationActions.tsx`
- Modify: `app/admin/page.tsx` (เขียนใหม่)

**Interfaces:**
- Consumes: `pendingQueue`, `auditLog`, `adminParamsSchema`, `actionLabel`, `kindLabel`, `postTypeLabel`, `departmentLabel` · `POST /api/admin/moderation/[kind]/[id]`
- Produces: `<ModerationActions kind id />`

- [ ] **Step 1: `components/ModerationActions.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui/Button";
import type { ContentKind } from "@/lib/moderation-rules";

/** อนุมัติ หรือปฏิเสธพร้อมเหตุผลที่ผู้เขียนจะเห็น — เซิร์ฟเวอร์ตรวจเหตุผลซ้ำ (5–500 ตัวอักษร) */
export function ModerationActions({ kind, id }: { kind: ContentKind; id: string }) {
  const router = useRouter();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(body: { decision: "APPROVED" } | { decision: "REJECTED"; reason: string }) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/moderation/${kind}/${id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
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
      {rejecting ? (
        <>
          <div className="kn-field">
            <label className="kn-field-label" htmlFor={`reason-${id}`}>
              เหตุผลที่ปฏิเสธ (ผู้เขียนจะเห็นข้อความนี้)
            </label>
            <textarea
              id={`reason-${id}`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={500}
              className="kn-input h-auto py-3"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" disabled={busy || reason.trim().length < 5} onClick={() => send({ decision: "REJECTED", reason })}>
              ยืนยันปฏิเสธ
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setRejecting(false)}>
              ยกเลิก
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" icon={<Icon name="check" />} disabled={busy} onClick={() => send({ decision: "APPROVED" })}>
            อนุมัติ
          </Button>
          <Button size="sm" variant="ghost" icon={<Icon name="close" />} disabled={busy} onClick={() => setRejecting(true)}>
            ปฏิเสธ
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

- [ ] **Step 2: เขียน `app/admin/page.tsx` ใหม่**

```tsx
import Link from "next/link";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/EmptyState";
import { ModerationActions } from "@/components/ModerationActions";
import { PageShell } from "@/components/PageShell";
import { Badge } from "@/components/ui/Badge";
import { buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Table } from "@/components/ui/Table";
import { postTypeLabel } from "@/lib/community-rules";
import { departmentLabel } from "@/lib/departments";
import { actionLabel, kindLabel } from "@/lib/moderation-rules";
import { auditLog, pendingQueue } from "@/lib/moderation";
import { adminParamsSchema } from "@/lib/validation";

const thaiDateTime = (d: Date) =>
  d.toLocaleString("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });

const TABS = [
  { value: "pending", label: "รอตรวจ" },
  { value: "history", label: "ประวัติผู้ดูแล" },
] as const;

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  const p = adminParamsSchema.parse(await searchParams);
  return (
    <PageShell
      title="ศูนย์คัดกรอง"
      lede="อนุมัติหรือปฏิเสธรีวิว กระทู้ ความคิดเห็น และประกาศงาน พร้อมเหตุผล ผู้เขียนได้รับแจ้งผลทุกครั้ง"
      actions={
        <>
          <Link href="/admin/users" className={buttonClass("secondary")}>
            จัดการบัญชี
          </Link>
          <Link href="/admin/dashboard" className={buttonClass("secondary")}>
            แดชบอร์ด
          </Link>
        </>
      }
    >
      <nav aria-label="มุมมองศูนย์คัดกรอง" className="overflow-x-auto">
        <div className="kn-tabs w-max min-w-full">
          {TABS.map((t) => (
            <Link key={t.value} href={t.value === "pending" ? "/admin" : `/admin?tab=${t.value}`} className="kn-tab" aria-current={p.tab === t.value ? "page" : undefined}>
              {t.label}
            </Link>
          ))}
        </div>
      </nav>
      {p.tab === "history" ? <History page={p.page} /> : <Pending />}
    </PageShell>
  );
}

function Who({ user, anonymous }: { user: { name: string | null; email: string }; anonymous?: boolean }) {
  return (
    <span className="flex flex-wrap items-center gap-2 text-small text-ink-muted">
      <span className="break-all">{`${user.name ?? "ไม่มีชื่อ"} · ${user.email}`}</span>
      {anonymous && <Badge tone="warning">ผู้เขียนเลือกไม่ระบุตัวตน</Badge>}
    </span>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  if (count === 0) return null;
  return (
    <section className="flex flex-col gap-4">
      <SectionHeader title={`${title} (${count})`} />
      {children}
    </section>
  );
}

const Text = ({ label, children }: { label?: string; children: string | null }) =>
  children ? <p className="whitespace-pre-line break-words">{label ? `${label}: ${children}` : children}</p> : null;

async function Pending() {
  const q = await pendingQueue();
  if (q.reviews.length + q.posts.length + q.comments.length + q.jobs.length === 0) {
    return (
      <EmptyState icon="fact_check" title="ไม่มีรายการรอตรวจ">
        เนื้อหาที่รอการอนุมัติจะแสดงที่นี่
      </EmptyState>
    );
  }
  return (
    <>
      <Section title={kindLabel("review")} count={q.reviews.length}>
        {q.reviews.map((r) => (
          <Card
            key={r.id}
            eyebrow={`${departmentLabel(r.department)} · ${thaiDateTime(r.createdAt)}`}
            title={r.company.name}
            footer={<ModerationActions kind="review" id={r.id} />}
          >
            <Who user={r.user} anonymous={r.isAnonymous} />
            <p>{`คะแนนรวม ${r.scoreOverall.toFixed(1)} · ${r.dailyAllowance === null ? "ไม่ระบุเบี้ยเลี้ยง" : `เบี้ยเลี้ยง ${r.dailyAllowance} บาท/วัน`}`}</p>
            <Text>{r.textWork}</Text>
            <Text label="ข้อดี">{r.textPros}</Text>
            <Text label="ข้อควรรู้">{r.textCons}</Text>
            <Text label="คำแนะนำ">{r.textAdvice}</Text>
            {r.photos.length > 0 && (
              <span className="flex flex-wrap gap-3">
                {r.photos.map((ph, i) => (
                  <a key={ph.id} href={ph.url} target="_blank" rel="noopener noreferrer" className="kn-link">
                    {`รูปที่ ${i + 1}`}
                  </a>
                ))}
              </span>
            )}
          </Card>
        ))}
      </Section>
      <Section title={kindLabel("post")} count={q.posts.length}>
        {q.posts.map((p) => (
          <Card
            key={p.id}
            eyebrow={`${postTypeLabel(p.type)} · ${p.department ? departmentLabel(p.department) : "ทั่วไป"} · ${thaiDateTime(p.createdAt)}`}
            title={p.title}
            footer={<ModerationActions kind="post" id={p.id} />}
          >
            <Who user={p.user} />
            <Text>{p.body}</Text>
          </Card>
        ))}
      </Section>
      <Section title={kindLabel("comment")} count={q.comments.length}>
        {q.comments.map((c) => (
          <Card key={c.id} eyebrow={thaiDateTime(c.createdAt)} title={`ในกระทู้: ${c.post.title}`} footer={<ModerationActions kind="comment" id={c.id} />}>
            <Who user={c.user} />
            {c.parent && <Text label="ตอบกลับ">{c.parent.body}</Text>}
            <Text>{c.body}</Text>
            {(c.post.status !== "APPROVED" || (c.parent && c.parent.status !== "APPROVED")) && (
              <Badge tone="warning">ต้นทางยังไม่เผยแพร่ อนุมัติไม่ได้</Badge>
            )}
          </Card>
        ))}
      </Section>
      <Section title={kindLabel("job")} count={q.jobs.length}>
        {q.jobs.map((j) => (
          <Card
            key={j.id}
            eyebrow={`${departmentLabel(j.department)} · ${thaiDateTime(j.createdAt)}`}
            title={`${j.title} · ${j.company.name}`}
            footer={<ModerationActions kind="job" id={j.id} />}
          >
            <Who user={j.employer.user} />
            <p>{`${j.allowance === null ? "ไม่ระบุเบี้ยเลี้ยง" : `เบี้ยเลี้ยง ${j.allowance} บาท/วัน`} · ติดต่อ ${j.contactEmail}${j.contactPhone ? ` ${j.contactPhone}` : ""}`}</p>
            <Text>{j.description}</Text>
            <Text label="คุณสมบัติ">{j.qualifications}</Text>
            <Text label="สวัสดิการ">{j.benefits}</Text>
          </Card>
        ))}
      </Section>
    </>
  );
}

const COLUMNS = [
  { key: "at", label: "เวลา" },
  { key: "admin", label: "ผู้ดูแล" },
  { key: "action", label: "การกระทำ" },
  { key: "target", label: "เป้าหมาย" },
  { key: "detail", label: "รายละเอียด" },
];

async function History({ page }: { page: number }) {
  const { items, page: current, pageCount } = await auditLog(page);
  if (items.length === 0) return <EmptyState icon="history" title="ยังไม่มีประวัติ" />;
  return (
    <>
      <Table
        columns={COLUMNS}
        rows={items.map((a) => ({
          id: a.id,
          at: <span className="whitespace-nowrap">{thaiDateTime(a.createdAt)}</span>,
          admin: a.admin.name ?? a.admin.email,
          action: actionLabel(a.action),
          target: <span className="whitespace-nowrap">{`${kindLabel(a.targetType)} ${a.targetId}`}</span>,
          detail: a.detail ?? "-",
        }))}
      />
      {pageCount > 1 && (
        <nav aria-label="เปลี่ยนหน้า" className="flex items-center justify-between gap-4">
          {current > 1 ? (
            <Link href={`/admin?tab=history&page=${current - 1}`} className={buttonClass("secondary")}>
              ก่อนหน้า
            </Link>
          ) : (
            <span />
          )}
          <span className="text-small text-ink-muted">{`หน้า ${current} จาก ${pageCount}`}</span>
          {current < pageCount ? (
            <Link href={`/admin?tab=history&page=${current + 1}`} className={buttonClass("secondary")}>
              ถัดไป
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  );
}
```

- [ ] **Step 3: ตรวจ** — `npx tsc --noEmit` · `node --test` · `npx eslint` ไฟล์ที่แตะ → ไม่มี error

- [ ] **Step 4: เบราว์เซอร์** — seed ใหม่ (คิวกลับมาเต็ม) · cookie `dev-p6-admin`:
  1. `/admin` เห็นหัวข้อ รีวิว (2) กระทู้ (1) ความคิดเห็น (2) ประกาศงาน (1) · รีวิว r6 ของ u2 แสดงชื่อ+อีเมล · ไม่มี error console
  2. อนุมัติ r4 → การ์ดหายหลัง refresh
  3. ปฏิเสธ post3: กดปฏิเสธ → ปุ่มยืนยัน disabled จนพิมพ์ ≥ 5 ตัว → ยืนยัน → การ์ดหาย
  4. ความคิดเห็น cm5 (ต้นทาง cm1 อนุมัติแล้ว) อนุมัติได้ · ปฏิเสธ cm1 ผ่าน API แล้ว seed cm5 กลับเป็น PENDING ด้วย SQL `UPDATE "CommunityComment" SET status='PENDING' WHERE id='seed_cm5'` → รีเฟรช → การ์ด cm5 มีป้าย "ต้นทางยังไม่เผยแพร่" กดอนุมัติ → ข้อความ 409 ใต้ปุ่ม
  5. แท็บ "ประวัติผู้ดูแล" เห็นแถวของการกระทำข้างบน การกระทำเป็นภาษาไทย
  6. `resize_window` mobile → `/admin` และ `/admin?tab=history`: `scrollWidth <= innerWidth` (ตารางเลื่อนในกล่องตัวเอง) · ปุ่มอนุมัติ/ปฏิเสธสูง ≥ 44px · screenshot · กลับ desktop
  7. cookie `dev-p6-u1` → `/admin` ได้ 403

- [ ] **Step 5: Checkpoint** — ห้าม commit

---

### Task 6: เอกสาร + เก็บกวาด + ตรวจสุดท้าย

**Files:** Modify `docs/context.md`

- [ ] **Step 1: `docs/context.md`**
  - ตาราง Phase แถว 6 → `| 6 | ยืนยันสิทธิ์ แจ้งเตือน รายงาน ศูนย์คัดกรอง จัดการบัญชี | 6a เสร็จ (คัดกรอง แจ้งเตือน ประวัติ) · 6b ยังไม่เริ่ม |`
  - บรรทัดสถานะ → `Phase 0–5 และ 6a เสร็จแล้ว ถัดไปคือ **Phase 6b**`
  - เพิ่มย่อหน้าหลัง Phase 5:

```markdown
Phase 6a: ทุกการตัดสินเนื้อหาผ่าน `moderate(kind, id, input)` ใน `lib/moderation.ts` ตัวเดียว (อ่าน ตรวจกฎ เปลี่ยนสถานะ `notify()` `logAdminAction()` ในทรานแซกชันเดียว) · ข้อตกลงค้างของ Phase 4–5 ทำครบแล้ว (ตัดกิ่งความคิดเห็น ล้างคำตอบที่ดีที่สุด toggleLike เช็คกระทู้ คิวประกาศเฉพาะที่เปิดรับ P2002 → 409) · **6b ต้องรักษา:** ถอนเนื้อหาจากข้อร้องเรียนให้เรียก `moderate(..., { decision: "REJECTED", reason })` ไม่เขียนตรรกะใหม่ · การกระทำผู้ดูแลแบบอื่น (อนุมัติคำขอยืนยันสิทธิ์ เปลี่ยนบทบาท ระงับ แต่งตั้ง) ใช้ `logAdminAction`/`notify` จาก `lib/admin.ts` ในทรานแซกชันเดียวกัน และเพิ่มคำใน `actionLabel` · เทสต์ใน `tests/route-guards.test.mjs` ห้ามเขียน `notification.create`/`auditLog.create` นอก `lib/admin.ts`
```

- [ ] **Step 2: เก็บกวาด**

```bash
npx prisma db execute --stdin <<'EOF'
DELETE FROM "Session" WHERE sessionToken LIKE 'dev-p6-%';
EOF
npx jiti prisma/seed.ts
```

- [ ] **Step 3: ตรวจสุดท้าย** — `node --test` · `npx tsc --noEmit` · `npm run build` → ผ่าน · `git status --short` เห็นเฉพาะไฟล์ใน File Structure

- [ ] **Step 4: หยุดให้ผู้ใช้รีวิว** — ห้าม commit จนผู้ใช้สั่ง
