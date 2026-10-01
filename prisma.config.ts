// migrate ต้องใช้ DIRECT_URL (ไม่ผ่าน pooler) ส่วนแอปใช้ DATABASE_URL แบบ pooled
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DIRECT_URL"],
  },
});
