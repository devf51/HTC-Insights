"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Icon";
import { buttonClass } from "@/components/ui/Button";
import { cx } from "@/lib/cx";
import { SETTINGS, isActive, type NavAction, type NavItem } from "@/lib/nav";

/** แถบบน 64px — ต่ำกว่า 768px ซ่อนลิงก์ (kernel.css) เหลือชื่อแบรนด์ ไอคอนตั้งค่า และปุ่ม */
export function TopNav({ links, action }: { links: NavItem[]; action: NavAction | null }) {
  const pathname = usePathname();
  const onSettings = isActive(pathname, SETTINGS.href);
  return (
    <header className="sticky top-0 z-40">
      <nav className="kn-nav" aria-label="เมนูหลัก">
        <Link href="/" className="kn-nav-brand" lang="en">
          HTC Insights
        </Link>
        <div className="kn-nav-links">
          {links.map((l) => (
            <Link key={l.href} href={l.href} aria-current={isActive(pathname, l.href) ? "page" : undefined}>
              {l.label}
            </Link>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href={SETTINGS.href}
            aria-label={SETTINGS.label}
            title={SETTINGS.label}
            aria-current={onSettings ? "page" : undefined}
            className={buttonClass("ghost", "sm", cx("w-8 px-0", onSettings ? "text-signal" : "text-ink-muted"))}
          >
            <Icon name={SETTINGS.icon} filled={onSettings} />
          </Link>
          {action && (
            <Link href={action.href} className={buttonClass("secondary", "sm")}>
              {action.label}
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
