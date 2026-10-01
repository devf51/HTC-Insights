# โครงหน้าบ้าน (Frontend Shell) — ดีไซน์

วันที่ 1 ต.ค. 2569 · สถานะ: รอผู้ใช้รีวิว

## ที่มา

Neon ยังตั้งค่าไม่ได้ (Phase 0 ข้อ 5 ค้าง) ระหว่างรอ ทำหน้าบ้านส่วนที่ไม่ต้องใช้ฐานข้อมูลก่อน
รอบนี้เป็น **โครงหน้าตาอย่างเดียว ไม่มีข้อมูล** — ไม่ใช้ mock data ไม่ใช้ฐานข้อมูลบนเครื่อง
ทุกอย่างที่สร้างต้องใช้ต่อได้จริงใน Phase ถัดไป ไม่มีงานทิ้ง

**เกณฑ์สำเร็จ:** ทุกลิงก์ในการนำทางเปิดได้ ไม่มี 404 ทั้ง 4 บทบาท ใช้งานได้ที่ 375px และจอคอม
ทั้งสองธีม เมนูไม่กระพริบตอนรีเฟรช และ `npm run build` ผ่าน

## ดีไซน์ซิสเต็ม: Kernel

ที่มา: https://claude.ai/artifact/Wq9MxxeQt7y1AFbc9LGYCJ (`project/README.md`, `project/tokens.json`,
`project/components/*`) ใช้ค่าตามนั้นตรง ๆ ไม่ประดิษฐ์ค่าเพิ่ม

ข้อที่ต่างจาก Kernel โดยตั้งใจ:

| Kernel | ในโปรเจกต์นี้ | เหตุผล |
|---|---|---|
| ไอคอน Lucide | **Material Symbols Outlined** ขนาด 20px | กฎใน `CLAUDE.md` |
| ค่าเริ่มต้นธีม Night | **ตามเครื่อง** (`prefers-color-scheme`) + เลือกเองที่ `/settings` | ผู้ใช้เลือก |
| CodeBlock | ไม่สร้าง | แอปนี้ไม่มีโค้ดให้แสดง |
| โลโก้ "Kernel" | คำว่า "HTC Insights" ด้วย Instrument Serif | ยังไม่มีโลโก้วิทยาลัย |

## ส่วนที่ 1 — รากฐาน

### Tokens

ย้าย token ของ Kernel ทั้งหมดเข้า `app/globals.css`:

- `:root` = ค่าธีม Paper, `[data-theme="night"]` = ค่าธีม Night
- `@theme inline` ผูกเป็นคลาส Tailwind ชื่อเดียวกับ Kernel: สี (`surface-000/100/200`, `surface-band`,
  `line`, `line-strong`, `ink`, `ink-muted`, `signal`, `signal-strong`, `signal-tint`, `on-signal`,
  `slate`, `success`, `warning`, `danger`, `focus`, `link`, `scrim`), ระยะ `space-*`,
  มุม `radius-*`, เงา `shadow-pop`, ขนาดตัวอักษร (`display`, `h1`, `h2`, `h3`, `body-lg`, `body`,
  `small`, `label`, `eyebrow`, `metric`, `display-th`, `h1-th`, `eyebrow-th`)
- ทุกสีเป็น hex/rgba — ไม่มี `oklch` ใช้กับหน้ารายงาน A4 ใน Phase 7 ได้
- ลบ `--background`/`--foreground` และฟอนต์ Geist ของ create-next-app ทิ้ง

### ฟอนต์

`next/font/google` (self-host อัตโนมัติ): IBM Plex Sans, IBM Plex Sans Thai, Trirong,
Instrument Serif, IBM Plex Mono — น้ำหนัก 400 และ 500 เท่านั้นตาม Kernel
Material Symbols Outlined โหลดด้วย `<link>` จาก Google Fonts
`<html lang="th">` เพื่อให้กฎไทยของ Kernel (`:lang(th)`) ทำงาน

### ธีม

- ค่าที่เก็บ: `localStorage["theme"]` = `"system" | "paper" | "night"` (ไม่มีค่า = `system`)
- สคริปต์ inline ใน `<head>` อ่านค่าแล้วตั้ง `data-theme` บน `<html>` **ก่อนวาดหน้าแรก** —
  กันการกระพริบ ไม่อ่าน cookie ฝั่งเซิร์ฟเวอร์ หน้าจึงยัง static ได้
