import Link from "next/link";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/EmptyState";
import { ModerationActions } from "@/components/ModerationActions";
import { ReportActions } from "@/components/ReportActions";
import { PageShell } from "@/components/PageShell";
import { Badge } from "@/components/ui/Badge";
import { buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Table } from "@/components/ui/Table";
import { ROLE_LABELS } from "@/lib/account-rules";
import { postTypeLabel } from "@/lib/community-rules";
import { departmentLabel } from "@/lib/departments";
import { actionLabel, excerpt, kindLabel, targetLabel, type ReportKind } from "@/lib/moderation-rules";
import { auditLog, pendingQueue, pendingReports } from "@/lib/moderation";
import { pendingUpgrades } from "@/lib/upgrades";
import { requireAdmin } from "@/lib/auth";
import { adminParamsSchema } from "@/lib/validation";

const thaiDateTime = (d: Date) =>
  d.toLocaleString("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });

const TABS = [
  { value: "pending", label: "รอตรวจ" },
  { value: "upgrades", label: "คำขอยืนยันสิทธิ์" },
  { value: "reports", label: "ข้อร้องเรียน" },
  { value: "history", label: "ประวัติผู้ดูแล" },
] as const;

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  // layout เรียกแล้ว — getCurrentUser ห่อ cache() ไม่ query ซ้ำ · แดชบอร์ดผู้บริหารเฉพาะ super admin
  const admin = await requireAdmin();
  const p = adminParamsSchema.parse(await searchParams);
  return (
    <PageShell
      title="ศูนย์คัดกรอง"
      lede="อนุมัติหรือปฏิเสธรีวิว กระทู้ ความคิดเห็น และประกาศงาน พร้อมเหตุผล ผู้เขียนได้รับแจ้งผลทุกครั้ง"
      actions={
        <>
          <Link href="/admin/users" className={buttonClass("secondary")}>
            จัดการบัญชี
          </Link>
          {admin.isSuperAdmin && (
            <Link href="/admin/dashboard" className={buttonClass("secondary")}>
              แดชบอร์ด
            </Link>
          )}
        </>
      }
    >
      <nav aria-label="มุมมองศูนย์คัดกรอง" className="overflow-x-auto">
        <div className="kn-tabs w-max min-w-full">
          {TABS.map((t) => (
            <Link key={t.value} href={t.value === "pending" ? "/admin" : `/admin?tab=${t.value}`} className="kn-tab" aria-current={p.tab === t.value ? "page" : undefined}>
              {t.label}
            </Link>
          ))}
        </div>
      </nav>
      {p.tab === "history" ? <History page={p.page} /> : p.tab === "upgrades" ? <Upgrades /> : p.tab === "reports" ? <Reports /> : <Pending />}
    </PageShell>
  );
}

