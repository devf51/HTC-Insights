"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui/Button";

/** ผู้ดูแลยืนยันสถานประกอบการ — เซิร์ฟเวอร์ตอบ 409 ถ้าผู้ดูแลคนอื่นยืนยันไปก่อน */
export function VerifyCompanyButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function verify() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/companies/${id}`, { method: "POST" });
      if (res.ok) router.refresh();
      else setError(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "บันทึกไม่สำเร็จ");
    } catch {
      setError("เชื่อมต่อไม่ได้ ลองอีกครั้ง");
    }
    setBusy(false);
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <div>
        <Button variant="secondary" icon={<Icon name="verified" />} disabled={busy} onClick={verify}>
          ยืนยันสถานประกอบการ
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-small text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
