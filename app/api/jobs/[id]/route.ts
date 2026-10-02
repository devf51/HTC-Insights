import { requireRole } from "@/lib/auth";
import { parseJson, userErrorResponse } from "@/lib/http";
import { setJobActive } from "@/lib/jobs";
import { idSchema, jobActiveInputSchema } from "@/lib/validation";

/** เจ้าของปิดรับ / เปิดรับประกาศอีกครั้ง */
export async function PATCH(req: Request, ctx: RouteContext<"/api/jobs/[id]">) {
  await requireRole("EXTERNAL");
  const id = idSchema.safeParse((await ctx.params).id);
  if (!id.success) return Response.json({ error: "ไม่พบประกาศ" }, { status: 404 });
  const input = await parseJson(req, jobActiveInputSchema);
  if (input instanceof Response) return input;
  try {
    return Response.json(await setJobActive(id.data, input.isActive));
  } catch (e) {
    return userErrorResponse(e);
  }
}
