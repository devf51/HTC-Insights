"use client";

import dynamic from "next/dynamic";
import type { MapPin } from "@/lib/company-rules";
import { cx } from "@/lib/cx";

// Leaflet แตะ window ตอน import — ssr: false ใช้ได้เฉพาะใน client component
const CompanyMapInner = dynamic(() => import("./CompanyMapInner"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-surface-200" />,
});

/** isolate: z-index ของ Leaflet (400–1000) ต้องอยู่ใต้ TopNav/BottomNav (z-40) — v1 เคยแถบล่างหาย */
export function CompanyMap({ pins, className }: { pins: MapPin[]; className?: string }) {
  return (
    <div className={cx("isolate overflow-hidden rounded-lg border border-line", className)}>
      <CompanyMapInner pins={pins} />
    </div>
  );
}
