# Phase 4 — เว็บบอร์ดชุมชน Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** นักศึกษาตั้งกระทู้ใน 4 หมวด (ถามตอบ เล่าประสบการณ์ เทคนิค หาเพื่อนฝึกงาน) กรองตามแผนก แสดงความคิดเห็นซ้อนเป็นลำดับชั้น กดถูกใจกระทู้และความคิดเห็นบัญชีละครั้ง และเจ้าของกระทู้ถามตอบเลือกคำตอบที่ดีที่สุดได้ ทุกอย่างเกิดมาเป็น `PENDING` ที่สาธารณะเห็นเฉพาะ `APPROVED` รวมถึงตัวนับความคิดเห็น

**Architecture:** หน้า `/community`, `/community/[id]`, `/community/new` เป็น Server Component อ่านผ่าน DAL `lib/community.ts` (มี guard เอง กรอง `APPROVED` ทุก query รวม `_count`) การกระทำของผู้ใช้ (ตั้งกระทู้ แสดงความคิดเห็น กดถูกใจ เลือกคำตอบ) ส่ง JSON ไป Route Handler 4 ตัวใน `app/api/community/` ความคิดเห็นทั้งกระทู้ดึงด้วย query เดียวแล้วประกอบเป็นต้นไม้ในหน่วยความจำด้วย `buildCommentTree` (pure มีเทสต์) คำตอบที่ดีที่สุดเก็บเป็นตัวชี้ `CommunityPost.bestAnswerId` ฐานข้อมูลจึงรับประกันหนึ่งคำตอบต่อกระทู้เอง

**Tech Stack:** Next 16.3 App Router (Route Handlers, `RouteContext`) · Prisma 7 + SQLite · zod 4 · `node --test`

**Spec:** แผนเต็ม `C:\Users\user\.claude\plans\htc-insights-synthetic-zephyr.md` หัวข้อ "Phase 4" + `docs/context.md` (หลักการโดเมนข้อ 1 และ 4, สเปกข้อ 6–8, บทเรียน v1 "นับคอมเมนต์ที่ยังไม่อนุมัติ")

### ต่างจากแผนเต็ม / ตัดสินเองในแผนนี้

| แผนเต็มเขียนว่า | แผนนี้ทำ | เหตุผล |
|---|---|---|
| `CommunityComment.isBestAnswer` ตั้งใหม่ต้องล้างของเดิมในทรานแซกชันเดียว | ลบ `isBestAnswer` เพิ่ม `CommunityPost.bestAnswerId String? @unique` (ชี้คอมเมนต์ ลบคอมเมนต์ = `SetNull`) | หนึ่งกระทู้หนึ่งคำตอบได้จากโครงสร้างฐานข้อมูลเอง ไม่มีทรานแซกชันให้พลาด (CLAUDE.md: กฎที่บังคับที่ฐานข้อมูลได้ ให้บังคับที่ฐานข้อมูล) |
| — | คำตอบที่ดีที่สุดเลือกได้เฉพาะกระทู้หมวด **ถามตอบ** และเลือกความคิดเห็นของตัวเองไม่ได้ | "คำตอบ" มีความหมายเฉพาะกับคำถาม |
| — | เจ้าของเห็นกระทู้/ความคิดเห็นของตัวเองที่ **รอตรวจ** พร้อมป้าย คนอื่นไม่เห็น | ส่งแล้วไม่เห็นอะไรเลยผู้ใช้จะคิดว่าพัง (หลักการข้อ 4 ผู้ใช้ต้องรู้ผล) ตัวนับสาธารณะยังนับเฉพาะ `APPROVED` |
| — | ตอบกลับได้เฉพาะความคิดเห็นที่ `APPROVED` ในกระทู้เดียวกัน และแสดงความคิดเห็นได้เฉพาะกระทู้ที่ `APPROVED` | คำตอบใต้ต้นทางที่สาธารณะมองไม่เห็นจะหลุดบริบท |
| — | ปุ่มตั้งกระทู้/แสดงความคิดเห็น/ถูกใจ/เลือกคำตอบ แสดงเฉพาะ `STUDENT` ผู้ดูแลอ่านได้อย่างเดียว | สเปกให้นักศึกษาทำสิ่งเหล่านี้ และไม่ให้ผู้ดูแลกดแล้วเจอหน้า 403 แบบที่เกิดกับปุ่มเขียนรีวิว |
| — | รวม `ReviewError` เป็น `UserError` ใน `lib/http.ts` ใช้ร่วมทุก Route Handler | Phase 4 ต้องการของเดียวกัน ไม่เขียนคลาสซ้ำ |

**ข้อตกลงที่ Phase 6 ต้องรักษา:** ผู้ดูแลต้องไม่อนุมัติคำตอบที่ต้นทางยังไม่ `APPROVED` ปฏิเสธหรือถอนความคิดเห็นที่อนุมัติแล้วต้องปฏิเสธคำตอบใต้มันทั้งกิ่งด้วย และเมื่อปฏิเสธความคิดเห็นที่เป็นคำตอบที่ดีที่สุด ให้ล้าง `bestAnswerId` — ไม่งั้นตัวนับบนการ์ดจะมากกว่าจำนวนที่แสดงในกระทู้ (`buildCommentTree` ตัดกิ่งที่หลุดบริบททิ้งอยู่แล้ว เป็นแค่ด่านสำรอง)

## Global Constraints

- อ่าน `AGENTS.md`: Next 16 — `params`/`searchParams` เป็น Promise ใช้ `PageProps<'/x'>` / `RouteContext<'/x'>` แบบ global ไม่ต้อง import
- Prisma Client ใช้ผ่าน `db` จาก `@/lib/db` เท่านั้น (ยกเว้น `prisma/seed.ts`)
- **ทุก Route Handler เรียก guard จาก `@/lib/auth` เป็นบรรทัดแรก** และทุก `export async function` ใน DAL (`lib/companies.ts`, `lib/reviews.ts`, `lib/community.ts`) ก็เช่นกัน — `tests/route-guards.test.mjs` ตรวจ
- **ตัวกรอง `APPROVED` อยู่ในทุก query ที่ข้อมูลไปถึงผู้อื่น รวมถึง `_count`** — บั๊กที่ v1 พลาดซ้ำสองรอบคือนับความคิดเห็นที่ยังไม่อนุมัติบนการ์ดกระทู้
- กระทู้และความคิดเห็นใหม่เป็น `PENDING` เสมอ client ส่ง `status`/`userId` มาเองไม่ได้ (zod ตัดคีย์ที่ไม่รู้จัก)
- กดถูกใจบัญชีละครั้งบังคับด้วย `@@unique` ที่มีอยู่แล้วใน `CommunityLike` กดซ้ำ = ยกเลิก
- input ทุกชิ้นผ่าน zod (`lib/validation.ts`) ข้อความ error ภาษาไทย รูปแบบ JSON `{ "error": "..." }` ผ่าน `UserError` / `badRequest` จาก `lib/http.ts`
- ห้ามส่งแถวที่มี `userId` ของคนอื่นเข้า client component — ส่งเฉพาะ id ของกระทู้/ความคิดเห็น และค่าที่ปุ่มต้องใช้
- วันที่แสดงด้วย locale `th-TH` และ `timeZone: "Asia/Bangkok"`
- UI ภาษาไทย ไม่ใช้ emoji ไอคอน Material Symbols primary หนึ่งปุ่มต่อหน้าจอ ทดสอบที่ 375px
- เทสต์รันด้วย `node --test` (ไม่ใส่ `tests/`) ไฟล์ที่เทสต์ import (`lib/community-rules.ts`) ต้องไม่ import ค่าจริง ห้ามใช้ alias `@/`
- Git Bash ส่งภาษาไทยใน argv ให้ `curl.exe`/`node.exe` เพี้ยน — ใส่ภาษาไทยในไฟล์สคริปต์หรือ percent-encode เท่านั้น
- `prisma migrate dev` ใช้ไม่ได้ในโหมด non-interactive ของเครื่องนี้ — ใช้ `migrate diff` + `migrate deploy` (Task 1)
- dev server ถือ Prisma Client ตัวเก่าไว้ใน `globalThis` — หลัง `prisma generate` ต้องรีสตาร์ต dev server ก่อนทดสอบ
- **ห้าม commit เอง** — CLAUDE.md ให้ commit เมื่อผู้ใช้สั่งเท่านั้น

## Review Focus

1. **ตัวนับความคิดเห็นบนการ์ดนับของที่ยังไม่อนุมัติ** (บั๊ก v1 สองรอบ) — `seed_post1` มี APPROVED 2, PENDING 2, REJECTED 1 → การ์ดต้องขึ้น `2 ความคิดเห็น` · curl ใน Task 5
2. **ตอบกลับไปที่ต้นทางที่มองไม่เห็นหรืออยู่คนละกระทู้ หรือแสดงความคิดเห็นในกระทู้ที่ยังไม่อนุมัติ** ต้องได้ 400/404 และต้นไม้ต้องไม่โชว์กิ่งที่หลุดบริบท → สคริปต์ Task 4 + เทสต์ `buildCommentTree` Task 2
3. **กดถูกใจรัว ๆ / กดถูกใจของที่ยังไม่อนุมัติ / ส่งทั้ง postId และ commentId** → กดสองครั้งต้องกลับไปที่ตัวเลขเดิม ของที่ไม่อนุมัติได้ 404 ส่งสองเป้าได้ 400 · สคริปต์ Task 4
4. **เลือกคำตอบที่ดีที่สุดโดยคนที่ไม่ใช่เจ้าของ / เลือกของตัวเอง / เลือกความคิดเห็นของกระทู้อื่น / กระทู้ไม่ใช่ถามตอบ** → 403/400 และยกเลิกการเลือกได้ · เทสต์ `bestAnswerError` Task 2 + สคริปต์ Task 4
5. **สายตอบกลับลึกหลายชั้นบนจอ 375px** → ย่อหน้าซ้อนสูงสุด 3 ชั้นแล้วไม่ย่อเพิ่ม ไม่มีอะไรล้นแนวนอน · ตรวจในเบราว์เซอร์ Task 7

---

## File Structure

```
prisma/schema.prisma + migration      CommunityPost.bestAnswerId @unique, ลบ CommunityComment.isBestAnswer      แก้ (T1)
prisma/seed.ts                        กระทู้ 5 ความคิดเห็น 7 ถูกใจ 3 ผสมสถานะ                                   แก้ (T1)
lib/community-rules.ts                POST_TYPES canView buildCommentTree countNodes bestAnswerError pageWindow (pure)  ใหม่ (T2)
lib/http.ts                           UserError badRequest userErrorResponse parseJson                         ใหม่ (T3)
lib/db.ts                             isPrismaError (ย้ายมาจาก lib/reviews.ts)                                 แก้ (T3)
lib/reviews.ts, lib/review-request.ts, app/api/reviews/route.ts, app/api/reviews/[id]/route.ts
                                      ใช้ UserError/badRequest/userErrorResponse จาก lib/http.ts               แก้ (T3)
lib/validation.ts                     communityListParamsSchema postInputSchema commentInputSchema
                                      likeInputSchema bestAnswerInputSchema                                    แก้ (T3)
lib/community.ts                      DAL: listPosts getPost createPost createComment toggleLike setBestAnswer myPosts  ใหม่ (T3)
app/api/community/posts/route.ts                    POST                                                      ใหม่ (T4)
app/api/community/comments/route.ts                 POST                                                      ใหม่ (T4)
app/api/community/likes/route.ts                    POST                                                      ใหม่ (T4)
app/api/community/posts/[id]/best-answer/route.ts   PUT                                                       ใหม่ (T4)
components/ui/kernel.css              .kn-tab[aria-current="page"]                                             แก้ (T5)
components/PostForm.tsx               ฟอร์มตั้งกระทู้ (client)                                                  ใหม่ (T5)
app/community/page.tsx, app/community/new/page.tsx                                                            เขียนใหม่ (T5)
components/CommentForm.tsx, components/LikeButton.tsx, components/BestAnswerButton.tsx  (client)               ใหม่ (T6)
app/community/[id]/page.tsx           กระทู้ + ต้นไม้ความคิดเห็น                                                 เขียนใหม่ (T6)
app/profile/page.tsx                  กระทู้ของฉัน                                                              แก้ (T7)
docs/context.md                       สถานะ Phase 4 + ข้อตกลงที่ Phase 6 ต้องรักษา                               แก้ (T7)
tests/community-rules.test.mjs        ใหม่ (T2) · tests/route-guards.test.mjs เพิ่ม lib/community.ts (T3)
```

