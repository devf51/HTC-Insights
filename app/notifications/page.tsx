import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { MarkAllRead } from "@/components/MarkAllRead";
import { PageShell } from "@/components/PageShell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { myNotifications } from "@/lib/notifications";
import { thaiDateTime } from "@/lib/thai-time";

export default async function NotificationsPage() {
  // myNotifications เรียก requireUser — ไม่ล็อกอินได้หน้า 401
  const items = await myNotifications();
  return (
    <PageShell title="แจ้งเตือน" lede="ผลการตรวจรีวิว กระทู้ ความคิดเห็น และประกาศของคุณ">
      {items.some((n) => !n.isRead) && <MarkAllRead />}
      {items.length === 0 ? (
        <EmptyState icon="notifications" title="ยังไม่มีแจ้งเตือน">
          เมื่อผู้ดูแลตรวจเนื้อหาของคุณ ผลจะแจ้งที่นี่
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-4">
          {items.map((n) => (
            <li key={n.id}>
              <Card eyebrow={thaiDateTime(n.createdAt)} footer={!n.isRead && <Badge tone="signal">ใหม่</Badge>}>
                {n.link ? (
                  <Link href={n.link} className="kn-link">
                    {n.message}
                  </Link>
                ) : (
                  n.message
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