function Who({ user, anonymous }: { user: { name: string | null; email: string }; anonymous?: boolean }) {
  return (
    <span className="flex flex-wrap items-center gap-2 text-small text-ink-muted">
      <span className="break-all">{`${user.name ?? "ไม่มีชื่อ"} · ${user.email}`}</span>
      {anonymous && <Badge tone="warning">ผู้เขียนเลือกไม่ระบุตัวตน</Badge>}
    </span>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  if (count === 0) return null;
  return (
    <section className="flex flex-col gap-4">
      <SectionHeader title={`${title} (${count})`} />
      {children}
    </section>
  );
}

const Text = ({ label, children }: { label?: string; children: string | null }) =>
  children ? <p className="whitespace-pre-line break-words">{label ? `${label}: ${children}` : children}</p> : null;

async function Pending() {
  const q = await pendingQueue();
  if (q.reviews.length + q.posts.length + q.comments.length + q.jobs.length === 0) {
    return (
      <EmptyState icon="fact_check" title="ไม่มีรายการรอตรวจ">
        เนื้อหาที่รอการอนุมัติจะแสดงที่นี่
      </EmptyState>
    );
  }
  return (
    <>
      <Section title={kindLabel("review")} count={q.reviews.length}>
        {q.reviews.map((r) => (
          <Card
            key={r.id}
            eyebrow={`${departmentLabel(r.department)} · ${thaiDateTime(r.createdAt)}`}
            title={r.company.name}
            footer={<ModerationActions endpoint={`/api/admin/moderation/review/${r.id}`} />}
          >
            <Who user={r.user} anonymous={r.isAnonymous} />
            <p>{`คะแนนรวม ${r.scoreOverall.toFixed(1)} · ${r.dailyAllowance === null ? "ไม่ระบุเบี้ยเลี้ยง" : `เบี้ยเลี้ยง ${r.dailyAllowance} บาท/วัน`}`}</p>
            <Text>{r.textWork}</Text>
            <Text label="ข้อดี">{r.textPros}</Text>
            <Text label="ข้อควรรู้">{r.textCons}</Text>
            <Text label="คำแนะนำ">{r.textAdvice}</Text>
            {r.photos.length > 0 && (
              <span className="flex flex-wrap gap-3">
                {r.photos.map((ph, i) => (
                  <a key={ph.id} href={ph.url} target="_blank" rel="noopener noreferrer" className="kn-link">
                    {`รูปที่ ${i + 1}`}
                  </a>
                ))}
              </span>
            )}
          </Card>
        ))}
      </Section>
      <Section title={kindLabel("post")} count={q.posts.length}>
        {q.posts.map((p) => (
          <Card
            key={p.id}
            eyebrow={`${postTypeLabel(p.type)} · ${p.department ? departmentLabel(p.department) : "ทั่วไป"} · ${thaiDateTime(p.createdAt)}`}
            title={p.title}
            footer={<ModerationActions endpoint={`/api/admin/moderation/post/${p.id}`} />}
          >
            <Who user={p.user} />
            <Text>{p.body}</Text>
          </Card>
        ))}
      </Section>
      <Section title={kindLabel("comment")} count={q.comments.length}>
        {q.comments.map((c) => (
          <Card key={c.id} eyebrow={thaiDateTime(c.createdAt)} title={`ในกระทู้: ${c.post.title}`} footer={<ModerationActions endpoint={`/api/admin/moderation/comment/${c.id}`} />}>
            <Who user={c.user} />
            {c.parent && <Text label="ตอบกลับ">{c.parent.body}</Text>}
            <Text>{c.body}</Text>
            {(c.post.status !== "APPROVED" || (c.parent && c.parent.status !== "APPROVED")) && (
              <Badge tone="warning">ต้นทางยังไม่เผยแพร่ อนุมัติไม่ได้</Badge>
            )}
          </Card>
        ))}
      </Section>
      <Section title={kindLabel("job")} count={q.jobs.length}>
        {q.jobs.map((j) => (
          <Card
            key={j.id}
            eyebrow={`${departmentLabel(j.department)} · ${thaiDateTime(j.createdAt)}`}
            title={`${j.title} · ${j.company.name}`}
            footer={<ModerationActions endpoint={`/api/admin/moderation/job/${j.id}`} />}
          >
            <Who user={j.employer.user} />
            <p>{`${j.allowance === null ? "ไม่ระบุเบี้ยเลี้ยง" : `เบี้ยเลี้ยง ${j.allowance} บาท/วัน`} · ติดต่อ ${j.contactEmail}${j.contactPhone ? ` ${j.contactPhone}` : ""}`}</p>
            <Text>{j.description}</Text>
            <Text label="คุณสมบัติ">{j.qualifications}</Text>
            <Text label="สวัสดิการ">{j.benefits}</Text>
          </Card>
        ))}
      </Section>
    </>
  );
}

const COLUMNS = [
  { key: "at", label: "เวลา" },
  { key: "admin", label: "ผู้ดูแล" },
  { key: "action", label: "การกระทำ" },
  { key: "target", label: "เป้าหมาย" },
  { key: "detail", label: "รายละเอียด" },
];

async function History({ page }: { page: number }) {
  const { items, page: current, pageCount } = await auditLog(page);
  if (items.length === 0) return <EmptyState icon="history" title="ยังไม่มีประวัติ" />;
  return (
    <>
      <Table
        columns={COLUMNS}
        rows={items.map((a) => ({
          id: a.id,
          at: <span className="whitespace-nowrap">{thaiDateTime(a.createdAt)}</span>,
          admin: a.admin.name ?? a.admin.email,
          action: actionLabel(a.action),
          target: <span className="whitespace-nowrap">{`${targetLabel(a.targetType)} ${a.targetId}`}</span>,
          detail: a.detail ?? "-",
        }))}
      />
      {pageCount > 1 && (
        <nav aria-label="เปลี่ยนหน้า" className="flex items-center justify-between gap-4">
          {current > 1 ? (
            <Link href={`/admin?tab=history&page=${current - 1}`} className={buttonClass("secondary")}>
              ก่อนหน้า
            </Link>
          ) : (
            <span />
          )}
          <span className="text-small text-ink-muted">{`หน้า ${current} จาก ${pageCount}`}</span>
          {current < pageCount ? (
            <Link href={`/admin?tab=history&page=${current + 1}`} className={buttonClass("secondary")}>
              ถัดไป
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  );
}

async function Upgrades() {
  const items = await pendingUpgrades();
  if (items.length === 0) return <EmptyState icon="badge" title="ไม่มีคำขอรอตรวจ" />;
  return (
    <ul className="flex flex-col gap-4">
      {items.map((u) => (
        <li key={u.id}>
          <Card eyebrow={thaiDateTime(u.createdAt)} title={`รหัสนักศึกษา ${u.studentId}`} footer={<ModerationActions endpoint={`/api/admin/upgrades/${u.id}`} />}>
            <Who user={u.user} />
            <p>{`${departmentLabel(u.department)} · ${u.educationLevel} · บทบาทปัจจุบัน ${ROLE_LABELS[u.user.role]}`}</p>
            <a href={u.cardImageUrl} target="_blank" rel="noopener noreferrer" className="kn-link">
              ดูรูปบัตรนักศึกษา
            </a>
          </Card>
        </li>
      ))}
    </ul>
  );
}

type PendingReport = Awaited<ReturnType<typeof pendingReports>>[number];

/** เป้าหมายของข้อร้องเรียนสำหรับแสดง — status null = ไม่มีสถานะการตรวจ (สถานประกอบการ) */
function reportPreview(r: PendingReport): { kind: ReportKind; title: string; href: string | null; status: string | null } {
  if (r.review) return { kind: "review", title: `${r.review.company.name}: ${excerpt(r.review.textWork)}`, href: `/insights/${r.review.companyId}`, status: r.review.status };
  if (r.post) return { kind: "post", title: r.post.title, href: `/community/${r.postId}`, status: r.post.status };
  if (r.comment) return { kind: "comment", title: excerpt(r.comment.body), href: `/community/${r.comment.postId}`, status: r.comment.status };
  if (r.job) return { kind: "job", title: r.job.title, href: `/jobs/${r.jobId}`, status: r.job.status };
  return { kind: "company", title: r.company?.name ?? "ไม่พบเนื้อหา", href: r.companyId ? `/insights/${r.companyId}` : null, status: null };
}

async function Reports() {
  const items = await pendingReports();
  if (items.length === 0) return <EmptyState icon="flag" title="ไม่มีข้อร้องเรียนรอตรวจ" />;
  return (
    <ul className="flex flex-col gap-4">
      {items.map((r) => {
        const t = reportPreview(r);
        return (
          <li key={r.id}>
            <Card
              eyebrow={`${targetLabel(t.kind)} · ${thaiDateTime(r.createdAt)}`}
              title={
                t.href ? (
                  <Link href={t.href} className="kn-link">
                    {t.title}
                  </Link>
                ) : (
                  t.title
                )
              }
              footer={<ReportActions id={r.id} canWithdraw={t.kind !== "company" && t.status === "APPROVED"} />}
            >
              <p className="text-small text-ink-muted">ผู้รายงาน</p>
              <Who user={r.reporter} />
              <Text label="เหตุผล">{r.reason}</Text>
              {t.status !== null && t.status !== "APPROVED" && <Badge tone="warning">เนื้อหานี้ไม่ได้เผยแพร่แล้ว</Badge>}
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
