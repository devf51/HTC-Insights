import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

export interface CardProps {
  lang?: string;
  eyebrow?: string;
  metric?: ReactNode;
  title?: ReactNode;
  /** ขอบสี signal — หนึ่งการ์ดต่อกลุ่ม */
  featured?: boolean;
  footer?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function Card({ lang, eyebrow, metric, title, featured, footer, children, className }: CardProps) {
  return (
    <article lang={lang} className={cx("kn-card", featured && "kn-card-featured", className)}>
      {eyebrow && <p className="kn-eyebrow">{eyebrow}</p>}
      {metric && <p className="kn-card-metric">{metric}</p>}
      {title && <h3 className="kn-card-title">{title}</h3>}
      {children && <div className="kn-card-body">{children}</div>}
      {footer && <div className="kn-card-footer">{footer}</div>}
    </article>
  );
}
