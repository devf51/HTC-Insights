import { logAdminAction, notify } from "./admin";
import { requireAdmin, requireRole } from "./auth";
import {
  isListed,
  reviewAuthor,
  round1,
  searchCompanies,
  similarCompanies,
  summarize,
  type SearchFilters,
  type SearchResult,
} from "./company-rules";
import { db } from "./db";
import { UserError } from "./http";
import { companyRejectedNotice, companyVerifiedNotice } from "./moderation-rules";
import type { AdminDecision } from "./validation";

// ทุกฟังก์ชันเริ่มด้วย guard เอง — Next 16 ให้ตรวจสิทธิ์ใกล้ข้อมูล เพราะ layout ไม่ re-render ตอนเปลี่ยนหน้า
// (node_modules/next/dist/docs/01-app/02-guides/authentication.md "Layouts and auth checks")
// ทุก query ที่นี่กรอง APPROVED รวมถึง aggregate — หลักการโดเมนข้อ 1

const APPROVED = { status: "APPROVED" } as const;
const COMPANY_ROW = { id: true, name: true, address: true, industry: true, lat: true, lng: true, isVerified: true } as const;

export async function listCompanies(filters: SearchFilters): Promise<SearchResult> {
  await requireRole("STUDENT", "ADMIN");
  // ponytail: ดึงบริษัทและรีวิวที่อนุมัติทั้งหมดมารวมในหน่วยความจำ — วิทยาลัยเดียวหลักร้อยบริษัทหลักพันรีวิว
  // ย้ายไป groupBy + where ใน SQL เมื่อรีวิวเกินหลักหมื่น
  const [companies, reviews] = await Promise.all([
    db.company.findMany({ select: COMPANY_ROW }),
    db.review.findMany({
      where: APPROVED,
      select: { companyId: true, department: true, scoreOverall: true, dailyAllowance: true },
    }),
  ]);
  return searchCompanies(companies, summarize(reviews), filters);
}

export async function getCompany(id: string) {
  await requireRole("STUDENT", "ADMIN");
  const where = { companyId: id, ...APPROVED };
  const [company, agg, reviews] = await Promise.all([
    db.company.findUnique({
      where: { id },
      select: { ...COMPANY_ROW, phone: true, website: true, description: true },
    }),
    db.review.aggregate({
      where,
      _count: true,
      _avg: {
        scoreOverall: true,
        scoreWork: true,
        scoreEnv: true,
        scoreMentor: true,
        scoreWelfare: true,
        dailyAllowance: true,
      },
    }),
    db.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      // ห้าม select userId — ชื่อผู้เขียนออกจากฟังก์ชันนี้ผ่าน reviewAuthor เท่านั้น
      select: {
        id: true,
        department: true,
        periodStart: true,
        periodEnd: true,
        dailyAllowance: true,
        hasAccommodation: true,
        hasTransport: true,
        workStartTime: true,
        workEndTime: true,
        scoreOverall: true,
        textWork: true,
        textPros: true,
        textCons: true,
        textAdvice: true,
        isAnonymous: true,
        photos: { select: { id: true, url: true } },
        user: { select: { name: true } },
      },
    }),
  ]);
  if (!company || !isListed({ isVerified: company.isVerified, reviewCount: agg._count })) return null;

  const avg = agg._avg;
  const r1 = (n: number | null) => (n === null ? null : round1(n));
  return {
    company,
    stats: {
      reviewCount: agg._count,
      avgScore: r1(avg.scoreOverall),
      avgAllowance: avg.dailyAllowance === null ? null : Math.round(avg.dailyAllowance),
      dims: {
        scoreWork: r1(avg.scoreWork),
        scoreEnv: r1(avg.scoreEnv),
        scoreMentor: r1(avg.scoreMentor),
        scoreWelfare: r1(avg.scoreWelfare),
      },
    },
    reviews: reviews.map(({ user, ...r }) => ({ ...r, author: reviewAuthor({ isAnonymous: r.isAnonymous, user }) })),
  };
}

