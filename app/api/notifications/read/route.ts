import { requireUser } from "@/lib/auth";
import { markAllRead } from "@/lib/notifications";

/** ทำเครื่องหมายว่าอ่านแจ้งเตือนของตัวเองทั้งหมดแล้ว */
export async function POST() {
  await requireUser();
  await markAllRead();
  return Response.json({ ok: true });
}
