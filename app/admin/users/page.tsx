import { EmptyState } from "@/components/EmptyState";
import { PageShell } from "@/components/PageShell";
import { Table } from "@/components/ui/Table";

const COLUMNS = [
  { key: "name", label: "ชื่อ" },
  { key: "email", label: "อีเมล" },
  { key: "role", label: "บทบาท" },
  { key: "status", label: "สถานะ" },
];

export default function AdminUsersPage() {
  return (
    <PageShell eyebrow="ผู้ดูแล" title="จัดการบัญชี" lede="ค้นหา เปลี่ยนบทบาท และระงับบัญชี">
      <Table columns={COLUMNS} rows={[]} />
      <EmptyState icon="group">บัญชีผู้ใช้จะแสดงที่นี่</EmptyState>
    </PageShell>
  );
}
