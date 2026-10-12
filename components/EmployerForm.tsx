"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { PinField } from "@/components/PinField";
import type { Pin } from "@/components/PinPicker";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { DEPARTMENTS } from "@/lib/departments";
import { MAX_DEPARTMENTS } from "@/lib/job-rules";

export function EmployerForm() {
  const router = useRouter();
  const [pin, setPin] = useState<Pin | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.reportValidity()) return;
    if (picked.length === 0) {
      setError("เลือกแผนกวิชาที่เปิดรับอย่างน้อย 1 แผนก");
      return;
    }
    setSending(true);
    setError(null);
    const fd = new FormData(form);
    try {
      const res = await fetch("/api/employer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          companyName: fd.get("companyName"),
          address: fd.get("address"),
          contactEmail: fd.get("contactEmail"),
          phone: fd.get("phone"),
          departments: picked,
          lat: pin?.lat ?? null,
          lng: pin?.lng ?? null,
        }),
      });
      const json: { error?: string } | null = await res.json().catch(() => null);
      if (res.ok) {
        router.push("/employer/jobs/new");
        return;
      }
      setError(json?.error ?? "ส่งไม่สำเร็จ ลองอีกครั้ง");
    } catch {
      setError("เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง");
    }
    setSending(false);
  }

  return (
    <form onSubmit={submit} className="flex max-w-2xl flex-col gap-6">
      <TextField name="companyName" label="ชื่อสถานประกอบการ" required minLength={2} maxLength={150} />
      <TextField name="address" label="ที่อยู่" required minLength={5} maxLength={300} />
      <PinField
        label="ปักหมุดที่ตั้ง (ไม่บังคับ)"
        hint="แตะบนแผนที่ตรงที่ตั้งสถานประกอบการ นักศึกษาจะเปิดเส้นทางจากหมุดนี้ได้"
        pin={pin}
        onPick={setPin}
      />
      <TextField
        name="contactEmail"
        type="email"
        label="อีเมลติดต่อสำหรับนักศึกษา"
        hint="แสดงในประกาศให้นักศึกษาเห็น ไม่ใช่อีเมลที่คุณใช้เข้าสู่ระบบ"
        required
        maxLength={254}
      />
      <TextField name="phone" type="tel" label="เบอร์โทร (ไม่บังคับ)" maxLength={20} />
      <fieldset className="kn-field">
        <legend className="kn-field-label">{`แผนกวิชาที่เปิดรับ (สูงสุด ${MAX_DEPARTMENTS} แผนก)`}</legend>
        <div className="grid gap-x-4 sm:grid-cols-2">
          {DEPARTMENTS.map((d) => {
            const on = picked.includes(d.value);
            return (
              <label key={d.value} className="flex min-h-11 items-center gap-3">
                <input
                  type="checkbox"
                  checked={on}
                  // ครบแล้วปิดช่องที่เหลือ — เซิร์ฟเวอร์ตรวจซ้ำ
                  disabled={!on && picked.length >= MAX_DEPARTMENTS}
                  onChange={(e) => setPicked((p) => (e.target.checked ? [...p, d.value] : p.filter((v) => v !== d.value)))}
                  className="size-5 accent-[var(--signal)]"
                />
                {d.label}
              </label>
            );
          })}
        </div>
      </fieldset>
      {error && (
        <p role="alert" className="text-small text-danger">
          {error}
        </p>
      )}
      <div>
        <Button type="submit" variant="primary" disabled={sending}>
          {sending ? "กำลังส่ง…" : "ลงทะเบียน"}
        </Button>
      </div>
    </form>
  );
}
