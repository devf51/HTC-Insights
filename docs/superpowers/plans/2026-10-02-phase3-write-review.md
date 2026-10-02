# Phase 3 — เขียนรีวิว Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** นักศึกษาเลือกสถานประกอบการ (จากในระบบ จาก Google Maps หรือกรอกเอง) แล้วเขียนรีวิวผ่านฟอร์มหลายขั้นตอน: คะแนน 4 ด้าน เบี้ยเลี้ยงและเวลางาน คำแนะนำ แนบรูป และเลือกไม่ระบุตัวตน รีวิวเกิดมาเป็น `PENDING` เสมอ ติดตามสถานะได้ที่โปรไฟล์ และแก้ไขแล้วส่งใหม่ได้เมื่อถูกปฏิเสธ

**Architecture:** หน้า `/insights/write-review` เป็น Server Component ที่ทำหน้าที่เลือกบริษัท (ค้นหาในฐานข้อมูลผ่าน `listCompanies` และค้นหา Google ผ่าน `lib/places.ts` ฝั่งเซิร์ฟเวอร์) แล้ว render `ReviewForm` (client) ที่ส่ง multipart ไป Route Handler `POST /api/reviews` และ `PUT /api/reviews/[id]` ทั้งสอง route อ่านฟอร์มผ่าน zod แล้วเรียก DAL `lib/reviews.ts` (มี guard เอง เขียนทุกอย่างในทรานแซกชัน) ตรรกะที่พังเงียบได้อยู่ใน `lib/review-rules.ts` และ `parsePlaces` แบบ pure มีเทสต์ ไม่มีคีย์ SerpApi หรือ Cloudinary = ซ่อนส่วนค้นหา Google และช่องแนบรูป ส่วนที่เหลือใช้งานได้ครบ

**Tech Stack:** Next 16.3 App Router (Route Handlers, `RouteContext`, `next/image`) · Prisma 7 + SQLite · zod 4 · cloudinary 2.11 (`uploader.upload_stream`) · SerpApi `engine=google_maps` · `node --test`

**Spec:** แผนเต็ม `C:\Users\user\.claude\plans\htc-insights-synthetic-zephyr.md` หัวข้อ "Phase 3" + `docs/context.md` (หลักการโดเมนข้อ 1–2, สเปกข้อ 5) + การตัดสินใจของผู้ใช้ 2 ต.ค. 2569 (ด้านล่าง)

### การตัดสินใจของผู้ใช้ (2 ต.ค. 2569)

| เรื่อง | ผู้ใช้เลือก |
|---|---|
| ตัวตนของรีวิวไม่ระบุตัวตน | ผู้ดูแลสืบได้ว่าใครเขียน แต่ชื่อไม่แสดงต่อผู้ใช้คนอื่นเมื่อเผยแพร่ — **ไม่เข้ารหัส** (`userId` เก็บไว้ไม่เข้ารหัสอยู่แล้ว การเข้ารหัสซ้ำไม่ได้กันอะไร) ลบคอลัมน์ `anonIdentityEnc` และแก้หลักการข้อ 2 ใน `docs/context.md` |
| ไม่มีคีย์ SerpApi / Cloudinary | ทำให้ใช้งานได้โดยไม่มีคีย์ — ซ่อนส่วนที่ต้องใช้คีย์ เติมคีย์ทีหลังฟีเจอร์เปิดเอง |
| บริษัทที่ไม่มีในระบบและหาใน Google ไม่เจอ | กรอกเอง: ชื่อ + ที่อยู่ (ไม่ปักหมุด) |
| รีวิวถูกปฏิเสธ | แก้รีวิวเดิมแล้วส่งใหม่ กลับเป็น `PENDING` |

### ต่างจากแผนเต็ม

| แผนเต็มเขียนว่า | แผนนี้ทำ | เหตุผล |
|---|---|---|
| `app/api/places-search/route.ts` proxy SerpApi ให้ client เรียก | ค้นหา Google ในหน้า Server Component ตรง (`lib/places.ts`) ไม่มี route ให้ client | คีย์ไม่มีทางหลุดไป client และไม่ต้องมี endpoint ที่คนภายนอกยิงเผาโควตาได้ |
| `anonIdentityEnc` เข้ารหัสตัวตน เปิดเผยได้เฉพาะเมื่อร้องเรียน | ลบคอลัมน์ ผู้ดูแลเห็นผู้เขียนจาก `userId` (หน้าคัดกรองทำใน Phase 6) | การตัดสินใจของผู้ใช้ข้างบน |
| — | เพิ่ม `Company.googlePlaceId @unique` | กันบริษัทเดียวกันถูกสร้างซ้ำเมื่อหลายคนเลือกจากผล Google — บังคับที่ฐานข้อมูล |
| v1 แจ้งเตือนผู้ดูแลทุกคนเมื่อมีรีวิวใหม่ | ไม่ทำ | ศูนย์คัดกรองใน Phase 6 แสดงคิว `PENDING` อยู่แล้ว |

## Global Constraints

- อ่าน `AGENTS.md`: Next 16 — `params`/`searchParams` เป็น Promise ใช้ `PageProps<'/x'>` / `RouteContext<'/x'>` แบบ global ไม่ต้อง import
- Prisma Client ใช้ผ่าน `db` จาก `@/lib/db` เท่านั้น (ยกเว้น `prisma/seed.ts`)
- **ทุก Route Handler เรียก guard จาก `@/lib/auth` เป็นบรรทัดแรก** และทุกฟังก์ชัน `export async function` ใน DAL (`lib/companies.ts`, `lib/reviews.ts`) ก็เช่นกัน — `tests/route-guards.test.mjs` ตรวจ
- **รีวิวใหม่และรีวิวที่แก้แล้วเป็น `PENDING` เสมอ** `scoreOverall` ระบบคำนวณจากค่าเฉลี่ย 4 ด้าน ผู้ใช้ส่งมาเองไม่ได้
- **ชื่อผู้เขียนรีวิวไม่ระบุตัวตนห้ามไปถึงผู้ใช้คนอื่น** (หน้าสาธารณะใช้ `reviewAuthor` จาก Phase 2 อยู่แล้ว) — เจ้าของเห็นรีวิวของตัวเองที่โปรไฟล์ได้
- input ทุกชิ้นจากผู้ใช้ผ่าน zod (`lib/validation.ts`) ก่อนแตะฐานข้อมูล ข้อความ error ที่ส่งกลับเป็นภาษาไทย รูปแบบ JSON `{ "error": "..." }`
- ความลับอยู่ใน env เท่านั้น ห้าม `NEXT_PUBLIC_` กับ `SERPAPI_KEY` / `CLOUDINARY_*` **ห้าม log URL ของ SerpApi** (มี `api_key` ใน query string)
- ไม่มีคีย์ = ปิดฟีเจอร์นั้นเงียบ ๆ ไม่ใช่ 500: `placesEnabled()` / `uploadsEnabled()` เป็นจุดตัดสินจุดเดียว
- วันที่: `<input type="date">` ตีความเป็นเที่ยงคืนเวลาไทย (`+07:00`) แสดงผลด้วย `timeZone: "Asia/Bangkok"`
- UI ภาษาไทย ไม่ใช้ emoji ไอคอน Material Symbols primary หนึ่งปุ่มต่อหน้าจอ ทดสอบที่ 375px
- เทสต์รันด้วย `node --test` (ไม่ใส่ `tests/`) ไฟล์ที่เทสต์ import (`lib/review-rules.ts`, `lib/places.ts`) ต้องไม่ import ค่าจริง (`import type` ได้) ห้ามใช้ alias `@/`
- Git Bash ส่งภาษาไทยใน argv ให้ `curl.exe`/`node.exe` เพี้ยน (cp874) — ใส่ภาษาไทยในไฟล์สคริปต์หรือ percent-encode เท่านั้น
- **ห้าม commit เอง** — CLAUDE.md ให้ commit เมื่อผู้ใช้สั่งเท่านั้น
- dev server: `preview_start` ชื่อ `next-dev` ที่ `localhost:3000` · ข้อมูล seed จาก Phase 2 (`npx prisma db seed`)

## Review Focus

1. **รีวิวบริษัทเดิมซ้ำ** (กดส่งสองครั้ง หรือเลือกสถานที่ Google เดียวกันจากคำค้นต่างกัน) ต้องได้ 409 ข้อความไทย ไม่ใช่ 500 → `@@unique([companyId, userId])` + upsert ด้วย `googlePlaceId` + จับ `P2002` · สคริปต์ Task 5
2. **วันที่ผิด** (30 ก.พ. ที่ JS ปัดเป็น 2 มี.ค., วันสิ้นสุดก่อนวันเริ่ม, วันเริ่มในอนาคต) ต้องได้ 400 → `parseThaiDate`/`periodError` เทสต์ใน Task 2 + สคริปต์ Task 5
3. **ช่องไฟล์ว่าง** (เบราว์เซอร์ส่งไฟล์ 0 ไบต์ชื่อ "" เมื่อไม่ได้เลือกรูป) ต้องไม่ถูกนับเป็นรูป และ **แนบรูปตอนยังไม่มีคีย์ Cloudinary** ต้องได้ 400 → `splitReviewForm` เทสต์ Task 2 + สคริปต์ Task 5
4. **แก้รีวิวของคนอื่น หรือรีวิวที่ไม่ได้ถูกปฏิเสธ** ผ่าน `PUT /api/reviews/<id>` ต้องได้ 404 และไม่มีอะไรเปลี่ยน → `where: { id, userId, status: "REJECTED" }` · สคริปต์ Task 5
5. **ไม่มีคีย์ SerpApi หรือ SerpApi ล่ม/ตอบขยะ** → ไม่มีส่วน Google ในหน้าเลือก ฟอร์มที่อ้าง place ได้ 400 ไม่ใช่ 500 → `parsePlaces`/`searchPlaces` เทสต์ Task 3 + สคริปต์ Task 5 + curl Task 6

---

## File Structure

```
prisma/schema.prisma + migration          ลบ Review.anonIdentityEnc เพิ่ม Company.googlePlaceId @unique     แก้ (T1)
prisma/seed.ts                            rejectionReason ของ seed_r3 (T1) + รูปตัวอย่าง (T7)               แก้
context.md                                หลักการข้อ 2 (T1) + สถานะ (T8)                                     แก้
lib/companies.ts                          คอมเมนต์ (T1) + select รูป (T7)                                    แก้
lib/review-rules.ts                       overallScore parseThaiDate toThaiDateInput periodError workTimeError
                                          photoError splitReviewForm canEditReview (pure)                   ใหม่ (T2)
lib/places.ts                             placesEnabled searchPlaces findPlace parsePlaces                   ใหม่ (T3)
lib/validation.ts                         idSchema reviewFieldsSchema companyChoiceSchema writeReviewParamsSchema  แก้ (T4)
lib/cloudinary.ts                         uploadsEnabled uploadImage                                         ใหม่ (T4)
lib/reviews.ts                            DAL: submitReview resubmitReview myReviews getReviewForEdit
                                          getCompanyForReview findCompanyIdByPlace + ReviewError             ใหม่ (T4)
lib/review-request.ts                     readReviewForm badRequest reviewErrorResponse                      ใหม่ (T5)
app/api/reviews/route.ts                  POST                                                               ใหม่ (T5)
app/api/reviews/[id]/route.ts             PUT                                                                ใหม่ (T5)
components/ReviewForm.tsx                 ฟอร์ม 5 ขั้น (client)                                              ใหม่ (T6)
app/insights/write-review/page.tsx        เลือกบริษัท + ฟอร์ม + โหมดแก้ไข                                     เขียนใหม่ (T6)
app/profile/page.tsx                      รีวิวของฉัน + แถบ "ส่งแล้ว"                                         แก้ (T7)
app/insights/[id]/page.tsx                แสดงรูปในรีวิว                                                      แก้ (T7)
next.config.ts                            images.remotePatterns res.cloudinary.com                           แก้ (T7)
.env.example                              หมายเหตุคีย์ที่เว้นว่างได้                                          แก้ (T8)
tests/review-rules.test.mjs, tests/places.test.mjs                                                           ใหม่
tests/route-guards.test.mjs               guard ใน DAL หลายไฟล์ (T4) + ทุก Route Handler (T5)                 แก้
```

---

### Task 1: Schema — ลบการเข้ารหัสตัวตน เพิ่ม `googlePlaceId`

**Files:**
- Modify: `prisma/schema.prisma`, `prisma/seed.ts`, `docs/context.md`, `lib/companies.ts` (คอมเมนต์บรรทัดเดียว)
- Create: `prisma/migrations/<timestamp>_phase3_reviews/migration.sql` (สร้างด้วยคำสั่ง ไม่เขียนมือ)

