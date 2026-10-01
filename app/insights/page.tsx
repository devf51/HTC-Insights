import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { PageShell } from "@/components/PageShell";
import { buttonClass } from "@/components/ui/Button";

export default function InsightsPage() {
  return (
    <PageShell
      title="สถานประกอบการ"
      lede="ค้นหาที่ฝึกงานบนแผนที่ กรองตามแผนกวิชาและคะแนน"
      actions={
        <Link href="/insights/write-review" className={buttonClass("primary")}>
          เขียนรีวิว
        </Link>
      }
    >
      <EmptyState icon="map">รายชื่อและแผนที่สถานประกอบการจะแสดงที่นี่</EmptyState>
    </PageShell>
  );
}
