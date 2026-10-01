// SQLite: CLI (migrate) และแอปใช้ DATABASE_URL ตัวเดียวกัน
// path แบบ relative นับจาก root ของโปรเจกต์ บนเซิร์ฟเวอร์จริงให้ใช้ path เต็ม เช่น file:/var/lib/htc-insights/htc.db
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // jiti มากับ prisma อยู่แล้ว (โหลดไฟล์นี้เองก็ใช้มัน) — ไม่ต้องลง tsx เพิ่ม
    seed: "npx jiti prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