---

### Task 1: Schema คำตอบที่ดีที่สุด + ข้อมูลตัวอย่างชุมชน

**Files:**
- Modify: `prisma/schema.prisma`, `prisma/seed.ts`
- Create: `prisma/migrations/<timestamp>_phase4_community/migration.sql` (สร้างด้วยคำสั่ง)

**Interfaces:**
- Produces: `CommunityPost.bestAnswerId: string | null` (unique) + relation `bestAnswer` · `CommunityComment` ไม่มี `isBestAnswer` · relation post↔comments ชื่อ `"PostComments"`
- ข้อมูล seed (id คงที่) ที่งานถัดไปใช้ตรวจ:

| id | เจ้าของ | หมวด | สถานะ | หมายเหตุ |
|---|---|---|---|---|
| `seed_post1` | u1 | QA ช่างยนต์ | APPROVED | ความคิดเห็น cm1–cm5 · ถูกใจโดย u2, u4 · คำตอบที่ดีที่สุด = cm1 |
| `seed_post2` | u2 | EXPERIENCE IT | APPROVED | ไม่มีความคิดเห็น |
| `seed_post3` | u3 | TIPS ทั่วไป | PENDING | u3 เห็นคนเดียว |
| `seed_post4` | u4 | TEAM อิเล็กทรอนิกส์ | REJECTED | ไม่มีใครเห็นในบอร์ด |
| `seed_post5` | u3 | QA ทั่วไป | APPROVED | ความคิดเห็น cm6 (u1), cm7 (u3) · ยังไม่มีคำตอบที่ดีที่สุด |

ความคิดเห็นของ `seed_post1`: `seed_cm1` u2 APPROVED (ระดับบน) · `seed_cm2` u3 APPROVED ตอบ cm1 · `seed_cm3` u4 PENDING · `seed_cm4` u2 REJECTED · `seed_cm5` u3 PENDING ตอบ cm1 → สาธารณะเห็น 2, u3 เห็น 3

- [ ] **Step 1: แก้ `prisma/schema.prisma`**

ใน `model CommunityPost` เพิ่มหลังบรรทัด `body       String`:

```prisma

  // คำตอบที่ดีที่สุด (หมวดถามตอบ) — ชี้ที่ความคิดเห็นตัวเดียว ฐานข้อมูลจึงรับประกันหนึ่งคำตอบต่อกระทู้เอง
  // ลบความคิดเห็นนั้น = ล้างค่า (SetNull)
  bestAnswerId String? @unique
```

และแทนบรรทัด `  comments CommunityComment[]` ใน `CommunityPost` ด้วย:

```prisma
  comments   CommunityComment[] @relation("PostComments")
  bestAnswer CommunityComment?  @relation("BestAnswer", fields: [bestAnswerId], references: [id], onDelete: SetNull)
```

ใน `model CommunityComment` ลบสามบรรทัดนี้:

```prisma
  // เจ้าของกระทู้เลือกได้ หนึ่งกระทู้หนึ่งคำตอบ ตั้งใหม่ต้องล้างของเดิมในทรานแซกชันเดียว
  isBestAnswer Boolean @default(false)

```

แทน `  post    CommunityPost      @relation(fields: [postId], references: [id], onDelete: Cascade)` ด้วย:

```prisma
  post         CommunityPost      @relation("PostComments", fields: [postId], references: [id], onDelete: Cascade)
  bestAnswerOf CommunityPost?     @relation("BestAnswer")
```

Run: `npx prisma validate` → Expected: `The schema at prisma\schema.prisma is valid`
(ถ้าฟ้องเรื่อง cycle/referential action ให้หยุดและรายงาน BLOCKED พร้อมข้อความเต็ม)

- [ ] **Step 2: สร้างและรัน migration**

```bash
dir="prisma/migrations/$(date -u +%Y%m%d%H%M%S)_phase4_community"; mkdir -p "$dir"
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script -o "$dir/migration.sql"
npx prisma migrate deploy
npx prisma generate
npx prisma migrate status
```

Expected: migration ใหม่ถูก apply · `Database schema is up to date!` · `migration.sql` เพิ่มคอลัมน์ `bestAnswerId` + unique index และสร้างตาราง `CommunityComment` ใหม่โดย `INSERT ... SELECT` คอลัมน์เดิมทั้งหมดยกเว้น `isBestAnswer`
ตรวจว่า git เห็นไฟล์: `git status --short prisma/migrations` → โฟลเดอร์ใหม่ขึ้นเป็น `??`

- [ ] **Step 3: เพิ่มข้อมูลชุมชนใน `prisma/seed.ts`**

แก้บรรทัด import ให้เอา type `PostType` มาด้วย:

```ts
import { PrismaClient, type ContentStatus, type PostType } from "../app/generated/prisma/client";
```

เพิ่มค่าคงที่ต่อจาก `const REVIEWS ... ];`:

```ts
type SeedPost = { id: string; userId: string; type: PostType; department: string | null; status: ContentStatus; title: string; body: string };

const POSTS: SeedPost[] = [
  { id: "seed_post1", userId: "seed_u1", type: "QA", department: "แผนกวิชาช่างยนต์", status: "APPROVED", title: "ฝึกงานช่างยนต์ที่ไหนได้เบี้ยเลี้ยงดีบ้าง", body: "ปีหน้าจะออกฝึกแล้ว อยากได้ที่ที่มีเบี้ยเลี้ยงและได้ลงมือซ่อมจริง แนะนำหน่อยครับ" },
  { id: "seed_post2", userId: "seed_u2", type: "EXPERIENCE", department: "แผนกวิชาเทคโนโลยีสารสนเทศ", status: "APPROVED", title: "เล่าประสบการณ์ฝึกงานบริษัทไอทีในหาดใหญ่", body: "ได้ช่วยดูแลเว็บและแก้คอมพิวเตอร์ในออฟฟิศ พี่ ๆ ใจดี สอนละเอียดมาก" },
  { id: "seed_post3", userId: "seed_u3", type: "TIPS", department: null, status: "PENDING", title: "เทคนิคเขียนรายงานฝึกงานให้เสร็จเร็ว", body: "จดงานที่ทำทุกวันตั้งแต่วันแรก แล้วรายงานจะเขียนง่ายมาก" },
  { id: "seed_post4", userId: "seed_u4", type: "TEAM", department: "แผนกวิชาช่างอิเล็กทรอนิกส์", status: "REJECTED", title: "กระทู้ที่ถูกปฏิเสธ", body: "ข้อความกระทู้ที่ถูกปฏิเสธ ไม่ควรแสดงในบอร์ด" },
  { id: "seed_post5", userId: "seed_u3", type: "QA", department: null, status: "APPROVED", title: "ต้องเตรียมเอกสารอะไรบ้างก่อนออกฝึก", body: "มีใครมีรายการเอกสารที่ต้องเตรียมก่อนออกฝึกบ้างครับ" },
];

type SeedComment = { id: string; postId: string; userId: string; parentId: string | null; status: ContentStatus; body: string };

// เรียงให้ต้นทางถูกสร้างก่อนคำตอบ
const COMMENTS: SeedComment[] = [
  { id: "seed_cm1", postId: "seed_post1", userId: "seed_u2", parentId: null, status: "APPROVED", body: "หาดใหญ่ออโต้เซอร์วิสให้วันละ 300 ได้ซ่อมจริงครับ" },
  { id: "seed_cm2", postId: "seed_post1", userId: "seed_u3", parentId: "seed_cm1", status: "APPROVED", body: "ยืนยันครับ พี่เลี้ยงดีมาก" },
  { id: "seed_cm3", postId: "seed_post1", userId: "seed_u4", parentId: null, status: "PENDING", body: "ความคิดเห็นที่รอตรวจของคนอื่น" },
  { id: "seed_cm4", postId: "seed_post1", userId: "seed_u2", parentId: null, status: "REJECTED", body: "ความคิดเห็นที่ถูกปฏิเสธ" },
  { id: "seed_cm5", postId: "seed_post1", userId: "seed_u3", parentId: "seed_cm1", status: "PENDING", body: "ความคิดเห็นที่รอตรวจของฉันเอง" },
  { id: "seed_cm6", postId: "seed_post5", userId: "seed_u1", parentId: null, status: "APPROVED", body: "สำเนาบัตรประชาชน หนังสือส่งตัวจากวิทยาลัย และรูปถ่ายครับ" },
  { id: "seed_cm7", postId: "seed_post5", userId: "seed_u3", parentId: null, status: "APPROVED", body: "ขอบคุณครับ" },
];

const LIKES = [
  { id: "seed_lk1", userId: "seed_u2", postId: "seed_post1" },
  { id: "seed_lk2", userId: "seed_u4", postId: "seed_post1" },
  { id: "seed_lk3", userId: "seed_u1", commentId: "seed_cm1" },
];
```

ใน `main()` ก่อนบรรทัด `const byStatus = await ...` เพิ่ม:

```ts
  // bestAnswerId ล้างทุกรอบ (สคริปต์ทดสอบเปลี่ยนค่าได้) แล้วตั้งของ seed_post1 หลังความคิดเห็นถูกสร้าง
  for (const p of POSTS) {
    const data = { ...p, bestAnswerId: null };
    await db.communityPost.upsert({ where: { id: p.id }, create: data, update: data });
  }
  for (const c of COMMENTS) await db.communityComment.upsert({ where: { id: c.id }, create: c, update: c });
  for (const l of LIKES) await db.communityLike.upsert({ where: { id: l.id }, create: l, update: l });
  await db.communityPost.update({ where: { id: "seed_post1" }, data: { bestAnswerId: "seed_cm1" } });
```

และต่อท้าย `main()` หลัง `console.log` เดิม:

```ts
  console.log(`seed: ${POSTS.length} กระทู้ ${COMMENTS.length} ความคิดเห็น ${LIKES.length} ถูกใจ`);
```

- [ ] **Step 4: รัน seed สองรอบ**

Run: `npx jiti prisma/seed.ts` (สองครั้ง)
Expected ทั้งสองครั้ง:
```
seed: 6 บริษัท APPROVED=5 PENDING=2 REJECTED=1
seed: 5 กระทู้ 7 ความคิดเห็น 3 ถูกใจ
```

- [ ] **Step 5: ตรวจ**

Run: `npx tsc --noEmit` → ไม่มี error · `node --test` → PASS ทั้งหมด (49)
Run: `grep -rn "isBestAnswer" --include=*.ts --include=*.tsx --include=*.prisma . | grep -v node_modules | grep -v app/generated` → ไม่มีผล

- [ ] **Step 6: Checkpoint** — ห้าม commit

---

### Task 2: กฎของบอร์ด (`lib/community-rules.ts`)

**Files:**
- Create: `lib/community-rules.ts`
- Test: `tests/community-rules.test.mjs`

**Interfaces:**
- Consumes: ไม่มี (pure)
- Produces:
  - `POST_TYPES` (value/label 4 หมวด) · `type PostType = "QA" | "EXPERIENCE" | "TIPS" | "TEAM"` · `POST_TYPE_VALUES: [PostType, ...PostType[]]` · `postTypeLabel(v: string): string`
  - `POSTS_PER_PAGE = 20`
  - `canView(item: { status: string; userId: string }, viewerId: string): boolean`
  - `type FlatComment = { id: string; parentId: string | null; status: string; userId: string; createdAt: Date }`
  - `type CommentNode<T extends FlatComment> = T & { depth: number; replies: CommentNode<T>[] }`
  - `buildCommentTree<T extends FlatComment>(rows: T[], viewerId: string): CommentNode<T>[]`
  - `countNodes(nodes: { replies: unknown[] }[]): number`
  - `bestAnswerError(post: { id; userId; type; status }, comment: { postId; userId; status } | null, viewerId: string): string | null`
  - `pageWindow(page: number, total: number, size: number): { page; pageCount; skip; take }`

