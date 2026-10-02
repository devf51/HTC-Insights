import { EmptyState } from "@/components/EmptyState";
import { PageShell } from "@/components/PageShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { UpgradeForm } from "@/components/UpgradeForm";
import { requireUser } from "@/lib/auth";
import { uploadsEnabled } from "@/lib/cloudinary";
import { departmentLabel } from "@/lib/departments";
import { myUpgradeRequests } from "@/lib/upgrades";

const thaiDate = (d: Date) => d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" });

export default async function UpgradePage() {
  const user = await requireUser();
  const requests = await myUpgradeRequests();
  const pending = requests.some((r) => r.status === "PENDING");

  return (
    <PageShell eyebrow="โปรไฟล์" title="ยืนยันสิทธิ์นักศึกษา" lede="กรอกรหัสนักศึกษา แผนก ระดับการศึกษา และแนบรูปบัตรนักศึกษา แล้วติดตามสถานะได้ที่นี่">
      {user.role !== "EXTERNAL" ? (
        <EmptyState icon="verified" title={user.role === "STUDENT" ? "บัญชีของคุณเป็นนักศึกษาแล้ว" : "ผู้ดูแลไม่ต้องยืนยันสิทธิ์"} />
      ) : pending ? (
        <p role="status" className="rounded-lg border border-line bg-signal-tint px-4 py-3">
          คำขอของคุณกำลังรอตรวจ ผลจะแจ้งที่กระดิ่งแจ้งเตือน
        </p>
      ) : !uploadsEnabled() ? (
        <EmptyState icon="badge" title="ยังเปิดรับคำขอไม่ได้">
          ระบบอัปโหลดรูปบัตรยังไม่ได้ตั้งค่า ติดต่อผู้ดูแล
        </EmptyState>
      ) : (
        <UpgradeForm />
      )}
      {requests.length > 0 && (
        <section className="flex flex-col gap-4">
          <SectionHeader title="คำขอของฉัน" />
          {requests.map((r) => (
            <Card
              key={r.id}
              eyebrow={thaiDate(r.createdAt)}
              title={`รหัส ${r.studentId}`}
              footer={<StatusBadge status={r.status} approvedLabel="อนุมัติแล้ว" />}
            >
              <p>{`${departmentLabel(r.department)} · ${r.educationLevel}`}</p>
              {r.status === "REJECTED" && <p>{`เหตุผล: ${r.rejectionReason ?? "ไม่ระบุ"}`}</p>}
            </Card>
          ))}
        </section>
      )}
    </PageShell>
  );
}
