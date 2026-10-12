import { requireRole } from "./auth";
import { round1 } from "./company-rules";
import { departmentSeries, dimensionSeries, topCompanySeries } from "./dashboard-rules";
import { db } from "./db";
import { departmentLabel } from "./departments";
import { SCORE_DIMENSIONS } from "./review-rules";

// หน้าแรกแยกตามบทบาท (สเปกข้อ 2) — ทุกตัวเลขมาจากเนื้อหาที่เผยแพร่แล้วเท่านั้น รวม _count/_avg (หลักการโดเมนข้อ 1)

const APPROVED = { status: "APPROVED" } as const;
const OPEN_JOB = { status: "APPROVED", isActive: true } as const;
const TOP_N = 5;

/** นักศึกษา (และผู้ดูแลที่เห็นหน้าเดียวกัน) — สรุปข้อมูลฝึกงานจากรีวิวที่เผยแพร่ */
export async function studentHome() {
  await requireRole("STUDENT", "ADMIN");
  const [avg, companyGroups, openJobs] = await Promise.all([
    db.review.aggregate({
      where: APPROVED,
      _count: true,
      _avg: { scoreOverall: true, dailyAllowance: true, scoreWork: true, scoreEnv: true, scoreMentor: true, scoreWelfare: true },
    }),
    db.review.groupBy({ by: ["companyId"], where: APPROVED, _count: { _all: true }, _avg: { scoreOverall: true } }),
    db.jobPosting.count({ where: OPEN_JOB }),
  ]);
  const top = topCompanySeries(companyGroups, TOP_N);
  const names = new Map(
    (await db.company.findMany({ where: { id: { in: top.map((t) => t.companyId) } }, select: { id: true, name: true } })).map((c) => [c.id, c.name]),
  );
  return {
    reviews: avg._count,
    companies: companyGroups.length,
    avgScore: avg._avg.scoreOverall === null ? null : round1(avg._avg.scoreOverall),
    // ค่าเฉลี่ยเฉพาะรีวิวที่กรอกเบี้ยเลี้ยง — _avg ข้าม null อยู่แล้ว
    avgAllowance: avg._avg.dailyAllowance === null ? null : Math.round(avg._avg.dailyAllowance),
    dimensions: dimensionSeries(avg._avg, SCORE_DIMENSIONS),
    topCompanies: top.map((t) => ({ ...t, name: names.get(t.companyId) ?? "ไม่พบชื่อ" })),
    openJobs,
  };
}

/** บุคคลภายนอก — แผนกที่นักศึกษาออกฝึกงาน (จากรีวิวที่เผยแพร่) และประกาศที่เปิดรับอยู่ */
export async function externalHome() {
  await requireRole("EXTERNAL");
  const [deptGroups, jobGroups, latestJobs] = await Promise.all([
    db.review.groupBy({ by: ["department"], where: APPROVED, _count: { _all: true } }),
    db.jobPosting.groupBy({ by: ["department"], where: OPEN_JOB, _count: { _all: true } }),
    db.jobPosting.findMany({
      where: OPEN_JOB,
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, title: true, department: true, company: { select: { name: true } } },
    }),
  ]);
  return {
    departments: departmentSeries(deptGroups, departmentLabel),
    openJobsByDepartment: departmentSeries(jobGroups, departmentLabel),
    latestJobs: latestJobs.map((j) => ({ ...j, department: departmentLabel(j.department) })),
  };
}
