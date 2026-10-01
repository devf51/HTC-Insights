import type { ReactNode } from "react";
import { Icon } from "@/components/Icon";

export function EmptyState({
  icon = "inbox",
  title = "ยังไม่มีข้อมูล",
  children,
}: {
  icon?: string;
  title?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-line bg-surface-100 px-6 py-12 text-center">
      <Icon name={icon} className="!text-[32px] text-ink-muted" />
      <p className="text-h3 text-ink">{title}</p>
      {children && <p className="max-w-sm text-small text-ink-muted">{children}</p>}
    </div>
  );
}
