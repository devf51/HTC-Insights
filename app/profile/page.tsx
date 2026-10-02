import Link from "next/link";
import { signOut } from "@/auth";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { JobActiveButton } from "@/components/JobActiveButton";
import { PageShell } from "@/components/PageShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ROLE_LABELS } from "@/lib/account-rules";
import { requireUser } from "@/lib/auth";
import { myPosts } from "@/lib/community";
import { postTypeLabel } from "@/lib/community-rules";
import { departmentLabel } from "@/lib/departments";
import { myEmployer } from "@/lib/jobs";
import { myReviews } from "@/lib/reviews";
import { thaiDate } from "@/lib/thai-time";

export default async function ProfilePage({ searchParams }: PageProps<"/profile">) {
  // layout เรียกแล้ว เรียกซ้ำเพื่อเอาข้อมูลผู้ใช้ — getCurrentUser() ห่อ cache() ไม่ query ซ้ำ
  const user = await requireUser();
  const sp = await searchParams;
  const sent = sp.sent === "1";
  const posted = sp.posted === "1";
  const [reviews, posts] = user.role === "STUDENT" ? await Promise.all([myReviews(), myPosts()]) : [[], []];
  const employer = user.role === "EXTERNAL" ? await myEmployer() : null;

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
      {posted && (
        <p role="status" className="rounded-lg border border-line bg-signal-tint px-4 py-3">
          ส่งประกาศแล้ว ผู้ดูแลจะตรวจก่อนเผยแพร่ ติดตามสถานะได้ด้านล่าง
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
            {ROLE_LABELS[user.role]}
            {user.isSuperAdmin ? " ระดับสูง" : ""}
          </Badge>
        </span>
      </Card>
      {user.role === "STUDENT" ? (
        <>
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
                  footer={<StatusBadge status={r.status} />}
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
          <section className="flex flex-col gap-4">
            <SectionHeader title="กระทู้ของฉัน" />
            {posts.length === 0 ? (
              <EmptyState icon="forum" title="ยังไม่มีกระทู้">
                <Link href="/community/new" className="kn-link">
                  ตั้งกระทู้แรก
                </Link>
              </EmptyState>
            ) : (
              posts.map((p) => (
                <Card
                  key={p.id}
                  eyebrow={`${postTypeLabel(p.type)} · ${thaiDate(p.createdAt)}`}
                  title={
                    p.status === "REJECTED" ? (
                      p.title
                    ) : (
                      <Link href={`/community/${p.id}`} className="kn-link">
                        {p.title}
                      </Link>
                    )
                  }
                  footer={<StatusBadge status={p.status} />}
                >
                  {p.status === "REJECTED" && <p>{`เหตุผล: ${p.rejectionReason ?? "ไม่ระบุ"}`}</p>}
                </Card>
              ))
            )}
          </section>
        </>
      ) : user.role === "EXTERNAL" ? (
        <EmployerSection employer={employer} />
      ) : null}
    </PageShell>
  );
}

function EmployerSection({ employer }: { employer: Awaited<ReturnType<typeof myEmployer>> }) {
  if (!employer) {
    return (
      <EmptyState icon="add_business" title="ยังไม่ได้ลงทะเบียนสถานประกอบการ">
        <Link href="/employer/register" className="kn-link">
          ลงทะเบียนเพื่อลงประกาศรับนักศึกษาฝึกงาน
        </Link>
      </EmptyState>
    );
  }
  return (
    <>
      <section className="flex flex-col gap-4">
        <SectionHeader title="สถานประกอบการของฉัน" />
        <Card title={employer.companyName}>
          <p>{`อีเมลติดต่อที่แสดงในประกาศ: ${employer.contactEmail}`}</p>
          <p>{`แผนกที่เปิดรับ: ${employer.departments.map(departmentLabel).join(" · ")}`}</p>
        </Card>
      </section>
      <section className="flex flex-col gap-4">
        <SectionHeader
          title="ประกาศของฉัน"
          actions={
            <Link href="/employer/jobs/new" className={buttonClass("secondary")}>
              ลงประกาศ
            </Link>
          }
        />
        {employer.jobs.length === 0 ? (
          <EmptyState icon="work" title="ยังไม่มีประกาศ" />
        ) : (
          employer.jobs.map((j) => (
            <Card
              key={j.id}
              eyebrow={`${departmentLabel(j.department)} · ${thaiDate(j.createdAt)}`}
              title={
                j.status === "APPROVED" && j.isActive ? (
                  <Link href={`/jobs/${j.id}`} className="kn-link">
                    {j.title}
                  </Link>
                ) : (
                  j.title
                )
              }
              footer={
                <span className="flex flex-wrap items-center gap-3">
                  <StatusBadge status={j.status} />
                  {!j.isActive && <Badge>ปิดรับแล้ว</Badge>}
                  {j.status !== "REJECTED" && <JobActiveButton id={j.id} isActive={j.isActive} />}
                </span>
              }
            >
              {j.status === "REJECTED" && <p>{`เหตุผล: ${j.rejectionReason ?? "ไม่ระบุ"}`}</p>}
            </Card>
          ))
        )}
      </section>
    </>
  );
}
