"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { cx } from "@/lib/cx";

/** ตัวเลขมาจากเซิร์ฟเวอร์ทุกครั้ง ไม่เดาเอง — กดซ้ำ = ยกเลิก */
export function LikeButton({
  target,
  liked,
  count,
  disabled,
}: {
  target: { postId: string } | { commentId: string };
  liked: boolean;
  count: number;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState({ liked, count });
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      const res = await fetch("/api/community/likes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(target),
      });
      if (res.ok) setState(await res.json());
      else router.refresh();
    } catch {
      // เครือข่ายล้ม — คงค่าเดิมไว้ ผู้ใช้กดใหม่ได้
    }
    setBusy(false);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled || busy}
      aria-pressed={state.liked}
      className={cx(
        "inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-small disabled:cursor-default",
        state.liked ? "text-signal" : "text-ink-muted",
      )}
    >
      <Icon name="thumb_up" filled={state.liked} />
      {`${state.count} ถูกใจ`}
    </button>
  );
}
