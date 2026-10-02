import { requireUser } from "./auth";
import { db } from "./db";

// ทุกฟังก์ชันเริ่มด้วย guard — เห็นและแก้ได้เฉพาะแจ้งเตือนของตัวเอง
// แจ้งเตือนถูกสร้างผ่าน notify() ใน lib/admin.ts เท่านั้น

export async function myNotifications() {
  const user = await requireUser();
  // ponytail: 50 รายการล่าสุด — แจ้งเตือนเกิดเฉพาะตอนผู้ดูแลตรวจ ต่อคนไม่มาก
  return db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, type: true, message: true, link: true, isRead: true, createdAt: true },
  });
}

export async function unreadCount(): Promise<number> {
  const user = await requireUser();
  return db.notification.count({ where: { userId: user.id, isRead: false } });
}

export async function markAllRead(): Promise<void> {
  const user = await requireUser();
  await db.notification.updateMany({ where: { userId: user.id, isRead: false }, data: { isRead: true } });
}