- [ ] **Step 1: เขียนเทสต์ที่ล้มเหลว `tests/community-rules.test.mjs`**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  POSTS_PER_PAGE,
  POST_TYPE_VALUES,
  bestAnswerError,
  buildCommentTree,
  canView,
  countNodes,
  pageWindow,
  postTypeLabel,
} from "../lib/community-rules.ts";

const at = (min) => new Date(Date.UTC(2026, 9, 2, 0, min));
const cm = (id, extra = {}) => ({ id, parentId: null, status: "APPROVED", userId: "u1", createdAt: at(0), ...extra });
const shape = (nodes) => nodes.map((n) => [n.id, n.depth, shape(n.replies)]);

test("หมวดกระทู้ 4 หมวดตามสเปก", () => {
  assert.deepEqual(POST_TYPE_VALUES, ["QA", "EXPERIENCE", "TIPS", "TEAM"]);
  assert.equal(postTypeLabel("QA"), "ถามตอบ");
  assert.equal(postTypeLabel("NEWS"), "NEWS");
});

test("canView: คนอื่นเห็นเฉพาะ APPROVED เจ้าของเห็นของตัวเองที่รอตรวจ", () => {
  assert.equal(canView({ status: "APPROVED", userId: "a" }, "b"), true);
  assert.equal(canView({ status: "PENDING", userId: "a" }, "a"), true);
  assert.equal(canView({ status: "PENDING", userId: "a" }, "b"), false);
  assert.equal(canView({ status: "REJECTED", userId: "a" }, "a"), false);
});

test("buildCommentTree: ซ้อนตาม parentId เรียงเก่าไปใหม่ และบอกความลึก", () => {
  const rows = [
    cm("b", { createdAt: at(2) }),
    cm("a", { createdAt: at(1) }),
    cm("a1", { parentId: "a", createdAt: at(3) }),
    cm("a1x", { parentId: "a1", createdAt: at(4) }),
  ];
  assert.deepEqual(shape(buildCommentTree(rows, "viewer")), [
    ["a", 0, [["a1", 1, [["a1x", 2, []]]]]],
    ["b", 0, []],
  ]);
});

test("buildCommentTree: ซ่อนที่ถูกปฏิเสธและที่รอตรวจของคนอื่น และตัดคำตอบใต้ต้นทางที่ถูกซ่อนทั้งกิ่ง", () => {
  const rows = [
    cm("ok"),
    cm("rejected", { status: "REJECTED" }),
    cm("underRejected", { parentId: "rejected" }),
    cm("deep", { parentId: "underRejected" }),
    cm("othersPending", { status: "PENDING", userId: "other" }),
    cm("minePending", { status: "PENDING", userId: "me", parentId: "ok" }),
  ];
  assert.deepEqual(shape(buildCommentTree(rows, "me")), [["ok", 0, [["minePending", 1, []]]]]);
  assert.deepEqual(shape(buildCommentTree(rows, "stranger")), [["ok", 0, []]]);
});

test("buildCommentTree เก็บฟิลด์อื่นของแถวไว้ครบ", () => {
  const [node] = buildCommentTree([cm("a", { body: "สวัสดี", likeCount: 3 })], "x");
  assert.equal(node.body, "สวัสดี");
  assert.equal(node.likeCount, 3);
});

test("countNodes นับทุกระดับ", () => {
  const rows = [cm("a"), cm("a1", { parentId: "a" }), cm("a2", { parentId: "a" }), cm("b")];
  assert.equal(countNodes(buildCommentTree(rows, "x")), 4);
  assert.equal(countNodes([]), 0);
});

test("bestAnswerError: เจ้าของกระทู้ถามตอบ เลือกความคิดเห็นที่อนุมัติในกระทู้เดียวกันที่ไม่ใช่ของตัวเอง", () => {
  const post = { id: "p", userId: "owner", type: "QA", status: "APPROVED" };
  const c = { postId: "p", userId: "other", status: "APPROVED" };
  assert.equal(bestAnswerError(post, c, "owner"), null);
  assert.equal(bestAnswerError(post, null, "owner"), null); // ยกเลิกการเลือก
  assert.match(bestAnswerError(post, c, "other"), /เจ้าของกระทู้/);
  assert.match(bestAnswerError({ ...post, type: "TIPS" }, c, "owner"), /ถามตอบ/);
  assert.match(bestAnswerError({ ...post, status: "PENDING" }, c, "owner"), /ยังไม่ผ่าน/);
  assert.match(bestAnswerError(post, { ...c, postId: "q" }, "owner"), /ไม่พบ/);
  assert.match(bestAnswerError(post, { ...c, status: "PENDING" }, "owner"), /ไม่พบ/);
  assert.match(bestAnswerError(post, { ...c, userId: "owner" }, "owner"), /ของตัวเอง/);
});

test("pageWindow: หน้าเกินดึงกลับมาหน้าสุดท้าย ว่าง = หน้า 1 จาก 1", () => {
  assert.deepEqual(pageWindow(1, 0, 20), { page: 1, pageCount: 1, skip: 0, take: 20 });
  assert.deepEqual(pageWindow(9, 45, 20), { page: 3, pageCount: 3, skip: 40, take: 20 });
  assert.deepEqual(pageWindow(2, 45, 20), { page: 2, pageCount: 3, skip: 20, take: 20 });
  assert.deepEqual(pageWindow(0, 45, 20), { page: 1, pageCount: 3, skip: 0, take: 20 });
  assert.equal(POSTS_PER_PAGE, 20);
});
```

- [ ] **Step 2: รันให้เห็นว่าล้ม**

Run: `node --test` → Expected: FAIL ที่ `tests/community-rules.test.mjs` — `Cannot find module ... lib/community-rules.ts`

- [ ] **Step 3: สร้าง `lib/community-rules.ts`**

```ts
// ไฟล์นี้ต้อง pure — tests/community-rules.test.mjs import ตรงด้วย Node ห้าม import ค่าจริงเพิ่ม (import type ได้)

/** 4 หมวดตามสเปกข้อ 6 — ลำดับนี้คือลำดับแท็บ */
export const POST_TYPES = [
  { value: "QA", label: "ถามตอบ" },
  { value: "EXPERIENCE", label: "เล่าประสบการณ์" },
  { value: "TIPS", label: "เทคนิค" },
  { value: "TEAM", label: "หาเพื่อนฝึกงาน" },
] as const;
export type PostType = (typeof POST_TYPES)[number]["value"];
export const POST_TYPE_VALUES = POST_TYPES.map((t) => t.value) as [PostType, ...PostType[]];

export function postTypeLabel(value: string): string {
  return POST_TYPES.find((t) => t.value === value)?.label ?? value;
}

export const POSTS_PER_PAGE = 20;

/**
 * คนอื่นเห็นเฉพาะ APPROVED · เจ้าของเห็นของตัวเองที่รอตรวจด้วย (หน้าแสดงป้าย "รอตรวจ")
 * ที่ถูกปฏิเสธไม่แสดงในบอร์ดแม้แต่กับเจ้าของ — ดูได้ที่โปรไฟล์
 */
export function canView(item: { status: string; userId: string }, viewerId: string): boolean {
  return item.status === "APPROVED" || (item.status === "PENDING" && item.userId === viewerId);
}

export type FlatComment = { id: string; parentId: string | null; status: string; userId: string; createdAt: Date };
export type CommentNode<T extends FlatComment> = T & { depth: number; replies: CommentNode<T>[] };

/**
 * ประกอบต้นไม้จากความคิดเห็นทั้งกระทู้ที่ดึงมาด้วย query เดียว (ไม่ query ซ้อนต่อระดับ)
 * ที่ผู้ชมมองไม่เห็นถูกตัดพร้อมคำตอบใต้มันทั้งกิ่ง — คำตอบที่หลุดบริบทไม่โผล่ลอย ๆ
 * เรียงเก่าไปใหม่ในแต่ละระดับ
 */
export function buildCommentTree<T extends FlatComment>(rows: T[], viewerId: string): CommentNode<T>[] {
  const visible = rows
    .filter((r) => canView(r, viewerId))
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const byParent = new Map<string | null, T[]>();
  for (const r of visible) {
    const siblings = byParent.get(r.parentId) ?? [];
    siblings.push(r);
    byParent.set(r.parentId, siblings);
  }
  // เดินจากราก — แถวที่ต้นทางมองไม่เห็นจึงไม่ถูกเดินถึง
  const build = (parentId: string | null, depth: number): CommentNode<T>[] =>
    (byParent.get(parentId) ?? []).map((r) => ({ ...r, depth, replies: build(r.id, depth + 1) }));
  return build(null, 0);
}

export function countNodes(nodes: { replies: unknown[] }[]): number {
  return nodes.reduce((n, node) => n + 1 + countNodes(node.replies as { replies: unknown[] }[]), 0);
}

/**
 * คำตอบที่ดีที่สุด: เจ้าของกระทู้ถามตอบที่อนุมัติแล้ว เลือกความคิดเห็นที่อนุมัติแล้วในกระทู้เดียวกันที่ไม่ใช่ของตัวเอง
 * comment = null คือยกเลิกการเลือก · คืนข้อความ error ภาษาไทย หรือ null ถ้าทำได้
 */
export function bestAnswerError(
  post: { id: string; userId: string; type: string; status: string },
  comment: { postId: string; userId: string; status: string } | null,
  viewerId: string,
): string | null {
  if (post.userId !== viewerId) return "เฉพาะเจ้าของกระทู้เลือกคำตอบที่ดีที่สุดได้";
  if (post.type !== "QA") return "เลือกคำตอบที่ดีที่สุดได้เฉพาะกระทู้ถามตอบ";
  if (post.status !== "APPROVED") return "กระทู้ยังไม่ผ่านการตรวจ";
  if (!comment) return null;
  if (comment.postId !== post.id || comment.status !== "APPROVED") return "ไม่พบความคิดเห็นนี้ในกระทู้";
  if (comment.userId === viewerId) return "เลือกความคิดเห็นของตัวเองไม่ได้";
  return null;
}

