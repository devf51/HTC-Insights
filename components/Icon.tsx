import { cx } from "@/lib/cx";

/** Material Symbols Outlined — name คือชื่อไอคอน เช่น "home" ดูได้ที่ fonts.google.com/icons */
export function Icon({ name, filled, className }: { name: string; filled?: boolean; className?: string }) {
  return (
    <span aria-hidden="true" className={cx("material-symbols-outlined", filled && "icon-fill", className)}>
      {name}
    </span>
  );
}
