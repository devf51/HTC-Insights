"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** เปิดหน้าแจ้งเตือนแล้วถือว่าอ่านหมด — refresh ให้ตัวเลขบนกระดิ่งใน layout อัปเดต */
export function MarkAllRead() {
  const router = useRouter();
  useEffect(() => {
    fetch("/api/notifications/read", { method: "POST" })
      .then((res) => res.ok && router.refresh())
      .catch(() => {});
  }, [router]);
  return null;
}
