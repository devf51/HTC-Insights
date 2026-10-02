import { requireRole } from "@/lib/auth";
import { setBestAnswer } from "@/lib/community";
import { parseJson, userErrorResponse } from "@/lib/http";
import { bestAnswerInputSchema, idSchema } from "@/lib/validation";

/** เจ้าของกระทู้ถามตอบเลือกคำตอบที่ดีที่สุด — commentId: null = ยกเลิก */
export async function PUT(req: Request, ctx: RouteContext<"/api/community/posts/[id]/best-answer">) {
  await requireRole("STUDENT");
  const id = idSchema.safeParse((await ctx.params).id);
  if (!id.success) return Response.json({ error: "ไม่พบกระทู้" }, { status: 404 });
  const input = await parseJson(req, bestAnswerInputSchema);
  if (input instanceof Response) return input;
  try {
    return Response.json(await setBestAnswer(id.data, input.commentId));
  } catch (e) {
    return userErrorResponse(e);
  }
}
