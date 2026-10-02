import { requireRole } from "@/lib/auth";
import { parseJson, userErrorResponse } from "@/lib/http";
import { registerEmployer } from "@/lib/jobs";
import { employerInputSchema } from "@/lib/validation";

/** ลงทะเบียนสถานประกอบการ — หนึ่งบัญชีหนึ่งแห่ง */
export async function POST(req: Request) {
  await requireRole("EXTERNAL");
  const input = await parseJson(req, employerInputSchema);
  if (input instanceof Response) return input;
  try {
    return Response.json(await registerEmployer(input), { status: 201 });
  } catch (e) {
    return userErrorResponse(e);
  }
}
