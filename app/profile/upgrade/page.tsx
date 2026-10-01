import { EmptyState } from "@/components/EmptyState";
import { PageShell } from "@/components/PageShell";

export default function UpgradePage() {
  return (
    <PageShell
      eyebrow="โปรไฟล์"
      title="ยืนยันสิทธิ์นักศึกษา"
      lede="กรอกรหัสนักศึกษา แผนก และแนบรูปบัตรนักศึกษา แล้วติดตามสถานะได้ที่นี่"
    >
      <EmptyState icon="badge" title="ยังเปิดใช้ไม่ได้">
        การยื่นคำขอยืนยันสิทธิ์อยู่ระหว่างพัฒนา
      </EmptyState>
    </PageShell>
  );
}
