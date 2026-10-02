import { requireRole } from "@/lib/auth";
import { createPost } from "@/lib/community";
import { parseJson, userErrorResponse } from "@/lib/http";
import { postInputSchema } from "@/lib/validation";

export async function POST(req: Request) {
  await requireRole("STUDENT");
  const input = await parseJson(req, postInputSchema);
  if (input instanceof Response) return input;
  try {
    return Response.json(await createPost(input), { status: 201 });
  } catch (e) {
    return userErrorResponse(e);
  }
}
