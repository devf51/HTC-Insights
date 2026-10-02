// ไฟล์นี้ต้อง pure — tests/community-rules.test.mjs import ตรงด้วย Node ห้าม import ค่าจริงเพิ่ม (import type ได้)

/** 4 หมวดตามสเปกข้อ 6 — ลำดับนี้คือลำดับแท็บ */
export const POST_TYPES = [
  { value: "QA", label: "ถามตอบ" },
  { value: "EXPERIENCE", label: "เล่าประสบการณ์" },
  { value: "TIPS", label: "เทคนิค" },
  { value: "TEAM", label: "หาเพื่อนฝึกงาน" },
] as const;
export type PostType = (typeof POST_TYPES)[number]["value"];
export const POST_TYPE_VALUES = POST_TYPES.map((t) => t.value) as [PostType, ...PostType[]];

export function postTypeLabel(value: string): string {
  return POST_TYPES.find((t) => t.value === value)?.label ?? value;
}

export const POSTS_PER_PAGE = 20;

/**
 * คนอื่นเห็นเฉพาะ APPROVED · เจ้าของเห็นของตัวเองที่รอตรวจด้วย (หน้าแสดงป้าย "รอตรวจ")
 * ที่ถูกปฏิเสธไม่แสดงในบอร์ดแม้แต่กับเจ้าของ — ดูได้ที่โปรไฟล์
 */
export function canView(item: { status: string; userId: string }, viewerId: string): boolean {
  return item.status === "APPROVED" || (item.status === "PENDING" && item.userId === viewerId);
}

export type FlatComment = { id: string; parentId: string | null; status: string; userId: string; createdAt: Date };
export type CommentNode<T extends FlatComment> = T & { depth: number; replies: CommentNode<T>[] };

/**
 * ประกอบต้นไม้จากความคิดเห็นทั้งกระทู้ที่ดึงมาด้วย query เดียว (ไม่ query ซ้อนต่อระดับ)
 * ที่ผู้ชมมองไม่เห็นถูกตัดพร้อมคำตอบใต้มันทั้งกิ่ง — คำตอบที่หลุดบริบทไม่โผล่ลอย ๆ
 * เรียงเก่าไปใหม่ในแต่ละระดับ
 */
export function buildCommentTree<T extends FlatComment>(rows: T[], viewerId: string): CommentNode<T>[] {
  const visible = rows
    .filter((r) => canView(r, viewerId))
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const byParent = new Map<string | null, T[]>();
  for (const r of visible) {
    const siblings = byParent.get(r.parentId) ?? [];
    siblings.push(r);
    byParent.set(r.parentId, siblings);
  }
  // เดินจากราก — แถวที่ต้นทางมองไม่เห็นจึงไม่ถูกเดินถึง
  const build = (parentId: string | null, depth: number): CommentNode<T>[] =>
    (byParent.get(parentId) ?? []).map((r) => ({ ...r, depth, replies: build(r.id, depth + 1) }));
  return build(null, 0);
}

export function countNodes(nodes: { replies: unknown[] }[]): number {
  return nodes.reduce((n, node) => n + 1 + countNodes(node.replies as { replies: unknown[] }[]), 0);
}

/**
 * คำตอบที่ดีที่สุด: เจ้าของกระทู้ถามตอบที่อนุมัติแล้ว เลือกความคิดเห็นที่อนุมัติแล้วในกระทู้เดียวกันที่ไม่ใช่ของตัวเอง
 * comment = null คือยกเลิกการเลือก · คืนข้อความ error ภาษาไทย หรือ null ถ้าทำได้
 */
export function bestAnswerError(
  post: { id: string; userId: string; type: string; status: string },
  comment: { postId: string; userId: string; status: string } | null,
  viewerId: string,
): string | null {
  if (post.userId !== viewerId) return "เฉพาะเจ้าของกระทู้เลือกคำตอบที่ดีที่สุดได้";
  if (post.type !== "QA") return "เลือกคำตอบที่ดีที่สุดได้เฉพาะกระทู้ถามตอบ";
  if (post.status !== "APPROVED") return "กระทู้ยังไม่ผ่านการตรวจ";
  if (!comment) return null;
  if (comment.postId !== post.id || comment.status !== "APPROVED") return "ไม่พบความคิดเห็นนี้ในกระทู้";
  if (comment.userId === viewerId) return "เลือกความคิดเห็นของตัวเองไม่ได้";
  return null;
}

/** หน้าที่ขอเกินถูกดึงกลับมาหน้าสุดท้าย — ลิงก์ที่ส่งต่อกันเปิดได้เสมอ */
export function pageWindow(page: number, total: number, size: number) {
  const pageCount = Math.max(1, Math.ceil(total / size));
  const p = Math.min(Math.max(1, page), pageCount);
  return { page: p, pageCount, skip: (p - 1) * size, take: size };
}
