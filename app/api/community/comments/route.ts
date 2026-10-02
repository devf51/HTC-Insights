import { requireRole } from "@/lib/auth";
import { createComment } from "@/lib/community";
import { parseJson, userErrorResponse } from "@/lib/http";
import { commentInputSchema } from "@/lib/validation";

export async function POST(req: Request) {
  await requireRole("STUDENT");
  const input = await parseJson(req, commentInputSchema);
  if (input instanceof Response) return input;
  try {
    return Response.json(await createComment(input), { status: 201 });
  } catch (e) {
    return userErrorResponse(e);
  }
}
