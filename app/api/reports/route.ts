import { requireUser } from "@/lib/auth";
import { parseJson, userErrorResponse } from "@/lib/http";
import { createReport } from "@/lib/reports";
import { reportInputSchema } from "@/lib/validation";

/** รายงานเนื้อหาไม่เหมาะสม — ผู้ดูแลตรวจที่แท็บข้อร้องเรียน */
export async function POST(req: Request) {
  await requireUser();
  const input = await parseJson(req, reportInputSchema);
  if (input instanceof Response) return input;
  try {
    return Response.json(await createReport(input), { status: 201 });
  } catch (e) {
    return userErrorResponse(e);
  }
}
