import { requireAdmin } from "@/lib/auth";
import { parseJson, userErrorResponse } from "@/lib/http";
import { resolveReport } from "@/lib/moderation";
import { idSchema, reportDecisionSchema } from "@/lib/validation";

/** ผู้ดูแลจัดการข้อร้องเรียน — ถอนเนื้อหา ปิดเรื่อง หรือไม่ผิดกฎ */
export async function POST(req: Request, ctx: RouteContext<"/api/admin/reports/[id]">) {
  await requireAdmin();
  const id = idSchema.safeParse((await ctx.params).id);
  if (!id.success) return Response.json({ error: "ไม่พบข้อร้องเรียน" }, { status: 404 });
  const input = await parseJson(req, reportDecisionSchema);
  if (input instanceof Response) return input;
  try {
    return Response.json(await resolveReport(id.data, input));
  } catch (e) {
    return userErrorResponse(e);
  }
}
