"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";

const ACTIONS = {
  withdraw: { button: "ถอนเนื้อหา", label: "เหตุผลที่ถอน (เจ้าของเนื้อหาและผู้รายงานจะเห็น)" },
  resolve: { button: "ปิดเรื่อง", label: "บันทึกการจัดการ (ผู้รายงานจะเห็น)" },
  dismiss: { button: "ไม่ผิดกฎ", label: "เหตุผลที่ไม่ผิดกฎ (ผู้รายงานจะเห็น)" },
} as const;
type Action = keyof typeof ACTIONS;

/** จัดการข้อร้องเรียน — ทุกทางต้องมีบันทึก 5–500 ตัวอักษร เซิร์ฟเวอร์ตรวจซ้ำ */
export function ReportActions({ id, canWithdraw }: { id: string; canWithdraw: boolean }) {
  const router = useRouter();
  const fieldId = useId();
  const [action, setAction] = useState<Action | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const choices = (Object.keys(ACTIONS) as Action[]).filter((a) => a !== "withdraw" || canWithdraw);

  async function send(a: Action) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: a, note }),
      });
      if (res.ok) router.refresh();
      else setError(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "บันทึกไม่สำเร็จ");
    } catch {
      setError("เชื่อมต่อไม่ได้ ลองอีกครั้ง");
    }
    setBusy(false);
  }

  return (
    <div className="flex w-full flex-col gap-3">
      {action ? (
        <>
          <div className="kn-field">
            <label className="kn-field-label" htmlFor={fieldId}>
              {ACTIONS[action].label}
            </label>
            <textarea id={fieldId} value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={500} className="kn-input h-auto py-3" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant={action === "withdraw" ? "danger" : "secondary"} disabled={busy || note.trim().length < 5} onClick={() => send(action)}>
              {`ยืนยัน${ACTIONS[action].button}`}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setAction(null)}>
              ยกเลิก
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap gap-2">
          {choices.map((a) => (
            <Button key={a} variant={a === "withdraw" ? "danger" : "secondary"} onClick={() => setAction(a)}>
              {ACTIONS[a].button}
            </Button>
          ))}
        </div>
      )}
      {error && (
        <p role="alert" className="text-small text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
