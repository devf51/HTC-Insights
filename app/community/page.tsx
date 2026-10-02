import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { PageShell } from "@/components/PageShell";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { listPosts } from "@/lib/community";
import { POST_TYPES, postTypeLabel, type PostType } from "@/lib/community-rules";
import { DEPARTMENTS, departmentLabel } from "@/lib/departments";
import { getCurrentUser } from "@/lib/session";
import { communityListParamsSchema } from "@/lib/validation";
import { thaiDate } from "@/lib/thai-time";

type Filters = { type?: PostType; department?: string; page: number };

export default async function CommunityPage({ searchParams }: PageProps<"/community">) {
  const f = communityListParamsSchema.parse(await searchParams);
  const [user, { items, page, pageCount }] = await Promise.all([getCurrentUser(), listPosts(f)]);
  const filtered = Boolean(f.type || f.department);

  return (
    <PageShell
      title="ชุมชน"
      lede="ถามตอบ เล่าประสบการณ์ แลกเทคนิค และหาเพื่อนฝึกงาน"
      actions={
        // ผู้ดูแลอ่านได้อย่างเดียว — ไม่แสดงปุ่มที่กดแล้วเจอ 403
        user?.role === "STUDENT" && (
          <Link href="/community/new" className={buttonClass("primary")}>
            ตั้งกระทู้
          </Link>
        )
      }
    >
      <nav aria-label="หมวดกระทู้" className="overflow-x-auto">
        <div className="kn-tabs w-max min-w-full">
          {[{ value: undefined, label: "ทั้งหมด" }, ...POST_TYPES].map((t) => (
            <Link
              key={t.value ?? "ALL"}
              href={listHref({ ...f, type: t.value, page: 1 })}
              className="kn-tab"
              aria-current={f.type === t.value ? "page" : undefined}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </nav>

      <form className="flex flex-col gap-4 sm:flex-row sm:items-end">
        {f.type && <input type="hidden" name="type" value={f.type} />}
        <div className="kn-field sm:w-80">
          <label className="kn-field-label" htmlFor="department">
            แผนกวิชา
          </label>
          <select id="department" name="department" className="kn-input" defaultValue={f.department ?? ""}>
            <option value="">ทุกแผนก</option>
            {DEPARTMENTS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" icon={<Icon name="filter_list" />}>
          กรอง
        </Button>
      </form>

      {items.length === 0 ? (
        <EmptyState icon="forum" title={filtered ? "ไม่พบกระทู้" : "ยังไม่มีกระทู้"}>
          {filtered ? "ลองเปลี่ยนหมวดหรือแผนก" : "กระทู้ที่ผ่านการตรวจแล้วจะแสดงที่นี่"}
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-4">
          {items.map((p) => (
            <li key={p.id}>
              <Card
                eyebrow={[postTypeLabel(p.type), p.department ? departmentLabel(p.department) : "ทั่วไป"].join(" · ")}
                title={
                  <Link href={`/community/${p.id}`} className="kn-link">
                    {p.title}
                  </Link>
                }
                footer={
                  <span className="flex flex-wrap items-center gap-x-4 gap-y-2 text-small text-ink-muted">
                    <span>{`${p.user.name ?? "นักศึกษา"} · ${thaiDate(p.createdAt)}`}</span>
                    <span>{`${p._count.comments} ความคิดเห็น`}</span>
                    <span>{`${p._count.likes} ถูกใจ`}</span>
                    {p.bestAnswerId && <Badge tone="success">มีคำตอบที่ดีที่สุด</Badge>}
                  </span>
                }
              />
            </li>
          ))}
        </ul>
      )}

      {pageCount > 1 && (
        <nav aria-label="เปลี่ยนหน้า" className="flex items-center justify-between gap-4">
          {page > 1 ? (
            <Link href={listHref({ ...f, page: page - 1 })} className={buttonClass("secondary")}>
              ก่อนหน้า
            </Link>
          ) : (
            <span />
          )}
          <span className="text-small text-ink-muted">{`หน้า ${page} จาก ${pageCount}`}</span>
          {page < pageCount ? (
            <Link href={listHref({ ...f, page: page + 1 })} className={buttonClass("secondary")}>
              ถัดไป
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </PageShell>
  );
}

function listHref(f: Filters): string {
  const p = new URLSearchParams();
  if (f.type) p.set("type", f.type);
  if (f.department) p.set("department", f.department);
  if (f.page > 1) p.set("page", String(f.page));
  const s = p.toString();
  return s ? `/community?${s}` : "/community";
}
