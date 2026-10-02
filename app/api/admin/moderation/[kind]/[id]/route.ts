import { requireAdmin } from "@/lib/auth";
import { parseJson, userErrorResponse } from "@/lib/http";
import { moderate } from "@/lib/moderation";
import { contentKindSchema, idSchema, moderationInputSchema } from "@/lib/validation";

/** ผู้ดูแลอนุมัติหรือปฏิเสธเนื้อหาหนึ่งชิ้น — แจ้งเจ้าของและลงประวัติในทรานแซกชันเดียว */
export async function POST(req: Request, ctx: RouteContext<"/api/admin/moderation/[kind]/[id]">) {
  await requireAdmin();
  const params = await ctx.params;
  const kind = contentKindSchema.safeParse(params.kind);
  const id = idSchema.safeParse(params.id);
  if (!kind.success || !id.success) return Response.json({ error: "ไม่พบเนื้อหา" }, { status: 404 });
  const input = await parseJson(req, moderationInputSchema);
  if (input instanceof Response) return input;
  try {
    return Response.json(await moderate(kind.data, id.data, input));
  } catch (e) {
    return userErrorResponse(e);
  }
}
