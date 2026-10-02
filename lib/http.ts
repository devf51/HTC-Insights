import type { z } from "zod";

// ของที่ Route Handler ทุกตัวใช้ร่วม — ข้อผิดพลาดที่ผู้ใช้แก้ได้ออกเป็น JSON { error } ภาษาไทย

export class UserError extends Error {
  status: 400 | 403 | 404 | 409;
  constructor(status: 400 | 403 | 404 | 409, message: string) {
    super(message);
    this.status = status;
  }
}

export const badRequest = (error: string) => Response.json({ error }, { status: 400 });

/** UserError → JSON · อย่างอื่นโยนต่อ (รวม unauthorized()/forbidden() ของ Next ที่ต้องโยนผ่าน) */
export function userErrorResponse(e: unknown): Response {
  if (e instanceof UserError) return Response.json({ error: e.message }, { status: e.status });
  throw e;
}

/** อ่าน JSON body แล้วผ่าน zod — ไม่ผ่านคืน Response 400 ข้อความข้อแรกที่เจอ */
export async function parseJson<T extends z.ZodType>(req: Request, schema: T): Promise<z.output<T> | Response> {
  const body: unknown = await req.json().catch(() => undefined);
  if (body === undefined) return badRequest("รูปแบบข้อมูลไม่ถูกต้อง");
  const parsed = schema.safeParse(body);
  return parsed.success ? parsed.data : badRequest(parsed.error.issues[0].message);
}
