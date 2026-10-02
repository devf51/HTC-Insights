"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui/Button";
import { ROLE_LABELS, ROLE_VALUES } from "@/lib/account-rules";
import type { Role } from "@/lib/nav";

/** เปลี่ยนบทบาทและระงับบัญชี — allowAdmin เฉพาะ super admin (สเปกข้อ 18) เซิร์ฟเวอร์ตรวจซ้ำใน accountChangeError */
export function UserActions({ id, role, isBanned, allowAdmin }: { id: string; role: Role; isBanned: boolean; allowAdmin: boolean }) {
  const router = useRouter();
  const fieldId = useId();
  const [next, setNext] = useState<Role>(role);
  const [confirmBan, setConfirmBan] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const roles = ROLE_VALUES.filter((r) => r !== "ADMIN" || allowAdmin);

  async function send(body: object) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setConfirmBan(false);
        router.refresh();
      } else {
        setError(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "บันทึกไม่สำเร็จ");
      }
    } catch {
      setError("เชื่อมต่อไม่ได้ ลองอีกครั้ง");
    }
    setBusy(false);
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="kn-field">
          <label className="kn-field-label" htmlFor={fieldId}>
            บทบาท
          </label>
          <select id={fieldId} className="kn-input" value={next} onChange={(e) => setNext(e.target.value as Role)}>
            {roles.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
        <Button variant="secondary" disabled={busy || next === role} onClick={() => send({ action: "set_role", role: next })}>
          บันทึกบทบาท
        </Button>
      </div>
      {isBanned ? (
        <div>
          <Button variant="secondary" disabled={busy} onClick={() => send({ action: "unban" })}>
            ยกเลิกการระงับ
          </Button>
        </div>
      ) : confirmBan ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="danger" disabled={busy} onClick={() => send({ action: "ban" })}>
            ยืนยันระงับบัญชี
          </Button>
          <Button variant="ghost" disabled={busy} onClick={() => setConfirmBan(false)}>
            ยกเลิก
          </Button>
        </div>
      ) : (
        <div>
          <Button variant="ghost" icon={<Icon name="block" />} onClick={() => setConfirmBan(true)}>
            ระงับบัญชี
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-small text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