/** หน้าที่ขอเกินถูกดึงกลับมาหน้าสุดท้าย — ลิงก์ที่ส่งต่อกันเปิดได้เสมอ */
export function pageWindow(page: number, total: number, size: number) {
  const pageCount = Math.max(1, Math.ceil(total / size));
  const p = Math.min(Math.max(1, page), pageCount);
  return { page: p, pageCount, skip: (p - 1) * size, take: size };
}
```

- [ ] **Step 4: รันเทสต์**

Run: `node --test` → Expected: PASS ทั้งหมด · `npx tsc --noEmit` → ไม่มี error

- [ ] **Step 5: Checkpoint** — ห้าม commit

---

### Task 3: `lib/http.ts` + schema ของบอร์ด + DAL `lib/community.ts`

**Files:**
- Create: `lib/http.ts`, `lib/community.ts`
- Modify: `lib/db.ts`, `lib/reviews.ts`, `lib/review-request.ts`, `app/api/reviews/route.ts`, `app/api/reviews/[id]/route.ts`, `lib/validation.ts`, `tests/route-guards.test.mjs`

**Interfaces:**
- Consumes: `POST_TYPE_VALUES`, `PostType`, `canView`, `buildCommentTree`, `bestAnswerError`, `pageWindow`, `POSTS_PER_PAGE` จาก `./community-rules` · `idSchema`, `DEPARTMENT_VALUES`
- Produces:
  - `lib/http.ts`: `class UserError extends Error { status: 400 | 403 | 404 | 409 }` · `badRequest(error: string): Response` · `userErrorResponse(e: unknown): Response` (UserError → JSON, อย่างอื่นโยนต่อ) · `parseJson<T extends z.ZodType>(req: Request, schema: T): Promise<z.output<T> | Response>`
  - `lib/db.ts`: `isPrismaError(e: unknown, code: string): boolean`
  - `lib/validation.ts`: `communityListParamsSchema` → `{ type?: PostType; department?: string; page: number }` · `postInputSchema` → `PostInput { type; department: string | null; title; body }` · `commentInputSchema` → `CommentInput { postId; parentId: string | null; body }` · `likeInputSchema` → `LikeInput = { postId: string } | { commentId: string }` · `bestAnswerInputSchema` → `{ commentId: string | null }`
  - `lib/community.ts`:
    - `listPosts(f: { type?: PostType; department?: string; page: number })` → `{ items: Array<{ id; type; department; title; createdAt; bestAnswerId; user: { name }; _count: { comments; likes } }>, total, page, pageCount }`
    - `getPost(id: string)` → `null` | `{ post: { id; userId; type; department; title; body; status; createdAt; bestAnswerId; user: { name }; likeCount; liked }, comments: CommentNode<...>[] (แต่ละโหนดมี id parentId userId body status createdAt user{name} likeCount liked depth replies), viewerId: string, canAct: boolean }`
    - `createPost(input: PostInput): Promise<{ id: string }>`
    - `createComment(input: CommentInput): Promise<{ id: string }>`
    - `toggleLike(input: LikeInput): Promise<{ liked: boolean; count: number }>`
    - `setBestAnswer(postId: string, commentId: string | null): Promise<{ bestAnswerId: string | null }>`
    - `myPosts()` → `Array<{ id; title; type; status; rejectionReason; createdAt }>`

- [ ] **Step 1: เพิ่ม `lib/community.ts` ในเทสต์ guard ของ DAL (ล้มเหลวก่อน)**

ใน `tests/route-guards.test.mjs` เปลี่ยน

```js
const DAL = ["lib/companies.ts", "lib/reviews.ts"];
```

เป็น

```js
const DAL = ["lib/companies.ts", "lib/reviews.ts", "lib/community.ts"];
```

Run: `node --test` → Expected: FAIL `ไม่พบฟังก์ชันใน lib/community.ts`

- [ ] **Step 2: สร้าง `lib/http.ts`**

```ts
import type { z } from "zod";

// ของที่ Route Handler ทุกตัวใช้ร่วม — ข้อผิดพลาดที่ผู้ใช้แก้ได้ออกเป็น JSON { error } ภาษาไทย

export class UserError extends Error {
  status: 400 | 403 | 404 | 409;
  constructor(status: 400 | 403 | 404 | 409, message: string) {
    super(message);
    this.status = status;
  }
}

export const badRequest = (error: string) => Response.json({ error }, { status: 400 });

/** UserError → JSON · อย่างอื่นโยนต่อ (รวม unauthorized()/forbidden() ของ Next ที่ต้องโยนผ่าน) */
export function userErrorResponse(e: unknown): Response {
  if (e instanceof UserError) return Response.json({ error: e.message }, { status: e.status });
  throw e;
}

/** อ่าน JSON body แล้วผ่าน zod — ไม่ผ่านคืน Response 400 ข้อความข้อแรกที่เจอ */
export async function parseJson<T extends z.ZodType>(req: Request, schema: T): Promise<z.output<T> | Response> {
  const body: unknown = await req.json().catch(() => undefined);
  if (body === undefined) return badRequest("รูปแบบข้อมูลไม่ถูกต้อง");
  const parsed = schema.safeParse(body);
  return parsed.success ? parsed.data : badRequest(parsed.error.issues[0].message);
}
```

- [ ] **Step 3: ย้าย `isPrismaError` ไป `lib/db.ts`** — เปลี่ยน import บรรทัดบนของ `lib/db.ts` เป็น

```ts
import { Prisma, PrismaClient } from "@/app/generated/prisma/client";
```

และต่อท้ายไฟล์:

```ts

/** รหัสข้อผิดพลาดของ Prisma เช่น P2002 (ชน unique) P2025 (ไม่พบแถวที่ตรงเงื่อนไข) */
export const isPrismaError = (e: unknown, code: string) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === code;
```

- [ ] **Step 4: ให้ส่วนรีวิวใช้ `lib/http.ts` (พฤติกรรมเหมือนเดิม)**

`lib/reviews.ts`:
- ลบ `import { Prisma } from "@/app/generated/prisma/client";` แล้วเพิ่ม `import type { Prisma } from "@/app/generated/prisma/client";` (ยังใช้ `Prisma.CompanyCreateInput` เป็น type)
- เปลี่ยน `import { db } from "./db";` เป็น `import { db, isPrismaError } from "./db";`
- เพิ่ม `import { UserError } from "./http";`
- ลบคลาส `ReviewError` ทั้งก้อน (คอมเมนต์ JSDoc + `export class ReviewError ... }`) และบรรทัด `const isPrismaError = ...`
- แทนทุก `ReviewError` ในไฟล์ด้วย `UserError` (`sed -i 's/ReviewError/UserError/g' lib/reviews.ts`)

`lib/review-request.ts` เขียนใหม่เป็น:

```ts
import { badRequest } from "./http";
import { splitReviewForm } from "./review-rules";
import { reviewFieldsSchema, type ReviewFields } from "./validation";

// ส่วนที่ POST และ PUT ของ /api/reviews ใช้ร่วมกัน — ไม่มี guard เพราะ route เรียก guard ก่อนแล้ว

/** อ่าน multipart แล้วผ่าน zod — ไม่ผ่านคืน Response 400 พร้อมข้อความไทยข้อแรกที่เจอ */
export async function readReviewForm(
  req: Request,
): Promise<{ fields: Record<string, string>; data: ReviewFields; photos: File[] } | Response> {
  const fd = await req.formData().catch(() => null);
  if (!fd) return badRequest("รูปแบบข้อมูลไม่ถูกต้อง");
  const { fields, photos } = splitReviewForm(fd);
  const parsed = reviewFieldsSchema.safeParse(fields);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);
  return { fields, data: parsed.data, photos };
}
```

`app/api/reviews/route.ts` บรรทัด import:

```ts
import { requireRole } from "@/lib/auth";
import { badRequest, userErrorResponse } from "@/lib/http";
import { readReviewForm } from "@/lib/review-request";
```

และ `return reviewErrorResponse(e);` → `return userErrorResponse(e);`

`app/api/reviews/[id]/route.ts` บรรทัด import:

```ts
import { requireRole } from "@/lib/auth";
import { userErrorResponse } from "@/lib/http";
import { readReviewForm } from "@/lib/review-request";
```

และ `return reviewErrorResponse(e);` → `return userErrorResponse(e);`

Run: `grep -rn "ReviewError\|reviewErrorResponse" app lib` → Expected: ไม่มีผล

- [ ] **Step 5: เพิ่ม schema ของบอร์ดใน `lib/validation.ts`**

เพิ่ม import ต่อจาก import เดิม:

```ts
import { POST_TYPE_VALUES } from "./community-rules";
```

ต่อท้ายไฟล์:

```ts
// ---------- เว็บบอร์ดชุมชน (JSON) ----------

/** query string ของ /community — ค่าผิดรูปแบบถูกเพิกเฉย */
export const communityListParamsSchema = z.object({
  type: z.enum(POST_TYPE_VALUES).optional().catch(undefined),
  department: z.enum(DEPARTMENT_VALUES).optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
});

export const postInputSchema = z.object({
  type: z.enum(POST_TYPE_VALUES, { error: "เลือกหมวดกระทู้" }),
  // "" หรือไม่ส่ง = ทั่วไป ไม่ระบุแผนก
  department: z
    .union([z.literal(""), z.enum(DEPARTMENT_VALUES)], { error: "เลือกแผนกวิชาจากรายการ" })
    .optional()
    .transform((v) => v || null),
  title: z.string({ error: "กรอกหัวข้อ" }).trim().min(5, "หัวข้ออย่างน้อย 5 ตัวอักษร").max(120, "หัวข้อไม่เกิน 120 ตัวอักษร"),
  body: z.string({ error: "กรอกเนื้อหา" }).trim().min(10, "เนื้อหาอย่างน้อย 10 ตัวอักษร").max(5000, "เนื้อหาไม่เกิน 5,000 ตัวอักษร"),
});
export type PostInput = z.infer<typeof postInputSchema>;

export const commentInputSchema = z.object({
  postId: idSchema,
  parentId: idSchema.nullish().transform((v) => v ?? null),
  body: z.string({ error: "พิมพ์ความคิดเห็น" }).trim().min(1, "พิมพ์ความคิดเห็น").max(2000, "ความคิดเห็นไม่เกิน 2,000 ตัวอักษร"),
});
export type CommentInput = z.infer<typeof commentInputSchema>;

/** กดถูกใจกระทู้หรือความคิดเห็น อย่างใดอย่างหนึ่งเท่านั้น */
export const likeInputSchema = z.union([z.strictObject({ postId: idSchema }), z.strictObject({ commentId: idSchema })], {
  error: "ระบุกระทู้หรือความคิดเห็นอย่างใดอย่างหนึ่ง",
});
export type LikeInput = z.infer<typeof likeInputSchema>;

/** commentId: null = ยกเลิกคำตอบที่ดีที่สุด */
export const bestAnswerInputSchema = z.object({ commentId: idSchema.nullable() }, { error: "ระบุความคิดเห็น" });
```

- [ ] **Step 6: สร้าง `lib/community.ts`**

```ts
import { requireRole, requireUser } from "./auth";
import { bestAnswerError, buildCommentTree, canView, pageWindow, POSTS_PER_PAGE, type PostType } from "./community-rules";
import { db, isPrismaError } from "./db";
import { UserError } from "./http";
import type { CommentInput, LikeInput, PostInput } from "./validation";

// ทุกฟังก์ชัน export async เริ่มด้วย guard เอง — tests/route-guards.test.mjs ตรวจ
// กระทู้และความคิดเห็นเกิดมาเป็น PENDING เสมอ (ค่า default ของ schema)
// ที่ผู้อื่นเห็นเฉพาะ APPROVED รวมถึงตัวนับ — v1 นับความคิดเห็นที่ยังไม่อนุมัติพลาดซ้ำสองรอบ

const APPROVED = { status: "APPROVED" } as const;
const AUTHOR = { select: { name: true } } as const;

export async function listPosts(f: { type?: PostType; department?: string; page: number }) {
  await requireRole("STUDENT", "ADMIN");
  const where = { ...APPROVED, type: f.type, department: f.department };
  const total = await db.communityPost.count({ where });
  const w = pageWindow(f.page, total, POSTS_PER_PAGE);
  const items = await db.communityPost.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: w.skip,
    take: w.take,
    select: {
      id: true,
      type: true,
      department: true,
      title: true,
      createdAt: true,
      bestAnswerId: true,
      user: AUTHOR,
      // ตัวนับต้องกรอง APPROVED เหมือนตัวเนื้อหา
      _count: { select: { comments: { where: APPROVED }, likes: true } },
    },
  });
  return { items, total, page: w.page, pageCount: w.pageCount };
}

export async function getPost(id: string) {
  const user = await requireRole("STUDENT", "ADMIN");
  const post = await db.communityPost.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      type: true,
      department: true,
      title: true,
      body: true,
      status: true,
      createdAt: true,
      bestAnswerId: true,
      user: AUTHOR,
      _count: { select: { likes: true } },
      likes: { where: { userId: user.id }, select: { id: true } },
    },
  });
  if (!post || !canView(post, user.id)) return null;

  // ทั้งกระทู้ในคำสั่งเดียว เฉพาะแถวที่ผู้ชมมีสิทธิ์เห็น แล้วประกอบต้นไม้ในหน่วยความจำ
  const rows = await db.communityComment.findMany({
    where: { postId: id, OR: [APPROVED, { status: "PENDING", userId: user.id }] },
    select: {
      id: true,
      parentId: true,
      userId: true,
      body: true,
      status: true,
      createdAt: true,
      user: AUTHOR,
      _count: { select: { likes: true } },
      likes: { where: { userId: user.id }, select: { id: true } },
    },
  });
  const { likes, _count, ...rest } = post;
  return {
    post: { ...rest, likeCount: _count.likes, liked: likes.length > 0 },
    comments: buildCommentTree(
      rows.map(({ likes: mine, _count: counts, ...c }) => ({ ...c, likeCount: counts.likes, liked: mine.length > 0 })),
      user.id,
    ),
    viewerId: user.id,
    // ผู้ดูแลอ่านได้อย่างเดียว — ตั้งกระทู้ แสดงความคิดเห็น ถูกใจ เลือกคำตอบ เป็นของนักศึกษา
    canAct: user.role === "STUDENT",
  };
}

