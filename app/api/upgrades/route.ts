import { requireRole } from "@/lib/auth";
import { badRequest, userErrorResponse } from "@/lib/http";
import { submitUpgrade } from "@/lib/upgrades";
import { upgradeFieldsSchema } from "@/lib/validation";

/** ยื่นคำขอยืนยันสิทธิ์นักศึกษา — multipart: studentId department educationLevel + card */
export async function POST(req: Request) {
  await requireRole("EXTERNAL");
  const fd = await req.formData().catch(() => null);
  if (!fd) return badRequest("รูปแบบข้อมูลไม่ถูกต้อง");
  const fields = upgradeFieldsSchema.safeParse(Object.fromEntries([...fd].filter(([, v]) => typeof v === "string")));
  if (!fields.success) return badRequest(fields.error.issues[0].message);
  // ช่องไฟล์ที่ไม่ได้เลือกรูป เบราว์เซอร์ส่งไฟล์ว่างขนาด 0 มา
  const card = fd.get("card");
  try {
    return Response.json(await submitUpgrade(fields.data, card instanceof File && card.size > 0 ? card : null), { status: 201 });
  } catch (e) {
    return userErrorResponse(e);
  }
}
