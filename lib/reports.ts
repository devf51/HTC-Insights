import type { Prisma } from "@/app/generated/prisma/client";
import { requireUser } from "./auth";
import { db, isPrismaError } from "./db";
import { UserError } from "./http";
import { REPORT_COLUMN, type ReportKind } from "./moderation-rules";
import type { ReportInput } from "./validation";

// ผู้ใช้รายงานเนื้อหาที่ตัวเองมองเห็นได้ — มองไม่เห็น = 404 เหมือนไม่มี ไม่ให้เดา id
// เรื่องที่ยังรอซ้ำบังคับด้วย partial unique Report_pending_<เป้าหมาย>Id ที่ฐานข้อมูล — ปิดแล้วรายงานใหม่ได้

const NOT_FOUND = "ไม่พบเนื้อหานี้";
const APPROVED = { status: "APPROVED" } as const;

function seen<T>(row: T | null): T {
  if (!row) throw new UserError(404, NOT_FOUND);
  return row;
}

/** เจ้าของเนื้อหาที่เผยแพร่อยู่ (สถานประกอบการไม่มีเจ้าของ = null) */
async function visibleOwner(kind: ReportKind, id: string): Promise<string | null> {
  switch (kind) {
    case "review":
      return seen(await db.review.findFirst({ where: { id, ...APPROVED }, select: { userId: true } })).userId;
    case "post":
      return seen(await db.communityPost.findFirst({ where: { id, ...APPROVED }, select: { userId: true } })).userId;
    case "comment":
      return seen(await db.communityComment.findFirst({ where: { id, ...APPROVED, post: APPROVED }, select: { userId: true } })).userId;
    case "job":
      return seen(await db.jobPosting.findFirst({ where: { id, ...APPROVED, isActive: true }, select: { employer: { select: { userId: true } } } }))
        .employer.userId;
    case "company":
      // เห็นได้เมื่อยืนยันแล้วหรือมีรีวิวที่เผยแพร่ (isListed ใน lib/company-rules.ts)
      seen(await db.company.findFirst({ where: { id, OR: [{ isVerified: true }, { reviews: { some: APPROVED } }] }, select: { id: true } }));
      return null;
  }
}

export async function createReport(input: ReportInput): Promise<{ id: string }> {
  const user = await requireUser();
  // รีวิว บอร์ด และหน้าสถานประกอบการเปิดเฉพาะนักศึกษาและผู้ดูแล — บุคคลภายนอกรายงานได้เฉพาะประกาศงาน
  if (user.role === "EXTERNAL" && input.kind !== "job") throw new UserError(404, NOT_FOUND);
  if ((await visibleOwner(input.kind, input.id)) === user.id) throw new UserError(400, "รายงานเนื้อหาของตัวเองไม่ได้");
  try {
    return await db.report.create({
      data: { reporterId: user.id, reason: input.reason, [REPORT_COLUMN[input.kind]]: input.id } as Prisma.ReportUncheckedCreateInput,
      select: { id: true },
    });
  } catch (e) {
    if (isPrismaError(e, "P2002")) throw new UserError(409, "คุณรายงานเนื้อหานี้แล้ว ผู้ดูแลกำลังตรวจสอบ");
    throw e;
  }
}
