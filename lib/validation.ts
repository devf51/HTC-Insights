import { z } from "zod";
import { POST_TYPE_VALUES } from "./community-rules";
import { DEPARTMENT_VALUES } from "./departments";
import { departmentsError, pinError } from "./job-rules";
import { parseThaiDate, periodError, workTimeError } from "./review-rules";

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
export const idSchema = z.string().min(1).max(64);
export const companyIdSchema = idSchema;

// ---------- ฟอร์มรีวิว (multipart → ทุกค่าเป็นสตริง) ----------

const checkbox = z.literal("on").optional().transform((v) => v === "on");

const optionalText = (max: number, label: string) =>
  z.string().trim().max(max, `${label}ต้องไม่เกิน ${max} ตัวอักษร`).optional().transform((s) => s || null);

const thaiDate = (label: string) =>
  z.string({ error: `เลือก${label}` }).transform((s, ctx) => {
    const d = parseThaiDate(s);
    if (!d) {
      ctx.addIssue({ code: "custom", message: `${label}ไม่ถูกต้อง` });
      return z.NEVER;
    }
    return d;
  });

const score = (label: string) =>
  z.coerce.number({ error: `ให้คะแนน${label}` }).int(`ให้คะแนน${label} 1–5`).min(1, `ให้คะแนน${label} 1–5`).max(5, `ให้คะแนน${label} 1–5`);

const workTime = z
  .string()
  .optional()
  .transform((s) => s || null)
  .refine((s) => s === null || /^([01]\d|2[0-3]):[0-5]\d$/.test(s), "เวลาต้องอยู่ในรูปแบบ ชม.:นาที");

const allowance = z
  .string()
  .optional()
  .transform((s, ctx) => {
    if (!s) return null;
    const n = Number(s);
    if (!Number.isInteger(n) || n < 0 || n > 10000) {
      ctx.addIssue({ code: "custom", message: "เบี้ยเลี้ยงต้องเป็นจำนวนเต็ม 0–10,000 บาท" });
      return z.NEVER;
    }
    return n;
  });

/** ช่องของรีวิว — ใช้ทั้งส่งใหม่และแก้ไข ชื่อฟิลด์ตรงกับคอลัมน์ของ Review */
export const reviewFieldsSchema = z
  .object({
    department: z.enum(DEPARTMENT_VALUES, { error: "เลือกแผนกวิชา" }),
    gender: z.enum(["MALE", "FEMALE", "PREFER_NOT"], { error: "เลือกเพศ" }),
    periodStart: thaiDate("วันเริ่มฝึก"),
    periodEnd: thaiDate("วันสิ้นสุดการฝึก"),
    dailyAllowance: allowance,
    hasAccommodation: checkbox,
    hasTransport: checkbox,
    workStartTime: workTime,
    workEndTime: workTime,
    scoreWork: score("ลักษณะงาน"),
    scoreEnv: score("สภาพแวดล้อม"),
    scoreMentor: score("พี่เลี้ยง"),
    scoreWelfare: score("เบี้ยเลี้ยงและสวัสดิการ"),
    textWork: z
      .string({ error: "เล่าลักษณะงานที่ได้ทำ" })
      .trim()
      .min(30, "เล่าลักษณะงานอย่างน้อย 30 ตัวอักษร")
      .max(1000, "ลักษณะงานต้องไม่เกิน 1,000 ตัวอักษร"),
    textPros: optionalText(500, "ข้อดี"),
    textCons: optionalText(500, "ข้อควรรู้"),
    textAdvice: optionalText(500, "คำแนะนำ"),
    isAnonymous: checkbox,
  })
  .superRefine((v, ctx) => {
    const period = periodError(v.periodStart, v.periodEnd, new Date());
    if (period) ctx.addIssue({ code: "custom", path: ["periodEnd"], message: period });
    const time = workTimeError(v.workStartTime, v.workEndTime);
    if (time) ctx.addIssue({ code: "custom", path: ["workEndTime"], message: time });
  });