- `system` → ตั้งตาม `matchMedia('(prefers-color-scheme: dark)')`
- หน้า `/settings` มีตัวเลือก 3 แบบ เปลี่ยนแล้วมีผลทันที
- หน้ารายงาน A4 (Phase 7) บังคับ Paper เสมอ

ข้าม: ไลบรารีธีม (next-themes), บันทึกธีมลงฐานข้อมูล

## ส่วนที่ 2 — Component และ layout

### `components/ui/` — พอร์ตจาก Kernel

`Button`, `Card`, `Badge`, `Band`, `SectionHeader`, `Table`, `TextField`, `Tabs`
API ตาม `project/components/index.d.ts` ของ Kernel ทุกตัวเป็น Server Component ยกเว้น `Tabs`
(client — ถือ state แท็บ) สไตล์ไทยผ่าน `:lang(th)` เขียนไว้ใน `globals.css` ที่เดียว

กฎของ Kernel ที่ต้องรักษา: primary หนึ่งปุ่มต่อหน้าจอ, ไม่มีปุ่มแคปซูล, ไม่มีการ์ดเส้นสีด้านซ้าย,
ไม่มี gradient, เงาเดียวคือ `shadow-pop`, ใช้น้ำหนัก 400/500 เท่านั้น, ข้อความไทยไม่เล็กกว่า 13px

### Component ที่เพิ่มเอง (ทำตามกฎ Kernel)

ทำตอนนี้:
- `TopNav` — 64px, ชื่อแบรนด์ซ้าย, ลิงก์ ≤ 5, ปุ่มเดียวชิดขวา, ต่ำกว่า 768px ซ่อนลิงก์
- `BottomNav` — เฉพาะ < 768px, fixed ล่าง, เผื่อ `env(safe-area-inset-bottom)`,
  หน้าปัจจุบันใช้สี `signal` และไอคอนแบบ FILL (client — ใช้ `usePathname`)
- `Icon` — `<span class="material-symbols-outlined">` ขนาด 20px
- `EmptyState` — ไอคอน + ข้อความ "ยังไม่มีข้อมูล" + คำอธิบายสั้น
- Footer — `Band` หนึ่งแถบท้ายหน้า มีลิงก์ "ตั้งค่า" `/settings` (ทางเข้าหน้าตั้งค่าของทุกบทบาท
  รวมผู้เยี่ยมชม เพราะเมนูไม่มีที่ว่างพอ)

ทำทีหลังเมื่อหน้าต้องใช้: โมดอล (`<dialog>` ของเบราว์เซอร์), ดาวคะแนน, pagination, แผนที่

### การนำทางตามบทบาท

`lib/session.ts` — `getCurrentUser()` เป็นจุดเดียวที่ระบุผู้ใช้
- ตอนนี้: อ่าน `process.env.DEV_ROLE` (`STUDENT | EXTERNAL | ADMIN`) จาก `.env.local`
  ไม่ตั้ง = ผู้เยี่ยมชม (`null`)
- Phase 1: เปลี่ยนไส้ในเป็น `auth()` ของ Auth.js ที่ไฟล์นี้ไฟล์เดียว และลบ `DEV_ROLE`

`app/layout.tsx` เป็น Server Component เรียก `getCurrentUser()` แล้วส่งรายการเมนูให้ `TopNav`
และ `BottomNav` — บทบาทรู้ก่อนส่ง HTML จึงไม่กระพริบแบบ v1

| บทบาท | เมนู |
|---|---|
| ผู้เยี่ยมชม | หน้าแรก `/` · ตำแหน่งงาน `/jobs` · ปุ่ม "เข้าสู่ระบบ" `/login` |
| `STUDENT` | หน้าแรก · สถานประกอบการ `/insights` · ชุมชน `/community` · ตำแหน่งงาน · โปรไฟล์ `/profile` |
| `EXTERNAL` | หน้าแรก · ตำแหน่งงาน · ลงประกาศ `/employer/register` · โปรไฟล์ |
| `ADMIN` | เมนูนักศึกษา แต่ช่องสุดท้ายของแถบล่างเป็น ผู้ดูแล `/admin` (โปรไฟล์อยู่ที่ปุ่มมุมขวาบน) |

