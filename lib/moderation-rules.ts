// ไฟล์นี้ต้อง pure — tests/moderation-rules.test.mjs import ตรงด้วย Node ห้าม import ค่าจริงเพิ่ม (import type ได้)

/** เนื้อหาที่ผ่านศูนย์คัดกรอง — ลำดับนี้คือลำดับหัวข้อในคิว */
export const CONTENT_KINDS = [
  { value: "review", label: "รีวิว" },
  { value: "post", label: "กระทู้" },
  { value: "comment", label: "ความคิดเห็น" },
  { value: "job", label: "ประกาศงาน" },
] as const;
export type ContentKind = (typeof CONTENT_KINDS)[number]["value"];
export const CONTENT_KIND_VALUES = CONTENT_KINDS.map((k) => k.value) as [ContentKind, ...ContentKind[]];

export function kindLabel(kind: string): string {
  return CONTENT_KINDS.find((k) => k.value === kind)?.label ?? kind;
}

export type Decision = "APPROVED" | "REJECTED";
export const CASCADE_REASON = "ความคิดเห็นต้นทางถูกปฏิเสธ";
export const AUDIT_PER_PAGE = 50;

/** ข้อความสั้นสำหรับแจ้งเตือนและประวัติ — ยุบช่องว่างและขึ้นบรรทัด */
export function excerpt(s: string, n = 40): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

/** id ของความคิดเห็นต้นทางและคำตอบใต้มันทุกชั้น — ปฏิเสธต้นทางต้องปฏิเสธทั้งกิ่ง (ข้อตกลง Phase 4) */
export function commentSubtree(rows: { id: string; parentId: string | null }[], rootId: string): string[] {
  const children = new Map<string, string[]>();
  for (const r of rows) {
    if (r.parentId) children.set(r.parentId, [...(children.get(r.parentId) ?? []), r.id]);
  }
  const out: string[] = [];
  const stack = [rootId];
  while (stack.length > 0) {
    const id = stack.pop()!;
    out.push(id);
    stack.push(...(children.get(id) ?? []));
  }
  return out;
}

/** อนุมัติความคิดเห็นได้เมื่อกระทู้และต้นทาง (ถ้ามี) เผยแพร่แล้ว — คำตอบใต้ต้นทางที่มองไม่เห็นหลุดบริบท */
export function commentApproveError(c: { postStatus: string; parentStatus: string | null }): string | null {
  if (c.postStatus !== "APPROVED") return "กระทู้ของความคิดเห็นนี้ยังไม่เผยแพร่";
  if (c.parentStatus !== null && c.parentStatus !== "APPROVED") return "ความคิดเห็นต้นทางยังไม่เผยแพร่ ตรวจต้นทางก่อน";
  return null;
}

export type NoticeTarget = { kind: ContentKind; id: string; title: string; companyId?: string; postId?: string };

function noticeLink(t: NoticeTarget, decision: Decision): string {
  const ok = decision === "APPROVED";
  switch (t.kind) {
    case "review":
      // ถูกปฏิเสธ → หน้าแก้ไขแล้วส่งใหม่ที่มีอยู่แล้ว
      return ok ? `/insights/${t.companyId}` : `/insights/write-review?edit=${t.id}`;
    case "post":
      return ok ? `/community/${t.id}` : "/profile";
    case "comment":
      return `/community/${t.postId}`;
    case "job":
      return ok ? `/jobs/${t.id}` : "/profile";
  }
}

/** ข้อความแจ้งเจ้าของเนื้อหา — หลักการโดเมนข้อ 4: ทุกผลการตรวจต้องแจ้งพร้อมเหตุผล */
export function decisionNotice(t: NoticeTarget, decision: Decision, reason: string | null) {
  const what = `${kindLabel(t.kind)} "${t.title}"`;
  return {
    type: `${t.kind}_${decision === "APPROVED" ? "approved" : "rejected"}`,
    message: decision === "APPROVED" ? `${what} ผ่านการตรวจและเผยแพร่แล้ว` : `${what} ไม่ผ่านการตรวจ เหตุผล: ${reason ?? "ไม่ระบุ"}`,
    link: noticeLink(t, decision),
  };
}

