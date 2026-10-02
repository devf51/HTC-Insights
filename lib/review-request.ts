import { ReviewError } from "./reviews";
import { splitReviewForm } from "./review-rules";
import { reviewFieldsSchema, type ReviewFields } from "./validation";

// ส่วนที่ POST และ PUT ของ /api/reviews ใช้ร่วมกัน — ไม่มี guard เพราะ route เรียก guard ก่อนแล้ว

export const badRequest = (error: string) => Response.json({ error }, { status: 400 });

/** อ่าน multipart แล้วผ่าน zod — ไม่ผ่านคืน Response 400 พร้อมข้อความไทยข้อแรกที่เจอ */
export async function readReviewForm(
  req: Request,
): Promise<{ fields: Record<string, string>; data: ReviewFields; photos: File[] } | Response> {
  const fd = await req.formData().catch(() => null);
  if (!fd) return badRequest("รูปแบบข้อมูลไม่ถูกต้อง");
  const { fields, photos } = splitReviewForm(fd);
  const parsed = reviewFieldsSchema.safeParse(fields);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);
  return { fields, data: parsed.data, photos };
}

/** ReviewError → JSON · อย่างอื่นโยนต่อ (รวม unauthorized()/forbidden() ของ Next ที่ต้องโยนผ่าน) */
export function reviewErrorResponse(e: unknown): Response {
  if (e instanceof ReviewError) return Response.json({ error: e.message }, { status: e.status });
  throw e;
}
