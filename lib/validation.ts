import { z } from "zod";
import { DEPARTMENT_VALUES } from "./departments";

// schema ของทุก input จากผู้ใช้ — ผ่านที่นี่ก่อนแตะฐานข้อมูล (CLAUDE.md)

/**
 * query string ของ /insights — ค่าผิดรูปแบบถูกเพิกเฉยด้วย catch ไม่ใช่ 500
 * ลิงก์ที่นักศึกษาส่งต่อกันต้องเปิดได้เสมอ แม้มีคนแก้ URL เล่น
 */
export const companySearchSchema = z.object({
  q: z.string().trim().transform((s) => s.slice(0, 100)).catch(""),
  department: z.enum(DEPARTMENT_VALUES).optional().catch(undefined),
  minScore: z.coerce.number().int().min(1).max(5).optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
});

/** id ใน URL — ไม่บังคับรูปแบบ cuid เพราะ seed ใช้ id อ่านง่าย (seed_c1) */
export const companyIdSchema = z.string().min(1).max(64);
