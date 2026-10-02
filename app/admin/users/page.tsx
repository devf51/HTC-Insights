import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { PageShell } from "@/components/PageShell";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/TextField";
import { UserActions } from "@/components/UserActions";
import { ROLE_LABELS, ROLE_VALUES, canManage } from "@/lib/account-rules";
import { requireAdmin } from "@/lib/auth";
import { departmentLabel } from "@/lib/departments";
import { searchUsers } from "@/lib/users";
import { userSearchSchema } from "@/lib/validation";

type Filters = { q: string; role?: string; page: number };

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  const actor = await requireAdmin();
  const f = userSearchSchema.parse(await searchParams);
  const { items, total, page, pageCount } = await searchUsers(f);

  return (
    <PageShell eyebrow="ผู้ดูแล" title="จัดการบัญชี" lede="ค้นหา เปลี่ยนบทบาท และระงับบัญชี — แต่งตั้งหรือถอดถอนผู้ดูแลได้เฉพาะผู้ดูแลระดับสูง">
      <form className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <TextField name="q" label="ค้นหา" placeholder="ชื่อหรืออีเมล" defaultValue={f.q} maxLength={100} className="sm:flex-1" />
        <div className="kn-field sm:w-56">
          <label className="kn-field-label" htmlFor="role">
            บทบาท
          </label>
          <select id="role" name="role" className="kn-input" defaultValue={f.role ?? ""}>
            <option value="">ทุกบทบาท</option>
            {ROLE_VALUES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" icon={<Icon name="search" />}>
          ค้นหา
        </Button>
      </form>
      <p className="text-small text-ink-muted">{`พบ ${total.toLocaleString("th-TH")} บัญชี`}</p>
      {items.length === 0 ? (
        <EmptyState icon="group" title="ไม่พบบัญชี" />
      ) : (
        <ul className="flex flex-col gap-4">
          {items.map((u) => (
            <li key={u.id}>
              <Card
                title={u.name ?? u.email}
                footer={
                  canManage(actor, u) ? (
                    <UserActions id={u.id} role={u.role} isBanned={u.isBanned} allowAdmin={actor.isSuperAdmin} />
                  ) : (
                    <span className="text-small text-ink-muted">
                      {u.id === actor.id ? "บัญชีของคุณ" : "แก้ไขได้เฉพาะผู้ดูแลระดับสูง"}
                    </span>
                  )
                }
              >
                <span className="flex flex-wrap items-center gap-2">
                  <span className="break-all">{u.email}</span>
                  <Badge tone="signal">{`${ROLE_LABELS[u.role]}${u.isSuperAdmin ? " ระดับสูง" : ""}`}</Badge>
                  {u.isBanned && <Badge tone="danger">ถูกระงับ</Badge>}
                </span>
                {u.studentId && <p>{`รหัส ${u.studentId}${u.department ? ` · ${departmentLabel(u.department)}` : ""}`}</p>}
              </Card>
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
  if (f.q) p.set("q", f.q);
  if (f.role) p.set("role", f.role);
  if (f.page > 1) p.set("page", String(f.page));
  const s = p.toString();
  return s ? `/admin/users?${s}` : "/admin/users";
}
