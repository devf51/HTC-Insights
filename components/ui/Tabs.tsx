"use client";

import { useState, type ReactNode } from "react";
import { cx } from "@/lib/cx";

export interface TabsProps {
  items: { id: string; label: ReactNode }[];
  value?: string;
  defaultValue?: string;
  onChange?: (id: string) => void;
  className?: string;
}

/** แท็บสลับมุมมองในหน้าเดียว — ห่อด้วย div เลื่อนแนวนอนได้ เพราะป้ายไทยหลายแท็บล้น 375px */
export function Tabs({ items, value, defaultValue, onChange, className }: TabsProps) {
  const [own, setOwn] = useState(defaultValue ?? items[0]?.id);
  const selected = value ?? own;
  return (
    <div className={cx("overflow-x-auto", className)}>
      <div className="kn-tabs w-max min-w-full" role="tablist">
        {items.map((it) => (
          <button
            key={it.id}
            type="button"
            role="tab"
            className="kn-tab"
            aria-selected={it.id === selected}
            onClick={() => {
              setOwn(it.id);
              onChange?.(it.id);
            }}
          >
            {it.label}
          </button>
        ))}
      </div>
    </div>
  );
}