**Interfaces:**
- Produces: `Company.googlePlaceId: string | null` (unique) · `Review` ไม่มี `anonIdentityEnc` แล้ว · seed `seed_r3` (REJECTED ของ `seed_u3`) มี `rejectionReason`

- [ ] **Step 1: แก้ `prisma/schema.prisma`**

ใน `model Company` เพิ่มหลัง `isVerified`:

```prisma
  // place_id ของ Google Maps (ผ่าน SerpApi) — unique กันบริษัทเดียวกันถูกสร้างซ้ำเมื่อหลายคนเลือกจากผลค้นหา
  // SQLite ยอมให้ NULL ซ้ำได้ บริษัทที่กรอกเองจึงไม่ชนกัน
  googlePlaceId String?  @unique
```

ใน `model Review` แทนสามบรรทัดนี้:

```prisma
  // ไม่ระบุตัวตน: ซ่อนจากทุกคนรวมถึงผู้ดูแล ตัวตนเก็บแบบเข้ารหัส
  // เปิดเผยได้เฉพาะเมื่อมีการร้องเรียน และต้องลง AuditLog ทุกครั้ง
  isAnonymous     Boolean @default(false)
  anonIdentityEnc String?
```

ด้วย:

```prisma
  // ไม่ระบุตัวตน: ชื่อไม่แสดงต่อผู้ใช้คนอื่น ผู้ดูแลสืบได้จาก userId (context.md หลักการข้อ 2)
  isAnonymous Boolean @default(false)
```

- [ ] **Step 2: สร้างและรัน migration**

Run: `npx prisma migrate dev --name phase3_reviews`

Expected: สร้างโฟลเดอร์ `prisma/migrations/<timestamp>_phase3_reviews/` และ `Your database is now in sync with your schema.`

ถ้าคำสั่งหยุดเพราะเตือนเรื่องลบคอลัมน์ในโหมด non-interactive ให้ใช้ทางสำรองนี้แทน (ผลเหมือนกัน):

```bash
dir="prisma/migrations/$(date +%Y%m%d%H%M%S)_phase3_reviews"; mkdir -p "$dir"
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script -o "$dir/migration.sql"
npx prisma migrate deploy
```

จากนั้น: `npx prisma generate` (Prisma 7 `migrate dev` ไม่ generate ให้)
แล้ว: `npx prisma migrate status` → Expected: `Database schema is up to date!`

- [ ] **Step 3: แก้ `prisma/seed.ts` ให้ `seed_r3` มีเหตุผลที่ถูกปฏิเสธ**

ใน `type SeedReview` เพิ่มฟิลด์ `rejectionReason?: string;` ต่อจาก `isAnonymous?: boolean;`

แถว `seed_r3` ใน `REVIEWS` เพิ่ม `rejectionReason` (ข้อความเดียวกันนี้ใช้ตรวจใน Task 6–8):

```ts
  { id: "seed_r3", companyId: "seed_c1", userId: "seed_u3", department: "แผนกวิชาช่างยนต์", status: "REJECTED", scores: [1, 1, 1, 1], allowance: 1000, text: "ข้อความรีวิวที่ถูกปฏิเสธ", rejectionReason: "ยังไม่ได้เล่าลักษณะงานที่ทำจริง เพิ่มรายละเอียดอย่างน้อย 30 ตัวอักษร" },
```

ใน `const data = {` เพิ่มบรรทัดต่อจาก `isAnonymous: r.isAnonymous ?? false,`:

```ts
      rejectionReason: r.rejectionReason ?? null,
```

Run: `npx prisma db seed` แล้ว `npx jiti prisma/seed.ts`
Expected: `seed: 6 บริษัท APPROVED=5 PENDING=2 REJECTED=1`

- [ ] **Step 4: แก้หลักการข้อ 2 ใน `docs/context.md`**

แทนข้อความเดิม:

```
2. **ความไม่ระบุตัวตนต้องกันได้จริง** รีวิวที่เลือกไม่ระบุตัวตนต้องซ่อนตัวตนจากทุกคนรวมถึง
   ผู้ดูแล ตัวตนเก็บแบบเข้ารหัส เปิดเผยได้เฉพาะเมื่อมีการร้องเรียน และการเปิดเผยทุกครั้งต้องลง
   `AuditLog`
```

ด้วย:

```
2. **ไม่ระบุตัวตนต่อผู้ใช้คนอื่น แต่ผู้ดูแลสืบได้** รีวิวที่เลือกไม่ระบุตัวตนต้องไม่แสดงชื่อผู้เขียนในทุกที่
   ที่ผู้ใช้คนอื่นเห็น ผู้ดูแลเห็นผู้เขียนในศูนย์คัดกรองเพื่อตรวจสอบได้ (ผู้ใช้ตัดสิน 2 ต.ค. 2569 แทน
   การเข้ารหัสตัวตนแบบ v1 — v1 เก็บ userId ไม่เข้ารหัสคู่กันอยู่แล้ว การเข้ารหัสจึงไม่ได้กันอะไร)
```

- [ ] **Step 5: แก้คอมเมนต์ใน `lib/companies.ts`**

บรรทัด `// ห้าม select anonIdentityEnc หรือ userId — ชื่อผู้เขียนออกจากฟังก์ชันนี้ผ่าน reviewAuthor เท่านั้น` เปลี่ยนเป็น:

```ts
      // ห้าม select userId — ชื่อผู้เขียนออกจากฟังก์ชันนี้ผ่าน reviewAuthor เท่านั้น
```

- [ ] **Step 6: ตรวจ**

Run: `npx tsc --noEmit` → Expected: ไม่มี error
Run: `node --test` → Expected: PASS ทั้งหมด (36)
Run: `grep -rn "anonIdentityEnc" --include=*.ts --include=*.tsx --include=*.prisma . | grep -v node_modules | grep -v app/generated` → Expected: ไม่มีผล

- [ ] **Step 7: Checkpoint** — ห้าม commit

---

### Task 2: กฎของรีวิว (`lib/review-rules.ts`)

**Files:**
- Create: `lib/review-rules.ts`
- Test: `tests/review-rules.test.mjs`

**Interfaces:**
- Consumes: ไม่มี (pure — ใช้แค่ global `Date`, `FormData`, `File`)
- Produces:
  - `type Scores = { scoreWork: number; scoreEnv: number; scoreMentor: number; scoreWelfare: number }`
  - `overallScore(s: Scores): number`
  - `parseThaiDate(s: string): Date | null` · `toThaiDateInput(d: Date): string`
  - `periodError(start: Date, end: Date, now: Date): string | null`
  - `workTimeError(start: string | null, end: string | null): string | null`
  - `MAX_PHOTOS = 2` · `MAX_PHOTO_BYTES = 5 * 1024 * 1024` · `PHOTO_TYPES: readonly string[]`
  - `photoError(photos: { size: number; type: string }[]): string | null`
  - `splitReviewForm(fd: FormData): { fields: Record<string, string>; photos: File[] }`
  - `canEditReview(r: { userId: string; status: string }, userId: string): boolean`

- [ ] **Step 1: เขียนเทสต์ที่ล้มเหลว `tests/review-rules.test.mjs`**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_PHOTO_BYTES,
  canEditReview,
  overallScore,
  parseThaiDate,
  periodError,
  photoError,
  splitReviewForm,
  toThaiDateInput,
  workTimeError,
} from "../lib/review-rules.ts";

test("overallScore คือค่าเฉลี่ย 4 ด้าน", () => {
  assert.equal(overallScore({ scoreWork: 4, scoreEnv: 3, scoreMentor: 5, scoreWelfare: 3 }), 3.75);
  assert.equal(overallScore({ scoreWork: 5, scoreEnv: 5, scoreMentor: 5, scoreWelfare: 5 }), 5);
});

test("parseThaiDate: เที่ยงคืนเวลาไทย และปฏิเสธวันที่ที่ JS ปัดเอง", () => {
  assert.equal(parseThaiDate("2026-05-01").toISOString(), "2026-04-30T17:00:00.000Z");
  assert.equal(parseThaiDate("2024-02-29").toISOString(), "2024-02-28T17:00:00.000Z");
  assert.equal(parseThaiDate("2026-02-30"), null);
  assert.equal(parseThaiDate("2026-04-31"), null);
  assert.equal(parseThaiDate("2026-13-01"), null);
  assert.equal(parseThaiDate("01/05/2026"), null);
  assert.equal(parseThaiDate(""), null);
});

test("toThaiDateInput กลับเป็นค่าเดิมของ <input type=date>", () => {
  assert.equal(toThaiDateInput(parseThaiDate("2026-05-01")), "2026-05-01");
  assert.equal(toThaiDateInput(new Date("2026-09-30T20:00:00Z")), "2026-10-01");
});

test("periodError: วันสิ้นสุดก่อนวันเริ่ม และวันเริ่มในอนาคต", () => {
  const now = parseThaiDate("2026-10-02");
  assert.equal(periodError(parseThaiDate("2026-05-01"), parseThaiDate("2026-09-30"), now), null);
  assert.equal(periodError(parseThaiDate("2026-05-01"), parseThaiDate("2026-05-01"), now), null);
  assert.match(periodError(parseThaiDate("2026-09-30"), parseThaiDate("2026-05-01"), now), /ก่อนวันเริ่ม/);
  assert.match(periodError(parseThaiDate("2026-11-01"), parseThaiDate("2027-02-01"), now), /อนาคต/);
  // ยังฝึกอยู่: วันสิ้นสุดในอนาคตได้
  assert.equal(periodError(parseThaiDate("2026-09-01"), parseThaiDate("2027-01-31"), now), null);
});

test("workTimeError: กรอกครบทั้งคู่หรือเว้นทั้งคู่ กะดึกได้", () => {
  assert.equal(workTimeError(null, null), null);
  assert.equal(workTimeError("08:00", "17:00"), null);
  assert.equal(workTimeError("22:00", "06:00"), null);
  assert.match(workTimeError("08:00", null), /ทั้งคู่/);
  assert.match(workTimeError(null, "17:00"), /ทั้งคู่/);
});

test("photoError: จำนวน ชนิด และขนาด", () => {
  const png = { type: "image/png", size: 1000 };
  assert.equal(photoError([]), null);
  assert.equal(photoError([png, { type: "image/webp", size: 1 }]), null);
  assert.match(photoError([png, png, png]), /ไม่เกิน 2/);
  assert.match(photoError([{ type: "image/gif", size: 1 }]), /JPG/);
  assert.match(photoError([{ type: "image/jpeg", size: MAX_PHOTO_BYTES + 1 }]), /5 MB/);
});

test("splitReviewForm: แยกข้อความกับรูป และทิ้งไฟล์ว่างจากช่องที่ไม่ได้เลือกรูป", () => {
  const fd = new FormData();
  fd.append("textWork", "ทดสอบ");
  fd.append("photos", new File([], "", { type: "application/octet-stream" }));
  fd.append("photos", new File([new Uint8Array(3)], "a.png", { type: "image/png" }));
  fd.append("avatar", new File([new Uint8Array(3)], "b.png", { type: "image/png" }));
  const { fields, photos } = splitReviewForm(fd);
  assert.deepEqual(fields, { textWork: "ทดสอบ" });
  assert.equal(photos.length, 1);
  assert.equal(photos[0].name, "a.png");
});

test("canEditReview: เฉพาะเจ้าของ และเฉพาะที่ถูกปฏิเสธ", () => {
  assert.equal(canEditReview({ userId: "u1", status: "REJECTED" }, "u1"), true);
  assert.equal(canEditReview({ userId: "u1", status: "REJECTED" }, "u2"), false);
  assert.equal(canEditReview({ userId: "u1", status: "PENDING" }, "u1"), false);
  assert.equal(canEditReview({ userId: "u1", status: "APPROVED" }, "u1"), false);
});
```

- [ ] **Step 2: รันให้เห็นว่าล้ม**

Run: `node --test` → Expected: FAIL ที่ `tests/review-rules.test.mjs` — `Cannot find module ... lib/review-rules.ts`

- [ ] **Step 3: สร้าง `lib/review-rules.ts`**

```ts
// ไฟล์นี้ต้อง pure — tests/review-rules.test.mjs import ตรงด้วย Node ห้าม import ค่าจริงเพิ่ม (import type ได้)
// ใช้ทั้งฝั่งเซิร์ฟเวอร์ (zod, DAL) และ components/ReviewForm.tsx

export type Scores = { scoreWork: number; scoreEnv: number; scoreMentor: number; scoreWelfare: number };

/** คะแนนรวม = ค่าเฉลี่ย 4 ด้าน ระบบคำนวณเอง ผู้ใช้ส่งมาเองไม่ได้ */
export function overallScore(s: Scores): number {
  return (s.scoreWork + s.scoreEnv + s.scoreMentor + s.scoreWelfare) / 4;
}

