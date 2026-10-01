import { forbidden, unauthorized } from "next/navigation";
import { hasRole } from "./auth-rules";
import type { Role } from "./nav";
import { getCurrentUser, type CurrentUser } from "./session";

// ทุก Route Handler และทุกส่วนที่ต้องล็อกอินเริ่มด้วยตัวใดตัวหนึ่งในไฟล์นี้ — อย่าตรวจสิทธิ์เองในแต่ละ route
// ไม่ได้ล็อกอิน → 401 (app/unauthorized.tsx) · บทบาทไม่ตรง → 403 (app/forbidden.tsx)

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) unauthorized();
  return user;
}

export async function requireRole(...roles: Role[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!hasRole(user.role, roles)) forbidden();
  return user;
}

export function requireAdmin(): Promise<CurrentUser> {
  return requireRole("ADMIN");
}

export async function requireSuperAdmin(): Promise<CurrentUser> {
  const user = await requireAdmin();
  if (!user.isSuperAdmin) forbidden();
  return user;
}
