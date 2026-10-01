import { cache } from "react";
import { auth } from "@/auth";
import type { Role } from "./nav";

export type CurrentUser = {
  id: string;
  role: Role;
  isSuperAdmin: boolean;
  name: string | null;
  email: string;
  image: string | null;
};

/**
 * ผู้ใช้ที่กำลังใช้งาน — จุดเดียวของทั้งระบบที่ตอบคำถามนี้ guard ใน lib/auth.ts สร้างบนตัวนี้
 * บัญชีที่ถูกระงับคืน null เหมือนออกจากระบบ · cache(): layout กับ page เรียกซ้ำได้ใน request เดียวโดยไม่ query ซ้ำ
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  const u = session?.user;
  if (!u?.id || u.isBanned) return null;
  return {
    id: u.id,
    role: u.role,
    isSuperAdmin: u.isSuperAdmin,
    name: u.name ?? null,
    email: u.email ?? "",
    image: u.image ?? null,
  };
});
