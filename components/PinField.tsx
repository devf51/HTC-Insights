"use client";

import dynamic from "next/dynamic";
import { Icon } from "@/components/Icon";
import type { Pin } from "@/components/PinPicker";
import { Button } from "@/components/ui/Button";

// Leaflet แตะ window ตอน import — ssr: false ใช้ได้เฉพาะใน client component
const PinPicker = dynamic(() => import("./PinPicker"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-surface-200" />,
});

/** ช่องปักหมุดที่ตั้งสถานประกอบการ — ฟอร์มลงทะเบียนผู้ประกอบการและฟอร์มรีวิว (เพิ่มบริษัทใหม่) */
export function PinField({ label, hint, pin, onPick }: { label: string; hint: string; pin: Pin | null; onPick: (p: Pin | null) => void }) {
  return (
    <div className="kn-field">
      <span className="kn-field-label">{label}</span>
      {/* isolate: z-index ของ Leaflet ต้องอยู่ใต้ TopNav/BottomNav */}
      <div className="isolate h-64 overflow-hidden rounded-lg border border-line">
        <PinPicker pin={pin} onPick={onPick} />
      </div>
      <p className="kn-field-hint">{pin ? `ปักหมุดแล้วที่ ${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)} แตะจุดอื่นเพื่อย้าย` : hint}</p>
      {pin && (
        <div>
          <Button size="sm" variant="ghost" icon={<Icon name="close" />} onClick={() => onPick(null)}>
            ลบหมุด
          </Button>
        </div>
      )}
    </div>
  );
}
