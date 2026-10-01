# Phase 1 — เข้าสู่ระบบด้วย Google และกันสิทธิ์ — ดีไซน์

วันที่ 1 ต.ค. 2569 · สถานะ: ผู้ใช้อนุมัติดีไซน์ในแชตแล้ว รอรีวิวเอกสาร

## เป้าหมาย

สเปกข้อ 1 "เข้าสู่ระบบด้วย Google และคัดกรองสิทธิ์ตามโดเมนอีเมล" และวางตัวกันสิทธิ์ที่ทุก Phase ถัดไปใช้
แทนที่ `DEV_ROLE` ชั่วคราวจากโครงหน้าบ้าน

**เกณฑ์สำเร็จ**
- เข้าสู่ระบบด้วยบัญชี Google จริงได้ และได้บทบาทถูกต้องตามโดเมนอีเมล
- ทุกหน้าในตารางสิทธิ์ (ด้านล่าง) ตอบ 200/401/403 ถูกต้องสำหรับผู้เยี่ยมชมและทั้ง 3 บทบาท
- บัญชีที่ถูกระงับเข้าสู่ระบบไม่ได้ และ session ที่ค้างอยู่ใช้ต่อไม่ได้
- `DEV_ROLE` หายไปจากโค้ดทั้งหมด

## 1. Session และบทบาทแรกเข้า

Auth.js v5 (`next-auth@5.0.0-beta.32`) + `@auth/prisma-adapter` + Google provider
**session แบบฐานข้อมูล** (ค่าเริ่มต้นเมื่อมี adapter) — เปลี่ยนบทบาทหรือระงับบัญชีแล้วมีผลทันทีที่คำขอถัดไป
ไม่ต้องรอ JWT หมดอายุ

Config อยู่ที่ `auth.ts` ที่ root ตามธรรมเนียมของ Auth.js (export `handlers`, `auth`, `signIn`, `signOut`)
route ที่ `app/api/auth/[...nextauth]/route.ts`

**บทบาทตัดสินครั้งเดียวตอนสร้างบัญชี** — ครอบ `createUser` ของ adapter ให้เขียนแถว `User` พร้อมบทบาท
ในคำสั่งเดียว:

| เงื่อนไข (อีเมลเทียบแบบไม่สนตัวพิมพ์ ตัดช่องว่างหัวท้ายของค่า env) | ผล |
|---|---|
| ตรงกับ `SUPER_ADMIN_EMAIL` | `ADMIN` + `isSuperAdmin = true` |
| ลงท้ายด้วย `@` + `ALLOWED_STUDENT_DOMAIN` ตรงตัว | `STUDENT` |
| อื่น ๆ (รวมกรณี env ว่าง) | `EXTERNAL` |

- เทียบทั้ง `@` + โดเมน — `x@evil-htc.ac.th` หรือ `x@htc.ac.th.evil.com` ต้องไม่ได้ `STUDENT`
- `ALLOWED_STUDENT_DOMAIN` ว่าง = ไม่มีใครได้ `STUDENT` อัตโนมัติ (ห้ามกลายเป็น "ทุกคนเป็นนักศึกษา")
- เข้าสู่ระบบครั้งต่อไปไม่แตะบทบาท — ไม่ทับสิ่งที่ผู้ดูแลเปลี่ยนไว้
- `SUPER_ADMIN_EMAIL` แทนการ seed: แถว `User` ยังไม่มีจนกว่าคนนั้นจะล็อกอิน Google ครั้งแรก
  ข้อจำกัด: ถ้าล็อกอินก่อนตั้งค่า env จะได้บทบาทตามโดเมน ต้องแก้ด้วย `npx prisma studio`

**ปฏิเสธการเข้าสู่ระบบ** (callback `signIn`) เมื่อ:
- Google แจ้ง `email_verified` ไม่ใช่ `true`
- บัญชีที่มีอยู่แล้วถูกระงับ (`isBanned`)

ผลคือ Auth.js พากลับ `/login?error=AccessDenied`

