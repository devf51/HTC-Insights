import { requireAdmin } from "@/lib/auth";
import { parseJson, userErrorResponse } from "@/lib/http";
import { decideUpgrade } from "@/lib/upgrades";
import { idSchema, upgradeDecisionSchema } from "@/lib/validation";

/** ผู้ดูแลอนุมัติหรือปฏิเสธคำขอยืนยันสิทธิ์นักศึกษา */
export async function POST(req: Request, ctx: RouteContext<"/api/admin/upgrades/[id]">) {
  await requireAdmin();
  const id = idSchema.safeParse((await ctx.params).id);
  if (!id.success) return Response.json({ error: "ไม่พบคำขอ" }, { status: 404 });
  const input = await parseJson(req, upgradeDecisionSchema);
  if (input instanceof Response) return input;
  try {
    return Response.json(await decideUpgrade(id.data, input));
  } catch (e) {
    return userErrorResponse(e);
  }
}
