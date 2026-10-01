import type { Role } from "./nav";

// ไฟล์นี้ต้อง pure — tests/auth-rules.test.mjs import ตรงด้วย Node ห้าม import ค่าจริงเพิ่ม (import type ได้)

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

/**
 * บทบาทของบัญชีใหม่ — ตัดสินครั้งเดียวตอนสร้างบัญชี (auth.ts ครอบ createUser ของ adapter)
 * เทียบทั้ง "@" + โดเมน กันโดเมนหลอกอย่าง evil-htc.ac.th · env ว่าง = ไม่มีใครได้สิทธิ์อัตโนมัติ
 */
export function initialAccess(
  email: string,
  studentDomain: string | undefined,
  superAdminEmail: string | undefined,
): { role: Role; isSuperAdmin: boolean } {
  const e = norm(email);
  const admin = norm(superAdminEmail);
  if (admin && e === admin) return { role: "ADMIN", isSuperAdmin: true };
  const domain = norm(studentDomain).replace(/^@/, "");
  if (domain && e.endsWith("@" + domain)) return { role: "STUDENT", isSuperAdmin: false };
  return { role: "EXTERNAL", isSuperAdmin: false };
}

export function hasRole(role: Role, allowed: readonly Role[]): boolean {
  return allowed.includes(role);
}

/** emailVerified มาจาก profile ของ Google — ต้องเป็น true จริง ไม่ใช่ค่าที่ "ดูเหมือนจริง" */
export function canSignIn({ emailVerified, isBanned }: { emailVerified: unknown; isBanned: boolean | undefined }): boolean {
  return emailVerified === true && !isBanned;
}

const LOGIN_ERRORS: Record<string, string> = {
  AccessDenied: "เข้าสู่ระบบไม่ได้ บัญชีอาจถูกระงับ หรืออีเมลยังไม่ได้ยืนยันกับ Google",
  Configuration: "ระบบเข้าสู่ระบบยังตั้งค่าไม่ครบ ติดต่อผู้ดูแล",
};

/** ?error= จาก Auth.js — Object.hasOwn กันชื่ออย่าง "constructor" ไปอ่าน prototype */
export function loginErrorMessage(error: string | string[] | undefined): string | null {
  if (error === undefined) return null;
  if (typeof error === "string" && Object.hasOwn(LOGIN_ERRORS, error)) return LOGIN_ERRORS[error];
  return "เข้าสู่ระบบไม่สำเร็จ ลองอีกครั้ง";
}
