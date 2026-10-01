import type { ReactNode } from "react";
import { SectionHeader } from "@/components/ui/SectionHeader";

/** โครงของทุกหน้า: กว้างไม่เกิน 1200px, หัวเรื่อง h1, ระยะส่วน 64px มือถือ / 96px เดสก์ท็อป */
export function PageShell({
  eyebrow,
  title,
  lede,
  actions,
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  lede?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 py-16 md:px-12 md:py-24">
      <SectionHeader level={1} eyebrow={eyebrow} title={title} lede={lede} actions={actions} />
      {children}
    </div>
  );
}
