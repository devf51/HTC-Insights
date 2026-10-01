# Frontend Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** สร้างโครงหน้าบ้านของ HTC Insights v2 ด้วยดีไซน์ซิสเต็ม Kernel — ธีม 2 แบบ เมนูตามบทบาท และทุกเส้นทางเปิดได้โดยไม่มี 404 ยังไม่มีข้อมูลจริง

**Architecture:** token และ CSS ของ component พอร์ตจาก Kernel แบบตรงตัว (`kn-*` classes อยู่ใน `@layer components` ให้ Tailwind utility ทับได้) component React เป็นเปลือกบาง ๆ ที่ใส่ class เหล่านั้น บทบาทผู้ใช้มาจาก `getCurrentUser()` จุดเดียว (ตอนนี้อ่าน `DEV_ROLE`) layout เป็น Server Component จึงรู้บทบาทก่อนส่ง HTML ธีมตั้งด้วยสคริปต์ inline ก่อนวาดหน้า

**Tech Stack:** Next.js 16.3 App Router · React 19.2 · Tailwind 4.3 · TypeScript · `next/font/google` · Material Symbols · `node --test` (Node 24 รัน `.ts` ได้ตรง)

**Spec:** `docs/superpowers/specs/2026-10-01-frontend-shell-design.md`
ดีไซน์ซิสเต็มต้นฉบับ: https://claude.ai/artifact/Wq9MxxeQt7y1AFbc9LGYCJ (`project/tokens.json`, `project/components/bundle.css`) — ค่าในแผนนี้คัดลอกมาแล้ว ไม่ต้องเปิดอ่านซ้ำ

## Global Constraints

- อ่าน `AGENTS.md`: Next.js 16 ต่างจากที่เคยรู้ — ดู `node_modules/next/dist/docs/` ก่อนใช้ API ที่ไม่แน่ใจ (`params` เป็น Promise, ใช้ `LayoutProps<'/'>` / `PageProps<'/x'>` แบบ global ได้)
- UI ภาษาไทยทั้งหมด `<html lang="th">` ไม่ใช้ emoji ไอคอนใช้ Material Symbols Outlined เท่านั้น
- สีทุกตัวเป็น hex/rgba — ห้าม `oklch`, `color-mix()` (html2canvas ใน Phase 7)
- น้ำหนักฟอนต์ 400 และ 500 เท่านั้น ห้ามตัวเอียง ข้อความไทยไม่เล็กกว่า 13px ห้าม letter-spacing กับข้อความไทย
- primary button ได้หนึ่งปุ่มต่อหน้าจอ ไม่มีปุ่มแคปซูล ไม่มีการ์ดเส้นสีด้านซ้าย ไม่มี gradient
- Server Component เป็นค่าเริ่มต้น `"use client"` เฉพาะ `TopNav`, `BottomNav`, `Tabs`, `ThemePicker`
- mobile-first ทดสอบที่ 375px ทุกหน้า breakpoint `md` = 768px ตรงกับ Kernel
- เนื้อหากว้างไม่เกิน 1200px ขอบข้าง 16px มือถือ / 48px เดสก์ท็อป ระยะส่วน 64px มือถือ / 96px เดสก์ท็อป
- **ห้าม commit เอง** — `CLAUDE.md` กำหนดให้ commit เฉพาะเมื่อผู้ใช้สั่ง จุด checkpoint ท้ายแต่ละ task คือรันตรวจ ไม่ใช่ commit
- เทสต์รันด้วย `node --test` ที่ root (ไม่ใส่ `tests/` — บน Windows/Node 24 รูปแบบนั้นพัง) ไฟล์เทสต์เป็น `.mjs` import `../lib/*.ts` ตรง ๆ ไฟล์ใน `lib/` ที่เทสต์ import ต้องไม่ import อะไรด้วย alias `@/`

## Review Focus

1. **`DEV_ROLE` หลุดไป production** — ถ้ามีคนตั้ง `DEV_ROLE=ADMIN` บน Vercel ต้องไม่มีผล ผู้ใช้ทุกคนเป็นผู้เยี่ยมชม → เทสต์ `devRole(..., "production")` ใน Task 3
2. **`DEV_ROLE` พิมพ์ผิด** (`student`, ` ADMIN`) — ต้องตกเป็นผู้เยี่ยมชมแบบเงียบ ไม่ใช่ crash หรือได้บทบาทแปลก → เทสต์ใน Task 3
3. **ลิงก์ในเมนูชี้ไปหน้าที่ไม่มี (404)** — ทุก href ของทุกบทบาท + ลิงก์ภายใน ต้องมี `page.tsx` → `tests/routes.test.mjs` ใน Task 6
4. **ป้ายภาษาไทยบนแถบล่างล้นที่ 375px** ("สถานประกอบการ" ยาวเกินช่อง 75px) → ใช้ `short` label + เทสต์ความยาวใน Task 3 และตรวจด้วยตาใน Task 7
5. **เมนูไฮไลต์ผิดหน้า** — `/` ต้องไม่ active ทุกหน้า, `/insightsx` ต้องไม่นับเป็น `/insights` → เทสต์ `isActive` ใน Task 3

---

## File Structure

```
app/globals.css                    tokens (2 ธีม) + Tailwind theme + ฐานของ body/ไอคอน     (เขียนใหม่)
components/ui/kernel.css           CSS component ของ Kernel ใน @layer components             (ใหม่)
app/layout.tsx                     ฟอนต์ สคริปต์ธีม TopNav/BottomNav/Footer                 (เขียนใหม่)
app/page.tsx                       หน้าแรกตามบทบาท                                         (เขียนใหม่)
app/login/page.tsx                 ปุ่ม Google แบบ disabled
app/settings/page.tsx              หน้าตั้งค่า
app/settings/ThemePicker.tsx       ตัวเลือกธีม (client)
app/<13 เส้นทาง>/page.tsx           หน้าโครง
components/ui/{Button,TextField,Card,Badge,Tabs,Table,SectionHeader,Band}.tsx   พอร์ต Kernel
components/{TopNav,BottomNav,Footer,Icon,EmptyState,PageShell}.tsx
lib/cx.ts                          รวม className
lib/nav.ts                         Role, เมนูตามบทบาท, isActive, devRole — pure ไม่มี import
lib/session.ts                     getCurrentUser()
tests/nav.test.mjs                 เทสต์ lib/nav.ts
tests/routes.test.mjs              ทุกลิงก์มีหน้ารองรับ
.env.example                       เพิ่ม DEV_ROLE
CLAUDE.md                          แก้คำสั่งรันเทสต์เป็น `node --test`
```

`PageShell` ไม่อยู่ในสเปก — เพิ่มเพราะ 16 หน้าใช้ wrapper เดียวกัน (container + SectionHeader + ระยะ) ไม่ใช่ abstraction ที่มี implementation เดียว แต่เป็นการรวมโค้ดซ้ำ 16 จุด

---

### Task 1: Tokens, ฟอนต์ และธีม

**Files:**
- Modify (เขียนทับ): `app/globals.css`
- Modify (เขียนทับ): `app/layout.tsx`
- Modify (เขียนทับชั่วคราว): `app/page.tsx`

**Interfaces:**
- Produces: คลาส Tailwind สี `bg-surface-000|100|200|band`, `text-ink`, `text-ink-muted`, `text-signal`, `bg-signal`, `bg-signal-tint`, `text-on-signal`, `border-line`, `border-line-strong`, `text-success|warning|danger`; ฟอนต์ `font-sans|display|mono`; ขนาด `text-h2|h3|body-lg|body|small|label|metric`; มุม `rounded-sm` 6px `rounded-md` 8px `rounded-lg` 14px; ตัวแปร CSS ดิบ `--ink`, `--signal`, `--space-1..24`, `--radius-*`, `--font-sans|display|mono` ที่ `kernel.css` ใช้; `data-theme="night"` บน element ใดก็ได้สลับเป็นธีมมืดภายในนั้น

- [ ] **Step 1: เขียน `app/globals.css` ใหม่ทั้งไฟล์**

