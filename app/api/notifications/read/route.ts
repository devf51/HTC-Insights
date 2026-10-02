import { requireUser } from "@/lib/auth";
import { crossSiteError } from "@/lib/http";
import { markAllRead } from "@/lib/notifications";

/** ทำเครื่องหมายว่าอ่านแจ้งเตือนของตัวเองทั้งหมดแล้ว */
export async function POST(req: Request) {
  await requireUser();
  const blocked = crossSiteError(req);
  if (blocked) return blocked;
  await markAllRead();
  return Response.json({ ok: true });
}
