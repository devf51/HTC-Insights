import type { Prisma } from "@/app/generated/prisma/client";
import { logAdminAction, notify } from "./admin";
import { requireAdmin } from "./auth";
import { pageWindow } from "./community-rules";
import { db } from "./db";
import { UserError } from "./http";
import {
  AUDIT_PER_PAGE,
  CASCADE_REASON,
  REPORT_COLUMN,
  commentApproveError,
  commentSubtree,
  decisionNotice,
  excerpt,
  reportActionError,
  reportNotice,
  reportTarget,
  type ContentKind,
  type Decision,
  type NoticeTarget,
} from "./moderation-rules";
import type { ModerationInput, ReportDecision } from "./validation";

// ทุกฟังก์ชัน export async เริ่มด้วย requireAdmin — tests/route-guards.test.mjs ตรวจ
// การตัดสินทุกครั้ง: เปลี่ยนสถานะ + notify ถึงทุกคนที่ได้รับผล + logAdminAction ในทรานแซกชันเดียว (หลักการโดเมนข้อ 3–4)

type Tx = Prisma.TransactionClient;
type Affected = { userId: string; target: NoticeTarget; reason?: string | null };
type Outcome = { affected: Affected[]; detail?: string | null };
type Current = { status: string };
type Decide = (tx: Tx, id: string, decision: Decision, reason: string | null, check: (cur: Current) => void) => Promise<Outcome>;

const PENDING = { status: "PENDING" } as const;
// ผู้ดูแลเห็นตัวตนผู้เขียนเสมอ รวมรีวิวไม่ระบุตัวตน (หลักการโดเมนข้อ 2)
const WHO = { select: { name: true, email: true } } as const;
// ponytail: คิวละไม่เกิน 50 รายการ เก่าสุดก่อน — วิทยาลัยเดียว ถ้าค้างเกินนี้บ่อยค่อยแบ่งหน้า
const QUEUE = { orderBy: { createdAt: "asc" }, take: 50 } as const;
const STALE = "ผู้ดูแลคนอื่นตัดสินเนื้อหานี้ไปแล้ว รีเฟรชหน้าเพื่อดูสถานะล่าสุด";

export async function pendingQueue() {
  await requireAdmin();
  const [reviews, posts, comments, jobs] = await Promise.all([
    db.review.findMany({
      where: PENDING,
      ...QUEUE,
      select: {
        id: true,
        department: true,
        createdAt: true,
        scoreOverall: true,
        dailyAllowance: true,
        textWork: true,
        textPros: true,
        textCons: true,
        textAdvice: true,
        isAnonymous: true,
        photos: { select: { id: true, url: true } },
        user: WHO,
        company: { select: { name: true, address: true } },
      },
    }),
    db.communityPost.findMany({
      where: PENDING,
      ...QUEUE,
      select: { id: true, type: true, department: true, title: true, body: true, createdAt: true, user: WHO },
    }),
    // ความคิดเห็นในกระทู้ที่ถูกถอนหายไปพร้อมกระทู้โดยไม่แจ้งผู้เขียน (ข้อตกลง Phase 6b) — ไม่ต้องตรวจ
    // ตัวนับรอตรวจในแดชบอร์ดใช้เงื่อนไขเดียวกัน (lib/dashboard.ts)
    db.communityComment.findMany({
      where: { ...PENDING, post: { status: "APPROVED" } },
      ...QUEUE,
      select: {
        id: true,
        body: true,
        createdAt: true,
        user: WHO,
        post: { select: { id: true, title: true } },
        parent: { select: { body: true, status: true } },
      },
    }),
    // ประกาศที่เจ้าของปิดรับระหว่างรอตรวจไม่ต้องตรวจ (ข้อตกลง Phase 5)
    db.jobPosting.findMany({
      where: { ...PENDING, isActive: true },
      ...QUEUE,
      select: {
        id: true,
        title: true,
        department: true,
        description: true,
        qualifications: true,
        benefits: true,
        allowance: true,
        contactEmail: true,
        contactPhone: true,
        createdAt: true,
        company: { select: { name: true, address: true } },
        employer: { select: { user: WHO } },
      },
    }),
  ]);
  return { reviews, posts, comments, jobs };
}

const decideReview: Decide = async (tx, id, decision, reason, check) => {
  const r = await tx.review.findUnique({ where: { id }, select: { status: true, userId: true, companyId: true, company: { select: { name: true } } } });
  if (!r) throw new UserError(404, "ไม่พบรีวิว");
  check(r);
  await tx.review.update({ where: { id }, data: { status: decision, rejectionReason: reason } });
  return { affected: [{ userId: r.userId, target: { kind: "review", id, title: r.company.name, companyId: r.companyId } }] };
};