```css
@import "tailwindcss";
@import "../components/ui/kernel.css";

/* ===== Kernel tokens — ค่าจาก project/tokens.json ห้ามแก้ค่าเอง =====
   :root = Paper (สว่าง) · [data-theme="night"] = Night (มืด)
   Band และ footer ตั้ง data-theme="night" บนตัวเองเพื่อเป็นเกาะมืดในทั้งสองธีม */
:root {
  --surface-000: #f4f4f1;
  --surface-100: #ffffff;
  --surface-200: #eaebe7;
  --surface-band: #000000;
  --line: #d9dbd5;
  --line-strong: #80847e;
  --ink: #15181b;
  --ink-muted: #565b60;
  --signal: #0f6b52;
  --signal-strong: #0a5541;
  --signal-tint: #e1efe9;
  --on-signal: #ffffff;
  --slate: #3d5f8f;
  --success: #3f6e1c;
  --warning: #8a5a00;
  --danger: #b3261e;
  --focus: var(--signal);
  --link: var(--signal);
  --scrim: rgba(22, 24, 28, 0.4);
  --pop-shadow: 0 12px 32px rgba(21, 24, 27, 0.12);
  color-scheme: light;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --space-16: 64px;
  --space-24: 96px;
}

[data-theme="night"] {
  --surface-000: #0e1114;
  --surface-100: #14181c;
  --surface-200: #1b2025;
  --surface-band: #000000;
  --line: #262c32;
  --line-strong: #68727c;
  --ink: #e8ebee;
  --ink-muted: #9aa3ad;
  --signal: #3fae8a;
  --signal-strong: #57c29e;
  --signal-tint: #12261f;
  --on-signal: #0b0e10;
  --slate: #8fa9d1;
  --success: #9ccc6b;
  --warning: #e0a63a;
  --danger: #f07a72;
  /* ประกาศซ้ำ: var() ถูกคำนวณตรงที่ประกาศ ถ้าไม่ซ้ำ Band จะได้ focus สีของ Paper */
  --focus: var(--signal);
  --link: var(--signal);
  --scrim: rgba(0, 0, 0, 0.6);
  --pop-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
  color-scheme: dark;
}

/* สี: inline เพื่อให้ utility อ้าง var(--ink) ตรง ๆ แล้วเปลี่ยนตามธีมของ element นั้น */
@theme inline {
  --color-surface-000: var(--surface-000);
  --color-surface-100: var(--surface-100);
  --color-surface-200: var(--surface-200);
  --color-surface-band: var(--surface-band);
  --color-line: var(--line);
  --color-line-strong: var(--line-strong);
  --color-ink: var(--ink);
  --color-ink-muted: var(--ink-muted);
  --color-signal: var(--signal);
  --color-signal-strong: var(--signal-strong);
  --color-signal-tint: var(--signal-tint);
  --color-on-signal: var(--on-signal);
  --color-slate: var(--slate);
  --color-success: var(--success);
  --color-warning: var(--warning);
  --color-danger: var(--danger);
}

/* static: ส่งออกทุกตัวไป :root เสมอ เพราะ kernel.css อ้าง var(--radius-md) ฯลฯ ตรง ๆ
   ระยะไม่ต้องกำหนด — สเกล 4px ของ Tailwind ตรงกับ Kernel (p-4 = 16px = space-4) */
@theme static {
  --font-sans: var(--font-plex-sans), var(--font-plex-thai), "Noto Sans Thai", system-ui, sans-serif;
  --font-display: var(--font-instrument), var(--font-trirong), Georgia, serif;
  --font-mono: var(--font-plex-mono), var(--font-plex-thai), ui-monospace, Consolas, monospace;

  --radius-none: 0px;
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 14px;
  --radius-full: 9999px;

  --text-h2: 26px;
  --text-h2--line-height: 36px;
  --text-h2--font-weight: 500;
  --text-h3: 18px;
  --text-h3--line-height: 28px;
  --text-h3--font-weight: 500;
  --text-body-lg: 18px;
  --text-body-lg--line-height: 30px;
  --text-body: 16px;
  --text-body--line-height: 26px;
  --text-small: 14px;
  --text-small--line-height: 22px;
  --text-label: 15px;
  --text-label--line-height: 22px;
  --text-label--font-weight: 500;
  --text-metric: 32px;
  --text-metric--line-height: 36px;
}

@layer base {
  body {
    font-family: var(--font-sans);
    font-size: 16px;
    line-height: 26px;
    background: var(--surface-000);
    color: var(--ink);
    -webkit-font-smoothing: antialiased;
    /* ไทยไม่มีช่องว่างระหว่างคำ ให้เบราว์เซอร์ตัดด้วยพจนานุกรม ห้าม break-all */
    word-break: normal;
    overflow-wrap: break-word;
  }
}

/* Material Symbols — เส้นบาง (wght 300) ใกล้กับเส้น 1.5px ของ Kernel
   ไม่อยู่ใน @layer: stylesheet ของ Google ตั้ง .material-symbols-outlined { font-size: 24px } แบบไม่มี layer
   ซึ่งชนะทุก layer — จึงเพิ่ม specificity ด้วย html ให้ชนะไม่ว่าไฟล์ไหนโหลดก่อน
   ผลข้างเคียง: utility ขนาดธรรมดาแพ้กฎนี้ ต้องใช้แบบ important เช่น !text-[24px] */
html .material-symbols-outlined {
  font-size: 20px;
  line-height: 1;
  font-variation-settings: "FILL" 0, "wght" 300, "opsz" 20;
  user-select: none;
}
html .material-symbols-outlined.icon-fill {
  font-variation-settings: "FILL" 1, "wght" 300, "opsz" 20;
}
```

- [ ] **Step 2: สร้าง `components/ui/kernel.css` เปล่าไว้ก่อน** (Task 2 เติมเนื้อหา — ต้องมีไฟล์ไม่งั้น `@import` พัง)

```css
/* Kernel component styles — เติมใน Task 2 */
```

- [ ] **Step 3: เขียน `app/layout.tsx` ใหม่ทั้งไฟล์** (ยังไม่มีเมนู — Task 4 เติม)

```tsx
import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Sans_Thai, Instrument_Serif, Trirong } from "next/font/google";
import "./globals.css";

const plexSans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-sans" });
const plexThai = IBM_Plex_Sans_Thai({ subsets: ["thai"], weight: ["400", "500"], variable: "--font-plex-thai" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono" });
const instrument = Instrument_Serif({ subsets: ["latin"], weight: "400", variable: "--font-instrument" });
const trirong = Trirong({ subsets: ["thai"], weight: "400", variable: "--font-trirong" });

export const metadata: Metadata = {
  title: "HTC Insights",
  description: "ฐานข้อมูลสถานประกอบการสำหรับนักศึกษาวิทยาลัยเทคนิคหาดใหญ่ ค้นหาที่ฝึกงาน อ่านรีวิวจากรุ่นพี่ และหาตำแหน่งงาน",
};

// viewport-fit=cover ทำให้ env(safe-area-inset-bottom) มีค่าบน iPhone — BottomNav ต้องใช้
export const viewport: Viewport = { viewportFit: "cover" };

// ตั้งธีมก่อนเบราว์เซอร์วาดหน้าแรก กันจอกระพริบ (node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md)
// ค่าที่เก็บ: "paper" | "night" | ไม่มี (= ตามเครื่อง) — ThemePicker ใช้กติกาเดียวกัน
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("theme");if(t!=="paper"&&t!=="night")t=matchMedia("(prefers-color-scheme: dark)").matches?"night":"paper";document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

const fontVars = [plexSans, plexThai, plexMono, instrument, trirong].map((f) => f.variable).join(" ");

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={fontVars} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {/* display=block: กันชื่อไอคอนโผล่เป็นตัวหนังสือระหว่างโหลด */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL@20,300,0..1&display=block"
        />
      </head>
      <body className="flex min-h-dvh flex-col">{children}</body>
    </html>
  );
}
```

- [ ] **Step 4: เขียน `app/page.tsx` ชั่วคราวเพื่อดู token** (Task 5 เขียนทับ)

```tsx
export default function Home() {
  return (
    <main className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 py-16 md:px-12">
      <h1 className="font-display text-[40px] leading-[56px]">ปู่ที่สุด ฤดูกู้คืน</h1>
      <p className="text-body-lg text-ink-muted">ข้อความรอง ink-muted บน surface-000</p>
      <div className="rounded-lg border border-line bg-surface-100 p-6">การ์ด surface-100</div>
      <p className="text-signal">ลิงก์สี signal</p>
      <span className="material-symbols-outlined">home</span>
      <section data-theme="night" className="bg-surface-band p-6 text-ink">เกาะมืดในทั้งสองธีม</section>
    </main>
  );
}
```

- [ ] **Step 5: รันตรวจ**

Run: `npm run build`
Expected: build ผ่าน ไม่มี error ของ CSS หรือ font

Run: `npm run dev` แล้วเปิด http://localhost:3000
Expected:
- หัวเรื่องไทยเป็น Trirong (มีหัว) สระบนล่างไม่ถูกตัด
- ไอคอนบ้านขึ้นเป็นรูป ไม่ใช่คำว่า "home"
- DevTools Console รัน `localStorage.setItem("theme","night"); location.reload()` → พื้นเปลี่ยนเป็น `#0e1114` ทันทีโดยไม่เห็นพื้นสว่างแวบ ไม่มี hydration error ใน console
- รัน `localStorage.removeItem("theme"); location.reload()` → ตามธีมของเครื่อง
- แถบ "เกาะมืด" เป็นพื้นดำตัวอักษรสว่างในทั้งสองธีม

- [ ] **Step 6: Checkpoint** — ห้าม commit (ดู Global Constraints)

---

### Task 2: Component ของ Kernel

**Files:**
- Modify (เขียนทับ): `components/ui/kernel.css`
- Create: `lib/cx.ts`
- Create: `components/ui/Button.tsx`, `TextField.tsx`, `Card.tsx`, `Badge.tsx`, `Tabs.tsx`, `Table.tsx`, `SectionHeader.tsx`, `Band.tsx`
- Modify (ชั่วคราว): `app/page.tsx`

**Interfaces:**
- Consumes: ตัวแปร CSS จาก Task 1
- Produces:
  - `cx(...c: (string | false | null | undefined)[]): string` จาก `@/lib/cx`
  - `buttonClass(variant?: "primary"|"secondary"|"ghost"|"danger", size?: "md"|"sm", className?: string): string` และ `Button(props: ButtonProps)` จาก `@/components/ui/Button`
  - `TextField({ label?, hint?, error?, ...input })` · `Card({ lang?, eyebrow?, metric?, title?, featured?, footer?, children?, className? })` · `Badge({ tone?: "neutral"|"signal"|"success"|"warning"|"danger", children, className? })` · `Tabs({ items: {id,label}[], value?, defaultValue?, onChange?, className? })` (client) · `Table({ lang?, columns: {key,label,numeric?}[], rows: Record<string, ReactNode>[], className? })` · `SectionHeader({ lang?, eyebrow?, title, lede?, display?, level?: 1|2, actions?, className? })` · `Band({ lang?, children?, className? })`
  - คลาส `.kn-link` (ลิงก์ในเนื้อหา) และ `.kn-nobr`

ข้อที่ต่างจาก bundle ของ Kernel โดยตั้งใจ (นอกนั้นคัดลอกตรง):
- ทุกกฎอยู่ใน `@layer components` — utility ของ Tailwind ทับได้ (เช่น `<Band className="py-12">`)
- `.kn-table-wrap` ใช้ `overflow-x: auto` แทน `hidden` — ตารางบนมือถือเลื่อนแนวนอนได้ (บทเรียน v1)
- `.kn-tab` เพิ่ม `white-space: nowrap` — README ของ Kernel: แท็บไม่ขึ้นบรรทัดใหม่
- เพิ่ม `.kn-link` — README: ลิงก์สี `signal` ขีดเส้นใต้เมื่อ hover
- `SectionHeader` เพิ่ม `level` — หัวหน้าเพจต้องเป็น `<h1>` โดยไม่ต้องใช้ขนาด display
- ตัด CodeBlock และ `.kn-stack`/`.kn-row` (ใช้แค่ในหน้าตัวอย่างของ Kernel)

