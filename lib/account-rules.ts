// ไฟล์นี้ต้อง pure — tests/account-rules.test.mjs import ตรงด้วย Node ห้าม import ค่าจริงเพิ่ม (import type ได้)
import type { Role } from "./nav";

export const ROLE_LABELS: Record<Role, string> = { STUDENT: "นักศึกษา", EXTERNAL: "บุคคลภายนอก", ADMIN: "ผู้ดูแลระบบ" };
export const ROLE_VALUES = ["STUDENT", "EXTERNAL", "ADMIN"] as const satisfies readonly Role[];
export const USERS_PER_PAGE = 20;

/** ระดับการศึกษาจาก v1 — ค่าเก็บลงฐานข้อมูล ห้ามแก้ value ที่มีข้อมูลแล้ว */
export const EDUCATION_LEVELS = [
  { value: "ปวช.", label: "ประกาศนียบัตรวิชาชีพ (ปวช.)" },
  { value: "ปวส.", label: "ประกาศนียบัตรวิชาชีพชั้นสูง (ปวส.)" },
] as const;
export const EDUCATION_LEVEL_VALUES = EDUCATION_LEVELS.map((l) => l.value) as [string, ...string[]];

type Actor = { id: string; isSuperAdmin: boolean };
type Target = { id: string; role: string; isSuperAdmin: boolean; isBanned: boolean };
export type AccountChange = { action: "set_role"; role: Role } | { action: "ban" } | { action: "unban" };

/** แสดงปุ่มจัดการบัญชีนี้ไหม — ตัวเอง super admin และผู้ดูแลคนอื่น (เว้นแต่ผู้กระทำเป็นระดับสูง) แก้ไม่ได้ */
export function canManage(actor: Actor, target: Target): boolean {
  return actor.id !== target.id && !target.isSuperAdmin && (target.role !== "ADMIN" || actor.isSuperAdmin);
}

/** ตัวตัดสินจริงฝั่งเซิร์ฟเวอร์ — แต่งตั้ง ถอดถอน และระงับผู้ดูแลได้เฉพาะ super admin (สเปกข้อ 18) */
export function accountChangeError(actor: Actor, target: Target, change: AccountChange): { status: 403 | 409; message: string } | null {
  if (actor.id === target.id) return { status: 403, message: "แก้ไขบัญชีของตัวเองไม่ได้" };
  if (target.isSuperAdmin) return { status: 403, message: "แก้ไขบัญชีผู้ดูแลระดับสูงไม่ได้" };
  const touchesAdmin = target.role === "ADMIN" || (change.action === "set_role" && change.role === "ADMIN");
  if (touchesAdmin && !actor.isSuperAdmin) return { status: 403, message: "แต่งตั้ง ถอดถอน หรือระงับผู้ดูแลได้เฉพาะผู้ดูแลระดับสูง" };
  if (change.action === "set_role" && change.role === target.role) return { status: 409, message: "บัญชีนี้มีบทบาทนี้อยู่แล้ว" };
  if (change.action === "ban" && target.isBanned) return { status: 409, message: "บัญชีนี้ถูกระงับอยู่แล้ว" };
  if (change.action === "unban" && !target.isBanned) return { status: 409, message: "บัญชีนี้ไม่ได้ถูกระงับ" };
  return null;
}

export function roleNotice(role: Role) {
  return { type: "role_changed", message: `ผู้ดูแลเปลี่ยนบทบาทบัญชีของคุณเป็น${ROLE_LABELS[role]}`, link: "/profile" };
}

/** หลักการโดเมนข้อ 4 — ผลคำขอยืนยันสิทธิ์ต้องแจ้งพร้อมเหตุผล */
export function upgradeNotice(decision: "APPROVED" | "REJECTED", reason: string | null) {
  return decision === "APPROVED"
    ? { type: "upgrade_approved", message: "คำขอยืนยันสิทธิ์นักศึกษาผ่านการตรวจแล้ว บัญชีของคุณเป็นนักศึกษาแล้ว", link: "/" }
    : { type: "upgrade_rejected", message: `คำขอยืนยันสิทธิ์นักศึกษาไม่ผ่านการตรวจ เหตุผล: ${reason ?? "ไม่ระบุ"}`, link: "/profile/upgrade" };
}
