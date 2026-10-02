import Link from "next/link";
import { signOut } from "@/auth";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { PageShell } from "@/components/PageShell";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { requireUser } from "@/lib/auth";
import type { Role } from "@/lib/nav";
import { myReviews } from "@/lib/reviews";

const ROLE_LABEL: Record<Role, string> = {
  STUDENT: "นักศึกษา",
  EXTERNAL: "บุคคลภายนอก",
  ADMIN: "ผู้ดูแลระบบ",
};

const STATUS = {
  PENDING: { tone: "warning", label: "รอตรวจ" },
  APPROVED: { tone: "success", label: "เผยแพร่แล้ว" },
  REJECTED: { tone: "danger", label: "ไม่ผ่านการตรวจ" },
} as const;

const thaiDate = (d: Date) => d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" });

export default async function ProfilePage({ searchParams }: PageProps<"/profile">) {
  // layout เรียกแล้ว เรียกซ้ำเพื่อเอาข้อมูลผู้ใช้ — getCurrentUser() ห่อ cache() ไม่ query ซ้ำ
  const user = await requireUser();
  const sent = (await searchParams).sent === "1";
  const reviews = user.role === "STUDENT" ? await myReviews() : [];

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <PageShell
      title="โปรไฟล์"
      actions={
        // ยื่นยืนยันสิทธิ์มีความหมายเฉพาะบุคคลภายนอกที่เป็นนักศึกษาแต่ไม่มีอีเมลวิทยาลัย
        user.role === "EXTERNAL" && (
          <Link href="/profile/upgrade" className={buttonClass("secondary")}>
            ยืนยันสิทธิ์นักศึกษา
          </Link>
        )
      }
    >
      {sent && (
        <p role="status" className="rounded-lg border border-line bg-signal-tint px-4 py-3">
          ส่งรีวิวแล้ว ผู้ดูแลจะตรวจก่อนเผยแพร่ ติดตามสถานะได้ด้านล่าง
        </p>
      )}
      <Card
        title={user.name ?? user.email}
        footer={
          <form action={signOutAction}>
            <Button type="submit" variant="ghost" icon={<Icon name="logout" />}>
              ออกจากระบบ
            </Button>
          </form>
        }
      >
        <span className="flex flex-wrap items-center gap-2">
          <span className="break-all">{user.email}</span>
          <Badge tone="signal">
            {ROLE_LABEL[user.role]}
            {user.isSuperAdmin ? " ระดับสูง" : ""}
          </Badge>
        </span>
      </Card>
      {user.role === "STUDENT" ? (
        <section className="flex flex-col gap-4">
          <SectionHeader title="รีวิวของฉัน" />
          {reviews.length === 0 ? (
            <EmptyState icon="rate_review" title="ยังไม่มีรีวิว">
              <Link href="/insights/write-review" className="kn-link">
                เขียนรีวิวที่ฝึกงานของคุณ
              </Link>
            </EmptyState>
          ) : (
            reviews.map((r) => (
              <Card
                key={r.id}
                eyebrow={thaiDate(r.createdAt)}
                title={r.company.name}
                footer={<Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge>}
              >
                {r.status === "REJECTED" && (
                  <>
                    <p>{`เหตุผล: ${r.rejectionReason ?? "ไม่ระบุ"}`}</p>
                    <Link href={`/insights/write-review?edit=${r.id}`} className="kn-link">
                      แก้ไขแล้วส่งใหม่
                    </Link>
                  </>
                )}
              </Card>
            ))
          )}
        </section>
      ) : (
        <EmptyState icon="rate_review">ประกาศของคุณจะแสดงที่นี่</EmptyState>
      )}
    </PageShell>
  );
}
