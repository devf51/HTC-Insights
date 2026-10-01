import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { PageShell } from "@/components/PageShell";
import { buttonClass } from "@/components/ui/Button";

export default function ProfilePage() {
  return (
    <PageShell
      title="โปรไฟล์"
      actions={
        <Link href="/profile/upgrade" className={buttonClass("secondary")}>
          ยืนยันสิทธิ์นักศึกษา
        </Link>
      }
    >
      <EmptyState icon="person">ข้อมูลบัญชี รีวิว และประกาศของคุณจะแสดงที่นี่</EmptyState>
    </PageShell>
  );
}
