import Link from "next/link";
import { signOut } from "@/auth";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { PageShell } from "@/components/PageShell";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { requireUser } from "@/lib/auth";
import type { Role } from "@/lib/nav";

const ROLE_LABEL: Record<Role, string> = {
  STUDENT: "นักศึกษา",
  EXTERNAL: "บุคคลภายนอก",
  ADMIN: "ผู้ดูแลระบบ",
};

export default async function ProfilePage() {
  // layout เรียกแล้ว เรียกซ้ำเพื่อเอาข้อมูลผู้ใช้ — getCurrentUser() ห่อ cache() ไม่ query ซ้ำ
  const user = await requireUser();

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <PageShell
      title="โปรไฟล์"
      actions={
        // ยื่นยืนยันสิทธิ์มีความหมายเฉพาะบุคคลภายนอกที่เป็นนักศึกษาแต่ไม่มีอีเมลวิทยาลัย
        user.role === "EXTERNAL" && (
          <Link href="/profile/upgrade" className={buttonClass("secondary")}>
            ยืนยันสิทธิ์นักศึกษา
          </Link>
        )
      }
    >
      <Card
        title={user.name ?? user.email}
        footer={
          <form action={signOutAction}>
            <Button type="submit" variant="ghost" icon={<Icon name="logout" />}>
              ออกจากระบบ
            </Button>
          </form>
        }
      >
        <span className="flex flex-wrap items-center gap-2">
          <span className="break-all">{user.email}</span>
          <Badge tone="signal">
            {ROLE_LABEL[user.role]}
            {user.isSuperAdmin ? " ระดับสูง" : ""}
          </Badge>
        </span>
      </Card>
      <EmptyState icon="rate_review">รีวิวและประกาศของคุณจะแสดงที่นี่</EmptyState>
    </PageShell>
  );
}