export async function createPost(input: PostInput): Promise<{ id: string }> {
  const user = await requireRole("STUDENT");
  return db.communityPost.create({ data: { ...input, userId: user.id }, select: { id: true } });
}

export async function createComment(input: CommentInput): Promise<{ id: string }> {
  const user = await requireRole("STUDENT");
  const post = await db.communityPost.findUnique({ where: { id: input.postId }, select: { status: true } });
  if (!post || post.status !== "APPROVED") throw new UserError(404, "ไม่พบกระทู้");
  if (input.parentId) {
    const parent = await db.communityComment.findUnique({ where: { id: input.parentId }, select: { postId: true, status: true } });
    // ตอบได้เฉพาะความคิดเห็นที่เผยแพร่แล้วในกระทู้เดียวกัน — ไม่งั้นคำตอบหลุดบริบทเมื่อคนอื่นมองไม่เห็นต้นทาง
    if (!parent || parent.postId !== input.postId || parent.status !== "APPROVED") {
      throw new UserError(400, "ตอบกลับได้เฉพาะความคิดเห็นที่เผยแพร่แล้วในกระทู้นี้");
    }
  }
  return db.communityComment.create({ data: { ...input, userId: user.id }, select: { id: true } });
}

export async function toggleLike(input: LikeInput): Promise<{ liked: boolean; count: number }> {
  const user = await requireRole("STUDENT");
  const target =
    "postId" in input
      ? await db.communityPost.findUnique({ where: { id: input.postId }, select: { status: true } })
      : await db.communityComment.findUnique({ where: { id: input.commentId }, select: { status: true } });
  if (!target || target.status !== "APPROVED") throw new UserError(404, "ไม่พบเนื้อหานี้");

  const key = "postId" in input ? { postId: input.postId } : { commentId: input.commentId };
  // กดซ้ำ = ยกเลิก: ลบก่อน ถ้าไม่มีอะไรให้ลบจึงสร้าง
  // สองคำขอพร้อมกันจะชน @@unique (P2002) — ถือว่ากดแล้ว ฐานข้อมูลยังมีแค่แถวเดียว
  const removed = await db.communityLike.deleteMany({ where: { ...key, userId: user.id } });
  let liked = false;
  if (removed.count === 0) {
    try {
      await db.communityLike.create({ data: { ...key, userId: user.id } });
    } catch (e) {
      if (!isPrismaError(e, "P2002")) throw e;
    }
    liked = true;
  }
  return { liked, count: await db.communityLike.count({ where: key }) };
}

export async function setBestAnswer(postId: string, commentId: string | null): Promise<{ bestAnswerId: string | null }> {
  const user = await requireRole("STUDENT");
  const post = await db.communityPost.findUnique({ where: { id: postId }, select: { id: true, userId: true, type: true, status: true } });
  if (!post || !canView(post, user.id)) throw new UserError(404, "ไม่พบกระทู้");
  const comment = commentId
    ? await db.communityComment.findUnique({ where: { id: commentId }, select: { postId: true, userId: true, status: true } })
    : null;
  if (commentId && !comment) throw new UserError(400, "ไม่พบความคิดเห็นนี้ในกระทู้");
  const err = bestAnswerError(post, comment, user.id);
  if (err) throw new UserError(post.userId === user.id ? 400 : 403, err);
  // bestAnswerId ช่องเดียวต่อกระทู้ — ตั้งใหม่แทนที่ของเดิมเอง ไม่ต้องล้าง
  await db.communityPost.update({ where: { id: postId }, data: { bestAnswerId: commentId } });
  return { bestAnswerId: commentId };
}

/** กระทู้ทุกสถานะของผู้ใช้เอง — ให้ติดตามผลการตรวจ */
export async function myPosts() {
  const user = await requireUser();
  return db.communityPost.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, type: true, status: true, rejectionReason: true, createdAt: true },
  });
}
```

- [ ] **Step 7: ตรวจ**

Run: `node --test` → Expected: PASS ทั้งหมด (รวมเทสต์ guard ที่ตอนนี้ครอบ `lib/community.ts` 7/7)
Run: `npx tsc --noEmit` → Expected: ไม่มี error · `npm run lint` → ไม่มี error

- [ ] **Step 8: Checkpoint** — ห้าม commit

---

### Task 4: Route Handlers ของบอร์ด

**Files:**
- Create: `app/api/community/posts/route.ts`, `app/api/community/comments/route.ts`, `app/api/community/likes/route.ts`, `app/api/community/posts/[id]/best-answer/route.ts`

**Interfaces:**
- Consumes: `requireRole` · `parseJson`, `userErrorResponse` จาก `@/lib/http` · schema จาก Task 3 · `createPost`, `createComment`, `toggleLike`, `setBestAnswer`
- Produces (JSON ทั้งหมด):
  - `POST /api/community/posts` `{ type, department?, title, body }` → `201 { id }`
  - `POST /api/community/comments` `{ postId, parentId?, body }` → `201 { id }`
  - `POST /api/community/likes` `{ postId }` หรือ `{ commentId }` → `200 { liked, count }`
  - `PUT /api/community/posts/:id/best-answer` `{ commentId | null }` → `200 { bestAnswerId }`
  - ผิดพลาด → `400/403/404 { error }` · ไม่ล็อกอิน 401 · ไม่ใช่ STUDENT 403

- [ ] **Step 1: เขียนสี่ไฟล์**

`app/api/community/posts/route.ts`:

```ts
import { requireRole } from "@/lib/auth";
import { createPost } from "@/lib/community";
import { parseJson, userErrorResponse } from "@/lib/http";
import { postInputSchema } from "@/lib/validation";

export async function POST(req: Request) {
  await requireRole("STUDENT");
  const input = await parseJson(req, postInputSchema);
  if (input instanceof Response) return input;
  try {
    return Response.json(await createPost(input), { status: 201 });
  } catch (e) {
    return userErrorResponse(e);
  }
}
```

`app/api/community/comments/route.ts`:

```ts
import { requireRole } from "@/lib/auth";
import { createComment } from "@/lib/community";
import { parseJson, userErrorResponse } from "@/lib/http";
import { commentInputSchema } from "@/lib/validation";

export async function POST(req: Request) {
  await requireRole("STUDENT");
  const input = await parseJson(req, commentInputSchema);
  if (input instanceof Response) return input;
  try {
    return Response.json(await createComment(input), { status: 201 });
  } catch (e) {
    return userErrorResponse(e);
  }
}
```

`app/api/community/likes/route.ts`:

```ts
import { requireRole } from "@/lib/auth";
import { toggleLike } from "@/lib/community";
import { parseJson, userErrorResponse } from "@/lib/http";
import { likeInputSchema } from "@/lib/validation";

/** กดถูกใจ / กดซ้ำเพื่อยกเลิก */
export async function POST(req: Request) {
  await requireRole("STUDENT");
  const input = await parseJson(req, likeInputSchema);
  if (input instanceof Response) return input;
  try {
    return Response.json(await toggleLike(input));
  } catch (e) {
    return userErrorResponse(e);
  }
}
```

`app/api/community/posts/[id]/best-answer/route.ts`:

```ts
import { requireRole } from "@/lib/auth";
import { setBestAnswer } from "@/lib/community";
import { parseJson, userErrorResponse } from "@/lib/http";
import { bestAnswerInputSchema, idSchema } from "@/lib/validation";

/** เจ้าของกระทู้ถามตอบเลือกคำตอบที่ดีที่สุด — commentId: null = ยกเลิก */
export async function PUT(req: Request, ctx: RouteContext<"/api/community/posts/[id]/best-answer">) {
  await requireRole("STUDENT");
  const id = idSchema.safeParse((await ctx.params).id);
  if (!id.success) return Response.json({ error: "ไม่พบกระทู้" }, { status: 404 });
  const input = await parseJson(req, bestAnswerInputSchema);
  if (input instanceof Response) return input;
  try {
    return Response.json(await setBestAnswer(id.data, input.commentId));
  } catch (e) {
    return userErrorResponse(e);
  }
}
```

- [ ] **Step 2: ตรวจ type และเทสต์**

Run: `npx tsc --noEmit` (ถ้า `RouteContext` ของ path ใหม่ยังไม่รู้จัก ให้รอ dev server สร้าง type หรือรัน `npx next typegen`) · `node --test` (เทสต์ guard ของ Route Handler ครอบไฟล์ใหม่อัตโนมัติ) → ผ่านทั้งหมด

- [ ] **Step 3: รีสตาร์ต dev server แล้วสร้าง session ทดสอบของ `seed_u3`**

dev server ถือ Prisma Client ตัวก่อน migration — `preview_stop` แล้ว `preview_start` ชื่อ `next-dev` (ถ้าเป็น subagent ที่ไม่มีเครื่องมือนี้ ให้รายงาน NEEDS_CONTEXT ขอให้ controller รีสตาร์ต) จากนั้น:

```bash
npx jiti prisma/seed.ts
npx prisma db execute --stdin <<'EOF'
INSERT OR REPLACE INTO "Session" (id, sessionToken, userId, expires)
VALUES ('dev_s_p4', 'dev-p4', 'seed_u3', '2099-01-01T00:00:00.000Z');
EOF
```

Expected: บรรทัด seed สองบรรทัดตาม Task 1 · `Script executed successfully.` (session ลบใน Task 7)

- [ ] **Step 4: ตรวจ API ด้วยสคริปต์ `$TEMP/phase4-api.mjs`** (นอก repo ภาษาไทยอยู่ในไฟล์)

```js
const BASE = "http://localhost:3000";
const COOKIE = "authjs.session-token=dev-p4";

async function call(method, path, body, { cookie = COOKIE, raw } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { ...(cookie ? { cookie } : {}), "content-type": "application/json" },
    body: raw ?? JSON.stringify(body),
    redirect: "manual",
  });
  const text = await res.text();
  let json = {};
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, ...json };
}

const post = (b, o) => call("POST", "/api/community/posts", b, o);
const comment = (b) => call("POST", "/api/community/comments", b);
const like = (b) => call("POST", "/api/community/likes", b);
const best = (id, b) => call("PUT", `/api/community/posts/${id}/best-answer`, b);
const okPost = { type: "TIPS", department: "", title: "P4TEST เทคนิคทดสอบ", body: "เนื้อหาทดสอบของกระทู้ใหม่ที่ยาวพอ" };