const VERBS: Record<string, string> = { approve: "อนุมัติ", reject: "ปฏิเสธ" };

const ACTIONS: Record<string, string> = {
  approve_upgrade: "อนุมัติคำขอยืนยันสิทธิ์",
  reject_upgrade: "ปฏิเสธคำขอยืนยันสิทธิ์",
  withdraw_report: "ถอนเนื้อหาตามข้อร้องเรียน",
  resolve_report: "ปิดข้อร้องเรียน",
  dismiss_report: "ยกข้อร้องเรียน",
  change_role: "เปลี่ยนบทบาท",
  ban_user: "ระงับบัญชี",
  unban_user: "ยกเลิกการระงับบัญชี",
};

/** ชื่อการกระทำในประวัติผู้ดูแล — การกระทำที่รู้จัก หรือรูปแบบ <verb>_<kind> ที่ moderate() เขียน · อื่น ๆ คืนค่าเดิม */
export function actionLabel(action: string): string {
  if (Object.hasOwn(ACTIONS, action)) return ACTIONS[action];
  const [verb, kind, ...rest] = action.split("_");
  if (rest.length > 0 || !Object.hasOwn(VERBS, verb) || !CONTENT_KINDS.some((k) => k.value === kind)) return action;
  return VERBS[verb] + kindLabel(kind);
}

const TARGET_LABELS: Record<string, string> = { company: "สถานประกอบการ", upgrade: "คำขอยืนยันสิทธิ์", report: "ข้อร้องเรียน", user: "บัญชี" };

/** ชื่อ targetType ในประวัติและข้อความ */
export function targetLabel(type: string): string {
  return Object.hasOwn(TARGET_LABELS, type) ? TARGET_LABELS[type] : kindLabel(type);
}

// ---------- ข้อร้องเรียน ----------

export const REPORT_KINDS = [...CONTENT_KINDS, { value: "company", label: "สถานประกอบการ" }] as const;
export type ReportKind = (typeof REPORT_KINDS)[number]["value"];
export const REPORT_KIND_VALUES = REPORT_KINDS.map((k) => k.value) as [ReportKind, ...ReportKind[]];
export type ReportColumn = "reviewId" | "postId" | "commentId" | "jobId" | "companyId";
export const REPORT_COLUMN: Record<ReportKind, ReportColumn> = {
  review: "reviewId",
  post: "postId",
  comment: "commentId",
  job: "jobId",
  company: "companyId",
};

/** แถว Report → เป้าหมาย — มีคอลัมน์เป้าหมายได้คอลัมน์เดียว */
export function reportTarget(r: Record<ReportColumn, string | null>): { kind: ReportKind; id: string } | null {
  for (const k of REPORT_KINDS) {
    const id = r[REPORT_COLUMN[k.value]];
    if (id) return { kind: k.value, id };
  }
  return null;
}

export type ReportAction = "withdraw" | "resolve" | "dismiss";

/** สถานประกอบการไม่มีสถานะให้ถอน — ใช้ปิดเรื่องพร้อมบันทึกแทน */
export function reportActionError(kind: ReportKind, action: ReportAction): string | null {
  return action === "withdraw" && kind === "company" ? "สถานประกอบการถอนไม่ได้ ใช้ปิดเรื่องพร้อมบันทึกการจัดการแทน" : null;
}

/** หลักการโดเมนข้อ 4 — ผู้รายงานต้องรู้ผล */
export function reportNotice(kind: ReportKind, action: ReportAction, note: string) {
  const what = `รายงาน${targetLabel(kind)}ของคุณ`;
  const message =
    action === "withdraw"
      ? `${what}ได้รับการตรวจแล้ว ผู้ดูแลถอนเนื้อหานั้นออก: ${note}`
      : action === "resolve"
        ? `${what}ได้รับการจัดการแล้ว: ${note}`
        : `${what}ตรวจแล้วไม่พบการละเมิดกฎ: ${note}`;
  return { type: `report_${action}`, message, link: null };
}