const TH_OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * "YYYY-MM-DD" จาก <input type="date"> → เที่ยงคืนเวลาไทย
 * คืน null ถ้าไม่ใช่วันที่จริง — JS ปัด 2026-02-30 เป็น 2 มี.ค. เงียบ ๆ จึงต้องเทียบกลับ
 */
export function parseThaiDate(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00+07:00`);
  if (Number.isNaN(d.getTime())) return null;
  return toThaiDateInput(d) === s ? d : null;
}

/** Date → "YYYY-MM-DD" ตามปฏิทินไทย ใช้เติมค่าเดิมในฟอร์มแก้ไข */
export function toThaiDateInput(d: Date): string {
  return new Date(d.getTime() + TH_OFFSET_MS).toISOString().slice(0, 10);
}

export function periodError(start: Date, end: Date, now: Date): string | null {
  if (end < start) return "วันสิ้นสุดการฝึกต้องไม่ก่อนวันเริ่มฝึก";
  if (start > now) return "วันเริ่มฝึกต้องไม่อยู่ในอนาคต";
  return null;
}

/** กะดึก (เลิกงานน้อยกว่าเข้างาน) ถือว่าถูก */
export function workTimeError(start: string | null, end: string | null): string | null {
  if (!start !== !end) return "กรอกเวลาเข้างานและเลิกงานให้ครบทั้งคู่ หรือเว้นว่างทั้งคู่";
  return null;
}

export const MAX_PHOTOS = 2;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const PHOTO_TYPES: readonly string[] = ["image/jpeg", "image/png", "image/webp"];

export function photoError(photos: { size: number; type: string }[]): string | null {
  if (photos.length > MAX_PHOTOS) return `แนบรูปได้ไม่เกิน ${MAX_PHOTOS} รูป`;
  if (photos.some((p) => !PHOTO_TYPES.includes(p.type))) return "รองรับเฉพาะรูป JPG PNG และ WEBP";
  if (photos.some((p) => p.size > MAX_PHOTO_BYTES)) return "รูปแต่ละรูปต้องไม่เกิน 5 MB";
  return null;
}

/**
 * multipart → ช่องข้อความ + รูป (เฉพาะช่องชื่อ photos)
 * ช่องไฟล์ที่ไม่ได้เลือกรูป เบราว์เซอร์ยังส่งไฟล์ว่างชื่อ "" ขนาด 0 มา — ต้องทิ้ง ไม่งั้นนับเป็นรูป
 */
export function splitReviewForm(fd: FormData): { fields: Record<string, string>; photos: File[] } {
  const fields: Record<string, string> = {};
  const photos: File[] = [];
  for (const [key, value] of fd) {
    if (typeof value === "string") fields[key] = value;
    else if (key === "photos" && value.size > 0) photos.push(value);
  }
  return { fields, photos };
}

/** แก้ได้เฉพาะเจ้าของ และเฉพาะรีวิวที่ถูกปฏิเสธ — แก้แล้วกลับไปรอตรวจ */
export function canEditReview(r: { userId: string; status: string }, userId: string): boolean {
  return r.userId === userId && r.status === "REJECTED";
}
```

- [ ] **Step 4: รันเทสต์**

Run: `node --test` → Expected: PASS ทั้งหมด
Run: `npx tsc --noEmit` → Expected: ไม่มี error

- [ ] **Step 5: Checkpoint** — ห้าม commit

---

### Task 3: ค้นหาสถานที่จาก Google (`lib/places.ts`)

**Files:**
- Create: `lib/places.ts`
- Test: `tests/places.test.mjs`

**Interfaces:**
- Consumes: env `SERPAPI_KEY` (อาจว่าง)
- Produces:
  - `type Place = { placeId: string; name: string; address: string | null; lat: number | null; lng: number | null; phone: string | null; website: string | null }`
  - `placesEnabled(): boolean`
  - `parsePlaces(json: unknown): Place[]`
  - `searchPlaces(q: string): Promise<Place[]>` — ไม่มีคีย์ / คำค้นสั้นกว่า 2 / error ใด ๆ → `[]`
  - `findPlace(q: string, placeId: string): Promise<Place | null>`

- [ ] **Step 1: เขียนเทสต์ที่ล้มเหลว `tests/places.test.mjs`**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePlaces, placesEnabled, searchPlaces } from "../lib/places.ts";

const SAMPLE = {
  local_results: [
    {
      place_id: "ChIJ1",
      title: "  บริษัท ทดสอบ จำกัด ",
      address: "ถ.เพชรเกษม หาดใหญ่",
      phone: "074 000 000",
      website: "https://example.com",
      gps_coordinates: { latitude: 7.01, longitude: 100.47 },
    },
    { place_id: "ChIJ2", title: "ร้านไม่มีพิกัด", gps_coordinates: "junk" },
    { title: "ไม่มี place_id" },
    { place_id: "ChIJ3", title: "   " },
    null,
    "junk",
  ],
};

test("parsePlaces แปลงผล SerpApi และข้ามแถวที่ไม่มี place_id หรือชื่อ", () => {
  assert.deepEqual(parsePlaces(SAMPLE), [
    {
      placeId: "ChIJ1",
      name: "บริษัท ทดสอบ จำกัด",
      address: "ถ.เพชรเกษม หาดใหญ่",
      lat: 7.01,
      lng: 100.47,
      phone: "074 000 000",
      website: "https://example.com",
    },
    { placeId: "ChIJ2", name: "ร้านไม่มีพิกัด", address: null, lat: null, lng: null, phone: null, website: null },
  ]);
});

test("parsePlaces รับ place_results เดี่ยว", () => {
  assert.deepEqual(
    parsePlaces({ place_results: { place_id: "P1", title: "ที่เดียว" } }).map((p) => p.placeId),
    ["P1"],
  );
});

test("parsePlaces กับข้อมูลขยะคืนอาร์เรย์ว่าง ไม่ throw", () => {
  for (const junk of [null, undefined, "x", 1, {}, { local_results: "x" }, { error: "Invalid API key" }]) {
    assert.deepEqual(parsePlaces(junk), []);
  }
});

test("ไม่มี SERPAPI_KEY = ปิดฟีเจอร์ คืนผลว่างโดยไม่เรียกเครือข่าย", async () => {
  delete process.env.SERPAPI_KEY;
  assert.equal(placesEnabled(), false);
  assert.deepEqual(await searchPlaces("หาดใหญ่"), []);
});
```

- [ ] **Step 2: รันให้เห็นว่าล้ม**

Run: `node --test` → Expected: FAIL ที่ `tests/places.test.mjs` — `Cannot find module ... lib/places.ts`

- [ ] **Step 3: สร้าง `lib/places.ts`**

```ts
// ค้นหาสถานที่จาก Google Maps ผ่าน SerpApi — เรียกจากฝั่งเซิร์ฟเวอร์เท่านั้น คีย์อยู่ใน SERPAPI_KEY (ห้าม NEXT_PUBLIC_)
// ไม่มีคีย์ = ปิดฟีเจอร์เงียบ ๆ คืนผลว่าง ฟอร์มรีวิวส่วนอื่นยังใช้ได้
// ไฟล์นี้ไม่ import อะไร — tests/places.test.mjs import ตรงด้วย Node

export type Place = {
  placeId: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  website: string | null;
};

type SerpPlace = {
  place_id?: unknown;
  title?: unknown;
  address?: unknown;
  phone?: unknown;
  website?: unknown;
  gps_coordinates?: { latitude?: unknown; longitude?: unknown };
};

const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

export const placesEnabled = () => Boolean(process.env.SERPAPI_KEY);

/** ผลจาก engine=google_maps — แถวที่ไม่มี place_id หรือชื่อถูกข้าม (ไม่มี place_id กันสร้างบริษัทซ้ำไม่ได้) */
export function parsePlaces(json: unknown): Place[] {
  const j = (json ?? {}) as { local_results?: unknown; place_results?: unknown };
  const list: unknown[] = Array.isArray(j.local_results) ? j.local_results : j.place_results ? [j.place_results] : [];
  return list.flatMap((raw) => {
    const r = (raw ?? {}) as SerpPlace;
    const placeId = text(r.place_id);
    const name = text(r.title);
    if (!placeId || !name) return [];
    const gps = r.gps_coordinates;
    return [
      {
        placeId,
        name,
        address: text(r.address),
        lat: num(gps?.latitude),
        lng: num(gps?.longitude),
        phone: text(r.phone),
        website: text(r.website),
      },
    ];
  });
}

const HAT_YAI = "@7.0084,100.4767,12z";
const TTL_MS = 24 * 60 * 60 * 1000;
// ponytail: แคชในหน่วยความจำของ process เดียว (เซิร์ฟเวอร์เครื่องเดียว) ล้างทั้งก้อนเมื่อเกิน 500 คำค้น
// ประหยัดโควตา SerpApi และทำให้ findPlace ตอนส่งฟอร์มได้ผลเดียวกับที่ผู้ใช้เห็นตอนเลือก
const cache = new Map<string, { at: number; places: Place[] }>();