const decidePost: Decide = async (tx, id, decision, reason, check) => {
  const p = await tx.communityPost.findUnique({ where: { id }, select: { status: true, userId: true, title: true } });
  if (!p) throw new UserError(404, "ไม่พบกระทู้");
  check(p);
  await tx.communityPost.update({ where: { id }, data: { status: decision, rejectionReason: reason } });
  return { affected: [{ userId: p.userId, target: { kind: "post", id, title: excerpt(p.title) } }] };
};

const decideComment: Decide = async (tx, id, decision, reason, check) => {
  const c = await tx.communityComment.findUnique({
    where: { id },
    select: { status: true, userId: true, postId: true, body: true, post: { select: { status: true } }, parent: { select: { status: true } } },
  });
  if (!c) throw new UserError(404, "ไม่พบความคิดเห็น");
  check(c);
  const target = (cid: string, body: string): NoticeTarget => ({ kind: "comment", id: cid, title: excerpt(body), postId: c.postId });

  if (decision === "APPROVED") {
    const err = commentApproveError({ postStatus: c.post.status, parentStatus: c.parent?.status ?? null });
    if (err) throw new UserError(409, err);
    await tx.communityComment.update({ where: { id }, data: { status: "APPROVED", rejectionReason: null } });
    return { affected: [{ userId: c.userId, target: target(id, c.body) }] };
  }

  // ปฏิเสธทั้งกิ่ง — ไม่งั้นตัวนับบนการ์ดเกินจำนวนที่แสดงในกระทู้ (บั๊กแบบ v1) · ล้างคำตอบที่ดีที่สุดถ้าอยู่ในกิ่ง
  const rows = await tx.communityComment.findMany({ where: { postId: c.postId }, select: { id: true, parentId: true, status: true, userId: true, body: true } });
  const branch = new Set(commentSubtree(rows, id));
  const below = rows.filter((r) => r.id !== id && branch.has(r.id) && r.status !== "REJECTED");
  await tx.communityComment.update({ where: { id }, data: { status: "REJECTED", rejectionReason: reason } });
  await tx.communityComment.updateMany({
    where: { id: { in: below.map((r) => r.id) } },
    data: { status: "REJECTED", rejectionReason: CASCADE_REASON },
  });
  await tx.communityPost.updateMany({ where: { bestAnswerId: { in: [...branch] } }, data: { bestAnswerId: null } });
  return {
    affected: [
      { userId: c.userId, target: target(id, c.body) },
      ...below.map((r) => ({ userId: r.userId, target: target(r.id, r.body), reason: CASCADE_REASON })),
    ],
    detail: below.length > 0 ? `${reason} (และคำตอบใต้มัน ${below.length} รายการ)` : reason,
  };
};

const decideJob: Decide = async (tx, id, decision, reason, check) => {
  const j = await tx.jobPosting.findUnique({ where: { id }, select: { status: true, title: true, employer: { select: { userId: true } } } });
  if (!j) throw new UserError(404, "ไม่พบประกาศ");
  check(j);
  // ไม่ชน JobPosting_open_per_department: PENDING นับใน index อยู่แล้ว และ REJECTED ไม่นับ
  // ถ้าวันหนึ่ง from รับ REJECTED (ย้ายกลับจากที่ปฏิเสธ) ต้องจับ P2002 เป็น 409
  await tx.jobPosting.update({ where: { id }, data: { status: decision, rejectionReason: reason } });
  return { affected: [{ userId: j.employer.userId, target: { kind: "job", id, title: excerpt(j.title) } }] };
};

const DECIDE: Record<ContentKind, Decide> = { review: decideReview, post: decidePost, comment: decideComment, job: decideJob };

/**
 * ตัดสินในทรานแซกชันของผู้เรียก — moderate() และ resolveReport() ใช้ตัวเดียวกัน ไม่มีตรรกะถอนชุดที่สอง
 * คืน id เนื้อหาชนิดเดียวกันที่ได้รับผล (ความคิดเห็น: ต้นทาง + คำตอบใต้มันที่ถูกปฏิเสธตาม)
 */
async function applyDecision(tx: Tx, adminId: string, kind: ContentKind, id: string, input: ModerationInput): Promise<string[]> {
  const reason = input.decision === "REJECTED" ? input.reason : null;
  // ตัดสินได้เฉพาะเมื่อสถานะยังเป็นอย่างที่ผู้ดูแลเห็นตอนกด — ผู้ดูแลสองคนกดพร้อมกันหรือหน้าค้าง ไม่ตัดสินทับกัน
  const check = (cur: Current) => {
    if (cur.status !== input.from || cur.status === input.decision) throw new UserError(409, STALE);
  };
  const { affected, detail = reason } = await DECIDE[kind](tx, id, input.decision, reason, check);
  for (const a of affected) await notify(tx, a.userId, decisionNotice(a.target, input.decision, a.reason ?? reason));
  await logAdminAction(tx, adminId, `${input.decision === "APPROVED" ? "approve" : "reject"}_${kind}`, { type: kind, id }, detail);
  return affected.map((a) => a.target.id);
}

