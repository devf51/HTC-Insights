import { upgradeNotice } from "./account-rules";
import { logAdminAction, notify } from "./admin";
import { requireAdmin, requireRole, requireUser } from "./auth";
import { uploadImage, uploadsEnabled } from "./cloudinary";
import { db, isPrismaError } from "./db";
import { UserError } from "./http";
import { photoError } from "./review-rules";
import type { UpgradeDecision, UpgradeFields } from "./validation";

// คำขอยืนยันสิทธิ์นักศึกษา (สเปกข้อ 11) — ยื่นได้เฉพาะบุคคลภายนอก ที่รอตรวจได้ครั้งละหนึ่ง (UpgradeRequest_one_pending)
// ponytail: รูปบัตรอัปโหลดเป็นรูปสาธารณะของ Cloudinary (URL เดาไม่ได้) แสดงเฉพาะผู้ดูแล — ถ้าต้องปิดจริงใช้ type "authenticated" + signed URL

const CARD_FOLDER = "htc-insights/student-cards";
const PENDING_EXISTS = "คุณมีคำขอที่รอตรวจอยู่แล้ว ติดตามสถานะได้ที่หน้านี้";

/** คำขอทุกสถานะของผู้ใช้เอง — ให้ติดตามผล */
export async function myUpgradeRequests() {
  const user = await requireUser();
  return db.upgradeRequest.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, studentId: true, department: true, educationLevel: true, status: true, rejectionReason: true, createdAt: true },
  });
}

export async function submitUpgrade(fields: UpgradeFields, card: File | null): Promise<{ id: string }> {
  const user = await requireRole("EXTERNAL");
  if (!uploadsEnabled()) throw new UserError(400, "ระบบยังไม่เปิดรับคำขอยืนยันสิทธิ์ ติดต่อผู้ดูแล");
  if (!card) throw new UserError(400, "แนบรูปบัตรนักศึกษา");
  const err = photoError([card]);
  if (err) throw new UserError(400, err);
  // เช็คก่อนอัปโหลดกันรูปค้าง — ตัวตัดสินจริงคือ unique index ที่จับ P2002 ข้างล่าง
  if (await db.upgradeRequest.findFirst({ where: { userId: user.id, status: "PENDING" }, select: { id: true } })) {
    throw new UserError(409, PENDING_EXISTS);
  }
  const cardImageUrl = await uploadImage(card, CARD_FOLDER);
  try {
    return await db.upgradeRequest.create({ data: { ...fields, userId: user.id, cardImageUrl }, select: { id: true } });
  } catch (e) {
    if (isPrismaError(e, "P2002")) throw new UserError(409, PENDING_EXISTS);
    throw e;
  }
}

export async function pendingUpgrades() {
  await requireAdmin();
  // ponytail: 50 คำขอเก่าสุดก่อน เหมือนคิวเนื้อหา
  return db.upgradeRequest.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: 50,
    select: {
      id: true,
      studentId: true,
      department: true,
      educationLevel: true,
      cardImageUrl: true,
      createdAt: true,
      user: { select: { name: true, email: true, role: true } },
    },
  });
}

/** อนุมัติ = บทบาทนักศึกษา + ข้อมูลนักศึกษา · ทั้งหมดพร้อมแจ้งเตือนและประวัติในทรานแซกชันเดียว */
export async function decideUpgrade(id: string, input: UpgradeDecision): Promise<{ status: "APPROVED" | "REJECTED" }> {
  const admin = await requireAdmin();
  const reason = input.decision === "REJECTED" ? input.reason : null;
  await db.$transaction(async (tx) => {
    const r = await tx.upgradeRequest.findUnique({
      where: { id },
      select: { status: true, userId: true, studentId: true, department: true, educationLevel: true, user: { select: { role: true } } },
    });
    if (!r) throw new UserError(404, "ไม่พบคำขอ");
    if (r.status !== "PENDING") throw new UserError(409, "คำขอนี้ถูกตัดสินไปแล้ว รีเฟรชหน้าเพื่อดูสถานะล่าสุด");
    if (input.decision === "APPROVED") {
      if (r.user.role !== "EXTERNAL") throw new UserError(409, "บัญชีนี้ไม่ใช่บุคคลภายนอกแล้ว ปฏิเสธคำขอแทน");
      await tx.user.update({
        where: { id: r.userId },
        data: { role: "STUDENT", studentId: r.studentId, department: r.department, educationLevel: r.educationLevel },
      });
    }
    await tx.upgradeRequest.update({ where: { id }, data: { status: input.decision, rejectionReason: reason } });
    await notify(tx, r.userId, upgradeNotice(input.decision, reason));
    await logAdminAction(tx, admin.id, `${input.decision === "APPROVED" ? "approve" : "reject"}_upgrade`, { type: "upgrade", id }, reason ?? `${r.studentId} ${r.educationLevel}`);
  });
  return { status: input.decision };
}
