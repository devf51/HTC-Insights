import Link from "next/link";
import { Band } from "@/components/ui/Band";

/** ท้ายหน้า — ทางเข้า /settings ของทุกบทบาทรวมผู้เยี่ยมชม */
export function Footer() {
  return (
    <footer>
      <Band className="py-12">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p lang="en" className="font-display text-[26px] leading-none">
              HTC Insights
            </p>
            <p className="mt-3 text-small text-ink-muted">ระบบฐานข้อมูลสถานประกอบการ วิทยาลัยเทคนิคหาดใหญ่</p>
          </div>
          <Link href="/settings" className="kn-link text-small">
            ตั้งค่า
          </Link>
        </div>
      </Band>
    </footer>
  );
}
