import { requireSuperAdmin } from "./auth";
import { round1 } from "./company-rules";
import { approvalRows, dateRange, departmentSeries, dimensionSeries, topCompanySeries, type DateRange } from "./dashboard-rules";
import { db } from "./db";
import { departmentLabel } from "./departments";
import { kindLabel } from "./moderation-rules";
import { SCORE_DIMENSIONS } from "./review-rules";

// แดชบอร์ดผู้บริหาร (สเปกข้อ 15) — เฉพาะ super admin · ฐานข้อมูลนับทุกชุดด้วย groupBy/aggregate
// ตัวเลขที่มาจากเนื้อหาสาธารณะ (แผนก ค่าเฉลี่ย อันดับบริษัท) นับเฉพาะ APPROVED — หลักการโดเมนข้อ 1
// สัดส่วนการอนุมัติเป็นตัวเลขงานคัดกรอง จึงนับทุกสถานะ

const TOP_N = 10;

export async function dashboardData(range: DateRange) {
  await requireSuperAdmin();
  const created = range.gte || range.lt ? { createdAt: { gte: range.gte ?? undefined, lt: range.lt ?? undefined } } : {};
  const approvedReviews = { ...created, status: "APPROVED" } as const;
  const COUNT = { _count: { _all: true } } as const;
  const [deptGroups, avg, companyGroups, reviewStatus, postStatus, commentStatus, jobStatus] = await Promise.all([
    db.review.groupBy({ by: ["department"], where: approvedReviews, ...COUNT }),
    db.review.aggregate({
      where: approvedReviews,
      _count: true,
      _avg: { scoreOverall: true, scoreWork: true, scoreEnv: true, scoreMentor: true, scoreWelfare: true },
    }),
    // ponytail: ทุกบริษัทที่มีรีวิวแล้วเรียงใน topCompanySeries — หลักร้อยแถว ลำดับเท่ากันแน่นอนกว่าตัดที่ฐานข้อมูล
    db.review.groupBy({ by: ["companyId"], where: approvedReviews, ...COUNT, _avg: { scoreOverall: true } }),
    db.review.groupBy({ by: ["status"], where: created, ...COUNT }),
    db.communityPost.groupBy({ by: ["status"], where: created, ...COUNT }),
    // ความคิดเห็นในกระทู้ที่ไม่เผยแพร่หายจากสาธารณะไปแล้ว ไม่นับ (ข้อบังคับ Phase 6b) — คิวตรวจก็ไม่แสดง
    db.communityComment.groupBy({ by: ["status"], where: { ...created, post: { status: "APPROVED" } }, ...COUNT }),
    // ประกาศที่เจ้าของปิดรับระหว่างรอตรวจไม่อยู่ในคิว จึงไม่นับ — ตัวเลขรอตรวจต้องตรงกับคิวใน /admin (pendingQueue)
    db.jobPosting.groupBy({ by: ["status"], where: { ...created, NOT: { status: "PENDING", isActive: false } }, ...COUNT }),
  ]);

  const top = topCompanySeries(companyGroups, TOP_N);
  const names = new Map(
    (await db.company.findMany({ where: { id: { in: top.map((t) => t.companyId) } }, select: { id: true, name: true } })).map((c) => [c.id, c.name]),
  );
  const approval = approvalRows([
    { label: kindLabel("review"), groups: reviewStatus },
    { label: kindLabel("post"), groups: postStatus },
    { label: kindLabel("comment"), groups: commentStatus },
    { label: kindLabel("job"), groups: jobStatus },
  ]);

  return {
    range: range.label,
    totals: {
      reviews: avg._count,
      avgScore: avg._avg.scoreOverall === null ? null : round1(avg._avg.scoreOverall),
      // เนื้อหา 4 ชนิดที่รอในคิว "รอตรวจ" — ไม่รวมคำขอยืนยันสิทธิ์และข้อร้องเรียน
      pending: approval.reduce((n, r) => n + r.PENDING, 0),
    },
    departments: departmentSeries(deptGroups, departmentLabel),
    dimensions: dimensionSeries(avg._avg, SCORE_DIMENSIONS),
    approval,
    topCompanies: top.map((t) => ({ ...t, name: names.get(t.companyId) ?? "ไม่พบชื่อ" })),
  };
}

export type DashboardData = Awaited<ReturnType<typeof dashboardData>>;
export { dateRange };
