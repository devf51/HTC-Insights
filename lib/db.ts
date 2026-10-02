import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { Prisma, PrismaClient } from "@/app/generated/prisma/client";
import { serializedAdapter } from "./sqlite-lock";

// instance เดียวทั้งแอป — dev server โหลดโมดูลซ้ำทุกครั้งที่ hot reload จึงฝากไว้ที่ globalThis
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  // serializedAdapter: query ธรรมดารอทรานแซกชันที่เปิดอยู่ ไม่งั้นถูก rollback ไปด้วย (lib/sqlite-lock.ts)
  new PrismaClient({ adapter: serializedAdapter(new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! })) });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

/** รหัสข้อผิดพลาดของ Prisma เช่น P2002 (ชน unique) P2025 (ไม่พบแถวที่ตรงเงื่อนไข) */
export const isPrismaError = (e: unknown, code: string) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === code;
