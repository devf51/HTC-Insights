# HTC Insights v2

ระบบฐานข้อมูลสถานประกอบการนักศึกษาวิทยาลัยเทคนิคหาดใหญ่ — นักศึกษาค้นหาและรีวิวที่ฝึกงาน
สถานประกอบการลงประกาศรับนักศึกษา ผู้ดูแลคัดกรองเนื้อหาก่อนเผยแพร่ ผู้บริหารดูแดชบอร์ดและพิมพ์รายงาน A4

Next.js 16 · React 19 · Prisma 7 + SQLite · Auth.js v5 (Google) · Tailwind v4

- บริบทโครงการ หลักการโดเมน และสถานะ: [docs/context.md](docs/context.md)
- กฎการเขียนโค้ด: [CLAUDE.md](CLAUDE.md)
- **deploy บนเซิร์ฟเวอร์จริง: [docs/deploy.md](docs/deploy.md)** — ระบบนี้ใช้ SQLite และเก็บรูปบนดิสก์
  จึง deploy บน Vercel หรือ serverless ไม่ได้

## เริ่มบนเครื่อง dev

```bash
cp .env.example .env.local     # กรอก AUTH_SECRET, AUTH_GOOGLE_ID/SECRET, ALLOWED_STUDENT_DOMAIN, SUPER_ADMIN_EMAIL
npm install
npx prisma migrate dev         # สร้าง prisma/dev.db
npx prisma generate
npx prisma db seed             # ข้อมูลตัวอย่าง (dev เท่านั้น)
npm run dev                    # http://localhost:3000
```

## คำสั่งที่ใช้บ่อย

```bash
node --test                    # เทสต์ทั้งหมดใน tests/
npm run build                  # ตรวจว่า build ผ่านก่อน commit
npx prisma studio              # ดูข้อมูลในฐานข้อมูล
```
