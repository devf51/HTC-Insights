import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { buttonClass } from "@/components/ui/Button";

export default function Forbidden() {
  return (
    <PageShell
      title="หน้านี้ไม่เปิดให้บัญชีของคุณ"
      lede="ถ้าคิดว่าควรเข้าได้ ติดต่อผู้ดูแลระบบ"
      actions={
        <Link href="/" className={buttonClass("secondary")}>
          กลับหน้าแรก
        </Link>
      }
    />
  );
}