const cases = [
  ["guest ตั้งกระทู้", () => post(okPost, { cookie: "" }), (r) => r.status === 401],
  ["ตั้งกระทู้ถูกต้อง (แผนกว่าง = ทั่วไป)", () => post(okPost), (r) => r.status === 201 && r.id],
  ["หัวข้อสั้น", () => post({ ...okPost, title: "สั้น" }), (r) => r.status === 400],
  ["หมวดไม่มีจริง", () => post({ ...okPost, type: "NEWS" }), (r) => r.status === 400],
  ["แผนกไม่มีจริง", () => post({ ...okPost, department: "แผนกวิชาไม่มีจริง" }), (r) => r.status === 400],
  ["ส่ง status มาเอง ถูกเพิกเฉย (ดู DB)", () => post({ ...okPost, title: "P4TEST ส่งสถานะเอง", status: "APPROVED" }), (r) => r.status === 201],
  ["body ไม่ใช่ JSON", () => call("POST", "/api/community/posts", null, { raw: "type=TIPS" }), (r) => r.status === 400],
  ["ความคิดเห็นระดับบน", () => comment({ postId: "seed_post1", body: "P4TEST ความคิดเห็นใหม่" }), (r) => r.status === 201],
  ["ตอบกลับ cm1", () => comment({ postId: "seed_post1", parentId: "seed_cm1", body: "P4TEST ตอบกลับ" }), (r) => r.status === 201],
  ["ตอบกลับต้นทางที่รอตรวจ", () => comment({ postId: "seed_post1", parentId: "seed_cm3", body: "P4TEST" }), (r) => r.status === 400],
  ["ตอบกลับความคิดเห็นของกระทู้อื่น", () => comment({ postId: "seed_post1", parentId: "seed_cm6", body: "P4TEST" }), (r) => r.status === 400],
  ["แสดงความคิดเห็นในกระทู้ที่ถูกปฏิเสธ", () => comment({ postId: "seed_post4", body: "P4TEST" }), (r) => r.status === 404],
  ["แสดงความคิดเห็นในกระทู้ที่รอตรวจของตัวเอง", () => comment({ postId: "seed_post3", body: "P4TEST" }), (r) => r.status === 404],
  ["ความคิดเห็นว่าง", () => comment({ postId: "seed_post1", body: "   " }), (r) => r.status === 400],
  ["ถูกใจกระทู้", () => like({ postId: "seed_post1" }), (r) => r.status === 200 && r.liked === true && r.count === 3],
  ["กดซ้ำ = ยกเลิก", () => like({ postId: "seed_post1" }), (r) => r.status === 200 && r.liked === false && r.count === 2],
  ["ถูกใจความคิดเห็น", () => like({ commentId: "seed_cm1" }), (r) => r.status === 200 && r.liked === true && r.count === 2],
  ["ถูกใจของที่รอตรวจ", () => like({ commentId: "seed_cm3" }), (r) => r.status === 404],
  ["ส่งทั้งสองเป้า", () => like({ postId: "seed_post1", commentId: "seed_cm1" }), (r) => r.status === 400],
  ["ไม่ส่งเป้า", () => like({}), (r) => r.status === 400],
  ["เลือกคำตอบในกระทู้ตัวเอง", () => best("seed_post5", { commentId: "seed_cm6" }), (r) => r.status === 200 && r.bestAnswerId === "seed_cm6"],
  ["เลือกความคิดเห็นของตัวเอง", () => best("seed_post5", { commentId: "seed_cm7" }), (r) => r.status === 400],
  ["เลือกความคิดเห็นของกระทู้อื่น", () => best("seed_post5", { commentId: "seed_cm1" }), (r) => r.status === 400],
  ["เลือกในกระทู้ของคนอื่น", () => best("seed_post1", { commentId: "seed_cm2" }), (r) => r.status === 403],
  ["กระทู้ที่ไม่มีใครเห็น", () => best("seed_post4", { commentId: null }), (r) => r.status === 404],
  ["ยกเลิกการเลือก", () => best("seed_post5", { commentId: null }), (r) => r.status === 200 && r.bestAnswerId === null],
  ["เลือกใหม่ (ทิ้งไว้ให้หน้าเว็บตรวจ)", () => best("seed_post5", { commentId: "seed_cm6" }), (r) => r.status === 200],
];

let fail = 0;
for (const [name, run, ok] of cases) {
  const r = await run();
  const pass = Boolean(ok(r));
  if (!pass) fail++;
  console.log(`${pass ? "ok  " : "FAIL"} ${String(r.status).padEnd(4)} ${name}${r.error ? " — " + r.error : ""}${"liked" in r ? ` liked=${r.liked} count=${r.count}` : ""}`);
}
console.log(fail ? `${fail} FAILED` : "all passed");
```

Run: `node "$TEMP/phase4-api.mjs"`
Expected: ทุกแถว `ok` บรรทัดท้าย `all passed` · แถว 400/403/404 มีข้อความ error ภาษาไทย (แถวที่ส่งข้อมูลปลอมอย่าง "ไม่ส่งเป้า" อาจเป็นข้อความรวมของ union ภาษาไทย)

- [ ] **Step 5: ตรวจในฐานข้อมูล**

```bash
q() { node -e 'const D=require(process.cwd()+"/node_modules/@prisma/adapter-better-sqlite3/node_modules/better-sqlite3");console.table(new D("prisma/dev.db",{readonly:true}).prepare(process.argv[1]).all())' "$1"; }
q "SELECT title, type, department, status FROM CommunityPost WHERE title LIKE 'P4TEST%'"
q "SELECT parentId, status FROM CommunityComment WHERE body LIKE 'P4TEST%'"
q "SELECT id, bestAnswerId FROM CommunityPost WHERE id IN ('seed_post1','seed_post5')"
```

Expected:
- กระทู้ P4TEST สองแถว `TIPS`, department `null`, status `PENDING` ทั้งคู่ (แถวที่ส่ง `status: "APPROVED"` มาเองก็ต้องเป็น PENDING)
- ความคิดเห็น P4TEST สองแถว (`parentId` null และ `seed_cm1`) ทั้งคู่ `PENDING`
- `seed_post1` → `seed_cm1` · `seed_post5` → `seed_cm6`

- [ ] **Step 6: Checkpoint** — ห้าม commit (ข้อมูลทดสอบเก็บไว้ ลบใน Task 7)

---

### Task 5: หน้ารายการกระทู้ + ตั้งกระทู้

**Files:**
- Modify: `components/ui/kernel.css` (บรรทัด `.kn-tab[aria-selected="true"]`)
- Create: `components/PostForm.tsx`
- Modify (เขียนใหม่): `app/community/page.tsx`, `app/community/new/page.tsx`

**Interfaces:**
- Consumes: `listPosts` · `getCurrentUser` จาก `@/lib/session` · `communityListParamsSchema` · `POST_TYPES`, `postTypeLabel`, `PostType` · `DEPARTMENTS`, `departmentLabel` · `requireRole` · `PageShell`, `EmptyState`, `Card`, `Badge`, `Button`, `buttonClass`, `TextField`, `Icon`
- Produces: `PostForm` ส่งไป `POST /api/community/posts` สำเร็จแล้วไป `/community/<id>` (Task 6 แสดงป้ายรอตรวจ)

- [ ] **Step 1: แท็บที่เป็นลิงก์** — ใน `components/ui/kernel.css` เปลี่ยนบรรทัด

```css
  .kn-tab[aria-selected="true"] { color: var(--ink); border-bottom-color: var(--signal); }
```

เป็น

```css
  .kn-tab[aria-selected="true"], .kn-tab[aria-current="page"] { color: var(--ink); border-bottom-color: var(--signal); }
  a.kn-tab { text-decoration: none; display: inline-block; }
```

- [ ] **Step 2: เขียน `app/community/page.tsx` ใหม่**

แท็บหมวดเป็นลิงก์ (เปลี่ยน URL → หน้า render ใหม่บนเซิร์ฟเวอร์) ไม่ใช้ `components/ui/Tabs` ที่เก็บ state ฝั่ง client

```tsx
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { PageShell } from "@/components/PageShell";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { listPosts } from "@/lib/community";
import { POST_TYPES, postTypeLabel, type PostType } from "@/lib/community-rules";
import { DEPARTMENTS, departmentLabel } from "@/lib/departments";
import { getCurrentUser } from "@/lib/session";
import { communityListParamsSchema } from "@/lib/validation";

type Filters = { type?: PostType; department?: string; page: number };

const thaiDate = (d: Date) => d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" });

