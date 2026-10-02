import { requireRole, requireUser } from "./auth";
import { bestAnswerError, buildCommentTree, canView, pageWindow, POSTS_PER_PAGE, type PostType } from "./community-rules";
import { db, isPrismaError } from "./db";
import { UserError } from "./http";
import type { CommentInput, LikeInput, PostInput } from "./validation";

// ทุกฟังก์ชัน export async เริ่มด้วย guard เอง — tests/route-guards.test.mjs ตรวจ
// กระทู้และความคิดเห็นเกิดมาเป็น PENDING เสมอ (ค่า default ของ schema)
// ที่ผู้อื่นเห็นเฉพาะ APPROVED รวมถึงตัวนับ — v1 นับความคิดเห็นที่ยังไม่อนุมัติพลาดซ้ำสองรอบ

const APPROVED = { status: "APPROVED" } as const;
const AUTHOR = { select: { name: true } } as const;

export async function listPosts(f: { type?: PostType; department?: string; page: number }) {
  await requireRole("STUDENT", "ADMIN");
  const where = { ...APPROVED, type: f.type, department: f.department };
  const total = await db.communityPost.count({ where });
  const w = pageWindow(f.page, total, POSTS_PER_PAGE);
  const items = await db.communityPost.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: w.skip,
    take: w.take,
    select: {
      id: true,
      type: true,
      department: true,
      title: true,
      createdAt: true,
      bestAnswerId: true,
      user: AUTHOR,
      // ตัวนับต้องกรอง APPROVED เหมือนตัวเนื้อหา
      _count: { select: { comments: { where: APPROVED }, likes: true } },
    },
  });
  return { items, total, page: w.page, pageCount: w.pageCount };
}

export async function getPost(id: string) {
  const user = await requireRole("STUDENT", "ADMIN");
  const post = await db.communityPost.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      type: true,
      department: true,
      title: true,
      body: true,
      status: true,
      createdAt: true,
      bestAnswerId: true,
      user: AUTHOR,
      _count: { select: { likes: true } },
      likes: { where: { userId: user.id }, select: { id: true } },
    },
  });
  if (!post || !canView(post, user.id)) return null;

  // ทั้งกระทู้ในคำสั่งเดียว เฉพาะแถวที่ผู้ชมมีสิทธิ์เห็น แล้วประกอบต้นไม้ในหน่วยความจำ
  const rows = await db.communityComment.findMany({
    where: { postId: id, OR: [APPROVED, { status: "PENDING", userId: user.id }] },
    select: {
      id: true,
      parentId: true,
      userId: true,
      body: true,
      status: true,
      createdAt: true,
      user: AUTHOR,
      _count: { select: { likes: true } },
      likes: { where: { userId: user.id }, select: { id: true } },
    },
  });
  const { likes, _count, ...rest } = post;
  return {
    post: { ...rest, likeCount: _count.likes, liked: likes.length > 0 },
    comments: buildCommentTree(
      rows.map(({ likes: mine, _count: counts, ...c }) => ({ ...c, likeCount: counts.likes, liked: mine.length > 0 })),
      user.id,
    ),
    viewerId: user.id,
    // ผู้ดูแลอ่านได้อย่างเดียว — ตั้งกระทู้ แสดงความคิดเห็น ถูกใจ เลือกคำตอบ เป็นของนักศึกษา
    canAct: user.role === "STUDENT",
  };
}

export async function createPost(input: PostInput): Promise<{ id: string }> {
  const user = await requireRole("STUDENT");
  return db.communityPost.create({ data: { ...input, userId: user.id }, select: { id: true } });
}

export async function createComment(input: CommentInput): Promise<{ id: string }> {
  const user = await requireRole("STUDENT");
  const post = await db.communityPost.findUnique({ where: { id: input.postId }, select: { status: true } });
  if (!post || post.status !== "APPROVED") throw new UserError(404, "ไม่พบกระทู้");
  if (input.parentId) {
    const parent = await db.communityComment.findUnique({ where: { id: input.parentId }, select: { postId: true, status: true } });
    // ตอบได้เฉพาะความคิดเห็นที่เผยแพร่แล้วในกระทู้เดียวกัน — ไม่งั้นคำตอบหลุดบริบทเมื่อคนอื่นมองไม่เห็นต้นทาง
    if (!parent || parent.postId !== input.postId || parent.status !== "APPROVED") {
      throw new UserError(400, "ตอบกลับได้เฉพาะความคิดเห็นที่เผยแพร่แล้วในกระทู้นี้");
    }
  }
  return db.communityComment.create({ data: { ...input, userId: user.id }, select: { id: true } });
}

export async function toggleLike(input: LikeInput): Promise<{ liked: boolean; count: number }> {
  const user = await requireRole("STUDENT");
  const target =
    "postId" in input
      ? await db.communityPost.findUnique({ where: { id: input.postId }, select: { status: true } })
      : await db.communityComment.findUnique({ where: { id: input.commentId }, select: { status: true } });
  if (!target || target.status !== "APPROVED") throw new UserError(404, "ไม่พบเนื้อหานี้");

  const key = "postId" in input ? { postId: input.postId } : { commentId: input.commentId };
  // กดซ้ำ = ยกเลิก: ลบก่อน ถ้าไม่มีอะไรให้ลบจึงสร้าง
  // สองคำขอพร้อมกันจะชน @@unique (P2002) — ถือว่ากดแล้ว ฐานข้อมูลยังมีแค่แถวเดียว
  const removed = await db.communityLike.deleteMany({ where: { ...key, userId: user.id } });
  let liked = false;
  if (removed.count === 0) {
    try {
      await db.communityLike.create({ data: { ...key, userId: user.id } });
    } catch (e) {
      if (!isPrismaError(e, "P2002")) throw e;
    }
    liked = true;
  }
  return { liked, count: await db.communityLike.count({ where: key }) };
}

export async function setBestAnswer(postId: string, commentId: string | null): Promise<{ bestAnswerId: string | null }> {
  const user = await requireRole("STUDENT");
  const post = await db.communityPost.findUnique({ where: { id: postId }, select: { id: true, userId: true, type: true, status: true } });
  if (!post || !canView(post, user.id)) throw new UserError(404, "ไม่พบกระทู้");
  const comment = commentId
    ? await db.communityComment.findUnique({ where: { id: commentId }, select: { postId: true, userId: true, status: true } })
    : null;
  if (commentId && !comment) throw new UserError(400, "ไม่พบความคิดเห็นนี้ในกระทู้");
  const err = bestAnswerError(post, comment, user.id);
  if (err) throw new UserError(post.userId === user.id ? 400 : 403, err);
  // bestAnswerId ช่องเดียวต่อกระทู้ — ตั้งใหม่แทนที่ของเดิมเอง ไม่ต้องล้าง
  await db.communityPost.update({ where: { id: postId }, data: { bestAnswerId: commentId } });
  return { bestAnswerId: commentId };
}

/** กระทู้ทุกสถานะของผู้ใช้เอง — ให้ติดตามผลการตรวจ */
export async function myPosts() {
  const user = await requireUser();
  return db.communityPost.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, type: true, status: true, rejectionReason: true, createdAt: true },
  });
}
