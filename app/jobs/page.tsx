import { EmptyState } from "@/components/EmptyState";
import { PageShell } from "@/components/PageShell";

export default function JobsPage() {
  return (
    <PageShell title="ตำแหน่งงาน" lede="ตำแหน่งฝึกงานที่สถานประกอบการเปิดรับ กรองตามสาขา">
      <EmptyState icon="work">ประกาศรับนักศึกษาฝึกงานที่ผ่านการตรวจแล้วจะแสดงที่นี่</EmptyState>
    </PageShell>
  );
}
