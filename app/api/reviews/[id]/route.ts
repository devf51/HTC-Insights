import { requireRole } from "@/lib/auth";
import { readReviewForm, reviewErrorResponse } from "@/lib/review-request";
import { resubmitReview } from "@/lib/reviews";
import { idSchema } from "@/lib/validation";

/** แก้รีวิวที่ถูกปฏิเสธแล้วส่งใหม่ — กลับเป็น PENDING */
export async function PUT(req: Request, ctx: RouteContext<"/api/reviews/[id]">) {
  await requireRole("STUDENT");
  const id = idSchema.safeParse((await ctx.params).id);
  if (!id.success) return Response.json({ error: "ไม่พบรีวิวที่แก้ไขได้" }, { status: 404 });
  const form = await readReviewForm(req);
  if (form instanceof Response) return form;
  try {
    return Response.json(await resubmitReview(id.data, form.data, form.photos));
  } catch (e) {
    return reviewErrorResponse(e);
  }
}
