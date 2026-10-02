// ไฟล์นี้ต้อง pure — tests/review-rules.test.mjs import ตรงด้วย Node ห้าม import ค่าจริงเพิ่ม (import type ได้)
// ใช้ทั้งฝั่งเซิร์ฟเวอร์ (zod, DAL) และ components/ReviewForm.tsx

export type Scores = { scoreWork: number; scoreEnv: number; scoreMentor: number; scoreWelfare: number };

/** คะแนนรวม = ค่าเฉลี่ย 4 ด้าน ระบบคำนวณเอง ผู้ใช้ส่งมาเองไม่ได้ */
export function overallScore(s: Scores): number {
  return (s.scoreWork + s.scoreEnv + s.scoreMentor + s.scoreWelfare) / 4;
}

const TH_OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * "YYYY-MM-DD" จาก <input type="date"> → เที่ยงคืนเวลาไทย
 * คืน null ถ้าไม่ใช่วันที่จริง — JS ปัด 2026-02-30 เป็น 2 มี.ค. เงียบ ๆ จึงต้องเทียบกลับ
 */
export function parseThaiDate(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00+07:00`);
  if (Number.isNaN(d.getTime())) return null;
  return toThaiDateInput(d) === s ? d : null;
}

/** Date → "YYYY-MM-DD" ตามปฏิทินไทย ใช้เติมค่าเดิมในฟอร์มแก้ไข */
export function toThaiDateInput(d: Date): string {
  return new Date(d.getTime() + TH_OFFSET_MS).toISOString().slice(0, 10);
}

export function periodError(start: Date, end: Date, now: Date): string | null {
  if (end < start) return "วันสิ้นสุดการฝึกต้องไม่ก่อนวันเริ่มฝึก";
  if (start > now) return "วันเริ่มฝึกต้องไม่อยู่ในอนาคต";
  return null;
}

/** กะดึก (เลิกงานน้อยกว่าเข้างาน) ถือว่าถูก */
export function workTimeError(start: string | null, end: string | null): string | null {
  if (!start !== !end) return "กรอกเวลาเข้างานและเลิกงานให้ครบทั้งคู่ หรือเว้นว่างทั้งคู่";
  return null;
}

export const MAX_PHOTOS = 2;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const PHOTO_TYPES: readonly string[] = ["image/jpeg", "image/png", "image/webp"];

export function photoError(photos: { size: number; type: string }[]): string | null {
  if (photos.length > MAX_PHOTOS) return `แนบรูปได้ไม่เกิน ${MAX_PHOTOS} รูป`;
  if (photos.some((p) => !PHOTO_TYPES.includes(p.type))) return "รองรับเฉพาะรูป JPG PNG และ WEBP";
  if (photos.some((p) => p.size > MAX_PHOTO_BYTES)) return "รูปแต่ละรูปต้องไม่เกิน 5 MB";
  return null;
}

/**
 * multipart → ช่องข้อความ + รูป (เฉพาะช่องชื่อ photos)
 * ช่องไฟล์ที่ไม่ได้เลือกรูป เบราว์เซอร์ยังส่งไฟล์ว่างชื่อ "" ขนาด 0 มา — ต้องทิ้ง ไม่งั้นนับเป็นรูป
 */
export function splitReviewForm(fd: FormData): { fields: Record<string, string>; photos: File[] } {
  const fields: Record<string, string> = {};
  const photos: File[] = [];
  for (const [key, value] of fd) {
    if (typeof value === "string") fields[key] = value;
    else if (key === "photos" && value.size > 0) photos.push(value);
  }
  return { fields, photos };
}

/** แก้ได้เฉพาะเจ้าของ และเฉพาะรีวิวที่ถูกปฏิเสธ — แก้แล้วกลับไปรอตรวจ */
export function canEditReview(r: { userId: string; status: string }, userId: string): boolean {
  return r.userId === userId && r.status === "REJECTED";
}