- [ ] **Step 1: เขียน `components/ui/kernel.css` ทั้งไฟล์**

```css
/* Kernel — component styles คัดลอกจาก project/components/bundle.css
   ต่างจากต้นฉบับ: อยู่ใน @layer components, table เลื่อนแนวนอนได้, tab ไม่ตัดบรรทัด, เพิ่ม .kn-link */
@layer components {
  .kn-num { font-variant-numeric: tabular-nums; }
  .kn-nobr { white-space: nowrap; }
  .kn-card, .kn-section, .kn-field { word-break: normal; overflow-wrap: break-word; line-break: auto; hyphens: manual; }
  .kn-section-title, .kn-card-title { text-wrap: balance; }
  .kn-section-lede, .kn-card-body { text-wrap: pretty; }

  /* focus — วงแหวนเดียวสำหรับทุกสิ่งที่กดได้ */
  .kn-btn:focus-visible, .kn-input:focus-visible, .kn-tab:focus-visible, .kn-nav a:focus-visible, .kn-link:focus-visible {
    outline: 2px solid var(--focus); outline-offset: 2px;
  }

  .kn-link { color: var(--link); text-decoration: none; }
  .kn-link:hover { text-decoration: underline; }

  .kn-eyebrow { font-family: var(--font-mono); font-size: 12px; line-height: 16px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--ink-muted); margin: 0; }

  .kn-btn { font: inherit; font-size: 15px; line-height: 22px; font-weight: 500; display: inline-flex; align-items: center; justify-content: center; gap: var(--space-2);
    height: 40px; padding: 0 var(--space-4); border-radius: var(--radius-md); border: 1px solid transparent; background: transparent; color: var(--ink); cursor: pointer; white-space: nowrap; text-decoration: none;
    transition: background-color .12s ease, border-color .12s ease, transform .08s ease; }
  .kn-btn:active { transform: scale(0.98); }
  .kn-btn[disabled] { opacity: .45; cursor: not-allowed; transform: none; }
  .kn-btn-sm { height: 32px; padding: 0 var(--space-3); font-size: 14px; }
  .kn-btn-primary { background: var(--signal); color: var(--on-signal); }
  .kn-btn-primary:hover:not([disabled]) { background: var(--signal-strong); }
  .kn-btn-secondary { border-color: var(--line-strong); }
  .kn-btn-secondary:hover:not([disabled]) { background: var(--surface-200); }
  .kn-btn-ghost:hover:not([disabled]) { background: var(--surface-200); }
  .kn-btn-danger { border-color: var(--line-strong); color: var(--danger); }
  .kn-btn-danger:hover:not([disabled]) { background: var(--surface-200); }

  .kn-field { display: flex; flex-direction: column; gap: var(--space-2); max-width: 360px; }
  .kn-field-label { font-size: 15px; line-height: 20px; font-weight: 500; color: var(--ink); }
  .kn-input { font: inherit; font-size: 16px; line-height: 24px; height: 44px; box-sizing: border-box; padding: 0 var(--space-4); border-radius: var(--radius-md);
    border: 1px solid var(--line-strong); background: var(--surface-100); color: var(--ink); }
  .kn-input::placeholder { color: var(--ink-muted); }
  .kn-field-hint { font-size: 14px; line-height: 22px; color: var(--ink-muted); margin: 0; }
  .kn-field-error .kn-input { border-color: var(--danger); }
  .kn-field-error .kn-field-hint { color: var(--danger); }

  .kn-card { background: var(--surface-100); border: 1px solid var(--line); border-radius: var(--radius-lg); padding: var(--space-6); display: flex; flex-direction: column; gap: var(--space-3); color: var(--ink); }
  .kn-card-featured { border-color: var(--signal); }
  .kn-card-title { margin: 0; font-size: 18px; line-height: 28px; font-weight: 500; }
  .kn-card-body { margin: 0; font-size: 16px; line-height: 26px; color: var(--ink-muted); }
  .kn-card-metric { font-family: var(--font-mono); font-size: 32px; line-height: 36px; letter-spacing: -0.64px; font-variant-numeric: tabular-nums; margin: 0; }
  .kn-card-footer { display: flex; gap: var(--space-2); align-items: center; padding-top: var(--space-3); margin-top: auto; border-top: 1px solid var(--line); }

  .kn-badge { display: inline-flex; align-items: center; gap: var(--space-2); height: 24px; padding: 0 10px; border-radius: var(--radius-full); background: var(--surface-200); color: var(--ink); font-size: 13px; line-height: 18px; white-space: nowrap; }
  .kn-badge-dot { width: 8px; height: 8px; border-radius: var(--radius-full); background: var(--ink-muted); flex: none; }
  .kn-badge-signal .kn-badge-dot { background: var(--signal); }
  .kn-badge-success .kn-badge-dot { background: var(--success); }
  .kn-badge-warning .kn-badge-dot { background: var(--warning); }
  .kn-badge-danger .kn-badge-dot { background: var(--danger); }

  .kn-tabs { display: flex; gap: var(--space-6); border-bottom: 1px solid var(--line); }
  .kn-tab { font: inherit; font-size: 15px; line-height: 20px; font-weight: 500; background: none; border: 0; padding: var(--space-3) 0; margin-bottom: -1px; color: var(--ink-muted); border-bottom: 2px solid transparent; cursor: pointer; white-space: nowrap; }
  .kn-tab:hover { color: var(--ink); }
  .kn-tab[aria-selected="true"] { color: var(--ink); border-bottom-color: var(--signal); }

  .kn-table-wrap { border: 1px solid var(--line); border-radius: var(--radius-lg); overflow-x: auto; background: var(--surface-100); }
  .kn-table { width: 100%; border-collapse: collapse; font-size: 14px; line-height: 22px; }
  .kn-table th { background: var(--surface-200); color: var(--ink-muted); font-family: var(--font-mono); font-weight: 400; font-size: 12px; line-height: 16px; letter-spacing: 1.4px; text-transform: uppercase; text-align: left; padding: var(--space-3) var(--space-4); white-space: nowrap; }
  .kn-table td { padding: var(--space-3) var(--space-4); border-top: 1px solid var(--line); color: var(--ink); }
  .kn-table .kn-right { text-align: right; font-variant-numeric: tabular-nums; }
  .kn-table tbody tr:hover td { background: var(--surface-200); }

  .kn-section { display: flex; flex-direction: column; gap: var(--space-3); max-width: 720px; }
  .kn-section-title { margin: 0; font-family: var(--font-display); font-weight: 400; font-size: 44px; line-height: 52px; letter-spacing: -0.66px; color: var(--ink); }
  .kn-section-title.kn-display { font-size: 64px; line-height: 68px; letter-spacing: -1.28px; }
  .kn-section-lede { margin: 0; font-size: 18px; line-height: 30px; color: var(--ink-muted); }
  .kn-section-actions { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-top: var(--space-3); }

  .kn-band { background: var(--surface-band); color: var(--ink); padding: var(--space-24) var(--space-12); border-radius: var(--radius-none); }

  .kn-nav { display: flex; align-items: center; gap: var(--space-8); height: 64px; padding: 0 var(--space-12); background: var(--surface-000); border-bottom: 1px solid var(--line); box-sizing: border-box; }
  .kn-nav-brand { font-family: var(--font-display); font-size: 26px; line-height: 1; color: var(--ink); text-decoration: none; white-space: nowrap; }
  .kn-nav-links { display: flex; gap: var(--space-6); flex: 1; }
  .kn-nav-links a { font-size: 14px; line-height: 22px; color: var(--ink-muted); text-decoration: none; white-space: nowrap; }
  .kn-nav-links a:hover, .kn-nav-links a[aria-current="page"] { color: var(--ink); }

  /* ---------- ภาษาไทย (:lang(th)) ---------- */
  .kn-eyebrow:lang(th), .kn-table th:lang(th) {
    font-family: var(--font-sans); font-size: 13px; line-height: 20px; font-weight: 500; letter-spacing: 0; text-transform: none;
  }
  .kn-section-title:lang(th) { font-size: 40px; line-height: 56px; letter-spacing: 0; }
  .kn-section-title.kn-display:lang(th) { font-size: 56px; line-height: 76px; letter-spacing: 0; }
  .kn-btn:lang(th), .kn-tab:lang(th), .kn-field-label:lang(th) { line-height: 22px; }
  .kn-badge:lang(th) { line-height: 20px; }
  .kn-input:lang(th) { line-height: 26px; }
  .kn-table td:lang(th) { line-height: 24px; }
  .kn-card-body:lang(th), .kn-section-lede:lang(th) { line-height: 1.7; }

  @media (max-width: 767px) {
    .kn-section-title.kn-display:lang(th) { font-size: 36px; line-height: 50px; }
    .kn-nav { padding: 0 var(--space-4); gap: var(--space-4); }
    .kn-nav-links { display: none; }
    .kn-band { padding: var(--space-16) var(--space-4); }
    .kn-section-title.kn-display { font-size: 40px; line-height: 46px; letter-spacing: -0.8px; }
  }
}
```

- [ ] **Step 2: สร้าง `lib/cx.ts`**

```ts
export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
```

- [ ] **Step 3: สร้าง `components/ui/Button.tsx`**

```tsx
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "sm";

/** ใช้กับ <Link> ที่ต้องหน้าตาเป็นปุ่ม — primary ได้หนึ่งปุ่มต่อหน้าจอ */
export function buttonClass(variant: Variant = "secondary", size: Size = "md", className?: string) {
  return cx("kn-btn", `kn-btn-${variant}`, size === "sm" && "kn-btn-sm", className);
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
}

export function Button({ variant, size, icon, className, children, type = "button", ...rest }: ButtonProps) {
  return (
    <button type={type} className={buttonClass(variant, size, className)} {...rest}>
      {icon}
      {children}
    </button>
  );
}
```

- [ ] **Step 4: สร้าง `components/ui/TextField.tsx`**

