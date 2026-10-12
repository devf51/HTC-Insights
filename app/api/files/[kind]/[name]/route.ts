import { requireAdmin, requireRole, requireUser } from "@/lib/auth";
import { readImage } from "@/lib/uploads";

const notFound = () => new Response("ไม่พบไฟล์", { status: 404 });

/**
 * รูปที่อัปโหลดไว้บนดิสก์ (lib/uploads.ts) — รูปรีวิวเห็นได้เฉพาะผู้ที่เข้าหน้าสถานประกอบการได้ รูปบัตรนักศึกษาเฉพาะผู้ดูแล
 * ponytail: รูปของรีวิวที่ยังไม่อนุมัติเปิดได้ถ้ารู้ชื่อไฟล์ (UUID เดาไม่ได้ และแสดงเฉพาะในคิวตรวจ) — ผูกรูปกับสถานะรีวิวถ้าต้องปิดจริง
 */
export async function GET(_req: Request, ctx: RouteContext<"/api/files/[kind]/[name]">) {
  await requireUser();
  const { kind, name } = await ctx.params;
  if (kind === "cards") await requireAdmin();
  else if (kind === "reviews") await requireRole("STUDENT", "ADMIN");
  else return notFound();
  const file = await readImage(kind, name);
  if (!file) return notFound();
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "image/webp",
      // private: ต้องล็อกอินถึงเห็น ห้าม cache กลางทางเก็บ · ชื่อไฟล์ไม่ซ้ำ เนื้อไฟล์จึงไม่เปลี่ยน
      "Cache-Control": kind === "cards" ? "private, no-store" : "private, max-age=31536000, immutable",
    },
  });
}
