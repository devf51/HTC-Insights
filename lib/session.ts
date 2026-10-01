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