**ข้อมูลใน session** — callback `session` คืน `id`, `name`, `email`, `image`, `role`, `isSuperAdmin`,
`isBanned` จากแถว `User` ที่ adapter ดึงมาพร้อม session อยู่แล้ว (ไม่ query เพิ่ม)

## 2. ตัวกลางเดียว

- `lib/session.ts` — `getCurrentUser()` คง signature `Promise<CurrentUser | null>` ไส้ในเปลี่ยนเป็น `auth()`
  `CurrentUser = { id, role, isSuperAdmin, name, email, image }` บัญชีที่ถูกระงับคืน `null`
  (เหมือนออกจากระบบ) ห่อด้วย `cache()` ของ React — layout กับ page เรียกซ้ำได้โดยไม่ query ซ้ำ
- `lib/auth.ts` — guard ทั้งหมดสร้างบน `getCurrentUser()`:
  - `requireUser()` → ไม่ได้ล็อกอิน: `unauthorized()` (401)
  - `requireRole(...roles)` → บทบาทไม่อยู่ในรายการ: `forbidden()` (403)
  - `requireAdmin()` = `requireRole("ADMIN")`
  - `requireSuperAdmin()` → ไม่ใช่ super admin: `forbidden()`
  - ทุกตัวคืน `CurrentUser` ให้ใช้ต่อ — ใช้ได้ใน Server Component, Server Action และ Route Handler
- `unauthorized()`/`forbidden()` ต้องเปิด `experimental.authInterrupts` ใน `next.config.ts`
  (ฟีเจอร์ experimental ของ Next 16 — มีเอกสารใน `node_modules/next/dist/docs/`)
- `lib/auth-rules.ts` — กฎ pure ไม่มี import มีเทสต์: `initialAccess(email, studentDomain, superAdminEmail)`,
  `hasRole(role, roles)`, `canSignIn({ emailVerified, isBanned })`
- ลบ `DEV_ROLE` และ `devRole()` ออกจาก `lib/nav.ts`, `.env.example`, เทสต์ — ทดสอบบทบาทอื่นด้วย
  `npx prisma studio` แก้ `role` ของบัญชีตัวเอง

## 3. ตารางสิทธิ์ของหน้า

guard อยู่ที่ `layout.tsx` ของแต่ละส่วน ตรงกับตารางเมนูที่อนุมัติแล้วในสเปกโครงหน้าบ้าน

| เส้นทาง | ใครเปิดได้ | ไม่ได้ล็อกอิน | บทบาทไม่ตรง |
|---|---|---|---|
| `/`, `/jobs`, `/login`, `/settings` | ทุกคน | 200 | 200 |
| `/insights/*`, `/community/*` | `STUDENT`, `ADMIN` | 401 | 403 |
| `/employer/register` | `EXTERNAL`, `ADMIN` | 401 | 403 |
| `/profile/*` | ล็อกอินแล้ว | 401 | — |
| `/admin/*` | `ADMIN` | 401 | 403 |

ข้อจำกัดของ guard ใน layout: layout ไม่ render ซ้ำเมื่อเปลี่ยนหน้าภายใน segment เดียวกันฝั่ง client
guard ใน layout จึงเป็นแค่ประตูของ UI — ข้อมูลที่ Phase 2 เป็นต้นไปดึงต้องเรียก guard ซ้ำที่จุดดึง
(Route Handler ทุกตัวเริ่มด้วย guard อยู่แล้วตามกฎใน `CLAUDE.md`)

## 4. หน้าที่เปลี่ยน

- `/login` — ปุ่ม Google เป็น Server Action เรียก `signIn("google", { redirectTo: "/" })`
  ล็อกอินแล้วเข้ามา → `redirect("/")` มี `?error=` → แสดงข้อความไทยใต้ปุ่ม:
  - `AccessDenied` → "เข้าสู่ระบบไม่ได้ บัญชีอาจถูกระงับ หรืออีเมลยังไม่ได้ยืนยันกับ Google"
  - `Configuration` → "ระบบเข้าสู่ระบบยังตั้งค่าไม่ครบ ติดต่อผู้ดูแล"
  - อื่น ๆ → "เข้าสู่ระบบไม่สำเร็จ ลองอีกครั้ง"
