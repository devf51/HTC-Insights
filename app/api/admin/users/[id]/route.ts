import { requireAdmin } from "@/lib/auth";
import { parseJson, userErrorResponse } from "@/lib/http";
import { changeUser } from "@/lib/users";
import { idSchema, userChangeSchema } from "@/lib/validation";

/** เปลี่ยนบทบาท ระงับ หรือยกเลิกการระงับบัญชี — สิทธิ์ตัดสินใน accountChangeError */
export async function POST(req: Request, ctx: RouteContext<"/api/admin/users/[id]">) {
  await requireAdmin();
  const id = idSchema.safeParse((await ctx.params).id);
  if (!id.success) return Response.json({ error: "ไม่พบบัญชี" }, { status: 404 });
  const input = await parseJson(req, userChangeSchema);
  if (input instanceof Response) return input;
  try {
    return Response.json(await changeUser(id.data, input));
  } catch (e) {
    return userErrorResponse(e);
  }
}
