"use client";

import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import type { MapPin } from "@/lib/company-rules";

export const HAT_YAI: [number, number] = [7.0084, 100.4767];

/** CircleMarker เป็น SVG — ไม่ต้องมีไฟล์รูปหมุด (รูปหมุด default ของ Leaflet พังเมื่อผ่าน bundler) */
export default function CompanyMapInner({ pins }: { pins: MapPin[] }) {
  const single = pins.length === 1 ? pins[0] : null;
  return (
    <MapContainer
      // props ของ MapContainer ไม่อัปเดตหลัง mount — key ให้สร้างใหม่เมื่อชุดหมุดเปลี่ยนตามตัวกรอง
      key={pins.map((p) => p.id).join()}
      center={single ? [single.lat, single.lng] : HAT_YAI}
      zoom={single ? 15 : 12}
      bounds={pins.length > 1 ? pins.map((p) => [p.lat, p.lng] as [number, number]) : undefined}
      boundsOptions={{ padding: [32, 32], maxZoom: 15 }}
      scrollWheelZoom={false}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {pins.map((p) => (
        <CircleMarker key={p.id} center={[p.lat, p.lng]} radius={9} pathOptions={{ className: "kn-map-pin" }}>
          <Popup>
            <Link href={`/insights/${p.id}`}>{p.name}</Link>
            {p.avgScore !== null && ` · ${p.avgScore.toFixed(1)}`}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
