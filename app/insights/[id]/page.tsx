import { EmptyState } from "@/components/EmptyState";
import { PageShell } from "@/components/PageShell";

export default function CompanyPage() {
  return (
    <PageShell eyebrow="สถานประกอบการ" title="รายละเอียดสถานประกอบการ">
      <EmptyState icon="apartment">พิกัด ช่องทางติดต่อ เบี้ยเลี้ยง และรีวิวที่ผ่านการตรวจจะแสดงที่นี่</EmptyState>
    </PageShell>
  );
}
