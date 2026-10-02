"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui/Button";

/** เจ้าของกระทู้ถามตอบเท่านั้นที่เห็นปุ่มนี้ — เซิร์ฟเวอร์ตรวจซ้ำทุกเงื่อนไข */
export function BestAnswerButton({ postId, commentId, isBest }: { postId: string; commentId: string; isBest: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function pick() {
    setBusy(true);
    try {
      await fetch(`/api/community/posts/${postId}/best-answer`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ commentId: isBest ? null : commentId }),
      });
      router.refresh();
    } catch {
      // เครือข่ายล้ม — ไม่เปลี่ยนอะไร
    }
    setBusy(false);
  }

  return (
    <Button size="sm" variant="ghost" onClick={pick} disabled={busy} icon={<Icon name={isBest ? "close" : "verified"} />}>
      {isBest ? "ยกเลิกคำตอบที่ดีที่สุด" : "เลือกเป็นคำตอบที่ดีที่สุด"}
    </Button>
  );
}
