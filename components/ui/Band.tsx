import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

/** แถบดำเต็มความกว้าง บังคับธีม Night ข้างในเสมอ — ห้ามวางติดกันสองแถบ */
export function Band({ lang, children, className }: { lang?: string; children?: ReactNode; className?: string }) {
  return (
    <section data-theme="night" lang={lang} className={cx("kn-band", className)}>
      {children}
    </section>
  );
}