- `/profile` — แสดงชื่อ อีเมล บทบาท และปุ่ม "ออกจากระบบ" (Server Action `signOut({ redirectTo: "/" })`)
- `app/unauthorized.tsx` — "ต้องเข้าสู่ระบบก่อน" + ปุ่มไป `/login` (ตาม Kernel ใช้ `PageShell` + `EmptyState`)
- `app/forbidden.tsx` — "หน้านี้ไม่เปิดให้บัญชีของคุณ" + ลิงก์กลับหน้าแรก
- เมนูเดิมไม่เปลี่ยน — `navFor(role)` / `actionFor(role)` รับบทบาทจาก `getCurrentUser()` ตัวใหม่

หลังล็อกอินกลับไป `/` เสมอ ไม่จำหน้าที่ตั้งใจจะไป — ponytail: เพิ่ม `redirectTo` จากหน้าที่โดน 401
เมื่อผู้ใช้บ่น

## 5. env และการ deploy

`.env.example`:
- ลบ `DEV_ROLE`
- เพิ่ม `AUTH_TRUST_HOST=true` พร้อมหมายเหตุ: จำเป็นเมื่อรันหลัง reverse proxy บนเซิร์ฟเวอร์ส่วนตัว
  (หรือตั้ง `AUTH_URL` เป็นโดเมนจริงแทน)
- หมายเหตุ redirect URI ของ Google OAuth: `http://localhost:3000/api/auth/callback/google` (dev)
  และ `https://<โดเมนจริง>/api/auth/callback/google` (production)

`AUTH_SECRET` สร้างด้วย `npx auth secret` (เขียนลง `.env.local`)

ผลข้างเคียงที่ยอมรับ: root layout เรียก `auth()` ซึ่งอ่าน cookie → ทุกหน้ากลายเป็น dynamic ไม่ prerender
จำเป็น เพราะหน้าที่ prerender จะเห็นเมนูเดียวกันทุกคน

## นอกขอบเขต

- คำขอยืนยันสิทธิ์นักศึกษา (`/profile/upgrade`) — Phase 6
- หน้าผู้ดูแลเปลี่ยนบทบาท/ระงับบัญชีพร้อม `AuditLog` — Phase 6
- `proxy.ts` — guard ใน layout พอ
- จำหน้าที่จะไปหลังล็อกอิน — ดูส่วนที่ 4

## การตรวจสอบ

1. `node --test` — กฎใน `lib/auth-rules.ts` (โดเมนหลอก, env ว่าง, ตัวพิมพ์, super admin, ระงับ, อีเมลไม่ยืนยัน)
2. **ไม่ต้องใช้บัญชี Google:** สร้างผู้ใช้ 3 บทบาท + 1 บัญชีถูกระงับ พร้อมแถว `Session` ด้วย SQL
   (`npx prisma db execute` — ทดลองแล้วว่า Prisma อ่านวันที่แบบ ISO ได้) แล้วยิง `curl` พร้อม cookie
   `authjs.session-token` ไล่ตารางสิทธิ์ครบทุกช่อง ต้องได้สถานะตรงตาราง และเมนูตรงบทบาท
3. `/api/auth/providers` มี `google`
4. **ต้องใช้บัญชี Google จริง (รอผู้ใช้สร้าง OAuth client):** ล็อกอิน → ได้บทบาทตามโดเมน → `/profile` แสดงข้อมูล
   → ออกจากระบบ → กลับเป็นผู้เยี่ยมชม
5. `npm run build`, `npm run lint` ผ่าน

## สิ่งที่ยังรอผู้ใช้

- ค่าจริงของ `ALLOWED_STUDENT_DOMAIN` — **ดีไซน์นี้ถือว่านักศึกษาใช้บัญชี Google Workspace ของวิทยาลัย**
  ถ้านักศึกษาใช้ Gmail ทั่วไป การคัดกรองตามโดเมนใช้ไม่ได้ ต้องกลับมาออกแบบส่วนที่ 1 ใหม่
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` และ `SUPER_ADMIN_EMAIL` — จำเป็นแค่ข้อ 4 ของการตรวจสอบ
