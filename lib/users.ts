import { USERS_PER_PAGE, accountChangeError, roleNotice, type AccountChange } from "./account-rules";
import { logAdminAction, notify } from "./admin";
import { requireAdmin } from "./auth";
import { pageWindow } from "./community-rules";
import { db } from "./db";
import { UserError } from "./http";
import type { Role } from "./nav";

// จัดการบัญชี (สเปกข้อ 17–18) — สิทธิ์ตัดสินที่ accountChangeError ตัวเดียว
// คนถูกระงับเข้าระบบไม่ได้ทันที: getCurrentUser คืน null เมื่อ isBanned (lib/session.ts)

export async function searchUsers(f: { q: string; role?: Role; page: number }) {
  await requireAdmin();
  // SQLite ไม่มี mode: "insensitive" — LIKE ไม่สนตัวพิมพ์เล็กใหญ่ของอังกฤษอยู่แล้ว
  const where = { role: f.role, ...(f.q ? { OR: [{ name: { contains: f.q } }, { email: { contains: f.q } }] } : {}) };
  const total = await db.user.count({ where });
  const w = pageWindow(f.page, total, USERS_PER_PAGE);
  const items = await db.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: w.skip,
    take: w.take,
    select: { id: true, name: true, email: true, role: true, isSuperAdmin: true, isBanned: true, studentId: true, department: true, createdAt: true },
  });
  return { items, total, page: w.page, pageCount: w.pageCount };
}

export async function changeUser(id: string, change: AccountChange): Promise<{ ok: true }> {
  const admin = await requireAdmin();
  await db.$transaction(async (tx) => {
    const target = await tx.user.findUnique({ where: { id }, select: { id: true, role: true, isSuperAdmin: true, isBanned: true } });
    if (!target) throw new UserError(404, "ไม่พบบัญชี");
    const err = accountChangeError(admin, target, change);
    if (err) throw new UserError(err.status, err.message);
    if (change.action === "set_role") {
      await tx.user.update({ where: { id }, data: { role: change.role } });
      await notify(tx, id, roleNotice(change.role));
      await logAdminAction(tx, admin.id, "change_role", { type: "user", id }, `${target.role} → ${change.role}`);
    } else {
      await tx.user.update({ where: { id }, data: { isBanned: change.action === "ban" } });
      await logAdminAction(tx, admin.id, `${change.action}_user`, { type: "user", id });
    }
  });
  return { ok: true };
}
