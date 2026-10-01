import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

export interface SectionHeaderProps {
  lang?: string;
  /** รูปแบบ "NN · คำ" หรือชื่อหมวด */
  eyebrow?: string;
  title: ReactNode;
  lede?: ReactNode;
  /** ขนาด display — ครั้งเดียวต่อหน้า */
  display?: boolean;
  /** ระดับหัวเรื่อง ค่าเริ่มต้น: display → h1, นอกนั้น h2 หัวของหน้าให้ส่ง 1 */
  level?: 1 | 2;
  actions?: ReactNode;
  className?: string;
}

export function SectionHeader({ lang, eyebrow, title, lede, display, level, actions, className }: SectionHeaderProps) {
  const Heading = (level ?? (display ? 1 : 2)) === 1 ? "h1" : "h2";
  return (
    <header lang={lang} className={cx("kn-section", className)}>
      {eyebrow && <p className="kn-eyebrow">{eyebrow}</p>}
      <Heading className={cx("kn-section-title", display && "kn-display")}>{title}</Heading>
      {lede && <p className="kn-section-lede">{lede}</p>}
      {actions && <div className="kn-section-actions">{actions}</div>}
    </header>
  );
}
