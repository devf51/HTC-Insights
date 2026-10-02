import { Badge } from "@/components/ui/Badge";

const STATUS = {
  PENDING: { tone: "warning", label: "รอตรวจ" },
  APPROVED: { tone: "success", label: "เผยแพร่แล้ว" },
  REJECTED: { tone: "danger", label: "ไม่ผ่านการตรวจ" },
} as const;

/** ป้ายสถานะการตรวจ — approvedLabel ใช้กับสิ่งที่ไม่ได้ "เผยแพร่" เช่นคำขอยืนยันสิทธิ์ */
export function StatusBadge({ status, approvedLabel }: { status: keyof typeof STATUS; approvedLabel?: string }) {
  const s = STATUS[status];
  return <Badge tone={s.tone}>{status === "APPROVED" && approvedLabel ? approvedLabel : s.label}</Badge>;
}
