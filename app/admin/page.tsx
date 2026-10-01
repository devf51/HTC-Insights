import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { PageShell } from "@/components/PageShell";
import { buttonClass } from "@/components/ui/Button";

// ponytail: ยังไม่มี guard — ใครก็เปิดได้ Phase 1 ใส่ requireAdmin()
export default function AdminPage() {
  return (
    <PageShell
      title="ศูนย์คัดกรอง"
      lede="อนุมัติหรือปฏิเสธรีวิว กระทู้ ความคิดเห็น และประกาศงาน พร้อมเหตุผล"
      actions={
        <>
          <Link href="/admin/users" className={buttonClass("secondary")}>
            จัดการบัญชี
          </Link>
          <Link href="/admin/dashboard" className={buttonClass("secondary")}>
            แดชบอร์ด
          </Link>
        </>
      }
    >
      <EmptyState icon="fact_check" title="ไม่มีรายการรอตรวจ">
        เนื้อหาที่รอการอนุมัติจะแสดงที่นี่
      </EmptyState>
    </PageShell>
  );
}
