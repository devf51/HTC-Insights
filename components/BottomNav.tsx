"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Icon";
import { cx } from "@/lib/cx";
import { isActive, type NavItem } from "@/lib/nav";

/** แถบล่างเฉพาะมือถือ — เผื่อขอบล่าง iPhone ด้วย safe-area (layout ตั้ง viewport-fit=cover แล้ว) */
export function BottomNav({ links }: { links: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="เมนูหลัก"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface-000 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="flex">
        {links.map((l) => {
          const active = isActive(pathname, l.href);
          return (
            <li key={l.href} className="flex-1">
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "flex h-16 flex-col items-center justify-center gap-1 text-[13px] leading-5",
                  active ? "text-signal" : "text-ink-muted",
                )}
              >
                <Icon name={l.icon} filled={active} className="!text-[24px]" />
                <span className="kn-nobr">{l.short ?? l.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
