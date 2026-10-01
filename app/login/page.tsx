import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { Icon } from "@/components/Icon";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/Button";
import { loginErrorMessage } from "@/lib/auth-rules";
import { getCurrentUser } from "@/lib/session";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await getCurrentUser()) redirect("/");
  const message = loginErrorMessage((await searchParams).error);

  // ponytail: กลับหน้าแรกเสมอ ไม่จำหน้าที่ตั้งใจจะไป — เพิ่ม redirectTo เมื่อผู้ใช้บ่น
  async function signInWithGoogle() {
    "use server";
    await signIn("google", { redirectTo: "/" });
  }

  return (
    <PageShell
      title="เข้าสู่ระบบ"
      lede="นักศึกษาใช้อีเมลของวิทยาลัย สถานประกอบการและบุคคลภายนอกใช้บัญชี Google ทั่วไป"
    >
      <form action={signInWithGoogle} className="flex flex-col items-start gap-3">
        <Button type="submit" variant="primary" icon={<Icon name="login" />}>
          เข้าสู่ระบบด้วย Google
        </Button>
        {message && (
          <p role="alert" className="text-small text-danger">
            {message}
          </p>
        )}
      </form>
    </PageShell>
  );
}
