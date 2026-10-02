"use client";

import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import type { ReportKind } from "@/lib/moderation-rules";

/** รายงานเนื้อหาไม่เหมาะสม (สเปกข้อ 12) — พับไว้จนกดเปิด เซิร์ฟเวอร์ตรวจสิทธิ์และรายงานซ้ำเอง */
export function ReportButton({ kind, id }: { kind: ReportKind; id: string }) {
  const fieldId = useId();
  const [reason, setReason] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function send(e: FormEvent) {
    e.preventDefault();
    setState("sending");
    setError(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, id, reason }),
      });
      if (res.ok) {
        setState("sent");
        return;
      }
      setError(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "ส่งไม่สำเร็จ ลองอีกครั้ง");
    } catch {
      setError("เชื่อมต่อไม่ได้ ลองอีกครั้ง");
    }
    setState("idle");
  }

  if (state === "sent") {
    return (
      <p role="status" className="text-small text-ink-muted">
        ส่งรายงานแล้ว ผู้ดูแลจะตรวจสอบและแจ้งผลให้ทราบ
      </p>
    );
  }
  return (
    <details className="text-small open:w-full">
      <summary className="kn-link cursor-pointer">รายงาน</summary>
      <form onSubmit={send} className="mt-2 flex flex-col gap-2">
        <label className="kn-field-label" htmlFor={fieldId}>
          เหตุผลที่รายงาน (ผู้ดูแลเห็นคนเดียว)
        </label>
        <textarea
          id={fieldId}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
          minLength={5}
          maxLength={500}
          rows={3}
          className="kn-input h-auto py-3"
        />
        {error && (
          <p role="alert" className="text-danger">
            {error}
          </p>
        )}
        <div>
          <Button type="submit" disabled={state === "sending" || reason.trim().length < 5}>
            ส่งรายงาน
          </Button>
        </div>
      </form>
    </details>
  );
}
