"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonClass } from "@/components/ui/Button";
import { isActive, type NavAction, type NavItem } from "@/lib/nav";

/** แถบบน 64px — ต่ำกว่า 768px ซ่อนลิงก์ (kernel.css) เหลือชื่อแบรนด์และปุ่ม */
export function TopNav({ links, action }: { links: NavItem[]; action: NavAction | null }) {
  const pathname = usePathname();
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
        {action && (
          <Link href={action.href} className={buttonClass("secondary", "sm", "ml-auto")}>
            {action.label}
          </Link>
        )}
      </nav>
    </header>
  );
}
