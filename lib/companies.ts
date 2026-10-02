import { requireRole } from "./auth";
import {
  isListed,
  reviewAuthor,
  round1,
  searchCompanies,
  summarize,
  type SearchFilters,
  type SearchResult,
} from "./company-rules";
import { db } from "./db";

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
