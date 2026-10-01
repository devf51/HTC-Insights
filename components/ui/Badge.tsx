import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

export interface BadgeProps {
  tone?: "neutral" | "signal" | "success" | "warning" | "danger";
  /** คำสถานะ ต้องมีเสมอ — สีอย่างเดียวไม่พอ */
  children: ReactNode;
  className?: string;
}

export function Badge({ tone = "neutral", children, className }: BadgeProps) {
  return (
    <span className={cx("kn-badge", `kn-badge-${tone}`, className)}>
      <span className="kn-badge-dot" aria-hidden="true" />
      {children}
    </span>
  );
}
