import Link from "next/link";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/EmptyState";
import { ModerationActions } from "@/components/ModerationActions";
import { PageShell } from "@/components/PageShell";
import { Badge } from "@/components/ui/Badge";
import { buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Table } from "@/components/ui/Table";
import { postTypeLabel } from "@/lib/community-rules";
import { departmentLabel } from "@/lib/departments";
import { actionLabel, kindLabel } from "@/lib/moderation-rules";
import { auditLog, pendingQueue } from "@/lib/moderation";
import { adminParamsSchema } from "@/lib/validation";

const thaiDateTime = (d: Date) =>
  d.toLocaleString("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });

const TABS = [
  { value: "pending", label: "รอตรวจ" },
  { value: "history", label: "ประวัติผู้ดูแล" },
] as const;

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
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
          <Link href="/admin/dashboard" className={buttonClass("secondary")}>
            แดชบอร์ด
          </Link>
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
      {p.tab === "history" ? <History page={p.page} /> : <Pending />}
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
            footer={<ModerationActions kind="review" id={r.id} />}
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
            footer={<ModerationActions kind="post" id={p.id} />}
          >
            <Who user={p.user} />
            <Text>{p.body}</Text>
          </Card>
        ))}
      </Section>
      <Section title={kindLabel("comment")} count={q.comments.length}>
        {q.comments.map((c) => (
          <Card key={c.id} eyebrow={thaiDateTime(c.createdAt)} title={`ในกระทู้: ${c.post.title}`} footer={<ModerationActions kind="comment" id={c.id} />}>
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
            footer={<ModerationActions kind="job" id={j.id} />}
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
          target: <span className="whitespace-nowrap">{`${kindLabel(a.targetType)} ${a.targetId}`}</span>,
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
