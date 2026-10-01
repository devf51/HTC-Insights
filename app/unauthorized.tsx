import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { buttonClass } from "@/components/ui/Button";

export default function Unauthorized() {
  return (
    <PageShell
      title="ต้องเข้าสู่ระบบก่อน"
      lede="หน้านี้เปิดให้เฉพาะผู้ที่เข้าสู่ระบบแล้ว"
      actions={
        <Link href="/login" className={buttonClass("primary")}>
          เข้าสู่ระบบ
        </Link>
      }
    />
  );
}
