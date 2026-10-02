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

/** ชื่อการกระทำในประวัติผู้ดูแล — รูปแบบ <verb>_<kind> ที่ moderate() เขียน · รูปแบบอื่นคืนค่าเดิม */
export function actionLabel(action: string): string {
  const [verb, kind, ...rest] = action.split("_");
  if (rest.length > 0 || !Object.hasOwn(VERBS, verb) || !CONTENT_KINDS.some((k) => k.value === kind)) return action;
  return VERBS[verb] + kindLabel(kind);
}
