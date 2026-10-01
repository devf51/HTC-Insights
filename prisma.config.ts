// SQLite: CLI (migrate) และแอปใช้ DATABASE_URL ตัวเดียวกัน
// path แบบ relative นับจาก root ของโปรเจกต์ บนเซิร์ฟเวอร์จริงให้ใช้ path เต็ม เช่น file:/var/lib/htc-insights/htc.db
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
