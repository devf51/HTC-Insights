"use client";

import { useSyncExternalStore } from "react";

type Choice = "system" | "paper" | "night";

const OPTIONS: { id: Choice; label: string; hint: string }[] = [
  { id: "system", label: "ตามเครื่อง", hint: "สว่างหรือมืดตามที่ตั้งไว้ในเครื่อง" },
  { id: "paper", label: "สว่าง", hint: "พื้นขาวนวล อ่านง่ายกลางแจ้ง" },
  { id: "night", label: "มืด", hint: "พื้นเทาเข้ม สบายตาตอนกลางคืน" },
];

// กติกาเดียวกับ THEME_SCRIPT ใน app/layout.tsx: เก็บ "paper" | "night", ไม่มีค่า = ตามเครื่อง
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function read(): Choice {
  try {
    const t = localStorage.getItem("theme");
    return t === "paper" || t === "night" ? t : "system";
  } catch {
    return "system";
  }
}

function apply(choice: Choice) {
  try {
    if (choice === "system") localStorage.removeItem("theme");
    else localStorage.setItem("theme", choice);
  } catch {
    // localStorage ถูกปิด (private mode) — ยังเปลี่ยนธีมของหน้านี้ได้ แต่ไม่จำ
  }
  const resolved =
    choice === "system" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "night" : "paper") : choice;
  document.documentElement.setAttribute("data-theme", resolved);
  listeners.forEach((l) => l());
}

export function ThemePicker() {
  // server snapshot = "system" แล้ว React สลับเป็นค่าจริงหลัง hydrate โดยไม่เกิด hydration error
  const choice = useSyncExternalStore(subscribe, read, () => "system" as Choice);
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-3 text-h3">ธีม</legend>
      {OPTIONS.map((o) => (
        <label
          key={o.id}
          className="flex cursor-pointer items-start gap-3 rounded-md border border-line bg-surface-100 p-4 has-[:checked]:border-signal has-[:checked]:bg-signal-tint"
        >
          <input
            type="radio"
            name="theme"
            value={o.id}
            checked={choice === o.id}
            onChange={() => apply(o.id)}
            className="mt-1 size-4 accent-signal"
          />
          <span className="flex flex-col">
            <span className="text-label">{o.label}</span>
            <span className="text-small text-ink-muted">{o.hint}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
