import type { Prisma } from "@/app/generated/prisma/client";

// helper กลางของการกระทำผู้ดูแล (CLAUDE.md) — เรียกในทรานแซกชันเดียวกับการกระทำเสมอ
// ไม่มี guard ในไฟล์นี้: รับ tx จากฟังก์ชัน DAL ที่ผ่าน requireAdmin มาแล้วเท่านั้น
// tests/route-guards.test.mjs กันไม่ให้ที่อื่นเขียน Notification/AuditLog ตรง

type Tx = Prisma.TransactionClient;

/** หลักการโดเมนข้อ 3 — ทุกการกระทำของผู้ดูแลตรวจสอบย้อนหลังได้ */
export function logAdminAction(tx: Tx, adminId: string, action: string, target: { type: string; id: string }, detail: string | null = null) {
  return tx.auditLog.create({ data: { adminId, action, targetType: target.type, targetId: target.id, detail } });
}

/** หลักการโดเมนข้อ 4 — ผู้ใช้ต้องรู้ผลเสมอ */
export function notify(tx: Tx, userId: string, n: { type: string; message: string; link: string | null }) {
  return tx.notification.create({ data: { userId, ...n } });
}
