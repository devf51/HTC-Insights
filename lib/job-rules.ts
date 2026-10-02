// ไฟล์นี้ต้อง pure — tests/job-rules.test.mjs import ตรงด้วย Node ห้าม import ค่าจริงเพิ่ม (import type ได้)

/** แผนกที่สถานประกอบการหนึ่งเปิดรับได้ — ค่าจาก v1 (v1 บังคับแค่ฝั่ง client) */
export const MAX_DEPARTMENTS = 3;
export const JOBS_PER_PAGE = 20;

/**
 * ประกาศที่ยังกินโควตาแผนก — ต้องตรงกับเงื่อนไข WHERE ของ unique index
 * JobPosting_open_per_department ใน prisma/schema.prisma (ตัวตัดสินจริงอยู่ที่ฐานข้อมูล)
 */
export function isOpen(j: { status: string; isActive: boolean }): boolean {
  return j.isActive && j.status !== "REJECTED";
}

export function departmentsError(list: string[]): string | null {
  if (list.length === 0) return "เลือกแผนกวิชาที่เปิดรับอย่างน้อย 1 แผนก";
  if (list.length > MAX_DEPARTMENTS) return `เลือกแผนกวิชาได้ไม่เกิน ${MAX_DEPARTMENTS} แผนก`;
  if (new Set(list).size !== list.length) return "เลือกแผนกวิชาซ้ำ";
  return null;
}

/** Employer.departments เป็น Json (SQLite ไม่มี String[]) — ค่าที่ไม่ใช่สตริงถูกทิ้ง */
export function parseDepartments(json: unknown): string[] {
  return Array.isArray(json) ? json.filter((d): d is string => typeof d === "string") : [];
}

/** แผนกที่ยังลงประกาศใหม่ได้ — แผนกละหนึ่งประกาศที่เปิดรับ */
export function freeDepartments(
  departments: string[],
  jobs: { department: string; status: string; isActive: boolean }[],
): string[] {
  const taken = new Set(jobs.filter(isOpen).map((j) => j.department));
  return departments.filter((d) => !taken.has(d));
}

/** หมุดไม่บังคับ แต่ถ้าปักต้องครบคู่และอยู่ในกรอบประเทศไทย — กันพิกัดสลับ lat/lng */
export function pinError(lat: number | null, lng: number | null): string | null {
  if (lat === null && lng === null) return null;
  if (lat === null || lng === null) return "พิกัดไม่ครบ ปักหมุดใหม่อีกครั้ง";
  if (lat < 5.5 || lat > 20.5 || lng < 97.3 || lng > 105.7) return "หมุดต้องอยู่ในประเทศไทย";
  return null;
}

/** ลิงก์เปิดพิกัดใน Google Maps — หน้าประกาศไม่ต้องโหลด Leaflet ทั้งก้อน */
export function mapsUrl(lat: number | null, lng: number | null): string | null {
  return lat === null || lng === null ? null : `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
