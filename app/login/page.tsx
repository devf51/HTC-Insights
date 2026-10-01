import { Icon } from "@/components/Icon";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  return (
    <PageShell
      title="เข้าสู่ระบบ"
      lede="นักศึกษาใช้อีเมลของวิทยาลัย สถานประกอบการและบุคคลภายนอกใช้บัญชี Google ทั่วไป"
    >
      <div className="flex flex-col items-start gap-3">
        <Button variant="primary" disabled icon={<Icon name="login" />}>
          เข้าสู่ระบบด้วย Google
        </Button>
        <p className="text-small text-ink-muted">ยังเปิดใช้ไม่ได้ ระบบเข้าสู่ระบบอยู่ระหว่างพัฒนา</p>
      </div>
    </PageShell>
  );
}