`EXTERNAL` ไม่เห็นสถานประกอบการและชุมชน (ตาม v1) ภาพรวมสำหรับบุคคลภายนอกอยู่ที่หน้าแรก (สเปกข้อ 2)

## ส่วนที่ 3 — หน้าในรอบนี้

### ทำเต็ม

- `/` — แยกตามบทบาท
  - ผู้เยี่ยมชม: Band hero (หัวเรื่อง `display-th` + ย่อหน้านำ + ปุ่ม "เข้าสู่ระบบ") แล้วการ์ด 3 ใบ:
    ค้นหาที่ฝึกงาน / อ่านรีวิวจากรุ่นพี่ / หาตำแหน่งงาน
  - `STUDENT` / `ADMIN`: โครงการ์ดสรุปข้อมูลฝึกงาน — แสดง `EmptyState`
  - `EXTERNAL`: โครงภาพรวมทักษะและบริษัทที่เปิดรับ — แสดง `EmptyState`
- `/settings` — ตัวเลือกธีม 3 แบบ
- `/login` — ปุ่ม "เข้าสู่ระบบด้วย Google" แบบ disabled พร้อมข้อความ "เปิดใช้ใน Phase 1"

### ทำโครง (`SectionHeader` + `EmptyState`)

`/insights`, `/insights/[id]`, `/insights/write-review`, `/community`, `/community/[id]`,
`/community/new`, `/jobs`, `/employer/register`, `/profile`, `/profile/upgrade`, `/admin`,
`/admin/users`, `/admin/dashboard`

ลิงก์ภายในโครง เพื่อให้ทุกหน้าเข้าถึงได้จากการคลิก: `/insights` → เขียนรีวิว, `/community` → ตั้งกระทู้,
`/profile` → ยื่นยืนยันสิทธิ์, `/admin` → จัดการบัญชี และ แดชบอร์ด หน้า `[id]` ยังไม่มีลิงก์เข้า
(ไม่มีข้อมูล) เปิดด้วย URL ตรงเพื่อตรวจ

### ข้าม

- `/admin/dashboard/report` — ต้องมีข้อมูลจริง (Phase 7)
- การกันสิทธิ์เข้าหน้า — ตอนนี้ใครก็เปิด `/admin` ได้ guard จริงมาใน Phase 1 (`requireAdmin()`)
- เทสต์อัตโนมัติ — ไม่มีตรรกะที่พังเงียบในรอบนี้ ตรวจด้วยตา

## การตรวจสอบ

1. `npm run dev` แล้วไล่ทุกลิงก์ใน `TopNav`/`BottomNav`/Footer ด้วย `DEV_ROLE` ครบ 4 แบบ (ไม่ตั้ง, STUDENT,
   EXTERNAL, ADMIN) — ไม่มี 404
2. ทุกหน้าที่ 375px และ 1280px ทั้ง Paper และ Night — ไม่มีแนวนอนล้น, แถบล่างไม่บังเนื้อหา
3. รีเฟรชหน้าในธีมที่ไม่ตรงกับเครื่อง — ไม่เห็นธีมผิดแวบขึ้นมา
4. ข้อความไทยที่มีสระบนล่าง ("ปู่ที่สุด") บนปุ่ม Badge และช่องกรอก — ไม่ถูกตัด
5. `npm run build` ผ่าน

## ไฟล์ที่แตะ

```
app/globals.css            tokens + กฎไทย + ฐาน (เขียนใหม่)
app/layout.tsx             ฟอนต์, สคริปต์ธีม, TopNav/BottomNav/Footer (เขียนใหม่)
app/page.tsx               หน้าแรกตามบทบาท (เขียนใหม่)
app/settings/page.tsx      ใหม่ (+ ตัวเลือกธีมแบบ client)
app/login/page.tsx         ใหม่
app/<13 เส้นทาง>/page.tsx  โครง
components/ui/*.tsx        8 ตัวจาก Kernel
components/{TopNav,BottomNav,Icon,EmptyState}.tsx
lib/session.ts             getCurrentUser() + เมนูตามบทบาท
.env.example               เพิ่ม DEV_ROLE (หมายเหตุ: ลบใน Phase 1)
```
