import { notFound } from "next/navigation";
import { BestAnswerButton } from "@/components/BestAnswerButton";
import { CommentForm } from "@/components/CommentForm";
import { EmptyState } from "@/components/EmptyState";
import { LikeButton } from "@/components/LikeButton";
import { PageShell } from "@/components/PageShell";
import { ReportButton } from "@/components/ReportButton";
import { Badge } from "@/components/ui/Badge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { getPost } from "@/lib/community";
import { countNodes, postTypeLabel } from "@/lib/community-rules";
import { cx } from "@/lib/cx";
import { departmentLabel } from "@/lib/departments";
import { idSchema } from "@/lib/validation";
import { thaiDateTime } from "@/lib/thai-time";

type Data = NonNullable<Awaited<ReturnType<typeof getPost>>>;
type Node = Data["comments"][number];
type Ctx = { postId: string; bestAnswerId: string | null; canAct: boolean; canPickBest: boolean; viewerId: string };

export default async function PostPage({ params }: PageProps<"/community/[id]">) {
  const id = idSchema.safeParse((await params).id);
  if (!id.success) notFound();
  const data = await getPost(id.data);
  if (!data) notFound();
  const { post, comments, viewerId, canAct } = data;
  const approved = post.status === "APPROVED";
  const ctx: Ctx = {
    postId: post.id,
    bestAnswerId: post.bestAnswerId,
    canAct,
    canPickBest: canAct && approved && post.type === "QA" && post.userId === viewerId,
    viewerId,
  };

  return (
    <PageShell
      eyebrow={[postTypeLabel(post.type), post.department ? departmentLabel(post.department) : "ทั่วไป"].join(" · ")}
      title={post.title}
      lede={`${post.user.name ?? "นักศึกษา"} · ${thaiDateTime(post.createdAt)}`}
    >
      {!approved && (
        <Badge tone="warning" className="self-start">
          รอตรวจ — มีแค่คุณที่เห็นกระทู้นี้
        </Badge>
      )}
      <p className="max-w-prose whitespace-pre-line break-words">{post.body}</p>
      {approved && (
        <div className="flex flex-wrap items-center gap-4">
          <LikeButton target={{ postId: post.id }} liked={post.liked} count={post.likeCount} disabled={!canAct} />
          {canAct && post.userId !== viewerId && <ReportButton kind="post" id={post.id} />}
        </div>
      )}

      <section className="flex flex-col gap-4">
        <SectionHeader title={`ความคิดเห็น (${countNodes(comments)})`} />
        {comments.length === 0 ? (
          <EmptyState icon="chat" title="ยังไม่มีความคิดเห็น">
            {approved ? "เริ่มต้นบทสนทนาได้เลย" : "แสดงความคิดเห็นได้หลังกระทู้ผ่านการตรวจ"}
          </EmptyState>
        ) : (
          <ul className="flex flex-col gap-4">
            {comments.map((c) => (
              <CommentItem key={c.id} c={c} ctx={ctx} />
            ))}
          </ul>
        )}
        {canAct && approved && <CommentForm postId={post.id} />}
      </section>
    </PageShell>
  );
}

function CommentItem({ c, ctx }: { c: Node; ctx: Ctx }) {
  const isBest = c.id === ctx.bestAnswerId;
  const approved = c.status === "APPROVED";
  return (
    // ย่อหน้าซ้อนสูงสุด 3 ชั้น ลึกกว่านั้นอยู่แนวเดียวกับชั้นที่ 3 — จอ 375px ไม่ถูกบีบจนอ่านไม่ได้
    <li className={cx(c.depth > 0 && c.depth <= 3 && "border-l border-line pl-4")}>
      <article className={cx("flex flex-col gap-2 rounded-lg border p-4", isBest ? "border-signal" : "border-line")}>
        <p className="text-small text-ink-muted">{`${c.user.name ?? "นักศึกษา"} · ${thaiDateTime(c.createdAt)}`}</p>
        {isBest && (
          <Badge tone="success" className="self-start">
            คำตอบที่ดีที่สุด
          </Badge>
        )}
        {!approved && (
          <Badge tone="warning" className="self-start">
            รอตรวจ — มีแค่คุณที่เห็น
          </Badge>
        )}
        <p className="whitespace-pre-line break-words">{c.body}</p>
        {approved && (
          <div className="flex flex-wrap items-center gap-2">
            <LikeButton target={{ commentId: c.id }} liked={c.liked} count={c.likeCount} disabled={!ctx.canAct} />
            {ctx.canPickBest && c.userId !== ctx.viewerId && <BestAnswerButton postId={ctx.postId} commentId={c.id} isBest={isBest} />}
            {ctx.canAct && c.userId !== ctx.viewerId && <ReportButton kind="comment" id={c.id} />}
          </div>
        )}
        {ctx.canAct && approved && (
          <details>
            <summary className="kn-link cursor-pointer text-small">ตอบกลับ</summary>
            <CommentForm postId={ctx.postId} parentId={c.id} />
          </details>
        )}
      </article>
      {c.replies.length > 0 && (
        <ul className="mt-3 flex flex-col gap-3">
          {c.replies.map((r) => (
            <CommentItem key={r.id} c={r} ctx={ctx} />
          ))}
        </ul>
      )}
    </li>
  );
}
