"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { departmentLabel } from "@/lib/departments";

function Area({ name, label, required, minLength, maxLength }: { name: string; label: string; required?: boolean; minLength?: number; maxLength: number }) {
  return (
    <div className="kn-field">
      <label className="kn-field-label" htmlFor={name}>
        {label}
      </label>
      <textarea id={name} name={name} required={required} minLength={minLength} maxLength={maxLength} rows={5} className="kn-input h-auto py-3" />
    </div>
  );
}

/** departments: เฉพาะแผนกที่ยังไม่มีประกาศเปิดรับ (หน้าคำนวณด้วย freeDepartments) */
export function JobForm({ departments, contactEmail, contactPhone }: { departments: string[]; contactEmail: string; contactPhone: string | null }) {
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
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      const json: { error?: string } | null = await res.json().catch(() => null);
      if (res.ok) {
        router.push("/profile?posted=1");
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
      <TextField name="title" label="ชื่อตำแหน่ง" required minLength={5} maxLength={120} />
      <div className="kn-field">
        <label className="kn-field-label" htmlFor="department">
          แผนกวิชา
        </label>
        <select id="department" name="department" required className="kn-input" defaultValue={departments.length === 1 ? departments[0] : ""}>
          <option value="" disabled>
            เลือกแผนก
          </option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {departmentLabel(d)}
            </option>
          ))}
        </select>
      </div>
      <Area name="description" label="หน้าที่และรายละเอียดงาน" required minLength={20} maxLength={2000} />
      <Area name="qualifications" label="คุณสมบัติ (ไม่บังคับ)" maxLength={1000} />
      <Area name="benefits" label="สวัสดิการ (ไม่บังคับ)" maxLength={1000} />
      <TextField name="allowance" type="number" inputMode="numeric" min={0} max={10000} step={1} label="เบี้ยเลี้ยง บาทต่อวัน (ไม่บังคับ)" />
      <TextField
        name="contactEmail"
        type="email"
        label="อีเมลติดต่อ"
        hint="นักศึกษาเห็นอีเมลนี้ในประกาศ ไม่ใช่อีเมลที่คุณใช้เข้าสู่ระบบ"
        defaultValue={contactEmail}
        required
        maxLength={254}
      />
      <TextField name="contactPhone" type="tel" label="เบอร์โทรติดต่อ (ไม่บังคับ)" defaultValue={contactPhone ?? ""} maxLength={20} />
      <p className="text-small text-ink-muted">ประกาศจะเผยแพร่หลังผู้ดูแลตรวจแล้ว ติดตามสถานะได้ที่หน้าโปรไฟล์</p>
      {error && (
        <p role="alert" className="text-small text-danger">
          {error}
        </p>
      )}
      <div>
        <Button type="submit" variant="primary" disabled={sending}>
          {sending ? "กำลังส่ง…" : "ลงประกาศ"}
        </Button>
      </div>
    </form>
  );
}
