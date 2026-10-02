"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui/Button";
import type { ContentKind } from "@/lib/moderation-rules";

/** อนุมัติ หรือปฏิเสธพร้อมเหตุผลที่ผู้เขียนจะเห็น — เซิร์ฟเวอร์ตรวจเหตุผลซ้ำ (5–500 ตัวอักษร) */
export function ModerationActions({ kind, id }: { kind: ContentKind; id: string }) {
  const router = useRouter();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(body: { decision: "APPROVED" } | { decision: "REJECTED"; reason: string }) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/moderation/${kind}/${id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
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
      {rejecting ? (
        <>
          <div className="kn-field">
            <label className="kn-field-label" htmlFor={`reason-${id}`}>
              เหตุผลที่ปฏิเสธ (ผู้เขียนจะเห็นข้อความนี้)
            </label>
            <textarea
              id={`reason-${id}`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={500}
              className="kn-input h-auto py-3"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" disabled={busy || reason.trim().length < 5} onClick={() => send({ decision: "REJECTED", reason })}>
              ยืนยันปฏิเสธ
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setRejecting(false)}>
              ยกเลิก
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={<Icon name="check" />} disabled={busy} onClick={() => send({ decision: "APPROVED" })}>
            อนุมัติ
          </Button>
          <Button variant="ghost" icon={<Icon name="close" />} disabled={busy} onClick={() => setRejecting(true)}>
            ปฏิเสธ
          </Button>
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
