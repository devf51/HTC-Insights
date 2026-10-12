import { requireAdmin } from "@/lib/auth";
import { decideCompany } from "@/lib/companies";
import { parseJson, userErrorResponse } from "@/lib/http";
import { adminDecisionSchema, idSchema } from "@/lib/validation";

/** ผู้ดูแลยืนยัน (ขึ้นหน้าค้นหาของนักศึกษา) หรือปฏิเสธ (เช่นซ้ำกับที่มีอยู่) สถานประกอบการที่ลงทะเบียนผ่านบัญชีผู้ประกอบการ */
export async function POST(req: Request, ctx: RouteContext<"/api/admin/companies/[id]">) {
  await requireAdmin();
  const input = await parseJson(req, adminDecisionSchema);
  if (input instanceof Response) return input;
  const id = idSchema.safeParse((await ctx.params).id);
  if (!id.success) return Response.json({ error: "ไม่พบสถานประกอบการ" }, { status: 404 });
  try {
    return Response.json(await decideCompany(id.data, input));
  } catch (e) {
    return userErrorResponse(e);
  }
}
