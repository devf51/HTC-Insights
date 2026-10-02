"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Icon";
import { buttonClass } from "@/components/ui/Button";
import { cx } from "@/lib/cx";
import { SETTINGS, isActive, type NavAction, type NavItem } from "@/lib/nav";

/** แถบบน 64px — ต่ำกว่า 768px ซ่อนลิงก์ (kernel.css) เหลือชื่อแบรนด์ ไอคอนตั้งค่า และปุ่ม */
export function TopNav({ links, action, unread }: { links: NavItem[]; action: NavAction | null; unread: number | null }) {
  const pathname = usePathname();
  const onSettings = isActive(pathname, SETTINGS.href);
  const onBell = isActive(pathname, "/notifications");
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
          {unread !== null && (
            <Link
              href="/notifications"
              aria-label={unread > 0 ? `แจ้งเตือน ยังไม่อ่าน ${unread} รายการ` : "แจ้งเตือน"}
              title="แจ้งเตือน"
              aria-current={onBell ? "page" : undefined}
              className={buttonClass("ghost", "sm", cx("relative w-8 px-0", onBell ? "text-signal" : "text-ink-muted"))}
            >
              <Icon name="notifications" filled={onBell} />
              {unread > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute -right-1 -top-1 min-w-4 rounded-full bg-signal px-1 text-center text-[11px] leading-4 text-surface-000"
                >
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
          )}
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
