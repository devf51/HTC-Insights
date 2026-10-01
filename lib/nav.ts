export type Role = "STUDENT" | "EXTERNAL" | "ADMIN";
/** short: ป้ายบนแถบล่างมือถือ ใส่เมื่อ label ยาวเกินช่อง */
export type NavItem = { href: string; label: string; short?: string; icon: string };
export type NavAction = { href: string; label: string };

const HOME: NavItem = { href: "/", label: "หน้าแรก", icon: "home" };
const INSIGHTS: NavItem = { href: "/insights", label: "สถานประกอบการ", short: "บริษัท", icon: "apartment" };
const COMMUNITY: NavItem = { href: "/community", label: "ชุมชน", icon: "forum" };
const JOBS: NavItem = { href: "/jobs", label: "ตำแหน่งงาน", short: "หางาน", icon: "work" };
const POST_JOB: NavItem = { href: "/employer/register", label: "ลงประกาศ", icon: "add_business" };
const PROFILE: NavItem = { href: "/profile", label: "โปรไฟล์", icon: "person" };
const ADMIN: NavItem = { href: "/admin", label: "ผู้ดูแล", icon: "shield_person" };

/** เมนูหลัก ใช้ทั้ง TopNav (จอกว้าง) และ BottomNav (มือถือ) — ไม่เกิน 5 รายการ */
export function navFor(role: Role | null): NavItem[] {
  switch (role) {
    case "STUDENT":
      return [HOME, INSIGHTS, COMMUNITY, JOBS, PROFILE];
    case "EXTERNAL":
      return [HOME, JOBS, POST_JOB, PROFILE];
    case "ADMIN":
      return [HOME, INSIGHTS, COMMUNITY, JOBS, ADMIN];
    default:
      return [HOME, JOBS];
  }
}

/** ปุ่มเดียวมุมขวาบนของ TopNav (แสดงทั้งมือถือและจอกว้าง) */
export function actionFor(role: Role | null): NavAction | null {
  if (role === null) return { href: "/login", label: "เข้าสู่ระบบ" };
  if (role === "ADMIN") return { href: "/profile", label: "โปรไฟล์" };
  return null;
}

/** หน้าแรกต้องตรงเป๊ะ ไม่งั้น active ทุกหน้า ส่วนอื่นนับหน้าย่อยด้วย */
export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

/**
 * แปลง DEV_ROLE เป็นบทบาท ค่าที่ไม่รู้จักหรือรันบน production = ผู้เยี่ยมชม
 * ponytail: ชั่วคราวจนกว่า Auth.js จะมาใน Phase 1 — ลบฟังก์ชันนี้และ DEV_ROLE ทิ้งตอนนั้น
 */
export function devRole(value: string | undefined, nodeEnv: string | undefined): Role | null {
  if (nodeEnv === "production") return null;
  return value === "STUDENT" || value === "EXTERNAL" || value === "ADMIN" ? value : null;
}
