"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { EDUCATION_LEVELS } from "@/lib/account-rules";
import { DEPARTMENTS } from "@/lib/departments";
import { PHOTO_TYPES } from "@/lib/review-rules";

export function UpgradeForm() {
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
      const res = await fetch("/api/upgrades", { method: "POST", body: new FormData(form) });
      if (res.ok) {
        form.reset();
        router.refresh();
      } else {
        setError(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "ส่งไม่สำเร็จ ลองอีกครั้ง");
      }
    } catch {
      setError("เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง");
    }
    setSending(false);
  }

  return (
    <form onSubmit={submit} className="flex max-w-2xl flex-col gap-6">
      <TextField name="studentId" label="รหัสนักศึกษา" inputMode="numeric" pattern="\d{5,15}" maxLength={15} required />
      <div className="kn-field">
        <label className="kn-field-label" htmlFor="department">
          แผนกวิชา
        </label>
        <select id="department" name="department" required className="kn-input" defaultValue="">
          <option value="" disabled>
            เลือกแผนก
          </option>
          {DEPARTMENTS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </div>
      <div className="kn-field">
        <label className="kn-field-label" htmlFor="educationLevel">
          ระดับการศึกษา
        </label>
        <select id="educationLevel" name="educationLevel" required className="kn-input" defaultValue="">
          <option value="" disabled>
            เลือกระดับ
          </option>
          {EDUCATION_LEVELS.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
      </div>
      <div className="kn-field">
        <label className="kn-field-label" htmlFor="card">
          รูปบัตรนักศึกษา
        </label>
        <input id="card" name="card" type="file" accept={PHOTO_TYPES.join(",")} required className="text-small" />
        <p className="kn-field-hint">JPG PNG หรือ WEBP ไม่เกิน 5 MB ใช้ตรวจสอบเท่านั้น ผู้ดูแลเห็นคนเดียว</p>
      </div>
      {error && (
        <p role="alert" className="text-small text-danger">
          {error}
        </p>
      )}
      <div>
        <Button type="submit" variant="primary" disabled={sending}>
          {sending ? "กำลังส่ง…" : "ส่งคำขอ"}
        </Button>
      </div>
    </form>
  );
}
