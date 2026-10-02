import { requireRole } from "@/lib/auth";
import { parseJson, userErrorResponse } from "@/lib/http";
import { createJob } from "@/lib/jobs";
import { jobInputSchema } from "@/lib/validation";

/** ลงประกาศใหม่ — เกิดมาเป็น PENDING */
export async function POST(req: Request) {
  await requireRole("EXTERNAL");
  const input = await parseJson(req, jobInputSchema);
  if (input instanceof Response) return input;
  try {
    return Response.json(await createJob(input), { status: 201 });
  } catch (e) {
    return userErrorResponse(e);
  }
}
