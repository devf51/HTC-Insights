@AGENTS.md
@docs/context.md

# HTC Insights v2 — กฎการทำงานในโปรเจกต์นี้

อ่าน `docs/context.md` ก่อน มันบอกว่าระบบนี้คืออะไรและหลักการโดเมน 4 ข้อที่ห้ามละเมิด
ไฟล์นี้บอกวิธีเขียนโค้ด

## Stack

Next.js 16 App Router · React 19 · TypeScript · Tailwind v4 · Prisma 7 + SQLite (`better-sqlite3` adapter)
Auth.js v5 · Leaflet · Recharts · jsPDF + html2canvas · zod

โปรเจกต์เดียว ไม่มี backend แยก API ทั้งหมดเป็น Route Handlers ใน `app/api/`
deploy บนเซิร์ฟเวอร์ส่วนตัวที่มีดิสก์ (ไม่ใช่ Vercel — ไฟล์ SQLite ต้องอยู่ถาวร)
Prisma Client ใช้ผ่าน `db` จาก `lib/db.ts` เท่านั้น อย่าสร้าง `PrismaClient` ใหม่

## กฎที่บังคับ

**ทุก Route Handler เริ่มด้วย guard** จาก `lib/auth.ts` — `requireUser()`, `requireRole()`,
`requireAdmin()`, `requireSuperAdmin()` อย่าตรวจสิทธิ์เองในแต่ละ route และอย่าเชื่อ role
ที่ส่งมาจาก client

**ทุก input ที่มาจากผู้ใช้ผ่าน zod** ก่อนแตะฐานข้อมูล schema อยู่ใน `lib/validation.ts`

**กฎที่บังคับได้ที่ฐานข้อมูล ให้บังคับที่ฐานข้อมูล** เช่นกดถูกใจครั้งเดียวต่อบัญชีใช้ `@@unique`
ไม่ใช่เช็คในโค้ดแล้วเจอ race condition ทีหลัง

**ตัวกรอง `APPROVED` ต้องอยู่ในทุก query ที่ข้อมูลไปถึงสาธารณะ** รวมถึง `_count` และ `_avg`
นี่คือบั๊กที่ v1 พลาดซ้ำสองรอบ

**การกระทำของผู้ดูแลเขียน `AuditLog` ในทรานแซกชันเดียวกัน** ผ่าน helper `logAdminAction()`
และการอนุมัติ/ปฏิเสธเรียก `notify()` เสมอ อย่าเขียนตรรกะนี้ซ้ำในแต่ละ route

**ความลับอยู่ใน env เท่านั้น** ห้าม `NEXT_PUBLIC_` กับ `SERPAPI_KEY`, คีย์ Cloudinary
หรืออะไรก็ตามที่เป็นความลับ เรียกบริการภายนอกจากฝั่งเซิร์ฟเวอร์เสมอ

## สไตล์โค้ด

- หาของที่มีอยู่แล้วใน `lib/` และ `components/` ก่อนเขียนใหม่ อย่าสร้าง abstraction
  ที่มี implementation เดียว
- ใช้ Server Component เป็นค่าเริ่มต้น เติม `"use client"` เฉพาะเมื่อต้องใช้ state หรือ event
- Leaflet และ Recharts ต้อง import ผ่าน `dynamic(..., { ssr: false })` ทั้งคู่แตะ `window`
- UI ภาษาไทย ไม่ใช้ emoji ใช้ Material Symbols เป็นไอคอน
- mobile-first ทุกหน้า ทดสอบที่ความกว้าง 375px ด้วยเสมอ ไม่ใช่แค่จอคอม
- ตรรกะที่พังเงียบได้ (คำนวณคะแนน ประกอบต้นไม้คอมเมนต์ aggregate แดชบอร์ด) ทิ้งเทสต์ไว้
  หนึ่งตัวใน `tests/` แบบรันตรงด้วย `node --test` ไม่ต้องลง framework

## ข้อควรระวังที่รู้แล้ว

- **Tailwind v4 ใช้สี `oklch` โดยปริยาย แต่ html2canvas อ่าน `oklch` ไม่ออก** หน้ารายงาน A4
  (`app/admin/dashboard/report/`) ต้องกำหนดสีเป็น hex/rgb ตรง ๆ เท่านั้น
- **ฟอนต์ไทยกับ html2canvas** ต้อง `await document.fonts.ready` ก่อนจับภาพ ไม่งั้นสระและ
  วรรณยุกต์หาย และต้องเปิดไฟล์ PDF ดูด้วยตาจริง การที่ไม่ error ไม่ได้แปลว่าถูก
- **Recharts ในหน้ารายงาน** ตั้ง `isAnimationActive={false}` ไม่งั้น html2canvas
  จับภาพตอนกราฟยังวาดไม่เสร็จ
- **SQLite:** `prisma migrate` และแอปใช้ `DATABASE_URL` ตัวเดียวกัน (`file:./prisma/dev.db` นับจาก
  root) ไม่มี `String[]` ใช้ `Json` แทน, enum ไม่ถูกบังคับที่ฐานข้อมูล ต้อง validate ด้วย zod ก่อนเขียน,
  ไม่มี `mode: "insensitive"` ในการค้นหา, การเขียนล็อกทั้งไฟล์ — บนเซิร์ฟเวอร์ต้องสำรองไฟล์ `.db` เอง
- หลังแก้ schema รัน `npx prisma generate` ด้วย — Prisma 7 `migrate dev` ไม่ generate client ให้
- npm ในเครื่องนี้บล็อก install script ถ้าลงแพ็กเกจที่ต้องใช้ postinstall ให้รัน
  `npm approve-scripts <pkg>`

## คำสั่ง

```bash
npm run dev                  # รันที่ localhost:3000
npx prisma migrate dev       # สร้าง migration หลังแก้ schema
npx prisma studio            # ดูข้อมูลในฐานข้อมูล
npx prisma db seed           # ข้อมูลตัวอย่าง 6 บริษัท (dev เท่านั้น รันซ้ำได้)
node --test                  # รันเทสต์ทั้งหมดใน tests/ (อย่าใส่ tests/ ต่อท้าย พังบน Windows)
npm run build                # ตรวจว่า build ผ่านก่อน commit
```

## การ commit

เขียนข้อความ commit เป็นภาษาอังกฤษ ขึ้นต้นด้วย `feat:`, `fix:`, `chore:`, `refactor:`
commit เฉพาะตอนผู้ใช้สั่ง
