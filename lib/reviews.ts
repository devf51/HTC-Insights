import type { Prisma } from "@/app/generated/prisma/client";
import { requireRole, requireUser } from "./auth";
import { uploadImage, uploadsEnabled } from "./cloudinary";
import { db, isPrismaError } from "./db";
import { UserError } from "./http";
import { findPlace } from "./places";
import { canEditReview, overallScore, photoError } from "./review-rules";
import type { CompanyChoice, ReviewFields } from "./validation";

// ทุกฟังก์ชัน export async เริ่มด้วย guard เอง (เหตุผลเดียวกับ lib/companies.ts) — tests/route-guards.test.mjs ตรวจ
// รีวิวที่ส่งใหม่และที่แก้แล้วเป็น PENDING เสมอ — หลักการโดเมนข้อ 1

const ALREADY_REVIEWED = "คุณรีวิวสถานประกอบการนี้แล้ว ดูสถานะได้ที่หน้าโปรไฟล์";
const PHOTO_FOLDER = "htc-insights/reviews";

function checkPhotos(photos: File[]) {
  if (photos.length > 0 && !uploadsEnabled()) throw new UserError(400, "ระบบยังไม่เปิดให้แนบรูป");
  const err = photoError(photos);
  if (err) throw new UserError(400, err);
}

// ponytail: อัปโหลดก่อนเขียนฐานข้อมูล ถ้าทรานแซกชันล้ม รูปจะค้างใน Cloudinary — เก็บกวาดเมื่อพบว่าเกิดบ่อย
const uploadAll = (photos: File[]) => Promise.all(photos.map((p) => uploadImage(p, PHOTO_FOLDER)));

const reviewData = (f: ReviewFields) => ({ ...f, scoreOverall: overallScore(f) });

type CompanyTarget = { id: string } | { create: Prisma.CompanyCreateInput };

/** บริษัทที่จะผูกรีวิว — สร้างจริงในทรานแซกชันเดียวกับรีวิว */
async function companyTarget(choice: CompanyChoice): Promise<CompanyTarget> {
  if (choice.companyKind === "existing") {
    const c = await db.company.findUnique({ where: { id: choice.companyId }, select: { id: true } });
    if (!c) throw new UserError(404, "ไม่พบสถานประกอบการ");
    return c;
  }
  if (choice.companyKind === "new") return { create: { name: choice.newName, address: choice.newAddress } };
  const place = await findPlace(choice.placeQuery, choice.placeId);
  if (!place) throw new UserError(400, "ไม่พบสถานที่ที่เลือก ค้นหาแล้วเลือกใหม่อีกครั้ง");
  const { placeId, ...rest } = place;
  return { create: { ...rest, googlePlaceId: placeId } };
}

export async function submitReview(choice: CompanyChoice, fields: ReviewFields, photos: File[]): Promise<{ id: string }> {
  const user = await requireRole("STUDENT");
  checkPhotos(photos);
  const target = await companyTarget(choice);
  // เช็คก่อนอัปโหลดรูปเพื่อไม่ทิ้งรูปค้าง — ตัวตัดสินจริงคือ @@unique ที่จับ P2002 ข้างล่าง
  if ("id" in target) {
    const mine = await db.review.findUnique({ where: { companyId_userId: { companyId: target.id, userId: user.id } }, select: { id: true } });
    if (mine) throw new UserError(409, ALREADY_REVIEWED);
  }
  const urls = await uploadAll(photos);
  try {
    return await db.$transaction(async (tx) => {
      const companyId =
        "id" in target
          ? target.id
          : target.create.googlePlaceId
            ? // สองคนเลือกสถานที่เดียวกันพร้อมกัน — upsert ด้วย unique ไม่สร้างซ้ำ
              (await tx.company.upsert({ where: { googlePlaceId: target.create.googlePlaceId }, create: target.create, update: {}, select: { id: true } })).id
            : (await tx.company.create({ data: target.create, select: { id: true } })).id;
      return tx.review.create({
        data: { ...reviewData(fields), companyId, userId: user.id, photos: { create: urls.map((url) => ({ url })) } },
        select: { id: true },
      });
    });
  } catch (e) {
    if (isPrismaError(e, "P2002")) throw new UserError(409, ALREADY_REVIEWED);
    throw e;
  }
}

export async function resubmitReview(id: string, fields: ReviewFields, photos: File[]): Promise<{ id: string }> {
  const user = await requireRole("STUDENT");
  const review = await db.review.findUnique({ where: { id }, select: { userId: true, status: true } });
  // ไม่แยกว่า "ไม่มี" กับ "มีแต่แก้ไม่ได้" — ไม่ให้เดา id รีวิวของคนอื่น
  if (!review || !canEditReview(review, user.id)) throw new UserError(404, "ไม่พบรีวิวที่แก้ไขได้");
  checkPhotos(photos);
  const urls = await uploadAll(photos);
  try {
    await db.$transaction(async (tx) => {
      if (urls.length > 0) await tx.reviewPhoto.deleteMany({ where: { reviewId: id } });
      // where ซ้ำเงื่อนไข canEditReview ที่ฐานข้อมูล — ถ้าผู้ดูแลเปลี่ยนสถานะระหว่างนั้นจะ P2025 ไม่เขียนทับ
      await tx.review.update({
        where: { id, userId: user.id, status: "REJECTED" },
        data: { ...reviewData(fields), status: "PENDING", rejectionReason: null, photos: { create: urls.map((url) => ({ url })) } },
      });
    });
  } catch (e) {
    if (isPrismaError(e, "P2025")) throw new UserError(404, "ไม่พบรีวิวที่แก้ไขได้");
    throw e;
  }
  return { id };
}

/** รีวิวทุกสถานะของผู้ใช้เอง — ให้ติดตามผลการตรวจ */
export async function myReviews() {
  const user = await requireUser();
  return db.review.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true, rejectionReason: true, createdAt: true, company: { select: { id: true, name: true } } },
  });
}

export async function getReviewForEdit(id: string) {
  const user = await requireRole("STUDENT");
  const r = await db.review.findUnique({
    where: { id },
    select: {
      userId: true,
      status: true,
      rejectionReason: true,
      department: true,
      gender: true,
      periodStart: true,
      periodEnd: true,
      dailyAllowance: true,
      hasAccommodation: true,
      hasTransport: true,
      workStartTime: true,
      workEndTime: true,
      scoreWork: true,
      scoreEnv: true,
      scoreMentor: true,
      scoreWelfare: true,
      textWork: true,
      textPros: true,
      textCons: true,
      textAdvice: true,
      isAnonymous: true,
      company: { select: { id: true, name: true, address: true } },
    },
  });
  if (!r || !canEditReview(r, user.id)) return null;
  return r;
}

/** บริษัทที่จะรีวิว + รีวิวเดิมของผู้ใช้ที่บริษัทนี้ (ถ้ามี) */
export async function getCompanyForReview(id: string) {
  const user = await requireRole("STUDENT");
  const c = await db.company.findUnique({
    where: { id },
    select: { id: true, name: true, address: true, reviews: { where: { userId: user.id }, select: { id: true, status: true } } },
  });
  if (!c) return null;
  const { reviews, ...company } = c;
  return { company, myReview: reviews[0] ?? null };
}

/** สถานที่จาก Google ที่เคยถูกสร้างเป็นบริษัทแล้ว */
export async function findCompanyIdByPlace(placeId: string): Promise<string | null> {
  await requireRole("STUDENT");
  const c = await db.company.findUnique({ where: { googlePlaceId: placeId }, select: { id: true } });
  return c?.id ?? null;
}
