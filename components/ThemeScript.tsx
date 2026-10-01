"use client";

import { useLayoutEffect } from "react";

// กติกาเดียวทั้งระบบ (ThemePicker ใช้ตาม): localStorage "theme" = "paper" | "night" | ไม่มี (= ตามเครื่อง)
// ต้องไม่อ้างตัวแปรภายนอก — ฟังก์ชันนี้ถูกแปลงเป็นข้อความไปฝังใน <script> ด้วย
function applyStoredTheme() {
  try {
    let t = localStorage.getItem("theme");
    if (t !== "paper" && t !== "night") t = matchMedia("(prefers-color-scheme: dark)").matches ? "night" : "paper";
    document.documentElement.setAttribute("data-theme", t);
  } catch {
    // localStorage ถูกปิด — ใช้ธีมสว่างของ :root ไป
  }
}

const SCRIPT = `(${applyStoredTheme.toString()})()`;

/**
 * ตั้ง data-theme ก่อนเบราว์เซอร์วาดหน้า (node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md)
 * - โหลดหน้าปกติ: <script> ใน HTML รันระหว่าง parse ก่อน paint
 * - หน้า 401/403/404 ที่โยนตอน render: Next ส่ง error shell แล้ว render root layout ฝั่ง client
 *   <script> จึงไม่รัน และ React ล้าง attribute ของ <html> — useLayoutEffect ตั้งใหม่ก่อน paint
 * ฝั่ง client ใช้ type="text/plain" กัน React เตือนเรื่อง <script> (suppressHydrationWarning รับความต่างของ type)
 */
export function ThemeScript() {
  useLayoutEffect(applyStoredTheme, []);
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: SCRIPT }}
    />
  );
}
