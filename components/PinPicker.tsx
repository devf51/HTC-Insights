"use client";

import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import { HAT_YAI } from "./CompanyMapInner";

export type Pin = { lat: number; lng: number };

// ทศนิยม 5 ตำแหน่ง ≈ 1 เมตร พอสำหรับหาทางไปบริษัท
const round5 = (n: number) => Math.round(n * 1e5) / 1e5;

function ClickToPin({ onPick }: { onPick: (p: Pin) => void }) {
  useMapEvents({ click: (e) => onPick({ lat: round5(e.latlng.lat), lng: round5(e.latlng.lng) }) });
  return null;
}

/** แตะบนแผนที่เพื่อปักหมุด — โหลดผ่าน dynamic ssr:false ใน EmployerForm เท่านั้น (Leaflet แตะ window) */
export default function PinPicker({ pin, onPick }: { pin: Pin | null; onPick: (p: Pin) => void }) {
  return (
    <MapContainer center={HAT_YAI} zoom={12} scrollWheelZoom={false} className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickToPin onPick={onPick} />
      {pin && <CircleMarker center={[pin.lat, pin.lng]} radius={9} pathOptions={{ className: "kn-map-pin" }} />}
    </MapContainer>
  );
}
