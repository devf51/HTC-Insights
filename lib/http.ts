import type { z } from "zod";

// ของที่ Route Handler ทุกตัวใช้ร่วม — ข้อผิดพลาดที่ผู้ใช้แก้ได้ออกเป็น JSON { error } ภาษาไทย
// ไฟล์นี้ต้อง pure — tests/http.test.mjs import ตรงด้วย Node ห้าม import ค่าจริงเพิ่ม (import type ได้)

export class UserError extends Error {
  status: 400 | 403 | 404 | 409;
  constructor(status: 400 | 403 | 404 | 409, message: string) {
    super(message);
    this.status = status;
  }
}

export const badRequest = (error: string) => Response.json({ error }, { status: 400 });

/**
 * กัน CSRF ชั้นที่สอง (OWASP A01) — ชั้นแรกคือ cookie SameSite=Lax ของ Auth.js
 * เบราว์เซอร์ส่ง Sec-Fetch-Site และ Origin กับคำขอ POST/PUT/PATCH เสมอ ต้องมาจากต้นทางเดียวกันเท่านั้น
 * (subdomain อื่นก็ไม่รับ) · ไม่มีทั้งสองหัว = ไม่ใช่เบราว์เซอร์ จึงไม่ใช่ช่องทาง CSRF
 * ทุก route ที่เขียนข้อมูลต้องผ่านตัวนี้ (ผ่าน parseJson, readReviewForm หรือเรียกตรง) — tests/route-guards.test.mjs ตรวจ
 */
export function crossSiteError(req: Request): Response | null {
  const site = req.headers.get("sec-fetch-site");
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  let sameHost = origin === null;
  try {
    if (origin !== null) sameHost = new URL(origin).host === host;
  } catch {
    // Origin: null หรือค่าที่ไม่ใช่ URL
  }
  return (site !== null && site !== "same-origin") || !sameHost
    ? Response.json({ error: "คำขอต้องมาจากหน้าเว็บของระบบนี้" }, { status: 403 })
    : null;
}

/** UserError → JSON · อย่างอื่นโยนต่อ (รวม unauthorized()/forbidden() ของ Next ที่ต้องโยนผ่าน) */
export function userErrorResponse(e: unknown): Response {
  if (e instanceof UserError) return Response.json({ error: e.message }, { status: e.status });
  throw e;
}

/** อ่าน JSON body แล้วผ่าน zod — ไม่ผ่านคืน Response 400 ข้อความข้อแรกที่เจอ · ข้ามต้นทางคืน 403 */
export async function parseJson<T extends z.ZodType>(req: Request, schema: T): Promise<z.output<T> | Response> {
  const blocked = crossSiteError(req);
  if (blocked) return blocked;
  const body: unknown = await req.json().catch(() => undefined);
  if (body === undefined) return badRequest("รูปแบบข้อมูลไม่ถูกต้อง");
  const parsed = schema.safeParse(body);
  return parsed.success ? parsed.data : badRequest(parsed.error.issues[0].message);
}
