"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui/Button";

/** เจ้าของกระทู้ถามตอบเท่านั้นที่เห็นปุ่มนี้ — เซิร์ฟเวอร์ตรวจซ้ำทุกเงื่อนไข แล้วแสดงข้อความถ้าไม่ผ่าน */
export function BestAnswerButton({ postId, commentId, isBest }: { postId: string; commentId: string; isBest: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/community/posts/${postId}/best-answer`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ commentId: isBest ? null : commentId }),
      });
      if (res.ok) router.refresh();
      else setError(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "บันทึกไม่สำเร็จ");
    } catch {
      setError("เชื่อมต่อไม่ได้ ลองอีกครั้ง");
    }
    setBusy(false);
  }

  return (
    <span className="flex flex-col items-start gap-1">
      <Button size="sm" variant="ghost" onClick={pick} disabled={busy} icon={<Icon name={isBest ? "close" : "verified"} />}>
        {isBest ? "ยกเลิกคำตอบที่ดีที่สุด" : "เลือกเป็นคำตอบที่ดีที่สุด"}
      </Button>
      {error && (
        <span role="alert" className="text-small text-danger">
          {error}
        </span>
      )}
    </span>
  );
}
