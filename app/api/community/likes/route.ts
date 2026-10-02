import { requireRole } from "@/lib/auth";
import { toggleLike } from "@/lib/community";
import { parseJson, userErrorResponse } from "@/lib/http";
import { likeInputSchema } from "@/lib/validation";

/** กดถูกใจ / กดซ้ำเพื่อยกเลิก */
export async function POST(req: Request) {
  await requireRole("STUDENT");
  const input = await parseJson(req, likeInputSchema);
  if (input instanceof Response) return input;
  try {
    return Response.json(await toggleLike(input));
  } catch (e) {
    return userErrorResponse(e);
  }
}