export type ReviewFields = z.infer<typeof reviewFieldsSchema>;

/** รีวิวใหม่ต้องบอกว่ารีวิวบริษัทไหน — เลือกจากในระบบ จาก Google หรือกรอกเอง */
export const companyChoiceSchema = z.discriminatedUnion(
  "companyKind",
  [
    z.object({ companyKind: z.literal("existing"), companyId: idSchema }),
    z.object({
      companyKind: z.literal("place"),
      placeId: z.string().min(1).max(300),
      placeQuery: z.string().trim().min(2).max(100),
    }),
    z.object({
      companyKind: z.literal("new"),
      newName: z.string({ error: "กรอกชื่อสถานประกอบการ" }).trim().min(2, "กรอกชื่อสถานประกอบการ").max(150, "ชื่อยาวเกิน 150 ตัวอักษร"),
      newAddress: z.string({ error: "กรอกที่อยู่" }).trim().min(5, "กรอกที่อยู่ให้รุ่นน้องหาเจอ").max(300, "ที่อยู่ยาวเกิน 300 ตัวอักษร"),
    }),
  ],
  { error: "เลือกสถานประกอบการ" },
);
export type CompanyChoice = z.infer<typeof companyChoiceSchema>;

/** query string ของ /insights/write-review — ค่าผิดรูปแบบถูกเพิกเฉย */
export const writeReviewParamsSchema = z.object({
  q: z.string().trim().transform((s) => s.slice(0, 100)).catch(""),
  company: idSchema.optional().catch(undefined),
  place: z.string().min(1).max(300).optional().catch(undefined),
  new: z.literal("1").optional().catch(undefined),
  edit: idSchema.optional().catch(undefined),
});

// ---------- เว็บบอร์ดชุมชน (JSON) ----------

/** query string ของ /community — ค่าผิดรูปแบบถูกเพิกเฉย */
export const communityListParamsSchema = z.object({
  type: z.enum(POST_TYPE_VALUES).optional().catch(undefined),
  department: z.enum(DEPARTMENT_VALUES).optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
});

export const postInputSchema = z.object({
  type: z.enum(POST_TYPE_VALUES, { error: "เลือกหมวดกระทู้" }),
  // "" หรือไม่ส่ง = ทั่วไป ไม่ระบุแผนก
  department: z
    .union([z.literal(""), z.enum(DEPARTMENT_VALUES)], { error: "เลือกแผนกวิชาจากรายการ" })
    .optional()
    .transform((v) => v || null),
  title: z.string({ error: "กรอกหัวข้อ" }).trim().min(5, "หัวข้ออย่างน้อย 5 ตัวอักษร").max(120, "หัวข้อไม่เกิน 120 ตัวอักษร"),
  body: z.string({ error: "กรอกเนื้อหา" }).trim().min(10, "เนื้อหาอย่างน้อย 10 ตัวอักษร").max(5000, "เนื้อหาไม่เกิน 5,000 ตัวอักษร"),
});
export type PostInput = z.infer<typeof postInputSchema>;

export const commentInputSchema = z.object({
  postId: idSchema,
  parentId: idSchema.nullish().transform((v) => v ?? null),
  body: z.string({ error: "พิมพ์ความคิดเห็น" }).trim().min(1, "พิมพ์ความคิดเห็น").max(2000, "ความคิดเห็นไม่เกิน 2,000 ตัวอักษร"),
});
export type CommentInput = z.infer<typeof commentInputSchema>;

/** กดถูกใจกระทู้หรือความคิดเห็น อย่างใดอย่างหนึ่งเท่านั้น */
export const likeInputSchema = z.union([z.strictObject({ postId: idSchema }), z.strictObject({ commentId: idSchema })], {
  error: "ระบุกระทู้หรือความคิดเห็นอย่างใดอย่างหนึ่ง",
});
export type LikeInput = z.infer<typeof likeInputSchema>;