```tsx
import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cx } from "@/lib/cx";

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  hint?: ReactNode;
  /** แทนที่ hint และเปลี่ยนขอบเป็น danger — ต้องบอกวิธีแก้ ไม่ใช่แค่ว่าผิด */
  error?: ReactNode;
}

export function TextField({ label, hint, error, className, id, ...rest }: TextFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const msg = error ?? hint;
  return (
    <div className={cx("kn-field", error ? "kn-field-error" : null, className)}>
      {label && (
        <label className="kn-field-label" htmlFor={fieldId}>
          {label}
        </label>
      )}
      <input
        id={fieldId}
        className="kn-input"
        aria-invalid={error ? true : undefined}
        aria-describedby={msg ? `${fieldId}-msg` : undefined}
        {...rest}
      />
      {msg && (
        <p className="kn-field-hint" id={`${fieldId}-msg`}>
          {msg}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 5: สร้าง `components/ui/Card.tsx`**

```tsx
import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

export interface CardProps {
  lang?: string;
  eyebrow?: string;
  metric?: ReactNode;
  title?: ReactNode;
  /** ขอบสี signal — หนึ่งการ์ดต่อกลุ่ม */
  featured?: boolean;
  footer?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function Card({ lang, eyebrow, metric, title, featured, footer, children, className }: CardProps) {
  return (
    <article lang={lang} className={cx("kn-card", featured && "kn-card-featured", className)}>
      {eyebrow && <p className="kn-eyebrow">{eyebrow}</p>}
      {metric && <p className="kn-card-metric">{metric}</p>}
      {title && <h3 className="kn-card-title">{title}</h3>}
      {children && <div className="kn-card-body">{children}</div>}
      {footer && <div className="kn-card-footer">{footer}</div>}
    </article>
  );
}
```

- [ ] **Step 6: สร้าง `components/ui/Badge.tsx`**

```tsx
import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

export interface BadgeProps {
  tone?: "neutral" | "signal" | "success" | "warning" | "danger";
  /** คำสถานะ ต้องมีเสมอ — สีอย่างเดียวไม่พอ */
  children: ReactNode;
  className?: string;
}

export function Badge({ tone = "neutral", children, className }: BadgeProps) {
  return (
    <span className={cx("kn-badge", `kn-badge-${tone}`, className)}>
      <span className="kn-badge-dot" aria-hidden="true" />
      {children}
    </span>
  );
}
```

- [ ] **Step 7: สร้าง `components/ui/Tabs.tsx`**

```tsx
"use client";

import { useState, type ReactNode } from "react";
import { cx } from "@/lib/cx";

export interface TabsProps {
  items: { id: string; label: ReactNode }[];
  value?: string;
  defaultValue?: string;
  onChange?: (id: string) => void;
  className?: string;
}

/** แท็บสลับมุมมองในหน้าเดียว — ห่อด้วย div เลื่อนแนวนอนได้ เพราะป้ายไทยหลายแท็บล้น 375px */
export function Tabs({ items, value, defaultValue, onChange, className }: TabsProps) {
  const [own, setOwn] = useState(defaultValue ?? items[0]?.id);
  const selected = value ?? own;
  return (
    <div className={cx("overflow-x-auto", className)}>
      <div className="kn-tabs w-max min-w-full" role="tablist">
        {items.map((it) => (
          <button
            key={it.id}
            type="button"
            role="tab"
            className="kn-tab"
            aria-selected={it.id === selected}
            onClick={() => {
              setOwn(it.id);
              onChange?.(it.id);
            }}
          >
            {it.label}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 8: สร้าง `components/ui/Table.tsx`**

```tsx
import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

export interface TableProps {
  lang?: string;
  /** numeric: ชิดขวา ใช้ตัวเลขความกว้างเท่ากัน */
  columns: { key: string; label: ReactNode; numeric?: boolean }[];
  rows: Record<string, ReactNode>[];
  className?: string;
}

export function Table({ lang, columns, rows, className }: TableProps) {
  return (
    <div lang={lang} className={cx("kn-table-wrap", className)}>
      <table className="kn-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={c.numeric ? "kn-right" : undefined}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={String(r.id ?? i)}>
              {columns.map((c) => (
                <td key={c.key} className={c.numeric ? "kn-right" : undefined}>
                  {r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 9: สร้าง `components/ui/SectionHeader.tsx`**

```tsx
import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

export interface SectionHeaderProps {
  lang?: string;
  /** รูปแบบ "NN · คำ" หรือชื่อหมวด */
  eyebrow?: string;
  title: ReactNode;
  lede?: ReactNode;
  /** ขนาด display — ครั้งเดียวต่อหน้า */
  display?: boolean;
  /** ระดับหัวเรื่อง ค่าเริ่มต้น: display → h1, นอกนั้น h2 หัวของหน้าให้ส่ง 1 */
  level?: 1 | 2;
  actions?: ReactNode;
  className?: string;
}

export function SectionHeader({ lang, eyebrow, title, lede, display, level, actions, className }: SectionHeaderProps) {
  const Heading = (level ?? (display ? 1 : 2)) === 1 ? "h1" : "h2";
  return (
    <header lang={lang} className={cx("kn-section", className)}>
      {eyebrow && <p className="kn-eyebrow">{eyebrow}</p>}
      <Heading className={cx("kn-section-title", display && "kn-display")}>{title}</Heading>
      {lede && <p className="kn-section-lede">{lede}</p>}
      {actions && <div className="kn-section-actions">{actions}</div>}
    </header>
  );
}
```

- [ ] **Step 10: สร้าง `components/ui/Band.tsx`**

```tsx
import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

/** แถบดำเต็มความกว้าง บังคับธีม Night ข้างในเสมอ — ห้ามวางติดกันสองแถบ */
export function Band({ lang, children, className }: { lang?: string; children?: ReactNode; className?: string }) {
  return (
    <section data-theme="night" lang={lang} className={cx("kn-band", className)}>
      {children}
    </section>
  );
}
```

- [ ] **Step 11: เขียน `app/page.tsx` ชั่วคราวเป็นหน้ารวม component** (Task 5 เขียนทับ)

```tsx
import { Badge } from "@/components/ui/Badge";
import { Band } from "@/components/ui/Band";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Table } from "@/components/ui/Table";
import { Tabs } from "@/components/ui/Tabs";
import { TextField } from "@/components/ui/TextField";

export default function Home() {
  return (
    <main className="flex flex-col gap-8">
      <Band>
        <SectionHeader display eyebrow="01 · ทดสอบ" title="ปู่ที่สุด ฤดูกู้คืน" lede="ย่อหน้านำสี ink-muted ในแถบดำ" />
      </Band>
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 md:px-12">
        <div className="flex flex-wrap gap-2">
          <Button variant="primary">บันทึก</Button>
          <Button>ปู่ที่สุด</Button>
          <Button variant="ghost">ยกเลิก</Button>
          <Button variant="danger">ลบ</Button>
          <Button variant="primary" disabled>ปิดอยู่</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>รอตรวจ</Badge>
          <Badge tone="success">อนุมัติ</Badge>
          <Badge tone="warning">ฤดูกู้คืน</Badge>
          <Badge tone="danger">ปฏิเสธ</Badge>
        </div>
        <TextField label="อีเมล" placeholder="name@example.com" hint="ใช้อีเมลวิทยาลัย" />
        <TextField label="รหัสนักศึกษา" error="รหัสต้องมี 11 หลัก ลองตรวจจากบัตรนักศึกษา" />
        <Tabs items={[{ id: "a", label: "ทั้งหมด" }, { id: "b", label: "ถามตอบ" }, { id: "c", label: "เล่าประสบการณ์" }, { id: "d", label: "เทคนิค" }, { id: "e", label: "หาเพื่อนฝึกงาน" }]} />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card eyebrow="01 · ค้นหา" title="การ์ดธรรมดา">เนื้อหาการ์ด</Card>
          <Card featured metric="4.6" title="การ์ดเด่น">ขอบสี signal</Card>
          <Card title="มี footer" footer={<Badge tone="signal">ใหม่</Badge>}>มีเส้นคั่น</Card>
        </div>
        <Table
          columns={[{ key: "name", label: "ชื่อ" }, { key: "email", label: "อีเมล" }, { key: "role", label: "บทบาท" }, { key: "n", label: "รีวิว", numeric: true }]}
          rows={[{ id: "1", name: "สมชาย ใจดี", email: "somchai@example.com", role: <Badge tone="signal">นักศึกษา</Badge>, n: 12 }]}
        />
      </div>
    </main>
  );
}
```

- [ ] **Step 12: รันตรวจ**

Run: `npm run build`
Expected: ผ่าน ไม่มี type error

Run: `npm run dev` เปิด http://localhost:3000 ทั้งธีม Paper และ Night (สลับด้วย `localStorage` ตาม Task 1 Step 5)
Expected:
- ปุ่มสูง 40px มุม 8px "ปู่ที่สุด" ไม่ถูกตัดบนหรือล่าง ปุ่ม disabled จาง
- Badge "ฤดูกู้คืน" สระล่างไม่ถูกตัด
- กด Tab บนคีย์บอร์ดแล้วเห็นวงแหวนโฟกัสสี signal บนปุ่ม แท็บ ช่องกรอก
- ที่ 375px (DevTools) แท็บเลื่อนแนวนอนได้ ตารางเลื่อนแนวนอนได้ หน้าทั้งหน้าไม่เลื่อนแนวนอน
- หัวตารางไทยไม่เป็นตัว mono/ไม่ถ่างช่องไฟ

- [ ] **Step 13: Checkpoint** — ห้าม commit

---

### Task 3: บทบาทและเมนู (`lib/nav.ts`, `lib/session.ts`)

**Files:**
- Create: `lib/nav.ts`
- Create: `lib/session.ts`
- Test: `tests/nav.test.mjs`
- Modify: `.env.example` (ต่อท้าย)
- Modify: `CLAUDE.md:65` (คำสั่งรันเทสต์)

**Interfaces:**
- Produces (จาก `@/lib/nav`):
  - `type Role = "STUDENT" | "EXTERNAL" | "ADMIN"`
  - `type NavItem = { href: string; label: string; short?: string; icon: string }` — `short` ใช้บนแถบล่าง
  - `type NavAction = { href: string; label: string }`
  - `navFor(role: Role | null): NavItem[]`
  - `actionFor(role: Role | null): NavAction | null`
  - `isActive(pathname: string, href: string): boolean`
  - `devRole(value: string | undefined, nodeEnv: string | undefined): Role | null`
- Produces (จาก `@/lib/session`): `type CurrentUser = { role: Role }`, `getCurrentUser(): Promise<CurrentUser | null>`

- [ ] **Step 1: เขียนเทสต์ที่ล้มเหลว `tests/nav.test.mjs`**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { actionFor, devRole, isActive, navFor } from "../lib/nav.ts";

const ROLES = [null, "STUDENT", "EXTERNAL", "ADMIN"];

test("devRole รับเฉพาะชื่อบทบาทตัวพิมพ์ใหญ่ที่ถูกต้อง ค่าอื่นเป็นผู้เยี่ยมชม", () => {
  assert.equal(devRole("STUDENT", "development"), "STUDENT");
  assert.equal(devRole("EXTERNAL", "development"), "EXTERNAL");
  assert.equal(devRole("ADMIN", "development"), "ADMIN");
  assert.equal(devRole("student", "development"), null);
  assert.equal(devRole(" ADMIN", "development"), null);
  assert.equal(devRole("", "development"), null);
  assert.equal(devRole(undefined, "development"), null);
  assert.equal(devRole("SUPERADMIN", "development"), null);
});

test("devRole ไม่มีผลบน production แม้ตั้ง ADMIN ไว้", () => {
  assert.equal(devRole("ADMIN", "production"), null);
  assert.equal(devRole("STUDENT", "production"), null);
});

test("เมนูแต่ละบทบาทตรงตามสเปก", () => {
  const hrefs = (r) => navFor(r).map((i) => i.href);
  assert.deepEqual(hrefs(null), ["/", "/jobs"]);
  assert.deepEqual(hrefs("STUDENT"), ["/", "/insights", "/community", "/jobs", "/profile"]);
  assert.deepEqual(hrefs("EXTERNAL"), ["/", "/jobs", "/employer/register", "/profile"]);
  assert.deepEqual(hrefs("ADMIN"), ["/", "/insights", "/community", "/jobs", "/admin"]);
});

test("ไม่มีบทบาทไหนมีลิงก์เกิน 5 (กฎ TopNav ของ Kernel และความกว้างแถบล่าง)", () => {
  for (const r of ROLES) assert.ok(navFor(r).length <= 5, String(r));
});

test("ปุ่มขวาบน: ผู้เยี่ยมชมไปเข้าสู่ระบบ ผู้ดูแลไปโปรไฟล์ นอกนั้นไม่มี", () => {
  assert.equal(actionFor(null)?.href, "/login");
  assert.equal(actionFor("ADMIN")?.href, "/profile");
  assert.equal(actionFor("STUDENT"), null);
  assert.equal(actionFor("EXTERNAL"), null);
});

test("ป้ายบนแถบล่างไม่เกิน 8 ตัวอักษร ไม่งั้นล้นช่องที่ 375px", () => {
  for (const r of ROLES) {
    for (const i of navFor(r)) {
      const label = i.short ?? i.label;
      assert.ok([...label].length <= 8, `"${label}" ยาวเกิน`);
    }
  }
});

test("isActive: หน้าแรกต้องตรงเป๊ะ หน้าอื่นนับหน้าย่อยด้วย", () => {
  assert.equal(isActive("/", "/"), true);
  assert.equal(isActive("/jobs", "/"), false);
  assert.equal(isActive("/jobs", "/jobs"), true);
  assert.equal(isActive("/insights/123", "/insights"), true);
  assert.equal(isActive("/insightsx", "/insights"), false);
  assert.equal(isActive("/admin/users", "/admin"), true);
});
```

- [ ] **Step 2: รันให้เห็นว่าล้ม**

Run: `node --test`
Expected: FAIL — `Cannot find module ... lib/nav.ts`

- [ ] **Step 3: เขียน `lib/nav.ts`** (ห้าม import อะไร — เทสต์ import ไฟล์นี้ตรงด้วย Node)

```ts
export type Role = "STUDENT" | "EXTERNAL" | "ADMIN";
/** short: ป้ายบนแถบล่างมือถือ ใส่เมื่อ label ยาวเกินช่อง */
export type NavItem = { href: string; label: string; short?: string; icon: string };
export type NavAction = { href: string; label: string };

const HOME: NavItem = { href: "/", label: "หน้าแรก", icon: "home" };
const INSIGHTS: NavItem = { href: "/insights", label: "สถานประกอบการ", short: "บริษัท", icon: "apartment" };
const COMMUNITY: NavItem = { href: "/community", label: "ชุมชน", icon: "forum" };
const JOBS: NavItem = { href: "/jobs", label: "ตำแหน่งงาน", short: "หางาน", icon: "work" };
const POST_JOB: NavItem = { href: "/employer/register", label: "ลงประกาศ", icon: "add_business" };
const PROFILE: NavItem = { href: "/profile", label: "โปรไฟล์", icon: "person" };
const ADMIN: NavItem = { href: "/admin", label: "ผู้ดูแล", icon: "shield_person" };

/** เมนูหลัก ใช้ทั้ง TopNav (จอกว้าง) และ BottomNav (มือถือ) — ไม่เกิน 5 รายการ */
export function navFor(role: Role | null): NavItem[] {
  switch (role) {
    case "STUDENT":
      return [HOME, INSIGHTS, COMMUNITY, JOBS, PROFILE];
    case "EXTERNAL":
      return [HOME, JOBS, POST_JOB, PROFILE];
    case "ADMIN":
      return [HOME, INSIGHTS, COMMUNITY, JOBS, ADMIN];
    default:
      return [HOME, JOBS];
  }
}

/** ปุ่มเดียวมุมขวาบนของ TopNav (แสดงทั้งมือถือและจอกว้าง) */
export function actionFor(role: Role | null): NavAction | null {
  if (role === null) return { href: "/login", label: "เข้าสู่ระบบ" };
  if (role === "ADMIN") return { href: "/profile", label: "โปรไฟล์" };
  return null;
}

/** หน้าแรกต้องตรงเป๊ะ ไม่งั้น active ทุกหน้า ส่วนอื่นนับหน้าย่อยด้วย */
export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

/**
 * แปลง DEV_ROLE เป็นบทบาท ค่าที่ไม่รู้จักหรือรันบน production = ผู้เยี่ยมชม
 * ponytail: ชั่วคราวจนกว่า Auth.js จะมาใน Phase 1 — ลบฟังก์ชันนี้และ DEV_ROLE ทิ้งตอนนั้น
 */
export function devRole(value: string | undefined, nodeEnv: string | undefined): Role | null {
  if (nodeEnv === "production") return null;
  return value === "STUDENT" || value === "EXTERNAL" || value === "ADMIN" ? value : null;
}
```

- [ ] **Step 4: รันให้ผ่าน**

Run: `node --test`
Expected: PASS ทั้ง 7 เทสต์

- [ ] **Step 5: เขียน `lib/session.ts`**

```ts
import { devRole, type Role } from "./nav";

export type CurrentUser = { role: Role };

/**
 * ผู้ใช้ที่กำลังใช้งาน — จุดเดียวของทั้งระบบที่ตอบคำถามนี้
 * ตอนนี้อ่าน DEV_ROLE จาก .env.local เพื่อดูหน้าตาแต่ละบทบาท
 * Phase 1: เปลี่ยนไส้ในเป็น auth() ของ Auth.js โดยคง signature เดิม
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const role = devRole(process.env.DEV_ROLE, process.env.NODE_ENV);
  return role ? { role } : null;
}
```

- [ ] **Step 6: ต่อท้าย `.env.example`**

```
# --- ชั่วคราว: ดูหน้าตาแต่ละบทบาทระหว่างยังไม่มีระบบล็อกอิน (ลบใน Phase 1) ---
# STUDENT | EXTERNAL | ADMIN — เว้นว่าง = ผู้เยี่ยมชม ไม่มีผลบน production
DEV_ROLE=""
```

- [ ] **Step 7: แก้คำสั่งเทสต์ใน `CLAUDE.md`** — บรรทัด `node --test tests/           # รันเทสต์` เปลี่ยนเป็น

```
node --test                  # รันเทสต์ทั้งหมดใน tests/ (อย่าใส่ tests/ ต่อท้าย พังบน Windows)
```

- [ ] **Step 8: Checkpoint** — `node --test` ผ่าน, `npm run build` ผ่าน ห้าม commit

---

### Task 4: Layout — TopNav, BottomNav, Footer

**Files:**
- Create: `components/Icon.tsx`, `components/TopNav.tsx`, `components/BottomNav.tsx`, `components/Footer.tsx`
- Modify: `app/layout.tsx` (ส่วน import, `RootLayout`)

**Interfaces:**
- Consumes: `navFor`, `actionFor`, `isActive`, `NavItem`, `NavAction` จาก `@/lib/nav` · `getCurrentUser` จาก `@/lib/session` · `buttonClass` จาก `@/components/ui/Button` · `Band` · `cx`
- Produces: `Icon({ name: string; filled?: boolean; className?: string })` จาก `@/components/Icon` · `TopNav({ links: NavItem[]; action: NavAction | null })` · `BottomNav({ links: NavItem[] })` · `Footer()`

- [ ] **Step 1: สร้าง `components/Icon.tsx`**

```tsx
import { cx } from "@/lib/cx";

/** Material Symbols Outlined — name คือชื่อไอคอน เช่น "home" ดูได้ที่ fonts.google.com/icons */
export function Icon({ name, filled, className }: { name: string; filled?: boolean; className?: string }) {
  return (
    <span aria-hidden="true" className={cx("material-symbols-outlined", filled && "icon-fill", className)}>
      {name}
    </span>
  );
}
```

- [ ] **Step 2: สร้าง `components/TopNav.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonClass } from "@/components/ui/Button";
import { isActive, type NavAction, type NavItem } from "@/lib/nav";

/** แถบบน 64px — ต่ำกว่า 768px ซ่อนลิงก์ (kernel.css) เหลือชื่อแบรนด์และปุ่ม */
export function TopNav({ links, action }: { links: NavItem[]; action: NavAction | null }) {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40">
      <nav className="kn-nav" aria-label="เมนูหลัก">
        <Link href="/" className="kn-nav-brand" lang="en">
          HTC Insights
        </Link>
        <div className="kn-nav-links">
          {links.map((l) => (
            <Link key={l.href} href={l.href} aria-current={isActive(pathname, l.href) ? "page" : undefined}>
              {l.label}
            </Link>
          ))}
        </div>
        {action && (
          <Link href={action.href} className={buttonClass("secondary", "sm", "ml-auto")}>
            {action.label}
          </Link>
        )}
      </nav>
    </header>
  );
}
```

- [ ] **Step 3: สร้าง `components/BottomNav.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Icon";
import { cx } from "@/lib/cx";
import { isActive, type NavItem } from "@/lib/nav";

/** แถบล่างเฉพาะมือถือ — เผื่อขอบล่าง iPhone ด้วย safe-area (layout ตั้ง viewport-fit=cover แล้ว) */
export function BottomNav({ links }: { links: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="เมนูหลัก"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface-000 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="flex">
        {links.map((l) => {
          const active = isActive(pathname, l.href);
          return (
            <li key={l.href} className="flex-1">
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "flex h-16 flex-col items-center justify-center gap-1 text-[13px] leading-5",
                  active ? "text-signal" : "text-ink-muted",
                )}
              >
                <Icon name={l.icon} filled={active} className="!text-[24px]" />
                <span className="kn-nobr">{l.short ?? l.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
```

หมายเหตุ: `!text-[24px]` (important) จำเป็น — กฎไอคอนใน `globals.css` ไม่อยู่ใน layer (ดูคอมเมนต์ที่นั่น) utility ธรรมดาจึงแพ้

- [ ] **Step 4: สร้าง `components/Footer.tsx`**

```tsx
import Link from "next/link";
import { Band } from "@/components/ui/Band";

/** ท้ายหน้า — ทางเข้า /settings ของทุกบทบาทรวมผู้เยี่ยมชม */
export function Footer() {
  return (
    <footer>
      <Band className="py-12">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p lang="en" className="font-display text-[26px] leading-none">
              HTC Insights
            </p>
            <p className="mt-3 text-small text-ink-muted">ระบบฐานข้อมูลสถานประกอบการ วิทยาลัยเทคนิคหาดใหญ่</p>
          </div>
          <Link href="/settings" className="kn-link text-small">
            ตั้งค่า
          </Link>
        </div>
      </Band>
    </footer>
  );
}
```

- [ ] **Step 5: แก้ `app/layout.tsx`** — เพิ่ม import ใต้ `import "./globals.css";`

```tsx
import { BottomNav } from "@/components/BottomNav";
import { Footer } from "@/components/Footer";
import { TopNav } from "@/components/TopNav";
import { actionFor, navFor } from "@/lib/nav";
import { getCurrentUser } from "@/lib/session";
```

แล้วแทน `RootLayout` ทั้งฟังก์ชันด้วย:

```tsx
export default async function RootLayout({ children }: LayoutProps<"/">) {
  // รู้บทบาทบนเซิร์ฟเวอร์ก่อนส่ง HTML — เมนูถูกตั้งแต่เฟรมแรก ไม่กระพริบแบบ v1
  const user = await getCurrentUser();
  const role = user?.role ?? null;
  const links = navFor(role);

  return (
    <html lang="th" className={fontVars} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {/* display=block: กันชื่อไอคอนโผล่เป็นตัวหนังสือระหว่างโหลด */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL@20,300,0..1&display=block"
        />
      </head>
      {/* pb บนมือถือ = ความสูง BottomNav + safe-area ให้ footer ไม่ถูกบัง */}
      <body className="flex min-h-dvh flex-col pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0">
        <TopNav links={links} action={actionFor(role)} />
        <main className="flex-1">{children}</main>
        <Footer />
        <BottomNav links={links} />
      </body>
    </html>
  );
}
```

- [ ] **Step 6: แก้ `app/page.tsx` ชั่วคราว** — เอา `<main>` ของ Task 2 Step 11 ออก (layout มี `<main>` แล้ว) เปลี่ยนเป็น `<div className="flex flex-col gap-8">` ทั้งเปิดและปิด

- [ ] **Step 7: รันตรวจ**

Run: `npm run build`
Expected: ผ่าน

Run: `npm run dev` แล้วลองทีละบทบาท — สร้าง/แก้ `.env.local` ใส่ `DEV_ROLE=` (ว่าง), `STUDENT`, `EXTERNAL`, `ADMIN` แล้วรีสตาร์ต dev server ทุกครั้งที่เปลี่ยน
Expected:
- เมนู TopNav (≥768px) และ BottomNav (375px) ตรงตารางในสเปกทุกบทบาท
- ผู้เยี่ยมชมเห็นปุ่ม "เข้าสู่ระบบ" มุมขวาบนทั้งมือถือและจอกว้าง ADMIN เห็น "โปรไฟล์"
- ที่ 375px ป้ายแถบล่างอยู่บรรทัดเดียว ไม่ล้น footer ไม่ถูกแถบล่างบัง
- รีเฟรชแล้วเมนูไม่กระพริบ (เมนูถูกตั้งแต่เฟรมแรก — เปิด DevTools Network → Disable cache → รีเฟรช ดู)
- footer เป็นแถบดำทั้งสองธีม ลิงก์ "ตั้งค่า" สีเขียว (คลิกแล้ว 404 ตอนนี้ — Task 5 สร้าง)
- `.env.local` ถูก `.gitignore` กันแล้ว (`git status` ต้องไม่เห็น)

- [ ] **Step 8: Checkpoint** — ห้าม commit

---

### Task 5: หน้าแรก เข้าสู่ระบบ และตั้งค่า

**Files:**
- Create: `components/EmptyState.tsx`, `components/PageShell.tsx`
- Modify (เขียนทับ): `app/page.tsx`
- Create: `app/login/page.tsx`, `app/settings/page.tsx`, `app/settings/ThemePicker.tsx`

**Interfaces:**
- Consumes: `getCurrentUser` · `SectionHeader` · `Band` · `Card` · `Button`, `buttonClass` · `Icon` · `cx`
- Produces:
  - `EmptyState({ icon?: string; title?: string; children?: ReactNode })` — ค่าเริ่มต้น `icon="inbox"`, `title="ยังไม่มีข้อมูล"`
  - `PageShell({ eyebrow?: string; title: ReactNode; lede?: ReactNode; actions?: ReactNode; children?: ReactNode })` — container + `SectionHeader level={1}` + ระยะตาม Kernel

- [ ] **Step 1: สร้าง `components/EmptyState.tsx`**

```tsx
import type { ReactNode } from "react";
import { Icon } from "@/components/Icon";

export function EmptyState({
  icon = "inbox",
  title = "ยังไม่มีข้อมูล",
  children,
}: {
  icon?: string;
  title?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-line bg-surface-100 px-6 py-12 text-center">
      <Icon name={icon} className="!text-[32px] text-ink-muted" />
      <p className="text-h3 text-ink">{title}</p>
      {children && <p className="max-w-sm text-small text-ink-muted">{children}</p>}
    </div>
  );
}
```

- [ ] **Step 2: สร้าง `components/PageShell.tsx`**

```tsx
import type { ReactNode } from "react";
import { SectionHeader } from "@/components/ui/SectionHeader";

/** โครงของทุกหน้า: กว้างไม่เกิน 1200px, หัวเรื่อง h1, ระยะส่วน 64px มือถือ / 96px เดสก์ท็อป */
export function PageShell({
  eyebrow,
  title,
  lede,
  actions,
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  lede?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 py-16 md:px-12 md:py-24">
      <SectionHeader level={1} eyebrow={eyebrow} title={title} lede={lede} actions={actions} />
      {children}
    </div>
  );
}
```

- [ ] **Step 3: เขียน `app/page.tsx` ใหม่ทั้งไฟล์**

```tsx
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { PageShell } from "@/components/PageShell";
import { Band } from "@/components/ui/Band";
import { buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { getCurrentUser } from "@/lib/session";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) return <GuestHome />;
  if (user.role === "EXTERNAL") return <ExternalHome />;
  return <StudentHome />;
}

function GuestHome() {
  return (
    <>
      <Band>
        <div className="mx-auto max-w-[1200px]">
          <SectionHeader
            display
            eyebrow="วิทยาลัยเทคนิคหาดใหญ่"
            title="รู้จักที่ฝึกงานก่อนออกไปจริง"
            lede="รีวิวสถานประกอบการจากรุ่นพี่ที่ฝึกงานมาแล้ว เบี้ยเลี้ยงเท่าไร พี่เลี้ยงดูแลดีไหม งานตรงสาขาหรือเปล่า ทุกรีวิวผ่านการตรวจก่อนเผยแพร่"
            actions={
              <Link href="/login" className={buttonClass("primary")}>
                เข้าสู่ระบบ
              </Link>
            }
          />
        </div>
      </Band>
      <div className="mx-auto grid w-full max-w-[1200px] gap-6 px-4 py-16 md:grid-cols-2 md:px-12 md:py-24 lg:grid-cols-3">
        <Card eyebrow="01 · ค้นหา" title="ค้นหาที่ฝึกงานบนแผนที่">
          กรองตามแผนกวิชาและคะแนน ดูพิกัด ช่องทางติดต่อ และเบี้ยเลี้ยง
        </Card>
        <Card eyebrow="02 · รีวิว" title="อ่านรีวิวจากรุ่นพี่">
          คะแนน 4 ด้าน ลักษณะงาน สภาพแวดล้อม พี่เลี้ยง และเบี้ยเลี้ยง พร้อมคำแนะนำถึงรุ่นน้อง
        </Card>
        <Card eyebrow="03 · ตำแหน่งงาน" title="หาตำแหน่งฝึกงานที่เปิดรับ">
          ดูหน้าที่ คุณสมบัติ และข้อมูลติดต่อจากสถานประกอบการโดยตรง
        </Card>
      </div>
    </>
  );
}

function StudentHome() {
  return (
    <PageShell
      title="ภาพรวมการฝึกงาน"
      lede="สรุปจากรีวิวที่ผ่านการตรวจแล้ว"
      actions={
        <Link href="/insights" className={buttonClass("primary")}>
          ค้นหาสถานประกอบการ
        </Link>
      }
    >
      <EmptyState icon="insights">สรุปข้อมูลฝึกงานจะแสดงที่นี่เมื่อมีรีวิวที่ผ่านการตรวจแล้ว</EmptyState>
    </PageShell>
  );
}

function ExternalHome() {
  return (
    <PageShell
      title="ภาพรวมสำหรับสถานประกอบการ"
      lede="ทักษะของนักศึกษาแต่ละแผนก และสถานประกอบการที่เปิดรับฝึกงาน"
      actions={
        <Link href="/employer/register" className={buttonClass("primary")}>
          ลงประกาศรับนักศึกษา
        </Link>
      }
    >
      <EmptyState icon="groups">ภาพรวมจะแสดงที่นี่เมื่อมีข้อมูลในระบบ</EmptyState>
    </PageShell>
  );
}
```

- [ ] **Step 4: สร้าง `app/login/page.tsx`**

```tsx
import { Icon } from "@/components/Icon";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  return (
    <PageShell
      title="เข้าสู่ระบบ"
      lede="นักศึกษาใช้อีเมลของวิทยาลัย สถานประกอบการและบุคคลภายนอกใช้บัญชี Google ทั่วไป"
    >
      <div className="flex flex-col items-start gap-3">
        <Button variant="primary" disabled icon={<Icon name="login" />}>
          เข้าสู่ระบบด้วย Google
        </Button>
        <p className="text-small text-ink-muted">ยังเปิดใช้ไม่ได้ ระบบเข้าสู่ระบบอยู่ระหว่างพัฒนา</p>
      </div>
    </PageShell>
  );
}
```

- [ ] **Step 5: สร้าง `app/settings/ThemePicker.tsx`**

```tsx
"use client";

import { useSyncExternalStore } from "react";

type Choice = "system" | "paper" | "night";

const OPTIONS: { id: Choice; label: string; hint: string }[] = [
  { id: "system", label: "ตามเครื่อง", hint: "สว่างหรือมืดตามที่ตั้งไว้ในเครื่อง" },
  { id: "paper", label: "สว่าง", hint: "พื้นขาวนวล อ่านง่ายกลางแจ้ง" },
  { id: "night", label: "มืด", hint: "พื้นเทาเข้ม สบายตาตอนกลางคืน" },
];

// กติกาเดียวกับ THEME_SCRIPT ใน app/layout.tsx: เก็บ "paper" | "night", ไม่มีค่า = ตามเครื่อง
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function read(): Choice {
  try {
    const t = localStorage.getItem("theme");
    return t === "paper" || t === "night" ? t : "system";
  } catch {
    return "system";
  }
}

function apply(choice: Choice) {
  try {
    if (choice === "system") localStorage.removeItem("theme");
    else localStorage.setItem("theme", choice);
  } catch {
    // localStorage ถูกปิด (private mode) — ยังเปลี่ยนธีมของหน้านี้ได้ แต่ไม่จำ
  }
  const resolved =
    choice === "system" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "night" : "paper") : choice;
  document.documentElement.setAttribute("data-theme", resolved);
  listeners.forEach((l) => l());
}

export function ThemePicker() {
  // server snapshot = "system" แล้ว React สลับเป็นค่าจริงหลัง hydrate โดยไม่เกิด hydration error
  const choice = useSyncExternalStore(subscribe, read, () => "system" as Choice);
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-3 text-h3">ธีม</legend>
      {OPTIONS.map((o) => (
        <label
          key={o.id}
          className="flex cursor-pointer items-start gap-3 rounded-md border border-line bg-surface-100 p-4 has-[:checked]:border-signal has-[:checked]:bg-signal-tint"
        >
          <input
            type="radio"
            name="theme"
            value={o.id}
            checked={choice === o.id}
            onChange={() => apply(o.id)}
            className="mt-1 size-4 accent-signal"
          />
          <span className="flex flex-col">
            <span className="text-label">{o.label}</span>
            <span className="text-small text-ink-muted">{o.hint}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
```

- [ ] **Step 6: สร้าง `app/settings/page.tsx`**

```tsx
import { PageShell } from "@/components/PageShell";
import { ThemePicker } from "./ThemePicker";

export default function SettingsPage() {
  return (
    <PageShell title="ตั้งค่า">
      <div className="max-w-md">
        <ThemePicker />
      </div>
    </PageShell>
  );
}
```

- [ ] **Step 7: รันตรวจ**

Run: `npm run build` · `node --test`
Expected: ผ่านทั้งคู่

Run: `npm run dev`
Expected:
- `/` ผู้เยี่ยมชม: แถบดำ hero หัวเรื่อง Trirong ขนาด display (36px ที่ 375px) การ์ด 3 ใบ เรียง 1/2/3 คอลัมน์ที่ 375/768/1280px มีปุ่ม primary เพียงปุ่มเดียวในหน้าจอ
- `/` STUDENT, ADMIN: "ภาพรวมการฝึกงาน" + EmptyState · EXTERNAL: "ภาพรวมสำหรับสถานประกอบการ"
- `/login`: ปุ่มจาง กดไม่ได้
- `/settings`: เลือก "มืด" → เปลี่ยนทันที, รีเฟรช → ยังมืด ไม่แวบสว่าง, เลือก "ตามเครื่อง" → กลับตามเครื่อง ไม่มี hydration error ใน console
- ตัวเลือกที่เลือกมีขอบเขียวพื้น `signal-tint` ทั้งสองธีม

- [ ] **Step 8: Checkpoint** — ห้าม commit

---

### Task 6: หน้าโครง 13 เส้นทาง

**Files:**
- Test: `tests/routes.test.mjs`
- Create: `app/insights/page.tsx`, `app/insights/[id]/page.tsx`, `app/insights/write-review/page.tsx`, `app/community/page.tsx`, `app/community/[id]/page.tsx`, `app/community/new/page.tsx`, `app/jobs/page.tsx`, `app/employer/register/page.tsx`, `app/profile/page.tsx`, `app/profile/upgrade/page.tsx`, `app/admin/page.tsx`, `app/admin/users/page.tsx`, `app/admin/dashboard/page.tsx`

**Interfaces:**
- Consumes: `PageShell`, `EmptyState`, `buttonClass`, `Tabs`, `Table`, `navFor`, `actionFor`

- [ ] **Step 1: เขียนเทสต์ที่ล้มเหลว `tests/routes.test.mjs`**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { actionFor, navFor } from "../lib/nav.ts";

// ลิงก์ที่ไม่อยู่ในเมนู แต่หน้าต่าง ๆ ลิงก์ไปหา (spec ส่วนที่ 3) + หน้ารายละเอียด
const INNER = [
  "/settings",
  "/login",
  "/insights/write-review",
  "/insights/[id]",
  "/community/new",
  "/community/[id]",
  "/profile/upgrade",
  "/admin/users",
  "/admin/dashboard",
];

const pageFile = (href) => `app${href === "/" ? "" : href}/page.tsx`;

test("ทุกลิงก์ในเมนูของทุกบทบาท และลิงก์ภายใน มีหน้ารองรับ — ไม่มี 404", () => {
  const hrefs = new Set(INNER);
  for (const role of [null, "STUDENT", "EXTERNAL", "ADMIN"]) {
    for (const item of navFor(role)) hrefs.add(item.href);
    const action = actionFor(role);
    if (action) hrefs.add(action.href);
  }
  const missing = [...hrefs].filter((h) => !existsSync(pageFile(h)));
  assert.deepEqual(missing, []);
});
```

- [ ] **Step 2: รันให้เห็นว่าล้ม**

Run: `node --test`
Expected: FAIL — `missing` มี 13 เส้นทาง เช่น `/insights`, `/jobs`, `/admin/users`

- [ ] **Step 3: สร้าง `app/insights/page.tsx`**

```tsx
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { PageShell } from "@/components/PageShell";
import { buttonClass } from "@/components/ui/Button";

export default function InsightsPage() {
  return (
    <PageShell
      title="สถานประกอบการ"
      lede="ค้นหาที่ฝึกงานบนแผนที่ กรองตามแผนกวิชาและคะแนน"
      actions={
        <Link href="/insights/write-review" className={buttonClass("primary")}>
          เขียนรีวิว
        </Link>
      }
    >
      <EmptyState icon="map">รายชื่อและแผนที่สถานประกอบการจะแสดงที่นี่</EmptyState>
    </PageShell>
  );
}
```

- [ ] **Step 4: สร้าง `app/insights/[id]/page.tsx`**

```tsx
import { EmptyState } from "@/components/EmptyState";
import { PageShell } from "@/components/PageShell";

export default function CompanyPage() {
  return (
    <PageShell eyebrow="สถานประกอบการ" title="รายละเอียดสถานประกอบการ">
      <EmptyState icon="apartment">พิกัด ช่องทางติดต่อ เบี้ยเลี้ยง และรีวิวที่ผ่านการตรวจจะแสดงที่นี่</EmptyState>
    </PageShell>
  );
}
```

- [ ] **Step 5: สร้าง `app/insights/write-review/page.tsx`**

```tsx
import { EmptyState } from "@/components/EmptyState";
import { PageShell } from "@/components/PageShell";

export default function WriteReviewPage() {
  return (
    <PageShell
      eyebrow="สถานประกอบการ"
      title="เขียนรีวิว"
      lede="คะแนน 4 ด้าน เวลาทำงาน และคำแนะนำถึงรุ่นน้อง ทุกรีวิวผ่านการตรวจก่อนเผยแพร่"
    >
      <EmptyState icon="edit_note" title="ยังเปิดใช้ไม่ได้">
        ฟอร์มเขียนรีวิวอยู่ระหว่างพัฒนา
      </EmptyState>
    </PageShell>
  );
}
```

- [ ] **Step 6: สร้าง `app/community/page.tsx`**

```tsx
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { PageShell } from "@/components/PageShell";
import { buttonClass } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";

// 4 หมวดตามสเปกข้อ 6 (enum PostType: QA | EXPERIENCE | TIPS | TEAM)
const CATEGORIES = [
  { id: "ALL", label: "ทั้งหมด" },
  { id: "QA", label: "ถามตอบ" },
  { id: "EXPERIENCE", label: "เล่าประสบการณ์" },
  { id: "TIPS", label: "เทคนิค" },
  { id: "TEAM", label: "หาเพื่อนฝึกงาน" },
];

export default function CommunityPage() {
  return (
    <PageShell
      title="ชุมชน"
      lede="ถามตอบ เล่าประสบการณ์ แลกเทคนิค และหาเพื่อนฝึกงาน"
      actions={
        <Link href="/community/new" className={buttonClass("primary")}>
          ตั้งกระทู้
        </Link>
      }
    >
      <Tabs items={CATEGORIES} />
      <EmptyState icon="forum">กระทู้ที่ผ่านการตรวจแล้วจะแสดงที่นี่</EmptyState>
    </PageShell>
  );
}
```

ค่า `id` ตรงกับ `enum PostType` ใน `prisma/schema.prisma:35` แล้ว (ตรวจแล้ว)

- [ ] **Step 7: สร้าง `app/community/[id]/page.tsx`**

```tsx
import { EmptyState } from "@/components/EmptyState";
import { PageShell } from "@/components/PageShell";

export default function PostPage() {
  return (
    <PageShell eyebrow="ชุมชน" title="กระทู้">
      <EmptyState icon="chat">เนื้อหากระทู้และความคิดเห็นจะแสดงที่นี่</EmptyState>
    </PageShell>
  );
}
```

- [ ] **Step 8: สร้าง `app/community/new/page.tsx`**

```tsx
import { EmptyState } from "@/components/EmptyState";
import { PageShell } from "@/components/PageShell";

export default function NewPostPage() {
  return (
    <PageShell eyebrow="ชุมชน" title="ตั้งกระทู้" lede="กระทู้ใหม่ผ่านการตรวจก่อนเผยแพร่">
      <EmptyState icon="edit_square" title="ยังเปิดใช้ไม่ได้">
        ฟอร์มตั้งกระทู้อยู่ระหว่างพัฒนา
      </EmptyState>
    </PageShell>
  );
}
```

- [ ] **Step 9: สร้าง `app/jobs/page.tsx`**

```tsx
import { EmptyState } from "@/components/EmptyState";
import { PageShell } from "@/components/PageShell";

export default function JobsPage() {
  return (
    <PageShell title="ตำแหน่งงาน" lede="ตำแหน่งฝึกงานที่สถานประกอบการเปิดรับ กรองตามสาขา">
      <EmptyState icon="work">ประกาศรับนักศึกษาฝึกงานที่ผ่านการตรวจแล้วจะแสดงที่นี่</EmptyState>
    </PageShell>
  );
}
```

- [ ] **Step 10: สร้าง `app/employer/register/page.tsx`**

```tsx
import { EmptyState } from "@/components/EmptyState";
import { PageShell } from "@/components/PageShell";

export default function EmployerRegisterPage() {
  return (
    <PageShell
      eyebrow="สถานประกอบการ"
      title="ลงทะเบียนและลงประกาศ"
      lede="ลงทะเบียนสถานประกอบการ ปักหมุดที่ตั้ง แล้วสร้างประกาศรับนักศึกษาฝึกงาน"
    >
      <EmptyState icon="add_business" title="ยังเปิดใช้ไม่ได้">
        การลงทะเบียนสถานประกอบการอยู่ระหว่างพัฒนา
      </EmptyState>
    </PageShell>
  );
}
```

- [ ] **Step 11: สร้าง `app/profile/page.tsx`**

```tsx
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { PageShell } from "@/components/PageShell";
import { buttonClass } from "@/components/ui/Button";

export default function ProfilePage() {
  return (
    <PageShell
      title="โปรไฟล์"
      actions={
        <Link href="/profile/upgrade" className={buttonClass("secondary")}>
          ยืนยันสิทธิ์นักศึกษา
        </Link>
      }
    >
      <EmptyState icon="person">ข้อมูลบัญชี รีวิว และประกาศของคุณจะแสดงที่นี่</EmptyState>
    </PageShell>
  );
}
```

- [ ] **Step 12: สร้าง `app/profile/upgrade/page.tsx`**

```tsx
import { EmptyState } from "@/components/EmptyState";
import { PageShell } from "@/components/PageShell";

export default function UpgradePage() {
  return (
    <PageShell
      eyebrow="โปรไฟล์"
      title="ยืนยันสิทธิ์นักศึกษา"
      lede="กรอกรหัสนักศึกษา แผนก และแนบรูปบัตรนักศึกษา แล้วติดตามสถานะได้ที่นี่"
    >
      <EmptyState icon="badge" title="ยังเปิดใช้ไม่ได้">
        การยื่นคำขอยืนยันสิทธิ์อยู่ระหว่างพัฒนา
      </EmptyState>
    </PageShell>
  );
}
```

- [ ] **Step 13: สร้าง `app/admin/page.tsx`**

```tsx
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { PageShell } from "@/components/PageShell";
import { buttonClass } from "@/components/ui/Button";

// ponytail: ยังไม่มี guard — ใครก็เปิดได้ Phase 1 ใส่ requireAdmin()
export default function AdminPage() {
  return (
    <PageShell
      title="ศูนย์คัดกรอง"
      lede="อนุมัติหรือปฏิเสธรีวิว กระทู้ ความคิดเห็น และประกาศงาน พร้อมเหตุผล"
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
      <EmptyState icon="fact_check" title="ไม่มีรายการรอตรวจ">
        เนื้อหาที่รอการอนุมัติจะแสดงที่นี่
      </EmptyState>
    </PageShell>
  );
}
```

- [ ] **Step 14: สร้าง `app/admin/users/page.tsx`**

```tsx
import { EmptyState } from "@/components/EmptyState";
import { PageShell } from "@/components/PageShell";
import { Table } from "@/components/ui/Table";

const COLUMNS = [
  { key: "name", label: "ชื่อ" },
  { key: "email", label: "อีเมล" },
  { key: "role", label: "บทบาท" },
  { key: "status", label: "สถานะ" },
];

export default function AdminUsersPage() {
  return (
    <PageShell eyebrow="ผู้ดูแล" title="จัดการบัญชี" lede="ค้นหา เปลี่ยนบทบาท และระงับบัญชี">
      <Table columns={COLUMNS} rows={[]} />
      <EmptyState icon="group">บัญชีผู้ใช้จะแสดงที่นี่</EmptyState>
    </PageShell>
  );
}
```

- [ ] **Step 15: สร้าง `app/admin/dashboard/page.tsx`**

```tsx
import { EmptyState } from "@/components/EmptyState";
import { PageShell } from "@/components/PageShell";

export default function DashboardPage() {
  return (
    <PageShell
      eyebrow="ผู้ดูแล"
      title="แดชบอร์ดผู้บริหาร"
      lede="รีวิวแยกตามแผนก ค่าเฉลี่ย 4 ด้าน สัดส่วนการอนุมัติ และบริษัทยอดนิยม"
    >
      <EmptyState icon="monitoring">กราฟจะแสดงที่นี่เมื่อมีข้อมูลในระบบ</EmptyState>
    </PageShell>
  );
}
```

- [ ] **Step 16: รันให้ผ่าน**

Run: `node --test`
Expected: PASS ทุกเทสต์ (nav 7 + routes 1)

Run: `npm run build`
Expected: ผ่าน รายการเส้นทางในผลลัพธ์มีครบ 16 หน้า (`/`, `/login`, `/settings` + 13)

- [ ] **Step 17: Checkpoint** — ห้าม commit

---

### Task 7: ตรวจรอบสุดท้ายในเบราว์เซอร์

**Files:** ไม่มีไฟล์ใหม่ — แก้เฉพาะที่ตรวจพบ

- [ ] **Step 1: ตรวจบทบาท × ความกว้าง × ธีม**

ตั้ง `DEV_ROLE` ทีละค่า (ว่าง, STUDENT, EXTERNAL, ADMIN) รีสตาร์ต `npm run dev` แล้วไล่คลิกทุกลิงก์ใน TopNav, BottomNav, footer และปุ่มในหน้า ที่ 375px และ 1280px ทั้งธีมสว่างและมืด

Expected ทุกชุด:
- ไม่มี 404 ไม่มี error ใน console
- หน้าไม่เลื่อนแนวนอนที่ 375px (`document.documentElement.scrollWidth === 375` ใน console)
- แถบล่างไม่บังเนื้อหาหรือ footer
- หัวเรื่องไทยยาว ("ภาพรวมสำหรับสถานประกอบการ", "แดชบอร์ดผู้บริหาร") ตัดบรรทัดที่ขอบคำ ไม่ล้น
- เมนูที่ active ตรงกับหน้าที่อยู่ รวมหน้าย่อย (`/admin/users` → "ผู้ดูแล")

- [ ] **Step 2: ตรวจการกระพริบ**

ตั้งธีม "มืด" ใน `/settings` บนเครื่องที่ตั้งโหมดสว่าง แล้วรีเฟรชหลายหน้าด้วย DevTools → Network → throttling "Slow 4G"
Expected: ไม่เห็นพื้นสว่างแวบก่อนมืด เมนูถูกบทบาทตั้งแต่แรก

- [ ] **Step 3: ตรวจ production build**

Run: `npm run build` · `node --test` · `npm run lint`
Expected: ผ่านทั้งหมด

- [ ] **Step 4: รายงานผู้ใช้และขออนุญาต commit**

สรุปสิ่งที่ทำและสิ่งที่ตรวจแล้ว แล้วถามผู้ใช้ว่าจะ commit หรือไม่ — working tree ยังมีงาน Phase 0 ที่ยังไม่ commit ปนอยู่ (`.gitignore`, `package.json`, `prisma/`, `prisma.config.ts`, `context.md` ฯลฯ) เสนอแยกเป็น 2 commit: `chore: phase 0 scaffold` และ `feat: frontend shell with Kernel design system`
