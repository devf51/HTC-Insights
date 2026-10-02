import { requireAdmin } from "@/lib/auth";
import { verifyCompany } from "@/lib/companies";
import { crossSiteError, userErrorResponse } from "@/lib/http";
import { idSchema } from "@/lib/validation";

/** ผู้ดูแลยืนยันสถานประกอบการที่ลงทะเบียนผ่านบัญชีผู้ประกอบการ — ขึ้นหน้าค้นหาของนักศึกษา */
export async function POST(req: Request, ctx: RouteContext<"/api/admin/companies/[id]">) {
  await requireAdmin();
  const blocked = crossSiteError(req);
  if (blocked) return blocked;
  const id = idSchema.safeParse((await ctx.params).id);
  if (!id.success) return Response.json({ error: "ไม่พบสถานประกอบการ" }, { status: 404 });
  try {
    return Response.json(await verifyCompany(id.data));
  } catch (e) {
    return userErrorResponse(e);
  }
}
