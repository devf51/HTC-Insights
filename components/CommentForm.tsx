"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";

export function CommentForm({ postId, parentId }: { postId: string; parentId?: string }) {
  const router = useRouter();
  const fieldId = useId();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.reportValidity()) return;
    setSending(true);
    setError(null);
    setSent(false);
    try {
      const res = await fetch("/api/community/comments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ postId, parentId: parentId ?? null, body: new FormData(form).get("body") }),
      });
      if (res.ok) {
        form.reset();
        setSent(true);
        // ให้ความคิดเห็นที่เพิ่งส่งโผล่พร้อมป้ายรอตรวจ (เจ้าของเห็นของตัวเอง)
        router.refresh();
      } else {
        const json: { error?: string } | null = await res.json().catch(() => null);
        setError(json?.error ?? "ส่งไม่สำเร็จ ลองอีกครั้ง");
      }
    } catch {
      setError("เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง");
    }
    setSending(false);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 pt-2">
      <label htmlFor={fieldId} className={parentId ? "sr-only" : "kn-field-label"}>
        {parentId ? "ตอบกลับ" : "แสดงความคิดเห็น"}
      </label>
      <textarea id={fieldId} name="body" required maxLength={2000} rows={parentId ? 2 : 3} className="kn-input h-auto py-3" />
      {error && (
        <p role="alert" className="text-small text-danger">
          {error}
        </p>
      )}
      {sent && (
        <p role="status" className="text-small text-ink-muted">
          ส่งแล้ว ความคิดเห็นจะเผยแพร่หลังผู้ดูแลตรวจ
        </p>
      )}
      <div>
        <Button type="submit" size="sm" disabled={sending}>
          {sending ? "กำลังส่ง…" : "ส่ง"}
        </Button>
      </div>
    </form>
  );
}