export type CompanyDetail = NonNullable<Awaited<ReturnType<typeof getCompany>>>;

/**
 * สถานประกอบการที่ลงทะเบียนผ่านบัญชีผู้ประกอบการและรอผู้ดูแลยืนยัน — ยังไม่ขึ้น /insights จนกว่าจะยืนยัน
 * similar: บริษัทชื่อคล้ายที่มีอยู่แล้ว ให้ผู้ดูแลตัดสินว่าลงทะเบียนซ้ำหรือไม่ (หนึ่งบริษัทหนึ่งบัญชี)
 */
export async function pendingCompanies() {
  await requireAdmin();
  // ponytail: 50 แห่งเก่าสุดก่อน เหมือนคิวเนื้อหา · ดึงชื่อทุกบริษัทมาเทียบในหน่วยความจำ — วิทยาลัยเดียวหลักร้อยบริษัท
  const [pending, all] = await Promise.all([
    db.company.findMany({
      // บัญชีที่ถูกระงับไม่ต้องตรวจ — ไม่งั้นการลงทะเบียนขยะดันรายการจริงตกคิว 50 แห่ง
      where: { isVerified: false, employer: { user: { isBanned: false } } },
      orderBy: { createdAt: "asc" },
      take: 50,
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        lat: true,
        lng: true,
        createdAt: true,
        employer: { select: { contactEmail: true, user: { select: { name: true, email: true } } } },
      },
    }),
    db.company.findMany({ select: { id: true, name: true, address: true, isVerified: true, employerId: true } }),
  ]);
  return pending.map((c) => ({ ...c, similar: similarCompanies(c, all) }));
}

/**
 * ยืนยันหรือปฏิเสธการลงทะเบียนสถานประกอบการ — แจ้งผู้ประกอบการและลงประวัติในทรานแซกชันเดียว (หลักการโดเมนข้อ 3–4)
 * ปฏิเสธ = ลบการลงทะเบียน (บัญชีผู้ประกอบการกับประกาศงาน) ให้บัญชีลงทะเบียนใหม่ได้ บริษัทที่ยังไม่มีรีวิวลบตามไปด้วย
 */
export async function decideCompany(id: string, input: AdminDecision): Promise<{ isVerified: boolean }> {
  const admin = await requireAdmin();
  await db.$transaction(async (tx) => {
    const c = await tx.company.findUnique({ where: { id }, select: { name: true, isVerified: true, employer: { select: { id: true, userId: true } } } });
    if (!c) throw new UserError(404, "ไม่พบสถานประกอบการ รีเฟรชหน้าเพื่อดูสถานะล่าสุด");
    if (c.isVerified) throw new UserError(409, "สถานประกอบการนี้ยืนยันแล้ว รีเฟรชหน้าเพื่อดูสถานะล่าสุด");
    if (input.decision === "APPROVED") {
      await tx.company.update({ where: { id }, data: { isVerified: true } });
      if (c.employer) await notify(tx, c.employer.userId, companyVerifiedNotice(c.name));
      await logAdminAction(tx, admin.id, "verify_company", { type: "company", id }, c.name);
      return;
    }
    if (!c.employer) throw new UserError(409, "สถานประกอบการนี้ไม่มีบัญชีผู้ประกอบการผูกอยู่ รีเฟรชหน้าเพื่อดูสถานะล่าสุด");
    // ประกาศงาน cascade ตาม Employer · Company.employer เป็น SetNull จึงลบบริษัทเองถ้าไม่มีรีวิว (กันลบรีวิวของนักศึกษา)
    await tx.employer.delete({ where: { id: c.employer.id } });
    await tx.company.deleteMany({ where: { id, reviews: { none: {} } } });
    await notify(tx, c.employer.userId, companyRejectedNotice(c.name, input.reason));
    // ชื่ออยู่ใน detail ด้วย — แถวบริษัทอาจถูกลบไปแล้ว
    await logAdminAction(tx, admin.id, "reject_company", { type: "company", id }, `${c.name}: ${input.reason}`);
  });
  return { isVerified: input.decision === "APPROVED" };
}