/** commentId: null = ยกเลิกคำตอบที่ดีที่สุด */
export const bestAnswerInputSchema = z.object({ commentId: idSchema.nullable() }, { error: "ระบุความคิดเห็น" });

// ---------- ตำแหน่งงานและสถานประกอบการ (JSON) ----------

/** query string ของ /jobs — ค่าผิดรูปแบบถูกเพิกเฉย ลิงก์ที่ส่งต่อกันต้องเปิดได้เสมอ */
export const jobListParamsSchema = z.object({
  q: z.string().trim().transform((s) => s.slice(0, 100)).catch(""),
  department: z.enum(DEPARTMENT_VALUES).optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
});

/** อีเมลที่แสดงในประกาศ — คนละตัวกับอีเมลบัญชีที่ใช้เข้าสู่ระบบ */
const contactEmail = z
  .string({ error: "กรอกอีเมลติดต่อ" })
  .trim()
  .max(254, "อีเมลยาวเกินไป")
  .pipe(z.email({ error: "อีเมลติดต่อไม่ถูกต้อง" }));

const phone = z
  .string()
  .trim()
  .optional()
  .transform((s) => s || null)
  .refine((s) => s === null || /^[\d+\-\s]{9,20}$/.test(s), "เบอร์โทรใช้ตัวเลข + - หรือเว้นวรรค 9–20 ตัว");

const coord = z.number({ error: "พิกัดไม่ถูกต้อง" }).nullable().default(null);

export const employerInputSchema = z
  .object({
    companyName: z
      .string({ error: "กรอกชื่อสถานประกอบการ" })
      .trim()
      .min(2, "กรอกชื่อสถานประกอบการ")
      .max(150, "ชื่อยาวเกิน 150 ตัวอักษร"),
    address: z.string({ error: "กรอกที่อยู่" }).trim().min(5, "กรอกที่อยู่ให้นักศึกษาหาเจอ").max(300, "ที่อยู่ยาวเกิน 300 ตัวอักษร"),
    lat: coord,
    lng: coord,
    contactEmail,
    phone,
    departments: z.array(z.enum(DEPARTMENT_VALUES, { error: "เลือกแผนกวิชาจากรายการ" }), { error: "เลือกแผนกวิชาที่เปิดรับ" }),
  })
  .superRefine((v, ctx) => {
    const d = departmentsError(v.departments);
    if (d) ctx.addIssue({ code: "custom", path: ["departments"], message: d });
    const p = pinError(v.lat, v.lng);
    if (p) ctx.addIssue({ code: "custom", path: ["lat"], message: p });
  });
export type EmployerInput = z.infer<typeof employerInputSchema>;

/** มาจาก FormData ทั้งก้อน — ทุกค่าเป็นสตริง (allowance ใช้ตัวเดียวกับรีวิว) */
export const jobInputSchema = z.object({
  title: z.string({ error: "กรอกชื่อตำแหน่ง" }).trim().min(5, "ชื่อตำแหน่งอย่างน้อย 5 ตัวอักษร").max(120, "ชื่อตำแหน่งไม่เกิน 120 ตัวอักษร"),
  department: z.enum(DEPARTMENT_VALUES, { error: "เลือกแผนกวิชา" }),
  description: z
    .string({ error: "กรอกหน้าที่และรายละเอียดงาน" })
    .trim()
    .min(20, "หน้าที่และรายละเอียดงานอย่างน้อย 20 ตัวอักษร")
    .max(2000, "หน้าที่และรายละเอียดงานไม่เกิน 2,000 ตัวอักษร"),
  qualifications: optionalText(1000, "คุณสมบัติ"),
  benefits: optionalText(1000, "สวัสดิการ"),
  allowance,
  contactEmail,
  contactPhone: phone,
});
export type JobInput = z.infer<typeof jobInputSchema>;

export const jobActiveInputSchema = z.object({ isActive: z.boolean({ error: "ระบุสถานะประกาศ" }) });