export async function searchPlaces(q: string): Promise<Place[]> {
  const key = process.env.SERPAPI_KEY;
  const query = q.trim().toLowerCase();
  if (!key || query.length < 2) return [];
  const hit = cache.get(query);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.places;

  const params = new URLSearchParams({ engine: "google_maps", type: "search", q: q.trim(), ll: HAT_YAI, hl: "th", gl: "th", api_key: key });
  try {
    const res = await fetch(`https://serpapi.com/search.json?${params}`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    // ห้าม log URL หรือ res.url — มี api_key อยู่ใน query string
    if (!res.ok) {
      console.error("SerpApi status", res.status);
      return [];
    }
    const places = parsePlaces(await res.json());
    if (cache.size >= 500) cache.clear();
    cache.set(query, { at: Date.now(), places });
    return places;
  } catch (e) {
    console.error("SerpApi error", e instanceof Error ? e.name : "unknown");
    return [];
  }
}

/** หาสถานที่ที่ผู้ใช้เลือกจากผลค้นหาเดิม — ไม่เชื่อชื่อ/พิกัดที่ client ส่งมา */
export async function findPlace(q: string, placeId: string): Promise<Place | null> {
  return (await searchPlaces(q)).find((p) => p.placeId === placeId) ?? null;
}
```

- [ ] **Step 4: รันเทสต์**

Run: `node --test` → Expected: PASS ทั้งหมด
Run: `npx tsc --noEmit` → Expected: ไม่มี error

- [ ] **Step 5: Checkpoint** — ห้าม commit

---

### Task 4: Schema ของฟอร์ม + อัปโหลดรูป + DAL รีวิว

**Files:**
- Modify: `lib/validation.ts`, `tests/route-guards.test.mjs`
- Create: `lib/cloudinary.ts`, `lib/reviews.ts`

**Interfaces:**
- Consumes: `parseThaiDate`, `periodError`, `workTimeError`, `overallScore`, `photoError`, `canEditReview` จาก `./review-rules` · `findPlace` จาก `./places` · `requireRole`, `requireUser` จาก `./auth` · `DEPARTMENT_VALUES` · `Prisma` จาก `@/app/generated/prisma/client`
- Produces:
  - `lib/validation.ts`: `idSchema` · `reviewFieldsSchema` → `ReviewFields` · `companyChoiceSchema` → `CompanyChoice` (discriminated `companyKind: "existing" | "place" | "new"`) · `writeReviewParamsSchema` → `{ q: string; company?: string; place?: string; new?: "1"; edit?: string }`
  - `lib/cloudinary.ts`: `uploadsEnabled(): boolean` · `uploadImage(file: File, folder: string): Promise<string>` (คืน `secure_url`)
  - `lib/reviews.ts`:
    - `class ReviewError extends Error { status: 400 | 404 | 409 }`
    - `submitReview(choice: CompanyChoice, fields: ReviewFields, photos: File[]): Promise<{ id: string }>`
    - `resubmitReview(id: string, fields: ReviewFields, photos: File[]): Promise<{ id: string }>`
    - `myReviews(): Promise<Array<{ id; status; rejectionReason; createdAt; company: { id; name } }>>`
    - `getReviewForEdit(id: string)` → รีวิว (ฟิลด์ฟอร์ม + `rejectionReason` + `company { id, name, address }`) หรือ `null`
    - `getCompanyForReview(id: string)` → `{ company: { id; name; address }, myReview: { id; status } | null } | null`
    - `findCompanyIdByPlace(placeId: string): Promise<string | null>`

- [ ] **Step 1: เปลี่ยนเทสต์ guard ใน DAL ให้ครอบหลายไฟล์ (ล้มเหลวก่อน)**

ใน `tests/route-guards.test.mjs` แทนเทสต์ `"ทุกฟังก์ชันใน data access layer เรียก guard เอง — layout ไม่ re-render ตอนเปลี่ยนหน้า"` ทั้งก้อนด้วย:

```js
// DAL ทุกไฟล์: ทุก export async function ต้องมีบรรทัด guard ระดับบนสุดของฟังก์ชันหนึ่งบรรทัด
const DAL = ["lib/companies.ts", "lib/reviews.ts"];
test("ทุกฟังก์ชันใน data access layer เรียก guard เอง — layout ไม่ re-render ตอนเปลี่ยนหน้า", () => {
  for (const file of DAL) {
    const src = existsSync(file) ? readFileSync(file, "utf8") : "";
    const fns = src.match(/^export async function/gm)?.length ?? 0;
    const guards = src.match(/^ {2}(?:const \w+ = )?await require(?:User|Role|Admin|SuperAdmin)\(/gm)?.length ?? 0;
    assert.ok(fns > 0, `ไม่พบฟังก์ชันใน ${file}`);
    assert.equal(guards, fns, file);
  }
});
```

Run: `node --test` → Expected: FAIL `ไม่พบฟังก์ชันใน lib/reviews.ts`

- [ ] **Step 2: เพิ่มใน `lib/validation.ts`**

เปลี่ยนบรรทัด import และ `companyIdSchema` เดิม:

```ts
import { z } from "zod";
import { DEPARTMENT_VALUES } from "./departments";
import { parseThaiDate, periodError, workTimeError } from "./review-rules";
```

```ts
/** id ใน URL — ไม่บังคับรูปแบบ cuid เพราะ seed ใช้ id อ่านง่าย (seed_c1) */
export const idSchema = z.string().min(1).max(64);
export const companyIdSchema = idSchema;
```

แล้วต่อท้ายไฟล์:

```ts
// ---------- ฟอร์มรีวิว (multipart → ทุกค่าเป็นสตริง) ----------

const checkbox = z.literal("on").optional().transform((v) => v === "on");

const optionalText = (max: number, label: string) =>
  z.string().trim().max(max, `${label}ต้องไม่เกิน ${max} ตัวอักษร`).optional().transform((s) => s || null);

const thaiDate = (label: string) =>
  z.string({ error: `เลือก${label}` }).transform((s, ctx) => {
    const d = parseThaiDate(s);
    if (!d) {
      ctx.addIssue({ code: "custom", message: `${label}ไม่ถูกต้อง` });
      return z.NEVER;
    }
    return d;
  });

const score = (label: string) =>
  z.coerce.number({ error: `ให้คะแนน${label}` }).int(`ให้คะแนน${label} 1–5`).min(1, `ให้คะแนน${label} 1–5`).max(5, `ให้คะแนน${label} 1–5`);

const workTime = z
  .string()
  .optional()
  .transform((s) => s || null)
  .refine((s) => s === null || /^([01]\d|2[0-3]):[0-5]\d$/.test(s), "เวลาต้องอยู่ในรูปแบบ ชม.:นาที");

const allowance = z
  .string()
  .optional()
  .transform((s, ctx) => {
    if (!s) return null;
    const n = Number(s);
    if (!Number.isInteger(n) || n < 0 || n > 10000) {
      ctx.addIssue({ code: "custom", message: "เบี้ยเลี้ยงต้องเป็นจำนวนเต็ม 0–10,000 บาท" });
      return z.NEVER;
    }
    return n;
  });

/** ช่องของรีวิว — ใช้ทั้งส่งใหม่และแก้ไข ชื่อฟิลด์ตรงกับคอลัมน์ของ Review */
export const reviewFieldsSchema = z
  .object({
    department: z.enum(DEPARTMENT_VALUES, { error: "เลือกแผนกวิชา" }),
    gender: z.enum(["MALE", "FEMALE", "PREFER_NOT"], { error: "เลือกเพศ" }),
    periodStart: thaiDate("วันเริ่มฝึก"),
    periodEnd: thaiDate("วันสิ้นสุดการฝึก"),
    dailyAllowance: allowance,
    hasAccommodation: checkbox,
    hasTransport: checkbox,
    workStartTime: workTime,
    workEndTime: workTime,
    scoreWork: score("ลักษณะงาน"),
    scoreEnv: score("สภาพแวดล้อม"),
    scoreMentor: score("พี่เลี้ยง"),
    scoreWelfare: score("เบี้ยเลี้ยงและสวัสดิการ"),
    textWork: z
      .string({ error: "เล่าลักษณะงานที่ได้ทำ" })
      .trim()
      .min(30, "เล่าลักษณะงานอย่างน้อย 30 ตัวอักษร")
      .max(1000, "ลักษณะงานต้องไม่เกิน 1,000 ตัวอักษร"),
    textPros: optionalText(500, "ข้อดี"),
    textCons: optionalText(500, "ข้อควรรู้"),
    textAdvice: optionalText(500, "คำแนะนำ"),
    isAnonymous: checkbox,
  })
  .superRefine((v, ctx) => {
    const period = periodError(v.periodStart, v.periodEnd, new Date());
    if (period) ctx.addIssue({ code: "custom", path: ["periodEnd"], message: period });
    const time = workTimeError(v.workStartTime, v.workEndTime);
    if (time) ctx.addIssue({ code: "custom", path: ["workEndTime"], message: time });
  });
export type ReviewFields = z.infer<typeof reviewFieldsSchema>;

/** รีวิวใหม่ต้องบอกว่ารีวิวบริษัทไหน — เลือกจากในระบบ จาก Google หรือกรอกเอง */
export const companyChoiceSchema = z.discriminatedUnion(
  "companyKind",
  [
    z.object({ companyKind: z.literal("existing"), companyId: idSchema }),
    z.object({
      companyKind: z.literal("place"),
      placeId: z.string().min(1).max(300),
      placeQuery: z.string().trim().min(2).max(100),
    }),
    z.object({
      companyKind: z.literal("new"),
      newName: z.string({ error: "กรอกชื่อสถานประกอบการ" }).trim().min(2, "กรอกชื่อสถานประกอบการ").max(150, "ชื่อยาวเกิน 150 ตัวอักษร"),
      newAddress: z.string({ error: "กรอกที่อยู่" }).trim().min(5, "กรอกที่อยู่ให้รุ่นน้องหาเจอ").max(300, "ที่อยู่ยาวเกิน 300 ตัวอักษร"),
    }),
  ],
  { error: "เลือกสถานประกอบการ" },
);
export type CompanyChoice = z.infer<typeof companyChoiceSchema>;

/** query string ของ /insights/write-review — ค่าผิดรูปแบบถูกเพิกเฉย */
export const writeReviewParamsSchema = z.object({
  q: z.string().trim().transform((s) => s.slice(0, 100)).catch(""),
  company: idSchema.optional().catch(undefined),
  place: z.string().min(1).max(300).optional().catch(undefined),
  new: z.literal("1").optional().catch(undefined),
  edit: idSchema.optional().catch(undefined),
});
```

- [ ] **Step 3: สร้าง `lib/cloudinary.ts`**

```ts
import { v2 as cloudinary } from "cloudinary";

// อัปโหลดรูปจากฝั่งเซิร์ฟเวอร์เท่านั้น คีย์อยู่ใน env (ห้าม NEXT_PUBLIC_)
// ไม่มีคีย์ครบ = ปิดการแนบรูป ฟอร์มซ่อนช่อง และ DAL ปฏิเสธไฟล์ที่ส่งมา

export const uploadsEnabled = () =>
  Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

/** คืน secure_url · ย่อด้านยาวไม่เกิน 1600px ที่ Cloudinary — ชนิดและขนาดไฟล์ตรวจแล้วก่อนเรียก (photoError) */
export async function uploadImage(file: File, folder: string): Promise<string> {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  const bytes = Buffer.from(await file.arrayBuffer());
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { folder, resource_type: "image", transformation: [{ width: 1600, height: 1600, crop: "limit", quality: "auto" }] },
        (err, res) => (err || !res ? reject(err ?? new Error("Cloudinary upload failed")) : resolve(res.secure_url)),
      )
      .end(bytes);
  });
}
```

- [ ] **Step 4: สร้าง `lib/reviews.ts`**

```ts
import { Prisma } from "@/app/generated/prisma/client";
import { requireRole, requireUser } from "./auth";
import { uploadImage, uploadsEnabled } from "./cloudinary";
import { db } from "./db";
import { findPlace } from "./places";
import { canEditReview, overallScore, photoError } from "./review-rules";
import type { CompanyChoice, ReviewFields } from "./validation";

// ทุกฟังก์ชัน export async เริ่มด้วย guard เอง (เหตุผลเดียวกับ lib/companies.ts) — tests/route-guards.test.mjs ตรวจ
// รีวิวที่ส่งใหม่และที่แก้แล้วเป็น PENDING เสมอ — หลักการโดเมนข้อ 1

/** ข้อผิดพลาดที่ผู้ใช้แก้ได้ — lib/review-request.ts แปลงเป็น JSON ตาม status */
export class ReviewError extends Error {
  status: 400 | 404 | 409;
  constructor(status: 400 | 404 | 409, message: string) {
    super(message);
    this.status = status;
  }
}

const ALREADY_REVIEWED = "คุณรีวิวสถานประกอบการนี้แล้ว ดูสถานะได้ที่หน้าโปรไฟล์";
const PHOTO_FOLDER = "htc-insights/reviews";

const isPrismaError = (e: unknown, code: string) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === code;

function checkPhotos(photos: File[]) {
  if (photos.length > 0 && !uploadsEnabled()) throw new ReviewError(400, "ระบบยังไม่เปิดให้แนบรูป");
  const err = photoError(photos);
  if (err) throw new ReviewError(400, err);
}

// ponytail: อัปโหลดก่อนเขียนฐานข้อมูล ถ้าทรานแซกชันล้ม รูปจะค้างใน Cloudinary — เก็บกวาดเมื่อพบว่าเกิดบ่อย
const uploadAll = (photos: File[]) => Promise.all(photos.map((p) => uploadImage(p, PHOTO_FOLDER)));

const reviewData = (f: ReviewFields) => ({ ...f, scoreOverall: overallScore(f) });

type CompanyTarget = { id: string } | { create: Prisma.CompanyCreateInput };

/** บริษัทที่จะผูกรีวิว — สร้างจริงในทรานแซกชันเดียวกับรีวิว */
async function companyTarget(choice: CompanyChoice): Promise<CompanyTarget> {
  if (choice.companyKind === "existing") {
    const c = await db.company.findUnique({ where: { id: choice.companyId }, select: { id: true } });
    if (!c) throw new ReviewError(404, "ไม่พบสถานประกอบการ");
    return c;
  }
  if (choice.companyKind === "new") return { create: { name: choice.newName, address: choice.newAddress } };
  const place = await findPlace(choice.placeQuery, choice.placeId);
  if (!place) throw new ReviewError(400, "ไม่พบสถานที่ที่เลือก ค้นหาแล้วเลือกใหม่อีกครั้ง");
  const { placeId, ...rest } = place;
  return { create: { ...rest, googlePlaceId: placeId } };
}

export async function submitReview(choice: CompanyChoice, fields: ReviewFields, photos: File[]): Promise<{ id: string }> {
  const user = await requireRole("STUDENT");
  checkPhotos(photos);
  const target = await companyTarget(choice);
  // เช็คก่อนอัปโหลดรูปเพื่อไม่ทิ้งรูปค้าง — ตัวตัดสินจริงคือ @@unique ที่จับ P2002 ข้างล่าง
  if ("id" in target) {
    const mine = await db.review.findUnique({ where: { companyId_userId: { companyId: target.id, userId: user.id } }, select: { id: true } });
    if (mine) throw new ReviewError(409, ALREADY_REVIEWED);
  }
  const urls = await uploadAll(photos);
  try {
    return await db.$transaction(async (tx) => {
      const companyId =
        "id" in target
          ? target.id
          : target.create.googlePlaceId
            ? // สองคนเลือกสถานที่เดียวกันพร้อมกัน — upsert ด้วย unique ไม่สร้างซ้ำ
              (await tx.company.upsert({ where: { googlePlaceId: target.create.googlePlaceId }, create: target.create, update: {}, select: { id: true } })).id
            : (await tx.company.create({ data: target.create, select: { id: true } })).id;
      return tx.review.create({
        data: { ...reviewData(fields), companyId, userId: user.id, photos: { create: urls.map((url) => ({ url })) } },
        select: { id: true },
      });
    });
  } catch (e) {
    if (isPrismaError(e, "P2002")) throw new ReviewError(409, ALREADY_REVIEWED);
    throw e;
  }
}

