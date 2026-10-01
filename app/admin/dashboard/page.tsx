import { EmptyState } from "@/components/EmptyState";
import { PageShell } from "@/components/PageShell";

export default function DashboardPage() {
  return (
    <PageShell
      eyebrow="ผู้ดูแล"
      title="แดชบอร์ดผู้บริหาร"
      lede="รีวิวแยกตามแผนก ค่าเฉลี่ย 4 ด้าน สัดส่วนการอนุมัติ และบริษัทยอดนิยม"
    >
      <EmptyState icon="monitoring">กราฟจะแสดงที่นี่เมื่อมีข้อมูลในระบบ</EmptyState>
    </PageShell>
  );
}
