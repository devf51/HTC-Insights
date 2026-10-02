"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { POST_TYPES } from "@/lib/community-rules";
import { DEPARTMENTS } from "@/lib/departments";

export function PostForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.reportValidity()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/community/posts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      const json: { id?: string; error?: string } | null = await res.json().catch(() => null);
      if (res.ok && json?.id) {
        router.push(`/community/${json.id}`);
        return;
      }
      setError(json?.error ?? "ส่งไม่สำเร็จ ลองอีกครั้ง");
    } catch {
      setError("เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง");
    }
    setSending(false);
  }

  return (
    <form onSubmit={submit} className="flex max-w-2xl flex-col gap-4">
      <div className="kn-field">
        <label className="kn-field-label" htmlFor="type">
          หมวด
        </label>
        <select id="type" name="type" required className="kn-input" defaultValue="">
          <option value="" disabled>
            เลือกหมวด
          </option>
          {POST_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div className="kn-field">
        <label className="kn-field-label" htmlFor="department">
          แผนกวิชา (ไม่บังคับ)
        </label>
        <select id="department" name="department" className="kn-input" defaultValue="">
          <option value="">ทั่วไป ไม่ระบุแผนก</option>
          {DEPARTMENTS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </div>
      <TextField name="title" label="หัวข้อ" required minLength={5} maxLength={120} />
      <div className="kn-field">
        <label className="kn-field-label" htmlFor="body">
          เนื้อหา
        </label>
        <textarea id="body" name="body" required minLength={10} maxLength={5000} rows={8} className="kn-input h-auto py-3" />
      </div>
      <p className="text-small text-ink-muted">
        กระทู้จะเผยแพร่หลังผู้ดูแลตรวจแล้ว ระหว่างนี้คุณเห็นกระทู้ของตัวเองพร้อมป้ายรอตรวจ
      </p>
      {error && (
        <p role="alert" className="text-small text-danger">
          {error}
        </p>
      )}
      <div>
        <Button type="submit" variant="primary" disabled={sending}>
          {sending ? "กำลังส่ง…" : "ตั้งกระทู้"}
        </Button>
      </div>
    </form>
  );
}
