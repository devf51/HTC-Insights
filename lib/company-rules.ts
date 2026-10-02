// ไฟล์นี้ต้อง pure — tests/company-rules.test.mjs import ตรงด้วย Node ห้าม import ค่าจริงเพิ่ม (import type ได้)

/** รีวิวที่อนุมัติแล้วเท่านั้น — lib/companies.ts กรอง status: "APPROVED" ที่ query ก่อนส่งมา */
export type ApprovedReviewRow = { companyId: string; department: string; scoreOverall: number; dailyAllowance: number | null };
export type CompanyRow = {
  id: string;
  name: string;
  address: string | null;
  industry: string | null;
  lat: number | null;
  lng: number | null;
  isVerified: boolean;
};
export type CompanyStats = { reviewCount: number; avgScore: number | null; avgAllowance: number | null; departments: string[] };
export type CompanyCardData = CompanyRow & CompanyStats;
export type MapPin = { id: string; name: string; lat: number; lng: number; avgScore: number | null };
export type SearchFilters = { q: string; department?: string; minScore?: number; page: number };
export type SearchResult = { items: CompanyCardData[]; pins: MapPin[]; total: number; page: number; pageCount: number };

export const PAGE_SIZE = 12;

const NO_REVIEWS: CompanyStats = { reviewCount: 0, avgScore: null, avgAllowance: null, departments: [] };

/** ปัดทศนิยมหนึ่งตำแหน่ง — ตัวเลขที่แสดงกับที่ใช้กรอง กราฟ และรายงาน A4 ใช้ตัวเดียวกันทั้งระบบ */
export const round1 = (n: number) => Math.round(n * 10) / 10;

export function summarize(rows: ApprovedReviewRow[]): Map<string, CompanyStats> {
  const acc = new Map<string, { n: number; score: number; allowN: number; allow: number; depts: Set<string> }>();
  for (const r of rows) {
    const a = acc.get(r.companyId) ?? { n: 0, score: 0, allowN: 0, allow: 0, depts: new Set<string>() };
    a.n++;
    a.score += r.scoreOverall;
    a.depts.add(r.department);
    if (r.dailyAllowance !== null) {
      a.allowN++;
      a.allow += r.dailyAllowance;
    }
    acc.set(r.companyId, a);
  }
  return new Map(
    [...acc].map(([id, a]) => [
      id,
      {
        reviewCount: a.n,
        avgScore: round1(a.score / a.n),
        avgAllowance: a.allowN ? Math.round(a.allow / a.allowN) : null,
        departments: [...a.depts].sort((x, y) => x.localeCompare(y, "th")),
      },
    ]),
  );
}

/**
 * สาธารณะเห็นบริษัทเมื่อผู้ดูแลยืนยันแล้ว หรือมีรีวิวที่อนุมัติอย่างน้อยหนึ่ง
 * บริษัทที่มีแต่รีวิวรออนุมัติต้องไม่โผล่ ไม่งั้นแค่ชื่อก็บอกแล้วว่ามีคนกำลังรีวิว (หลักการโดเมนข้อ 1)
 */
export function isListed(c: { isVerified: boolean; reviewCount: number }): boolean {
  return c.isVerified || c.reviewCount > 0;
}

export function searchCompanies(companies: CompanyRow[], stats: Map<string, CompanyStats>, f: SearchFilters): SearchResult {
  const q = f.q.trim().toLowerCase();
  const matched = companies
    .map((c): CompanyCardData => ({ ...c, ...(stats.get(c.id) ?? NO_REVIEWS) }))
    .filter(isListed)
    .filter((c) => !q || [c.name, c.address, c.industry].some((s) => s?.toLowerCase().includes(q)))
    .filter((c) => !f.department || c.departments.includes(f.department))
    .filter((c) => f.minScore === undefined || (c.avgScore !== null && c.avgScore >= f.minScore))
    .sort(
      (a, b) =>
        b.reviewCount - a.reviewCount || (b.avgScore ?? 0) - (a.avgScore ?? 0) || a.name.localeCompare(b.name, "th"),
    );
  const pageCount = Math.max(1, Math.ceil(matched.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, f.page), pageCount);
  return {
    items: matched.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    // หมุดครบทุกผลที่ตรงตัวกรอง — แผนที่ไม่ได้แบ่งหน้าตามการ์ด
    pins: matched.flatMap((c) =>
      c.lat !== null && c.lng !== null ? [{ id: c.id, name: c.name, lat: c.lat, lng: c.lng, avgScore: c.avgScore }] : [],
    ),
    total: matched.length,
    page,
    pageCount,
  };
}

/** ชื่อผู้เขียนที่แสดงได้ — ไม่ระบุตัวตนซ่อนจากทุกคนรวมถึงผู้ดูแล (หลักการโดเมนข้อ 2) */
export function reviewAuthor(r: { isAnonymous: boolean; user: { name: string | null } }): string {
  if (r.isAnonymous) return "ไม่ระบุตัวตน";
  return r.user.name ?? "นักศึกษา";
}

/** URL ที่ใส่ใน href ได้ปลอดภัย — เว็บไซต์บริษัทมาจาก SerpApi และผู้ประกอบการกรอกเอง กัน javascript: */
export function safeUrl(raw: string | null): string | null {
  const s = raw?.trim();
  if (!s) return null;
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`);
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : null;
  } catch {
    return null;
  }
}
