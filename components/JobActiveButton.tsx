"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui/Button";

/** เจ้าของประกาศปิดรับ / เปิดรับอีกครั้ง — เปิดซ้ำชนประกาศเปิดรับอื่นในแผนกเดียวกันได้ จึงต้องแสดงข้อความจากเซิร์ฟเวอร์ */
export function JobActiveButton({ id, isActive }: { id: string; isActive: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (res.ok) router.refresh();
      else setError(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "เปลี่ยนสถานะไม่สำเร็จ");
    } catch {
      setError("เชื่อมต่อไม่ได้ ลองอีกครั้ง");
    }
    setBusy(false);
  }

  return (
    <span className="flex flex-col items-start gap-1">
      <Button size="sm" variant="ghost" onClick={toggle} disabled={busy} icon={<Icon name={isActive ? "block" : "restart_alt"} />}>
        {isActive ? "ปิดรับ" : "เปิดรับอีกครั้ง"}
      </Button>
      {error && (
        <span role="alert" className="text-small text-danger">
          {error}
        </span>
      )}
    </span>
  );
}