export async function resubmitReview(id: string, fields: ReviewFields, photos: File[]): Promise<{ id: string }> {
  const user = await requireRole("STUDENT");
  const review = await db.review.findUnique({ where: { id }, select: { userId: true, status: true } });
  // ไม่แยกว่า "ไม่มี" กับ "มีแต่แก้ไม่ได้" — ไม่ให้เดา id รีวิวของคนอื่น
  if (!review || !canEditReview(review, user.id)) throw new ReviewError(404, "ไม่พบรีวิวที่แก้ไขได้");
  checkPhotos(photos);
  const urls = await uploadAll(photos);
  try {
    await db.$transaction(async (tx) => {
      if (urls.length > 0) await tx.reviewPhoto.deleteMany({ where: { reviewId: id } });
      // where ซ้ำเงื่อนไข canEditReview ที่ฐานข้อมูล — ถ้าผู้ดูแลเปลี่ยนสถานะระหว่างนั้นจะ P2025 ไม่เขียนทับ
      await tx.review.update({
        where: { id, userId: user.id, status: "REJECTED" },
        data: { ...reviewData(fields), status: "PENDING", rejectionReason: null, photos: { create: urls.map((url) => ({ url })) } },
      });
    });
  } catch (e) {
    if (isPrismaError(e, "P2025")) throw new ReviewError(404, "ไม่พบรีวิวที่แก้ไขได้");
    throw e;
  }
  return { id };
}

/** รีวิวทุกสถานะของผู้ใช้เอง — ให้ติดตามผลการตรวจ */
export async function myReviews() {
  const user = await requireUser();
  return db.review.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true, rejectionReason: true, createdAt: true, company: { select: { id: true, name: true } } },
  });
}

export async function getReviewForEdit(id: string) {
  const user = await requireRole("STUDENT");
  const r = await db.review.findUnique({
    where: { id },
    select: {
      userId: true,
      status: true,
      rejectionReason: true,
      department: true,
      gender: true,
      periodStart: true,
      periodEnd: true,
      dailyAllowance: true,
      hasAccommodation: true,
      hasTransport: true,
      workStartTime: true,
      workEndTime: true,
      scoreWork: true,
      scoreEnv: true,
      scoreMentor: true,
      scoreWelfare: true,
      textWork: true,
      textPros: true,
      textCons: true,
      textAdvice: true,
      isAnonymous: true,
      company: { select: { id: true, name: true, address: true } },
    },
  });
  if (!r || !canEditReview(r, user.id)) return null;
  return r;
}

/** บริษัทที่จะรีวิว + รีวิวเดิมของผู้ใช้ที่บริษัทนี้ (ถ้ามี) */
export async function getCompanyForReview(id: string) {
  const user = await requireRole("STUDENT");
  const c = await db.company.findUnique({
    where: { id },
    select: { id: true, name: true, address: true, reviews: { where: { userId: user.id }, select: { id: true, status: true } } },
  });
  if (!c) return null;
  const { reviews, ...company } = c;
  return { company, myReview: reviews[0] ?? null };
}

/** สถานที่จาก Google ที่เคยถูกสร้างเป็นบริษัทแล้ว */
export async function findCompanyIdByPlace(placeId: string): Promise<string | null> {
  await requireRole("STUDENT");
  const c = await db.company.findUnique({ where: { googlePlaceId: placeId }, select: { id: true } });
  return c?.id ?? null;
}
```

- [ ] **Step 5: รันเทสต์และตรวจ type**

Run: `node --test` → Expected: PASS ทั้งหมด (รวมเทสต์ guard ที่ตอนนี้ครอบ `lib/reviews.ts`)
Run: `npx tsc --noEmit` → Expected: ไม่มี error

- [ ] **Step 6: Checkpoint** — ห้าม commit

---

### Task 5: Route Handlers `POST /api/reviews` และ `PUT /api/reviews/[id]`

**Files:**
- Create: `lib/review-request.ts`, `app/api/reviews/route.ts`, `app/api/reviews/[id]/route.ts`
- Modify: `tests/route-guards.test.mjs`

**Interfaces:**
- Consumes: `requireRole` · `splitReviewForm` · `reviewFieldsSchema`, `companyChoiceSchema`, `idSchema`, `ReviewFields` · `submitReview`, `resubmitReview`, `ReviewError`
- Produces:
  - `POST /api/reviews` (multipart) → `201 { id }` | `400/404/409 { error }` | 401/403
  - `PUT /api/reviews/:id` (multipart, ไม่มีช่องบริษัท) → `200 { id }` | `400/404 { error }` | 401/403
  - ชื่อช่องในฟอร์ม: `companyKind` `companyId` `placeId` `placeQuery` `newName` `newAddress` + ทุกคีย์ของ `reviewFieldsSchema` + `photos` (ไฟล์ ซ้ำได้)

- [ ] **Step 1: เพิ่มเทสต์ guard ของ Route Handler (ล้มเหลวก่อน)** — ต่อท้าย `tests/route-guards.test.mjs`

```js
import { readdirSync } from "node:fs";