/** ตัดสินเนื้อหาหนึ่งชิ้นจากคิวตรวจ — from ค่าเริ่มต้น PENDING */
export async function moderate(kind: ContentKind, id: string, input: ModerationInput): Promise<{ status: Decision }> {
  const admin = await requireAdmin();
  await db.$transaction((tx) => applyDecision(tx, admin.id, kind, id, input));
  return { status: input.decision };
}

export async function auditLog(page: number) {
  await requireAdmin();
  const total = await db.auditLog.count();
  const w = pageWindow(page, total, AUDIT_PER_PAGE);
  const items = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    skip: w.skip,
    take: w.take,
    select: { id: true, action: true, targetType: true, targetId: true, detail: true, createdAt: true, admin: WHO },
  });
  return { items, page: w.page, pageCount: w.pageCount };
}

// ---------- ข้อร้องเรียน ----------

export async function pendingReports() {
  await requireAdmin();
  return db.report.findMany({
    where: PENDING,
    ...QUEUE,
    select: {
      id: true,
      reason: true,
      createdAt: true,
      reporter: WHO,
      reviewId: true,
      postId: true,
      commentId: true,
      jobId: true,
      companyId: true,
      review: { select: { status: true, textWork: true, companyId: true, company: { select: { name: true } } } },
      post: { select: { status: true, title: true } },
      comment: { select: { status: true, body: true, postId: true } },
      job: { select: { status: true, title: true } },
      company: { select: { name: true } },
    },
  });
}

/**
 * จัดการข้อร้องเรียน — ถอนเนื้อหาผ่าน applyDecision แล้วปิดทุกข้อร้องเรียนที่รอของเนื้อหาที่หายจากสาธารณะ
 * (ตัวมันเอง คำตอบใต้ความคิดเห็นที่ถูกถอนตาม และความคิดเห็นในกระทู้ที่ถูกถอน) · ทางอื่นปิดเฉพาะเรื่องนี้
 */
export async function resolveReport(id: string, input: ReportDecision): Promise<{ status: "RESOLVED" | "DISMISSED" }> {
  const admin = await requireAdmin();
  const status = input.action === "dismiss" ? "DISMISSED" : "RESOLVED";
  await db.$transaction(async (tx) => {
    const r = await tx.report.findUnique({
      where: { id },
      select: { status: true, reporterId: true, reviewId: true, postId: true, commentId: true, jobId: true, companyId: true },
    });
    if (!r) throw new UserError(404, "ไม่พบข้อร้องเรียน");
    if (r.status !== "PENDING") throw new UserError(409, "ข้อร้องเรียนนี้ถูกจัดการไปแล้ว รีเฟรชหน้าเพื่อดูสถานะล่าสุด");
    const target = reportTarget(r);
    if (!target) throw new UserError(404, "ไม่พบเนื้อหาที่ถูกรายงาน");
    const err = reportActionError(target.kind, input.action);
    if (err) throw new UserError(400, err);

    let closing = [{ id, reporterId: r.reporterId, commentId: r.commentId }];
    if (input.action === "withdraw" && target.kind !== "company") {
      const ids = await applyDecision(tx, admin.id, target.kind, target.id, { decision: "REJECTED", from: "APPROVED", reason: input.note });
      const hidden = [{ [REPORT_COLUMN[target.kind]]: { in: ids } } as Prisma.ReportWhereInput];
      if (target.kind === "post") hidden.push({ comment: { postId: target.id } });
      closing = await tx.report.findMany({ where: { status: "PENDING", OR: hidden }, select: { id: true, reporterId: true, commentId: true } });
    }
    await tx.report.updateMany({ where: { id: { in: closing.map((c) => c.id) } }, data: { status, resolution: input.note } });
    // ข้อร้องเรียนความคิดเห็นในกระทู้ที่ถูกถอน — บอกผู้รายงานตามสิ่งที่เขารายงาน
    for (const c of closing) await notify(tx, c.reporterId, reportNotice(c.commentId ? "comment" : target.kind, input.action, input.note));
    await logAdminAction(tx, admin.id, `${input.action}_report`, { type: "report", id }, input.note);
  });
  return { status };
}
