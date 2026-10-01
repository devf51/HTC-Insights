import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "sm";

/** ใช้กับ <Link> ที่ต้องหน้าตาเป็นปุ่ม — primary ได้หนึ่งปุ่มต่อหน้าจอ */
export function buttonClass(variant: Variant = "secondary", size: Size = "md", className?: string) {
  return cx("kn-btn", `kn-btn-${variant}`, size === "sm" && "kn-btn-sm", className);
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
}

export function Button({ variant, size, icon, className, children, type = "button", ...rest }: ButtonProps) {
  return (
    <button type={type} className={buttonClass(variant, size, className)} {...rest}>
      {icon}
      {children}
    </button>
  );
}
