import { Band } from "@/components/ui/Band";

/** ท้ายหน้า — ตั้งค่าย้ายไปเป็นไอคอนเฟืองใน TopNav แล้ว */
export function Footer() {
  return (
    <footer>
      <Band className="py-12">
        <div className="mx-auto max-w-[1200px]">
          <p lang="en" className="font-display text-[26px] leading-none">
            HTC Insights
          </p>
          <p className="mt-3 text-small text-ink-muted">ระบบฐานข้อมูลสถานประกอบการ วิทยาลัยเทคนิคหาดใหญ่</p>
        </div>
      </Band>
    </footer>
  );
}