test("ทุก Route Handler ใน app/api (ยกเว้น auth ของ Auth.js) เรียก guard เป็นบรรทัดแรก", () => {
  const files = readdirSync("app/api", { recursive: true })
    .map((f) => `app/api/${String(f).replaceAll("\\", "/")}`)
    .filter((f) => f.endsWith("/route.ts") && !f.startsWith("app/api/auth/"));
  assert.ok(files.length > 0, "ไม่พบ Route Handler");
  for (const file of files) {
    const src = readFileSync(file, "utf8");
    const all = src.match(/^export async function (?:GET|POST|PUT|PATCH|DELETE)\b/gm)?.length ?? 0;
    const guarded = src.match(/^export async function (?:GET|POST|PUT|PATCH|DELETE)\b[^\n]*\{\n {2}await require\w+\(/gm)?.length ?? 0;
    assert.ok(all > 0, file);
    assert.equal(guarded, all, file);
  }
});
```

(ย้าย `import { readdirSync } from "node:fs";` ไปรวมกับ import ของ `node:fs` เดิมบนสุดของไฟล์: `import { existsSync, readFileSync, readdirSync } from "node:fs";`)

Run: `node --test` → Expected: FAIL `ไม่พบ Route Handler`

- [ ] **Step 2: สร้าง `lib/review-request.ts`**

```ts
import { ReviewError } from "./reviews";
import { splitReviewForm } from "./review-rules";
import { reviewFieldsSchema, type ReviewFields } from "./validation";

// ส่วนที่ POST และ PUT ของ /api/reviews ใช้ร่วมกัน — ไม่มี guard เพราะ route เรียก guard ก่อนแล้ว

export const badRequest = (error: string) => Response.json({ error }, { status: 400 });

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

/** ReviewError → JSON · อย่างอื่นโยนต่อ (รวม unauthorized()/forbidden() ของ Next ที่ต้องโยนผ่าน) */
export function reviewErrorResponse(e: unknown): Response {
  if (e instanceof ReviewError) return Response.json({ error: e.message }, { status: e.status });
  throw e;
}
```

- [ ] **Step 3: สร้าง `app/api/reviews/route.ts`**

```ts
import { requireRole } from "@/lib/auth";
import { badRequest, readReviewForm, reviewErrorResponse } from "@/lib/review-request";
import { submitReview } from "@/lib/reviews";
import { companyChoiceSchema } from "@/lib/validation";

export async function POST(req: Request) {
  await requireRole("STUDENT");
  const form = await readReviewForm(req);
  if (form instanceof Response) return form;
  const choice = companyChoiceSchema.safeParse(form.fields);
  if (!choice.success) return badRequest(choice.error.issues[0].message);
  try {
    return Response.json(await submitReview(choice.data, form.data, form.photos), { status: 201 });
  } catch (e) {
    return reviewErrorResponse(e);
  }
}
```

- [ ] **Step 4: สร้าง `app/api/reviews/[id]/route.ts`**

```ts
import { requireRole } from "@/lib/auth";
import { readReviewForm, reviewErrorResponse } from "@/lib/review-request";
import { resubmitReview } from "@/lib/reviews";
import { idSchema } from "@/lib/validation";

/** แก้รีวิวที่ถูกปฏิเสธแล้วส่งใหม่ — กลับเป็น PENDING */
export async function PUT(req: Request, ctx: RouteContext<"/api/reviews/[id]">) {
  await requireRole("STUDENT");
  const id = idSchema.safeParse((await ctx.params).id);
  if (!id.success) return Response.json({ error: "ไม่พบรีวิวที่แก้ไขได้" }, { status: 404 });
  const form = await readReviewForm(req);
  if (form instanceof Response) return form;
  try {
    return Response.json(await resubmitReview(id.data, form.data, form.photos));
  } catch (e) {
    return reviewErrorResponse(e);
  }
}
```

- [ ] **Step 5: รันเทสต์และตรวจ type**

Run: `node --test` → Expected: PASS ทั้งหมด
Run: `npx tsc --noEmit` → Expected: ไม่มี error (ถ้า `RouteContext` ยังไม่รู้จัก ให้รอ dev server สร้าง type ใน `.next/dev/types` หรือรัน `npx next typegen` แล้วลองใหม่)

- [ ] **Step 6: เปิด dev server และสร้าง session ทดสอบของ `seed_u3`**

`preview_start` ชื่อ `next-dev` แล้ว `npx prisma db seed` (รีเซ็ต `seed_r3` เป็น REJECTED) แล้ว:

```bash
npx prisma db execute --stdin <<'EOF'
INSERT OR REPLACE INTO "Session" (id, sessionToken, userId, expires)
VALUES ('dev_s_p3', 'dev-p3', 'seed_u3', '2099-01-01T00:00:00.000Z');
EOF
```

Expected: `Script executed successfully.` (ลบใน Task 8)

- [ ] **Step 7: ตรวจ API ด้วยสคริปต์**

เขียนไฟล์ `$TEMP/phase3-api.mjs` (นอก repo ภาษาไทยอยู่ในไฟล์ จึงไม่โดนปัญหา argv):

```js
const BASE = "http://localhost:3000";
const COOKIE = "authjs.session-token=dev-p3";
const base = {
  department: "แผนกวิชาช่างยนต์",
  gender: "PREFER_NOT",
  periodStart: "2026-05-01",
  periodEnd: "2026-09-30",
  dailyAllowance: "200",
  hasTransport: "on",
  workStartTime: "08:00",
  workEndTime: "17:00",
  scoreWork: "4",
  scoreEnv: "3",
  scoreMentor: "5",
  scoreWelfare: "3",
  textWork: "ช่วยจัดสต็อกสินค้าและขับรถยกในคลังสินค้า ได้เรียนรู้ระบบคลังจริง",
};
const onC4 = { ...base, companyKind: "existing", companyId: "seed_c4" };
const onC6 = { ...base, companyKind: "existing", companyId: "seed_c6" };
const png = () => new File([new Uint8Array(10)], "a.png", { type: "image/png" });
const empty = () => new File([], "", { type: "application/octet-stream" });

async function send(method, path, fields, { cookie = COOKIE, files = [], raw } = {}) {
  let body = raw;
  if (!raw) {
    body = new FormData();
    for (const [k, v] of Object.entries(fields)) body.append(k, v);
    for (const f of files) body.append("photos", f);
  }
  const res = await fetch(BASE + path, { method, body, headers: cookie ? { cookie } : {}, redirect: "manual" });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, error: json?.error ?? "", id: json?.id ?? "" };
}

const cases = [
  ["guest", () => send("POST", "/api/reviews", onC4, { cookie: "" }), 401],
  ["ส่งใหม่ถูกต้อง", () => send("POST", "/api/reviews", onC4), 201],
  ["บริษัทเดิมซ้ำ", () => send("POST", "/api/reviews", onC4), 409],
  ["30 ก.พ.", () => send("POST", "/api/reviews", { ...onC6, periodStart: "2026-02-30" }), 400],
  ["สิ้นสุดก่อนเริ่ม", () => send("POST", "/api/reviews", { ...onC6, periodEnd: "2026-04-01" }), 400],
  ["เริ่มในอนาคต", () => send("POST", "/api/reviews", { ...onC6, periodStart: "2099-01-01", periodEnd: "2099-02-01" }), 400],
  ["เวลางานไม่ครบ", () => send("POST", "/api/reviews", { ...onC6, workEndTime: "" }), 400],
  ["ลักษณะงานสั้น", () => send("POST", "/api/reviews", { ...onC6, textWork: "สั้นไป" }), 400],
  ["คะแนน 6", () => send("POST", "/api/reviews", { ...onC6, scoreWork: "6" }), 400],
  ["ส่ง scoreOverall มาเอง ถูกเพิกเฉย (ดู DB)", () => send("POST", "/api/reviews", { ...onC6, scoreOverall: "5", textWork: base.textWork + " P3OVERALL" }), 201],
  ["แนบรูปตอนไม่มีคีย์", () => send("POST", "/api/reviews", { ...base, companyKind: "new", newName: "บริษัท P3TEST รูป จำกัด", newAddress: "ถ.ทดสอบ อ.หาดใหญ่" }, { files: [png()] }), 400],
  ["กรอกเอง + ไฟล์ว่าง", () => send("POST", "/api/reviews", { ...base, companyKind: "new", newName: "บริษัท P3TEST จำกัด", newAddress: "ถ.ทดสอบ อ.หาดใหญ่" }, { files: [empty()] }), 201],
  ["กรอกเองไม่มีที่อยู่", () => send("POST", "/api/reviews", { ...base, companyKind: "new", newName: "บริษัท P3TEST สอง จำกัด" }), 400],
  ["place ตอนไม่มีคีย์", () => send("POST", "/api/reviews", { ...base, companyKind: "place", placeId: "ChIJx", placeQuery: "ทดสอบ" }), 400],
  ["บริษัทไม่มีจริง", () => send("POST", "/api/reviews", { ...base, companyKind: "existing", companyId: "nope" }), 404],
  ["ไม่บอกบริษัท", () => send("POST", "/api/reviews", base), 400],
  ["body ไม่ใช่ multipart", () => send("POST", "/api/reviews", null, { raw: JSON.stringify(onC4) }), 400],
  ["แก้รีวิวที่ถูกปฏิเสธของตัวเอง", () => send("PUT", "/api/reviews/seed_r3", base), 200],
  ["แก้ซ้ำ (ตอนนี้ PENDING)", () => send("PUT", "/api/reviews/seed_r3", base), 404],
  ["แก้รีวิวของคนอื่น", () => send("PUT", "/api/reviews/seed_r1", base), 404],
  ["แก้ id ไม่มีจริง", () => send("PUT", "/api/reviews/nope", base), 404],
];

let fail = 0;
for (const [name, run, want] of cases) {
  const r = await run();
  const ok = r.status === want;
  if (!ok) fail++;
  console.log(`${ok ? "ok  " : "FAIL"} ${String(r.status).padEnd(4)} (want ${want}) ${name}${r.error ? " — " + r.error : ""}`);
}
console.log(fail ? `${fail} FAILED` : "all passed");
```

Run: `node "$TEMP/phase3-api.mjs"`
Expected: ทุกแถว `ok` และบรรทัดท้าย `all passed` · แถว 400/404/409 มีข้อความ error ภาษาไทย (ไม่ใช่ข้อความภาษาอังกฤษของ zod)

- [ ] **Step 8: ตรวจในฐานข้อมูล**

```bash
q() { node -e 'const D=require(process.cwd()+"/node_modules/@prisma/adapter-better-sqlite3/node_modules/better-sqlite3");console.table(new D("prisma/dev.db",{readonly:true}).prepare(process.argv[1]).all())' "$1"; }
q "SELECT r.id, c.id AS company, r.status, r.scoreOverall, r.rejectionReason IS NULL AS noReason, (SELECT count(*) FROM ReviewPhoto p WHERE p.reviewId=r.id) AS photos FROM Review r JOIN Company c ON c.id=r.companyId WHERE r.userId='seed_u3' ORDER BY r.createdAt"
q "SELECT id, isVerified, googlePlaceId, address FROM Company WHERE name LIKE '%P3TEST%'"
```

Expected:
- แถวของ `seed_u3`: `seed_r3` (`PENDING`, `scoreOverall` 3.75, `noReason` 1) + รีวิวใหม่ 3 แถวบน `seed_c4`, `seed_c6`, บริษัท P3TEST — ทุกแถว `PENDING`, `scoreOverall` 3.75 (ไม่ใช่ 5 ที่ส่งมา), `photos` 0
- บริษัท P3TEST หนึ่งแถว `isVerified` 0, `googlePlaceId` null, มีที่อยู่ (ไม่มีแถว "P3TEST รูป" หรือ "P3TEST สอง")

- [ ] **Step 9: Checkpoint** — ห้าม commit (ข้อมูลทดสอบเก็บไว้ใช้ต่อใน Task 7 ลบใน Task 8)

---

### Task 6: หน้าเลือกบริษัทและฟอร์มรีวิว

**Files:**
- Create: `components/ReviewForm.tsx`
- Modify (เขียนใหม่): `app/insights/write-review/page.tsx`

**Interfaces:**
- Consumes: `requireRole` · `uploadsEnabled` · `listCompanies` · `placesEnabled`, `searchPlaces`, `findPlace` · `toThaiDateInput`, `overallScore`, `MAX_PHOTOS`, `PHOTO_TYPES` · `getCompanyForReview`, `getReviewForEdit`, `findCompanyIdByPlace` · `writeReviewParamsSchema` · `DEPARTMENTS` · `PageShell`, `EmptyState`, `Card`, `Button`, `buttonClass`, `TextField`, `Icon`
- Produces: `ReviewForm` ส่งไป `POST /api/reviews` หรือ `PUT /api/reviews/:id` สำเร็จแล้วไป `/profile?sent=1` (Task 7 แสดงแถบยืนยัน)

- [ ] **Step 1: สร้าง `components/ReviewForm.tsx`**

ฟอร์มเดียว 5 ขั้น ทุกช่องอยู่ใน DOM ตลอด (ขั้นที่ไม่ได้แสดงใช้ `hidden`) จึงส่งด้วย `new FormData(form)` ได้ครบ ตรวจทีละขั้นด้วย validation ของเบราว์เซอร์ เซิร์ฟเวอร์ตรวจซ้ำทั้งหมด

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { DEPARTMENTS } from "@/lib/departments";
import { MAX_PHOTOS, PHOTO_TYPES, overallScore } from "@/lib/review-rules";

export type CompanyPick =
  | { kind: "existing"; id: string }
  | { kind: "place"; placeId: string; query: string }
  | { kind: "new" };

/** ค่าเริ่มต้นตอนแก้รีวิวที่ถูกปฏิเสธ — วันที่เป็น "YYYY-MM-DD" แล้ว */
export type ReviewDefaults = {
  department: string;
  gender: string;
  periodStart: string;
  periodEnd: string;
  dailyAllowance: string;
  hasAccommodation: boolean;
  hasTransport: boolean;
  workStartTime: string;
  workEndTime: string;
  scoreWork: number;
  scoreEnv: number;
  scoreMentor: number;
  scoreWelfare: number;
  textWork: string;
  textPros: string;
  textCons: string;
  textAdvice: string;
  isAnonymous: boolean;
};

const STEPS = ["ช่วงฝึกงาน", "คะแนน 4 ด้าน", "เบี้ยเลี้ยงและเวลางาน", "เล่าประสบการณ์", "ตรวจและส่ง"];

const SCORES = [
  { name: "scoreWork", label: "ลักษณะงาน", hint: "ตรงสาขา ได้ลงมือทำจริง" },
  { name: "scoreEnv", label: "สภาพแวดล้อม", hint: "สถานที่ เพื่อนร่วมงาน ความปลอดภัย" },
  { name: "scoreMentor", label: "พี่เลี้ยง", hint: "สอนงาน ดูแล ให้คำแนะนำ" },
  { name: "scoreWelfare", label: "เบี้ยเลี้ยงและสวัสดิการ", hint: "เบี้ยเลี้ยง ที่พัก รถรับส่ง" },
] as const;
type ScoreName = (typeof SCORES)[number]["name"];

const GENDERS = [
  ["MALE", "ชาย"],
  ["FEMALE", "หญิง"],
  ["PREFER_NOT", "ไม่ระบุ"],
] as const;

// วันนี้ตามเวลาไทย ในรูปแบบของ <input type="date">
const todayThai = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });

type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export function ReviewForm({
  company,
  editId,
  defaults = {},
  uploadsEnabled,
}: {
  company: CompanyPick;
  editId?: string;
  defaults?: Partial<ReviewDefaults>;
  uploadsEnabled: boolean;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState(0);
  const [scores, setScores] = useState<Record<ScoreName, number>>({
    scoreWork: defaults.scoreWork ?? 0,
    scoreEnv: defaults.scoreEnv ?? 0,
    scoreMentor: defaults.scoreMentor ?? 0,
    scoreWelfare: defaults.scoreWelfare ?? 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const last = STEPS.length - 1;

  const fieldsOf = (i: number) =>
    Array.from(formRef.current?.querySelectorAll<Field>(`[data-step="${i}"] :is(input, select, textarea)`) ?? []);

  function next() {
    // every หยุดที่ช่องแรกที่ผิด — เบราว์เซอร์แสดงข้อความของมันที่ช่องนั้น
    if (fieldsOf(step).every((f) => f.reportValidity())) {
      setError(null);
      setStep(step + 1);
    }
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // กด Enter ในช่องข้อความ = ไปขั้นถัดไป ไม่ใช่ส่ง
    if (step < last) return next();
    // ขั้นก่อนหน้าตรวจไปแล้ว แต่ผู้ใช้อาจย้อนไปแก้ — ตรวจทุกขั้นอีกรอบ
    const bad = STEPS.findIndex((_, i) => !fieldsOf(i).every((f) => f.checkValidity()));
    if (bad !== -1) {
      setStep(bad);
      setError(`กรอกขั้นที่ ${bad + 1} (${STEPS[bad]}) ให้ครบก่อนส่ง`);
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await fetch(editId ? `/api/reviews/${editId}` : "/api/reviews", {
        method: editId ? "PUT" : "POST",
        body: new FormData(e.currentTarget),
      });
      if (res.ok) {
        router.push("/profile?sent=1");
        return;
      }
      const body: { error?: string } | null = await res.json().catch(() => null);
      setError(body?.error ?? "ส่งไม่สำเร็จ ลองอีกครั้ง");
    } catch {
      setError("เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง");
    }
    setSending(false);
  }

  const allScored = Object.values(scores).every((n) => n > 0);

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="flex max-w-2xl flex-col gap-6">
      {company.kind === "existing" && (
        <>
          <input type="hidden" name="companyKind" value="existing" />
          <input type="hidden" name="companyId" value={company.id} />
        </>
      )}
      {company.kind === "place" && (
        <>
          <input type="hidden" name="companyKind" value="place" />
          <input type="hidden" name="placeId" value={company.placeId} />
          <input type="hidden" name="placeQuery" value={company.query} />
        </>
      )}
      {company.kind === "new" && <input type="hidden" name="companyKind" value="new" />}

      <p className="text-small text-ink-muted" aria-live="polite">
        {`ขั้นที่ ${step + 1} จาก ${STEPS.length} · ${STEPS[step]}`}
      </p>

      <Step i={0} step={step}>
        {company.kind === "new" && (
          <>
            <TextField name="newName" label="ชื่อสถานประกอบการ" required minLength={2} maxLength={150} />
            <TextField name="newAddress" label="ที่อยู่" required minLength={5} maxLength={300} hint="ถนน อำเภอ จังหวัด ให้รุ่นน้องหาเจอ" />
          </>
        )}
        <Select name="department" label="แผนกวิชา" required defaultValue={defaults.department ?? ""}>
          <option value="" disabled>
            เลือกแผนก
          </option>
          {DEPARTMENTS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </Select>
        <Select name="gender" label="เพศ" required defaultValue={defaults.gender ?? "PREFER_NOT"}>
          {GENDERS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField type="date" name="periodStart" label="วันเริ่มฝึก" required max={todayThai()} defaultValue={defaults.periodStart} />
          <TextField type="date" name="periodEnd" label="วันสิ้นสุดการฝึก" required defaultValue={defaults.periodEnd} />
        </div>
      </Step>

      <Step i={1} step={step}>
        {SCORES.map((s) => (
          <fieldset key={s.name} className="flex min-w-0 flex-col gap-2">
            <legend className="mb-2">
              {s.label} <span className="text-small text-ink-muted">· {s.hint}</span>
            </legend>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className="flex-1">
                  <input
                    type="radio"
                    name={s.name}
                    value={n}
                    required
                    defaultChecked={defaults[s.name] === n}
                    onChange={() => setScores((v) => ({ ...v, [s.name]: n }))}
                    className="peer sr-only"
                  />
                  <span className="flex h-11 cursor-pointer items-center justify-center rounded-md border border-line peer-checked:border-signal peer-checked:bg-signal peer-checked:text-on-signal peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-signal">
                    {n}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
        <p className="text-small text-ink-muted">
          {`คะแนนรวม (ระบบคำนวณจากค่าเฉลี่ย 4 ด้าน): ${allScored ? overallScore(scores).toFixed(2) : "–"}`}
        </p>
      </Step>

      <Step i={2} step={step}>
        <TextField
          type="number"
          name="dailyAllowance"
          label="เบี้ยเลี้ยงต่อวัน (บาท)"
          hint="ใส่ 0 ถ้าไม่ได้รับ เว้นว่างถ้าจำไม่ได้"
          min={0}
          max={10000}
          step={1}
          inputMode="numeric"
          defaultValue={defaults.dailyAllowance}
        />
        <Check name="hasAccommodation" label="มีที่พักให้" defaultChecked={defaults.hasAccommodation} />
        <Check name="hasTransport" label="มีรถรับส่ง" defaultChecked={defaults.hasTransport} />
        <div className="grid grid-cols-2 gap-4">
          <TextField type="time" name="workStartTime" label="เวลาเข้างาน" defaultValue={defaults.workStartTime} />
          <TextField type="time" name="workEndTime" label="เวลาเลิกงาน" defaultValue={defaults.workEndTime} />
        </div>
      </Step>

      <Step i={3} step={step}>
        <Area
          name="textWork"
          label="ลักษณะงานที่ได้ทำ"
          hint="อย่างน้อย 30 ตัวอักษร เล่าว่าทำอะไรบ้างในแต่ละวัน"
          required
          minLength={30}
          maxLength={1000}
          defaultValue={defaults.textWork}
        />
        <Area name="textPros" label="ข้อดี" maxLength={500} defaultValue={defaults.textPros} />
        <Area name="textCons" label="ข้อควรรู้" maxLength={500} defaultValue={defaults.textCons} />
        <Area name="textAdvice" label="คำแนะนำถึงรุ่นน้อง" maxLength={500} defaultValue={defaults.textAdvice} />
      </Step>

      <Step i={4} step={step}>
        {uploadsEnabled && (
          <div className="kn-field">
            <label className="kn-field-label" htmlFor="photos">
              {`รูปประกอบ (ไม่เกิน ${MAX_PHOTOS} รูป ไฟล์ละไม่เกิน 5 MB)`}
            </label>
            <input
              id="photos"
              name="photos"
              type="file"
              multiple
              accept={PHOTO_TYPES.join(",")}
              className="kn-input h-auto py-2"
              onChange={(e) => {
                const files = e.currentTarget.files;
                e.currentTarget.setCustomValidity(files && files.length > MAX_PHOTOS ? `เลือกได้ไม่เกิน ${MAX_PHOTOS} รูป` : "");
              }}
            />
            {editId && <p className="kn-field-hint">แนบใหม่จะแทนที่รูปเดิมทั้งหมด ไม่แนบ = ใช้รูปเดิม</p>}
          </div>
        )}
        <Check name="isAnonymous" label="ไม่แสดงชื่อของฉันในรีวิวนี้" defaultChecked={defaults.isAnonymous} />
        <p className="text-small text-ink-muted">
          ผู้ดูแลยังเห็นว่าใครเขียนเพื่อตรวจสอบได้ แต่ชื่อจะไม่แสดงต่อผู้ใช้คนอื่น รีวิวจะเผยแพร่หลังผู้ดูแลตรวจแล้ว
        </p>
      </Step>

      {error && (
        <p role="alert" className="text-small text-danger">
          {error}
        </p>
      )}

      <div className="flex justify-between gap-4">
        {step > 0 ? <Button onClick={() => setStep(step - 1)}>ย้อนกลับ</Button> : <span />}
        {step < last ? (
          <Button key="next" variant="primary" onClick={next}>
            ถัดไป
          </Button>
        ) : (
          <Button key="submit" type="submit" variant="primary" disabled={sending}>
            {sending ? "กำลังส่ง…" : editId ? "ส่งรีวิวอีกครั้ง" : "ส่งรีวิว"}
          </Button>
        )}
      </div>
    </form>
  );
}

function Step({ i, step, children }: { i: number; step: number; children: ReactNode }) {
  return (
    <fieldset data-step={i} hidden={step !== i} className="flex min-w-0 flex-col gap-4">
      <legend className="sr-only">{STEPS[i]}</legend>
      {children}
    </fieldset>
  );
}

function Select({ label, name, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; name: string }) {
  return (
    <div className="kn-field">
      <label className="kn-field-label" htmlFor={name}>
        {label}
      </label>
      <select id={name} name={name} className="kn-input" {...rest}>
        {children}
      </select>
    </div>
  );
}

function Area({ label, hint, name, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string; name: string }) {
  return (
    <div className="kn-field">
      <label className="kn-field-label" htmlFor={name}>
        {label}
      </label>
      <textarea id={name} name={name} rows={4} className="kn-input h-auto py-3" aria-describedby={hint ? `${name}-hint` : undefined} {...rest} />
      {hint && (
        <p className="kn-field-hint" id={`${name}-hint`}>
          {hint}
        </p>
      )}
    </div>
  );
}

function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex min-h-11 items-center gap-3">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="size-5 accent-[var(--signal)]" />
      {label}
    </label>
  );
}
```

- [ ] **Step 2: เขียน `app/insights/write-review/page.tsx` ใหม่**

```tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { PageShell } from "@/components/PageShell";
import { ReviewForm, type ReviewDefaults } from "@/components/ReviewForm";
import { Button, buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { TextField } from "@/components/ui/TextField";
import { requireRole } from "@/lib/auth";
import { uploadsEnabled } from "@/lib/cloudinary";
import { listCompanies } from "@/lib/companies";
import { findPlace, placesEnabled, searchPlaces } from "@/lib/places";
import { toThaiDateInput } from "@/lib/review-rules";
import { findCompanyIdByPlace, getCompanyForReview, getReviewForEdit } from "@/lib/reviews";
import { writeReviewParamsSchema } from "@/lib/validation";

export default async function WriteReviewPage({ searchParams }: PageProps<"/insights/write-review">) {
  // layout ยอม ADMIN ด้วย แต่การเขียนรีวิวเป็นของนักศึกษาเท่านั้น
  await requireRole("STUDENT");
  const p = writeReviewParamsSchema.parse(await searchParams);
  const uploads = uploadsEnabled();

  if (p.edit) {
    const r = await getReviewForEdit(p.edit);
    if (!r) notFound();
    return (
      <PageShell eyebrow="แก้ไขรีวิวที่ไม่ผ่านการตรวจ" title={r.company.name} lede={`เหตุผลจากผู้ดูแล: ${r.rejectionReason ?? "ไม่ระบุ"}`}>
        <ReviewForm company={{ kind: "existing", id: r.company.id }} editId={p.edit} defaults={toDefaults(r)} uploadsEnabled={uploads} />
      </PageShell>
    );
  }

  if (p.company) {
    const found = await getCompanyForReview(p.company);
    if (!found) notFound();
    const { company, myReview } = found;
    if (myReview) {
      return (
        <PageShell eyebrow="เขียนรีวิว" title={company.name}>
          <EmptyState icon="task_alt" title="คุณรีวิวที่นี่แล้ว">
            {myReview.status === "REJECTED" ? (
              <Link href={`/insights/write-review?edit=${myReview.id}`} className="kn-link">
                รีวิวไม่ผ่านการตรวจ แก้ไขแล้วส่งใหม่
              </Link>
            ) : (
              <Link href="/profile" className="kn-link">
                ดูสถานะที่หน้าโปรไฟล์
              </Link>
            )}
          </EmptyState>
        </PageShell>
      );
    }
    return (
      <PageShell eyebrow="เขียนรีวิว" title={company.name} lede={company.address ?? undefined}>
        <ReviewForm company={{ kind: "existing", id: company.id }} uploadsEnabled={uploads} />
      </PageShell>
    );
  }

  if (p.place && p.q) {
    // สถานที่นี้เคยมีคนเลือกแล้ว — ใช้บริษัทเดิม จะได้เห็นว่าตัวเองเคยรีวิวหรือยัง
    const existingId = await findCompanyIdByPlace(p.place);
    if (existingId) redirect(`/insights/write-review?company=${existingId}`);
    const place = await findPlace(p.q, p.place);
    if (place) {
      return (
        <PageShell eyebrow="เขียนรีวิว" title={place.name} lede={place.address ?? undefined}>
          <ReviewForm company={{ kind: "place", placeId: place.placeId, query: p.q }} uploadsEnabled={uploads} />
        </PageShell>
      );
    }
    // ไม่พบแล้ว (แคชหมดอายุและผลเปลี่ยน) — ตกไปหน้าค้นหาด้วยคำเดิม
  }

  if (p.new) {
    return (
      <PageShell eyebrow="เขียนรีวิว" title="เพิ่มสถานประกอบการใหม่" lede="กรอกชื่อและที่อยู่ ผู้ดูแลจะตรวจพร้อมรีวิวของคุณ">
        <ReviewForm company={{ kind: "new" }} uploadsEnabled={uploads} />
      </PageShell>
    );
  }

  const google = placesEnabled();
  const [inSystem, fromGoogle] = p.q
    ? await Promise.all([listCompanies({ q: p.q, page: 1 }).then((r) => r.items.slice(0, 8)), searchPlaces(p.q)])
    : [[], []];

  return (
    <PageShell
      title="เขียนรีวิว"
      lede={google ? "ค้นหาสถานประกอบการที่ไปฝึกงาน จากในระบบหรือจาก Google Maps" : "ค้นหาสถานประกอบการที่ไปฝึกงานจากในระบบ"}
    >
      <form role="search" className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <TextField name="q" label="ชื่อสถานประกอบการ" defaultValue={p.q} required minLength={2} className="sm:flex-1" />
        <Button type="submit" icon={<Icon name="search" />}>
          ค้นหา
        </Button>
      </form>

      {p.q && (
        <section className="flex flex-col gap-4">
          <SectionHeader title="ในระบบ" />
          {inSystem.length === 0 ? (
            <p className="text-small text-ink-muted">ไม่พบในระบบ</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {inSystem.map((c) => (
                <Card key={c.id} title={c.name} footer={<PickLink href={`/insights/write-review?company=${c.id}`} />}>
                  {c.address && <p className="text-ink-muted">{c.address}</p>}
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

      {p.q && google && (
        <section className="flex flex-col gap-4">
          <SectionHeader title="จาก Google Maps" />
          {fromGoogle.length === 0 ? (
            <p className="text-small text-ink-muted">ไม่พบใน Google Maps</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {fromGoogle.map((pl) => (
                <Card
                  key={pl.placeId}
                  title={pl.name}
                  footer={<PickLink href={`/insights/write-review?${new URLSearchParams({ place: pl.placeId, q: p.q })}`} />}
                >
                  {pl.address && <p className="text-ink-muted">{pl.address}</p>}
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

      <p className="text-small text-ink-muted">
        {"ไม่พบที่ที่ไปฝึกงาน? "}
        <Link href="/insights/write-review?new=1" className="kn-link">
          เพิ่มสถานประกอบการเอง
        </Link>
      </p>
    </PageShell>
  );
}

function PickLink({ href }: { href: string }) {
  return (
    <Link href={href} className={buttonClass("secondary", "sm")}>
      เลือกที่นี่
    </Link>
  );
}

function toDefaults(r: NonNullable<Awaited<ReturnType<typeof getReviewForEdit>>>): ReviewDefaults {
  return {
    department: r.department,
    gender: r.gender,
    periodStart: toThaiDateInput(r.periodStart),
    periodEnd: toThaiDateInput(r.periodEnd),
    dailyAllowance: r.dailyAllowance?.toString() ?? "",
    hasAccommodation: r.hasAccommodation,
    hasTransport: r.hasTransport,
    workStartTime: r.workStartTime ?? "",
    workEndTime: r.workEndTime ?? "",
    scoreWork: r.scoreWork,
    scoreEnv: r.scoreEnv,
    scoreMentor: r.scoreMentor,
    scoreWelfare: r.scoreWelfare,
    textWork: r.textWork,
    textPros: r.textPros ?? "",
    textCons: r.textCons ?? "",
    textAdvice: r.textAdvice ?? "",
    isAnonymous: r.isAnonymous,
  };
}
```

- [ ] **Step 3: ตรวจ type lint เทสต์**

Run: `npx tsc --noEmit` · `npm run lint` · `node --test` → Expected: ผ่านทั้งหมด

- [ ] **Step 4: ตรวจหน้าเลือกด้วย curl** (session `dev-p3` จาก Task 5 ยังอยู่)

```bash
C="authjs.session-token=dev-p3"
code() { curl -s -o /dev/null -w "%{http_code} " -b "$C" "localhost:3000$1"; }
code /insights/write-review; code "/insights/write-review?company=seed_c2"; code "/insights/write-review?company=nope"; code "/insights/write-review?edit=seed_r1"; code "/insights/write-review?new=1"; echo
curl -s -o /dev/null -w "%{http_code}\n" localhost:3000/insights/write-review
P=$(curl -s -b "$C" "localhost:3000/insights/write-review?q=%E0%B8%9A%E0%B8%A3%E0%B8%B4%E0%B8%A9%E0%B8%B1%E0%B8%97")
echo "$P" | grep -o 'write-review?company=seed_c[0-9]' | sort -u | tr '\n' ' '; echo
echo "$P" | grep -c "Google Maps"
curl -s -b "$C" "localhost:3000/insights/write-review?company=seed_c4" | grep -c "คุณรีวิวที่นี่แล้ว"
```

Expected ตามลำดับ:
- `200 200 404 404 200` (`seed_r1` เป็นของคนอื่น → 404)
- `401` (guest)
- ลิงก์เลือกของบริษัทในระบบที่ชื่อมีคำว่า "บริษัท" และสาธารณะเห็น: `seed_c1 seed_c2 seed_c4 seed_c5 seed_c6` (ไม่มี `seed_c3`)
- `0` (ไม่มีคีย์ SerpApi = ไม่มีส่วน Google และไม่มีคำว่า Google Maps ใน lede)
- `1` (`seed_u3` ส่งรีวิว `seed_c4` ไปแล้วใน Task 5)

- [ ] **Step 5: ตรวจฟอร์มในเบราว์เซอร์** (controller ทำ — ต้องใช้ built-in browser)

ตั้ง cookie `authjs.session-token=dev-p3` แล้วเปิด `/insights/write-review?company=seed_c2`:
- ขั้นที่ 1 กด "ถัดไป" ทั้งที่ยังไม่เลือกแผนก → อยู่ขั้นเดิม เบราว์เซอร์ชี้ช่องแผนก
- กรอกครบ เดินผ่านทั้ง 5 ขั้น ที่ขั้นคะแนนเลือก 4/3/5/3 → ข้อความคะแนนรวม `3.75`
- ขั้นสุดท้ายไม่มีช่องแนบรูป (ไม่มีคีย์ Cloudinary) ติ๊กไม่ระบุตัวตน กดส่ง → ไปที่ `/profile?sent=1`
- เปิด `/insights/write-review?edit=<id ของรีวิวที่เพิ่งส่ง>` → 404 (PENDING แก้ไม่ได้)
- `read_console_messages` onlyErrors → ไม่มี error

- [ ] **Step 6: Checkpoint** — ห้าม commit

---

### Task 7: รีวิวของฉันที่โปรไฟล์ + รูปในหน้ารายละเอียด

**Files:**
- Modify: `app/profile/page.tsx`, `lib/companies.ts` (select รูป), `app/insights/[id]/page.tsx`, `next.config.ts`, `prisma/seed.ts`

**Interfaces:**
- Consumes: `myReviews` จาก `@/lib/reviews` · `getCompany` (Phase 2) · `Badge`, `Card`, `SectionHeader`, `EmptyState`
- Produces: `/profile?sent=1` แสดงแถบยืนยัน · `CompanyDetail["reviews"][number].photos: { id: string; url: string }[]`

- [ ] **Step 1: ให้ `getCompany` ส่งรูปมาด้วย** — ใน `lib/companies.ts` ใน `select` ของ `db.review.findMany` เพิ่มบรรทัดก่อน `user: { select: { name: true } },`:

```ts
        photos: { select: { id: true, url: true } },
```

- [ ] **Step 2: อนุญาตรูปจาก Cloudinary ใน `next.config.ts`** — เพิ่มใน `nextConfig`:

```ts
  // รูปรีวิวอยู่บน Cloudinary (lib/cloudinary.ts) — next/image ต้องรู้จักโดเมน
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
```

- [ ] **Step 3: แสดงรูปใน `ReviewCard` ของ `app/insights/[id]/page.tsx`**

เพิ่ม `import Image from "next/image";` แล้วใน `ReviewCard` ต่อท้ายหลัง `<ReviewText label="คำแนะนำถึงรุ่นน้อง" text={r.textAdvice} />`:

```tsx
      {r.photos.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {r.photos.map((p) => (
            <a
              key={p.id}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="relative block aspect-[4/3] overflow-hidden rounded-md bg-surface-200"
            >
              <Image src={p.url} alt="รูปประกอบรีวิว" fill sizes="(min-width: 768px) 280px, 45vw" className="object-cover" />
            </a>
          ))}
        </div>
      )}
```

- [ ] **Step 4: รูปตัวอย่างใน seed** — ใน `prisma/seed.ts` ใน `main()` ต่อจากลูปรีวิว ก่อน `const byStatus`:

```ts
  // รูปตัวอย่างสาธารณะของ Cloudinary (บัญชี demo) — ใช้ตรวจการแสดงผลรูปโดยไม่ต้องมีคีย์
  await db.reviewPhoto.upsert({
    where: { id: "seed_p1" },
    create: { id: "seed_p1", reviewId: "seed_r2", url: "https://res.cloudinary.com/demo/image/upload/sample.jpg" },
    update: {},
  });
```

Run: `npx prisma db seed`

- [ ] **Step 5: รีวิวของฉันใน `app/profile/page.tsx`**

เพิ่ม import:

```tsx
import { SectionHeader } from "@/components/ui/SectionHeader";
import { myReviews } from "@/lib/reviews";
```

เปลี่ยน signature และบรรทัดแรกในฟังก์ชัน:

```tsx
export default async function ProfilePage({ searchParams }: PageProps<"/profile">) {
  // layout เรียกแล้ว เรียกซ้ำเพื่อเอาข้อมูลผู้ใช้ — getCurrentUser() ห่อ cache() ไม่ query ซ้ำ
  const user = await requireUser();
  const sent = (await searchParams).sent === "1";
  const reviews = user.role === "STUDENT" ? await myReviews() : [];
```

เพิ่มค่าคงที่ไว้ใต้ `ROLE_LABEL`:

```tsx
const STATUS = {
  PENDING: { tone: "warning", label: "รอตรวจ" },
  APPROVED: { tone: "success", label: "เผยแพร่แล้ว" },
  REJECTED: { tone: "danger", label: "ไม่ผ่านการตรวจ" },
} as const;

const thaiDate = (d: Date) => d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" });
```

ใน JSX: ก่อน `<Card title={user.name ?? user.email}` เพิ่ม

```tsx
      {sent && (
        <p role="status" className="rounded-lg border border-line bg-signal-tint px-4 py-3">
          ส่งรีวิวแล้ว ผู้ดูแลจะตรวจก่อนเผยแพร่ ติดตามสถานะได้ด้านล่าง
        </p>
      )}
```

และแทน `<EmptyState icon="rate_review">รีวิวและประกาศของคุณจะแสดงที่นี่</EmptyState>` ด้วย

```tsx
      {user.role === "STUDENT" ? (
        <section className="flex flex-col gap-4">
          <SectionHeader title="รีวิวของฉัน" />
          {reviews.length === 0 ? (
            <EmptyState icon="rate_review" title="ยังไม่มีรีวิว">
              <Link href="/insights/write-review" className="kn-link">
                เขียนรีวิวที่ฝึกงานของคุณ
              </Link>
            </EmptyState>
          ) : (
            reviews.map((r) => (
              <Card
                key={r.id}
                eyebrow={thaiDate(r.createdAt)}
                title={r.company.name}
                footer={<Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge>}
              >
                {r.status === "REJECTED" && (
                  <>
                    <p>{`เหตุผล: ${r.rejectionReason ?? "ไม่ระบุ"}`}</p>
                    <Link href={`/insights/write-review?edit=${r.id}`} className="kn-link">
                      แก้ไขแล้วส่งใหม่
                    </Link>
                  </>
                )}
              </Card>
            ))
          )}
        </section>
      ) : (
        <EmptyState icon="rate_review">ประกาศของคุณจะแสดงที่นี่</EmptyState>
      )}
```

- [ ] **Step 6: ตรวจ**

Run: `npx tsc --noEmit` · `npm run lint` · `node --test` → Expected: ผ่านทั้งหมด

```bash
C="authjs.session-token=dev-p3"
P=$(curl -s -b "$C" "localhost:3000/profile?sent=1")
echo "$P" | grep -c "ส่งรีวิวแล้ว"
echo "$P" | grep -o "รอตรวจ\|เผยแพร่แล้ว\|ไม่ผ่านการตรวจ" | sort | uniq -c
curl -s -b "$C" localhost:3000/insights/seed_c1 | grep -o '/_next/image?url=https%3A%2F%2Fres.cloudinary.com[^"&]*' | head -1
```

Expected:
- `1`
- `รอตรวจ` อย่างน้อย 4 (seed_r3 ที่แก้แล้ว + 3 รีวิวจาก Task 5 + รีวิวจากเบราว์เซอร์ใน Task 6 ถ้าทำแล้ว) ไม่มี `ไม่ผ่านการตรวจ` (seed_r3 ถูกแก้เป็น PENDING แล้ว)
- URL `next/image` ของรูป demo บน `seed_c1` (รีวิว `seed_r2`)

- [ ] **Step 7: Checkpoint** — ห้าม commit

---

### Task 8: ตรวจทั้งเส้นทาง เก็บกวาด อัปเดตเอกสาร

**Files:**
- Modify: `.env.example`, `docs/context.md`

- [ ] **Step 1: เส้นทางแก้ไขรีวิวที่ถูกปฏิเสธในเบราว์เซอร์** (controller ทำ)

`npx prisma db seed` (`seed_r3` กลับเป็น REJECTED พร้อมเหตุผล) แล้วด้วย cookie `dev-p3`:
- `/profile` → การ์ดบริษัท หาดใหญ่ออโต้เซอร์วิส มีป้าย "ไม่ผ่านการตรวจ" เหตุผล และลิงก์ "แก้ไขแล้วส่งใหม่"
- คลิกลิงก์ → ฟอร์มเติมค่าเดิม (แผนกช่างยนต์ คะแนน 1/1/1/1 ข้อความเดิม) lede แสดงเหตุผล
- ไปขั้นสุดท้ายแล้วส่งทั้งที่ข้อความยังสั้น → ข้อความ error ภาษาไทยจากเซิร์ฟเวอร์ "เล่าลักษณะงานอย่างน้อย 30 ตัวอักษร"
- ย้อนไปแก้ข้อความให้ยาวพอ ส่ง → `/profile?sent=1` การ์ดเดิมเป็น "รอตรวจ"
- `read_console_messages` onlyErrors → ไม่มี error

- [ ] **Step 2: ที่ 375px** (controller ทำ) — `resize_window` preset `mobile`, เปิดหน้าเลือก (`?q=บริษัท`), ฟอร์มขั้นคะแนน และ `/profile` → ปุ่มคะแนน 1–5 อยู่ในแถวเดียวไม่ล้น ปุ่มย้อนกลับ/ถัดไปไม่ถูก BottomNav บัง `document.documentElement.scrollWidth <= innerWidth` แล้ว screenshot จากนั้น preset `desktop`

- [ ] **Step 3: เทสต์ lint build**

Run: `node --test` · `npm run lint` · `npm run build` → Expected: ผ่านทั้งหมด

- [ ] **Step 4: เก็บกวาดข้อมูลทดสอบและ session**

```bash
npx prisma db execute --stdin <<'EOF'
DELETE FROM "Review" WHERE "userId" = 'seed_u3' AND id NOT LIKE 'seed_%';
DELETE FROM "Company" WHERE name LIKE '%P3TEST%';
DELETE FROM "Session" WHERE "sessionToken" = 'dev-p3';
EOF
npx prisma db seed
curl -s -o /dev/null -w '%{http_code}\n' -b "authjs.session-token=dev-p3" localhost:3000/insights/write-review
```

Expected: `Script executed successfully.` · `seed: 6 บริษัท APPROVED=5 PENDING=2 REJECTED=1` · `401`

- [ ] **Step 5: `.env.example`** — แทนบรรทัดหัวข้อสองบรรทัดนี้:

```
# --- อัปโหลดรูป (Cloudinary) ---
```

ด้วย

```
# --- อัปโหลดรูป (Cloudinary) --- เว้นว่างได้: ฟอร์มรีวิวจะซ่อนช่องแนบรูป
```

และ

```
# --- ค้นหาสถานที่ (SerpApi) --- ใช้ฝั่งเซิร์ฟเวอร์เท่านั้น ห้ามใส่ NEXT_PUBLIC_
```

ด้วย

```
# --- ค้นหาสถานที่ (SerpApi) --- ใช้ฝั่งเซิร์ฟเวอร์เท่านั้น ห้ามใส่ NEXT_PUBLIC_ · เว้นว่างได้: ซ่อนการค้นหาจาก Google Maps
```

- [ ] **Step 6: `docs/context.md`** — ตารางสถานะแถว Phase 3 เป็น `เสร็จ` เปลี่ยน "Phase 0–2 เสร็จแล้ว ถัดไปคือ **Phase 3**" เป็น "Phase 0–3 เสร็จแล้ว ถัดไปคือ **Phase 4**" และแทนบรรทัดหมายเหตุ Phase 2 ด้วย:

```
Phase 2–3: หน้าอ่านข้อมูลเรียก DAL (`lib/companies.ts`, `lib/reviews.ts`) ตรง Route Handler มีเฉพาะที่ client ต้องส่งข้อมูล
(`/api/reviews`) ค้นหา Google ทำฝั่งเซิร์ฟเวอร์ในหน้า ไม่มี proxy ให้ client · ไม่มีคีย์ SerpApi/Cloudinary ระบบซ่อนฟีเจอร์นั้นเอง
```

- [ ] **Step 7: Checkpoint** — สรุปผลให้ผู้ใช้ ห้าม commit จนกว่าผู้ใช้สั่ง