export default async function CommunityPage({ searchParams }: PageProps<"/community">) {
  const f = communityListParamsSchema.parse(await searchParams);
  const [user, { items, page, pageCount }] = await Promise.all([getCurrentUser(), listPosts(f)]);
  const filtered = Boolean(f.type || f.department);

  return (
    <PageShell
      title="ชุมชน"
      lede="ถามตอบ เล่าประสบการณ์ แลกเทคนิค และหาเพื่อนฝึกงาน"
      actions={
        // ผู้ดูแลอ่านได้อย่างเดียว — ไม่แสดงปุ่มที่กดแล้วเจอ 403
        user?.role === "STUDENT" && (
          <Link href="/community/new" className={buttonClass("primary")}>
            ตั้งกระทู้
          </Link>
        )
      }
    >
      <nav aria-label="หมวดกระทู้" className="overflow-x-auto">
        <div className="kn-tabs w-max min-w-full">
          {[{ value: undefined, label: "ทั้งหมด" }, ...POST_TYPES].map((t) => (
            <Link
              key={t.value ?? "ALL"}
              href={listHref({ ...f, type: t.value, page: 1 })}
              className="kn-tab"
              aria-current={f.type === t.value ? "page" : undefined}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </nav>

      <form className="flex flex-col gap-4 sm:flex-row sm:items-end">
        {f.type && <input type="hidden" name="type" value={f.type} />}
        <div className="kn-field sm:w-80">
          <label className="kn-field-label" htmlFor="department">
            แผนกวิชา
          </label>
          <select id="department" name="department" className="kn-input" defaultValue={f.department ?? ""}>
            <option value="">ทุกแผนก</option>
            {DEPARTMENTS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" icon={<Icon name="filter_list" />}>
          กรอง
        </Button>
      </form>

      {items.length === 0 ? (
        <EmptyState icon="forum" title={filtered ? "ไม่พบกระทู้" : "ยังไม่มีกระทู้"}>
          {filtered ? "ลองเปลี่ยนหมวดหรือแผนก" : "กระทู้ที่ผ่านการตรวจแล้วจะแสดงที่นี่"}
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-4">
          {items.map((p) => (
            <li key={p.id}>
              <Card
                eyebrow={[postTypeLabel(p.type), p.department ? departmentLabel(p.department) : "ทั่วไป"].join(" · ")}
                title={
                  <Link href={`/community/${p.id}`} className="kn-link">
                    {p.title}
                  </Link>
                }
                footer={
                  <span className="flex flex-wrap items-center gap-x-4 gap-y-2 text-small text-ink-muted">
                    <span>{`${p.user.name ?? "นักศึกษา"} · ${thaiDate(p.createdAt)}`}</span>
                    <span>{`${p._count.comments} ความคิดเห็น`}</span>
                    <span>{`${p._count.likes} ถูกใจ`}</span>
                    {p.bestAnswerId && <Badge tone="success">มีคำตอบที่ดีที่สุด</Badge>}
                  </span>
                }
              />
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
  if (f.type) p.set("type", f.type);
  if (f.department) p.set("department", f.department);
  if (f.page > 1) p.set("page", String(f.page));
  const s = p.toString();
  return s ? `/community?${s}` : "/community";
}
```

- [ ] **Step 3: สร้าง `components/PostForm.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { POST_TYPES } from "@/lib/community-rules";
import { DEPARTMENTS } from "@/lib/departments";

export function PostForm() {
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
      const res = await fetch("/api/community/posts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      const json: { id?: string; error?: string } | null = await res.json().catch(() => null);
      if (res.ok && json?.id) {
        router.push(`/community/${json.id}`);
        return;
      }
      setError(json?.error ?? "ส่งไม่สำเร็จ ลองอีกครั้ง");
    } catch {
      setError("เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง");
    }
    setSending(false);
  }

  return (
    <form onSubmit={submit} className="flex max-w-2xl flex-col gap-4">
      <div className="kn-field">
        <label className="kn-field-label" htmlFor="type">
          หมวด
        </label>
        <select id="type" name="type" required className="kn-input" defaultValue="">
          <option value="" disabled>
            เลือกหมวด
          </option>
          {POST_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div className="kn-field">
        <label className="kn-field-label" htmlFor="department">
          แผนกวิชา (ไม่บังคับ)
        </label>
        <select id="department" name="department" className="kn-input" defaultValue="">
          <option value="">ทั่วไป ไม่ระบุแผนก</option>
          {DEPARTMENTS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </div>
      <TextField name="title" label="หัวข้อ" required minLength={5} maxLength={120} />
      <div className="kn-field">
        <label className="kn-field-label" htmlFor="body">
          เนื้อหา
        </label>
        <textarea id="body" name="body" required minLength={10} maxLength={5000} rows={8} className="kn-input h-auto py-3" />
      </div>
      <p className="text-small text-ink-muted">
        กระทู้จะเผยแพร่หลังผู้ดูแลตรวจแล้ว ระหว่างนี้คุณเห็นกระทู้ของตัวเองพร้อมป้ายรอตรวจ
      </p>
      {error && (
        <p role="alert" className="text-small text-danger">
          {error}
        </p>
      )}
      <div>
        <Button type="submit" variant="primary" disabled={sending}>
          {sending ? "กำลังส่ง…" : "ตั้งกระทู้"}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 4: เขียน `app/community/new/page.tsx` ใหม่**

```tsx
import { PageShell } from "@/components/PageShell";
import { PostForm } from "@/components/PostForm";
import { requireRole } from "@/lib/auth";

export default async function NewPostPage() {
  // layout ยอม ADMIN ด้วย แต่การตั้งกระทู้เป็นของนักศึกษา
  await requireRole("STUDENT");
  return (
    <PageShell eyebrow="ชุมชน" title="ตั้งกระทู้" lede="กระทู้ใหม่ผ่านการตรวจก่อนเผยแพร่">
      <PostForm />
    </PageShell>
  );
}
```

- [ ] **Step 5: ตรวจ**

Run: `npx tsc --noEmit` · `npm run lint` · `node --test` → ผ่านทั้งหมด

```bash
C="authjs.session-token=dev-p4"
P=$(curl -s -b "$C" localhost:3000/community)
echo "$P" | grep -o 'href="/community/seed_post[0-9]"' | grep -o 'seed_post[0-9]' | sort -u | tr '\n' ' '; echo
echo "$P" | grep -o '[0-9]* ความคิดเห็น' | tr '\n' '|'; echo
echo "$P" | grep -c "มีคำตอบที่ดีที่สุด"
curl -s -b "$C" "localhost:3000/community?type=QA" | grep -o 'href="/community/seed_post[0-9]"' | grep -o 'seed_post[0-9]' | sort -u | tr '\n' ' '; echo
curl -s -b "$C" "localhost:3000/community?type=NEWS&department=xyz&page=abc" -o /dev/null -w '%{http_code}\n'
curl -s -b "$C" localhost:3000/community | grep -c 'href="/community/new"'
curl -s -b "$C" localhost:3000/community/new -o /dev/null -w '%{http_code} '; curl -s localhost:3000/community/new -o /dev/null -w '%{http_code}\n'
```

Expected ตามลำดับ:
- `seed_post1 seed_post2 seed_post5` (ไม่มี post3 ที่รอตรวจ post4 ที่ถูกปฏิเสธ และไม่มีกระทู้ P4TEST ที่รอตรวจ)
- ตัวนับของ post1 คือ `2 ความคิดเห็น` — **ไม่ใช่ 3 หรือ 6** (post1 มีที่รอตรวจ 2 + ถูกปฏิเสธ 1 + ของ P4TEST ที่รอตรวจอีก 2) · post5 `2 ความคิดเห็น` · post2 `0 ความคิดเห็น`
- `1` หรือมากกว่า (post1 และ post5 มีคำตอบที่ดีที่สุด — `grep -c` นับบรรทัด และ HTML อาจเป็นบรรทัดเดียว จึงดูแค่ว่ามี)
- `seed_post1 seed_post5`
- `200` (ค่าขยะถูกเพิกเฉย)
- `1` หรือมากกว่า (ปุ่มตั้งกระทู้แสดงให้นักศึกษา)
- `200 401`

- [ ] **Step 6: Checkpoint** — ห้าม commit

---

### Task 6: หน้ากระทู้ — ต้นไม้ความคิดเห็น ถูกใจ คำตอบที่ดีที่สุด

**Files:**
- Create: `components/CommentForm.tsx`, `components/LikeButton.tsx`, `components/BestAnswerButton.tsx`
- Modify (เขียนใหม่): `app/community/[id]/page.tsx`

**Interfaces:**
- Consumes: `getPost` · `countNodes`, `postTypeLabel` · `departmentLabel` · `idSchema` · `cx` · `PageShell`, `EmptyState`, `Badge`, `Button`, `SectionHeader`, `Icon`
- Produces: client components ที่รับแค่ id และค่าที่ต้องแสดง — `LikeButton({ target: { postId } | { commentId }, liked, count, disabled? })` · `CommentForm({ postId, parentId? })` · `BestAnswerButton({ postId, commentId, isBest })`

- [ ] **Step 1: สร้าง `components/LikeButton.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { cx } from "@/lib/cx";

/** ตัวเลขมาจากเซิร์ฟเวอร์ทุกครั้ง ไม่เดาเอง — กดซ้ำ = ยกเลิก */
export function LikeButton({
  target,
  liked,
  count,
  disabled,
}: {
  target: { postId: string } | { commentId: string };
  liked: boolean;
  count: number;
  disabled?: boolean;
}) {
  const [state, setState] = useState({ liked, count });
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      const res = await fetch("/api/community/likes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(target),
      });
      if (res.ok) setState(await res.json());
    } catch {
      // เครือข่ายล้ม — คงค่าเดิมไว้ ผู้ใช้กดใหม่ได้
    }
    setBusy(false);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled || busy}
      aria-pressed={state.liked}
      className={cx(
        "inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-small disabled:cursor-default",
        state.liked ? "text-signal" : "text-ink-muted",
      )}
    >
      <Icon name="thumb_up" filled={state.liked} />
      {`${state.count} ถูกใจ`}
    </button>
  );
}
```

- [ ] **Step 2: สร้าง `components/CommentForm.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";

export function CommentForm({ postId, parentId }: { postId: string; parentId?: string }) {
  const router = useRouter();
  const fieldId = useId();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.reportValidity()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/community/comments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ postId, parentId: parentId ?? null, body: new FormData(form).get("body") }),
      });
      if (res.ok) {
        form.reset();
        setSent(true);
        // ให้ความคิดเห็นที่เพิ่งส่งโผล่พร้อมป้ายรอตรวจ (เจ้าของเห็นของตัวเอง)
        router.refresh();
      } else {
        const json: { error?: string } | null = await res.json().catch(() => null);
        setError(json?.error ?? "ส่งไม่สำเร็จ ลองอีกครั้ง");
      }
    } catch {
      setError("เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง");
    }
    setSending(false);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 pt-2">
      <label htmlFor={fieldId} className={parentId ? "sr-only" : "kn-field-label"}>
        {parentId ? "ตอบกลับ" : "แสดงความคิดเห็น"}
      </label>
      <textarea id={fieldId} name="body" required maxLength={2000} rows={parentId ? 2 : 3} className="kn-input h-auto py-3" />
      {error && (
        <p role="alert" className="text-small text-danger">
          {error}
        </p>
      )}
      {sent && (
        <p role="status" className="text-small text-ink-muted">
          ส่งแล้ว ความคิดเห็นจะเผยแพร่หลังผู้ดูแลตรวจ
        </p>
      )}
      <div>
        <Button type="submit" size="sm" disabled={sending}>
          {sending ? "กำลังส่ง…" : "ส่ง"}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: สร้าง `components/BestAnswerButton.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui/Button";

/** เจ้าของกระทู้ถามตอบเท่านั้นที่เห็นปุ่มนี้ — เซิร์ฟเวอร์ตรวจซ้ำทุกเงื่อนไข */
export function BestAnswerButton({ postId, commentId, isBest }: { postId: string; commentId: string; isBest: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function pick() {
    setBusy(true);
    try {
      const res = await fetch(`/api/community/posts/${postId}/best-answer`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ commentId: isBest ? null : commentId }),
      });
      if (res.ok) router.refresh();
    } catch {
      // เครือข่ายล้ม — ไม่เปลี่ยนอะไร
    }
    setBusy(false);
  }

  return (
    <Button size="sm" variant="ghost" onClick={pick} disabled={busy} icon={<Icon name={isBest ? "close" : "verified"} />}>
      {isBest ? "ยกเลิกคำตอบที่ดีที่สุด" : "เลือกเป็นคำตอบที่ดีที่สุด"}
    </Button>
  );
}
```

- [ ] **Step 4: เขียน `app/community/[id]/page.tsx` ใหม่**

```tsx
import { notFound } from "next/navigation";
import { BestAnswerButton } from "@/components/BestAnswerButton";
import { CommentForm } from "@/components/CommentForm";
import { EmptyState } from "@/components/EmptyState";
import { LikeButton } from "@/components/LikeButton";
import { PageShell } from "@/components/PageShell";
import { Badge } from "@/components/ui/Badge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { getPost } from "@/lib/community";
import { countNodes, postTypeLabel } from "@/lib/community-rules";
import { cx } from "@/lib/cx";
import { departmentLabel } from "@/lib/departments";
import { idSchema } from "@/lib/validation";

type Data = NonNullable<Awaited<ReturnType<typeof getPost>>>;
type Node = Data["comments"][number];
type Ctx = { postId: string; bestAnswerId: string | null; canAct: boolean; canPickBest: boolean; viewerId: string };

// เวลาไทยทั้งระบบ (บทเรียน v1)
const thaiDateTime = (d: Date) =>
  d.toLocaleString("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });

export default async function PostPage({ params }: PageProps<"/community/[id]">) {
  const id = idSchema.safeParse((await params).id);
  if (!id.success) notFound();
  const data = await getPost(id.data);
  if (!data) notFound();
  const { post, comments, viewerId, canAct } = data;
  const approved = post.status === "APPROVED";
  const ctx: Ctx = {
    postId: post.id,
    bestAnswerId: post.bestAnswerId,
    canAct,
    canPickBest: canAct && approved && post.type === "QA" && post.userId === viewerId,
    viewerId,
  };

  return (
    <PageShell
      eyebrow={[postTypeLabel(post.type), post.department ? departmentLabel(post.department) : "ทั่วไป"].join(" · ")}
      title={post.title}
      lede={`${post.user.name ?? "นักศึกษา"} · ${thaiDateTime(post.createdAt)}`}
    >
      {!approved && (
        <Badge tone="warning" className="self-start">
          รอตรวจ — มีแค่คุณที่เห็นกระทู้นี้
        </Badge>
      )}
      <p className="max-w-prose whitespace-pre-line break-words">{post.body}</p>
      {approved && <LikeButton target={{ postId: post.id }} liked={post.liked} count={post.likeCount} disabled={!canAct} />}

      <section className="flex flex-col gap-4">
        <SectionHeader title={`ความคิดเห็น (${countNodes(comments)})`} />
        {comments.length === 0 ? (
          <EmptyState icon="chat" title="ยังไม่มีความคิดเห็น">
            {approved ? "เริ่มต้นบทสนทนาได้เลย" : "แสดงความคิดเห็นได้หลังกระทู้ผ่านการตรวจ"}
          </EmptyState>
        ) : (
          <ul className="flex flex-col gap-4">
            {comments.map((c) => (
              <CommentItem key={c.id} c={c} ctx={ctx} />
            ))}
          </ul>
        )}
        {canAct && approved && <CommentForm postId={post.id} />}
      </section>
    </PageShell>
  );
}

function CommentItem({ c, ctx }: { c: Node; ctx: Ctx }) {
  const isBest = c.id === ctx.bestAnswerId;
  const approved = c.status === "APPROVED";
  return (
    // ย่อหน้าซ้อนสูงสุด 3 ชั้น ลึกกว่านั้นอยู่แนวเดียวกับชั้นที่ 3 — จอ 375px ไม่ถูกบีบจนอ่านไม่ได้
    <li className={cx(c.depth > 0 && c.depth <= 3 && "border-l border-line pl-4")}>
      <article className={cx("flex flex-col gap-2 rounded-lg border p-4", isBest ? "border-signal" : "border-line")}>
        <p className="text-small text-ink-muted">{`${c.user.name ?? "นักศึกษา"} · ${thaiDateTime(c.createdAt)}`}</p>
        {isBest && (
          <Badge tone="success" className="self-start">
            คำตอบที่ดีที่สุด
          </Badge>
        )}
        {!approved && (
          <Badge tone="warning" className="self-start">
            รอตรวจ — มีแค่คุณที่เห็น
          </Badge>
        )}
        <p className="whitespace-pre-line break-words">{c.body}</p>
        {approved && (
          <div className="flex flex-wrap items-center gap-2">
            <LikeButton target={{ commentId: c.id }} liked={c.liked} count={c.likeCount} disabled={!ctx.canAct} />
            {ctx.canPickBest && c.userId !== ctx.viewerId && <BestAnswerButton postId={ctx.postId} commentId={c.id} isBest={isBest} />}
          </div>
        )}
        {ctx.canAct && approved && (
          <details>
            <summary className="kn-link cursor-pointer text-small">ตอบกลับ</summary>
            <CommentForm postId={ctx.postId} parentId={c.id} />
          </details>
        )}
      </article>
      {c.replies.length > 0 && (
        <ul className="mt-3 flex flex-col gap-3">
          {c.replies.map((r) => (
            <CommentItem key={r.id} c={r} ctx={ctx} />
          ))}
        </ul>
      )}
    </li>
  );
}
```

- [ ] **Step 5: ตรวจ type lint เทสต์**

Run: `npx tsc --noEmit` · `npm run lint` · `node --test` → ผ่านทั้งหมด

- [ ] **Step 6: ตรวจด้วย curl** (session `dev-p4` = `seed_u3`)

```bash
C="authjs.session-token=dev-p4"
code() { curl -s -o /dev/null -w "%{http_code} " -b "$C" "localhost:3000/community/$1"; }
code seed_post1; code seed_post3; code seed_post4; code nope; echo
P1=$(curl -s -b "$C" localhost:3000/community/seed_post1)
for s in "ความคิดเห็นที่รอตรวจของคนอื่น" "ความคิดเห็นที่ถูกปฏิเสธ" "ความคิดเห็นที่รอตรวจของฉันเอง" "คำตอบที่ดีที่สุด" "เลือกเป็นคำตอบที่ดีที่สุด"; do printf '%s=%s ' "$s" "$(echo "$P1" | grep -c "$s")"; done; echo
P3=$(curl -s -b "$C" localhost:3000/community/seed_post3); echo "$P3" | grep -c "รอตรวจ — มีแค่คุณที่เห็นกระทู้นี้"
P5=$(curl -s -b "$C" localhost:3000/community/seed_post5); echo "$P5" | grep -o "เลือกเป็นคำตอบที่ดีที่สุด\|ยกเลิกคำตอบที่ดีที่สุด" | sort | uniq -c
```

Expected:
- `200 200 404 404` (post3 รอตรวจแต่เป็นของ u3 จึงเปิดได้ · post4 ถูกปฏิเสธ 404)
- บน post1: ของคนอื่นที่รอตรวจ `0` · ที่ถูกปฏิเสธ `0` · ของฉันที่รอตรวจ `≥1` · `คำตอบที่ดีที่สุด` `≥1` (cm1) · `เลือกเป็นคำตอบที่ดีที่สุด` `0` (u3 ไม่ใช่เจ้าของ post1)
- post3: `≥1`
- post5 (u3 เป็นเจ้าของ คำตอบที่ดีที่สุด = cm6 จาก Task 4): `ยกเลิกคำตอบที่ดีที่สุด` บน cm6 และไม่มีปุ่มบน cm7 (ความคิดเห็นของ u3 เอง) — ปุ่ม "เลือกเป็นคำตอบที่ดีที่สุด" ไม่มีเลย

- [ ] **Step 7: Checkpoint** — ห้าม commit (การตรวจในเบราว์เซอร์อยู่ใน Task 7)

---

### Task 7: กระทู้ของฉัน + ตรวจทั้งเส้นทาง + เก็บกวาด + เอกสาร

**Files:**
- Modify: `app/profile/page.tsx`, `docs/context.md`

**Interfaces:**
- Consumes: `myPosts` จาก `@/lib/community` · `postTypeLabel` · ค่าคงที่ `STATUS` และ `thaiDate` ที่มีอยู่แล้วใน `app/profile/page.tsx`

- [ ] **Step 1: กระทู้ของฉันใน `app/profile/page.tsx`**

เพิ่ม import:

```tsx
import { myPosts } from "@/lib/community";
import { postTypeLabel } from "@/lib/community-rules";
```

เปลี่ยนบรรทัด `const reviews = user.role === "STUDENT" ? await myReviews() : [];` เป็น:

```tsx
  const [reviews, posts] = user.role === "STUDENT" ? await Promise.all([myReviews(), myPosts()]) : [[], []];
```

ในกิ่ง `user.role === "STUDENT"` ต่อจาก `</section>` ของ "รีวิวของฉัน" (ภายใน fragment เดียวกัน — ถ้ากิ่งนั้นเป็น element เดียว ให้ห่อด้วย `<>...</>`) เพิ่ม:

```tsx
          <section className="flex flex-col gap-4">
            <SectionHeader title="กระทู้ของฉัน" />
            {posts.length === 0 ? (
              <EmptyState icon="forum" title="ยังไม่มีกระทู้">
                <Link href="/community/new" className="kn-link">
                  ตั้งกระทู้แรก
                </Link>
              </EmptyState>
            ) : (
              posts.map((p) => (
                <Card
                  key={p.id}
                  eyebrow={`${postTypeLabel(p.type)} · ${thaiDate(p.createdAt)}`}
                  title={
                    p.status === "REJECTED" ? (
                      p.title
                    ) : (
                      <Link href={`/community/${p.id}`} className="kn-link">
                        {p.title}
                      </Link>
                    )
                  }
                  footer={<Badge tone={STATUS[p.status].tone}>{STATUS[p.status].label}</Badge>}
                >
                  {p.status === "REJECTED" && <p>{`เหตุผล: ${p.rejectionReason ?? "ไม่ระบุ"}`}</p>}
                </Card>
              ))
            )}
          </section>
```

Run: `npx tsc --noEmit` · `npm run lint` · `node --test` → ผ่าน

```bash
curl -s -b "authjs.session-token=dev-p4" localhost:3000/profile | grep -o "กระทู้ของฉัน\|เทคนิคเขียนรายงานฝึกงานให้เสร็จเร็ว\|P4TEST เทคนิคทดสอบ" | sort -u
```

Expected: ทั้งสามข้อความ (หัวข้อส่วน, post3 ที่รอตรวจ, กระทู้ P4TEST จาก Task 4)

- [ ] **Step 2: ตรวจทั้งเส้นทางในเบราว์เซอร์** (controller ทำ — built-in browser, cookie `authjs.session-token=dev-p4`)

- `/community` → แท็บ "ถามตอบ" เปลี่ยน URL และแสดงเฉพาะ post1 post5 · เลือกแผนกแล้วกด "กรอง" ได้ผลตาม
- `/community/new` → กดตั้งกระทู้โดยไม่เลือกหมวด เบราว์เซอร์ชี้ช่องหมวด · กรอกครบแล้วส่ง → ไปหน้ากระทู้ใหม่ มีป้าย "รอตรวจ — มีแค่คุณที่เห็นกระทู้นี้" และไม่มีปุ่มถูกใจ/ช่องความคิดเห็น
- `/community/seed_post1` → กดถูกใจ ตัวเลข 2→3 กดอีกครั้ง 3→2 · เปิด "ตอบกลับ" ใต้ cm1 พิมพ์แล้วส่ง → ข้อความ "ส่งแล้ว..." และความคิดเห็นใหม่โผล่ใต้ cm1 พร้อมป้ายรอตรวจ
- `/community/seed_post5` → กด "ยกเลิกคำตอบที่ดีที่สุด" ป้ายหายและปุ่มกลายเป็น "เลือกเป็นคำตอบที่ดีที่สุด" กดอีกครั้งป้ายกลับมา
- `read_console_messages` onlyErrors → ไม่มี error (นอกจาก 4xx ของ resource ที่คาดไว้)

- [ ] **Step 3: สายตอบกลับลึกที่ 375px** (controller ทำ)

สร้างสายตอบกลับลึก 5 ชั้นที่อนุมัติแล้วใต้ cm2 ตรงในฐานข้อมูล (ข้อมูลทดสอบ ลบใน Step 5):

```bash
npx prisma db execute --stdin <<'EOF'
INSERT INTO "CommunityComment" (id, postId, userId, parentId, body, status, createdAt) VALUES
 ('p4deep1','seed_post1','seed_u1','seed_cm2','P4TEST ชั้น 3','APPROVED','2026-10-02T01:00:00.000Z'),
 ('p4deep2','seed_post1','seed_u2','p4deep1','P4TEST ชั้น 4','APPROVED','2026-10-02T01:01:00.000Z'),
 ('p4deep3','seed_post1','seed_u4','p4deep2','P4TEST ชั้น 5','APPROVED','2026-10-02T01:02:00.000Z'),
 ('p4deep4','seed_post1','seed_u1','p4deep3','P4TEST ชั้น 6 ข้อความยาวยาวยาวยาวยาวยาวยาวยาวยาวยาวยาวยาวยาวยาวยาว','APPROVED','2026-10-02T01:03:00.000Z');
EOF
```

`resize_window` preset `mobile` → เปิด `/community/seed_post1` ตรวจด้วย `javascript_tool`:

```js
const a = (id) => [...document.querySelectorAll("article")].find((x) => x.textContent.includes(id)).getBoundingClientRect();
({ d3: Math.round(a("ชั้น 3").left), d4: Math.round(a("ชั้น 4").left), d5: Math.round(a("ชั้น 5").left), d6: Math.round(a("ชั้น 6").left), w6: Math.round(a("ชั้น 6").width), overflowX: document.documentElement.scrollWidth > innerWidth })
```

Expected: `d4 === d5 === d6` (ชั้นที่ลึกกว่า 3 ไม่ย่อหน้าเพิ่ม) · `w6` มากกว่า 200 · `overflowX: false` แล้ว screenshot จากนั้น preset `desktop`

- [ ] **Step 4: เทสต์ lint build**

Run: `node --test` · `npm run lint` · `npm run build` → ผ่านทั้งหมด

- [ ] **Step 5: เก็บกวาดข้อมูลทดสอบและ session**

```bash
npx prisma db execute --stdin <<'EOF'
DELETE FROM "CommunityComment" WHERE body LIKE 'P4TEST%' OR id LIKE 'p4deep%' OR (userId = 'seed_u3' AND id NOT LIKE 'seed_%');
DELETE FROM "CommunityLike" WHERE id NOT LIKE 'seed_%';
DELETE FROM "CommunityPost" WHERE title LIKE 'P4TEST%' OR (userId = 'seed_u3' AND id NOT LIKE 'seed_%');
DELETE FROM "Session" WHERE "sessionToken" = 'dev-p4';
EOF
npx jiti prisma/seed.ts
curl -s -o /dev/null -w '%{http_code}\n' -b "authjs.session-token=dev-p4" localhost:3000/community
```

Expected: `Script executed successfully.` · บรรทัด seed สองบรรทัดตาม Task 1 · `401`

- [ ] **Step 6: `docs/context.md`** — ตารางสถานะแถว Phase 4 เป็น `เสร็จ` · เปลี่ยน "Phase 0–3 เสร็จแล้ว ถัดไปคือ **Phase 4**" เป็น "Phase 0–4 เสร็จแล้ว ถัดไปคือ **Phase 5**" · ต่อท้ายย่อหน้าหมายเหตุ "Phase 2–3: ..." ด้วยบรรทัดใหม่:

```
Phase 4: คำตอบที่ดีที่สุดเก็บเป็น `CommunityPost.bestAnswerId` (หนึ่งคำตอบต่อกระทู้โดยโครงสร้าง) · **Phase 6 ต้องรักษา:** ห้ามอนุมัติคำตอบที่ต้นทางยังไม่อนุมัติ และปฏิเสธความคิดเห็นที่เป็นคำตอบที่ดีที่สุดต้องล้าง `bestAnswerId`
```

- [ ] **Step 7: Checkpoint** — สรุปผลให้ผู้ใช้ ห้าม commit จนกว่าผู้ใช้สั่ง
