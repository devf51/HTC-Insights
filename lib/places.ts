// ค้นหาสถานที่จาก Google Maps ผ่าน SerpApi — เรียกจากฝั่งเซิร์ฟเวอร์เท่านั้น คีย์อยู่ใน SERPAPI_KEY (ห้าม NEXT_PUBLIC_)
// ไม่มีคีย์ = ปิดฟีเจอร์เงียบ ๆ คืนผลว่าง ฟอร์มรีวิวส่วนอื่นยังใช้ได้
// ไฟล์นี้ไม่ import อะไร — tests/places.test.mjs import ตรงด้วย Node

export type Place = {
  placeId: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  website: string | null;
};

type SerpPlace = {
  place_id?: unknown;
  title?: unknown;
  address?: unknown;
  phone?: unknown;
  website?: unknown;
  gps_coordinates?: { latitude?: unknown; longitude?: unknown };
};

const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

export const placesEnabled = () => Boolean(process.env.SERPAPI_KEY);

/** ผลจาก engine=google_maps — แถวที่ไม่มี place_id หรือชื่อถูกข้าม (ไม่มี place_id กันสร้างบริษัทซ้ำไม่ได้) */
export function parsePlaces(json: unknown): Place[] {
  const j = (json ?? {}) as { local_results?: unknown; place_results?: unknown };
  const list: unknown[] = Array.isArray(j.local_results) ? j.local_results : j.place_results ? [j.place_results] : [];
  return list.flatMap((raw) => {
    const r = (raw ?? {}) as SerpPlace;
    const placeId = text(r.place_id);
    const name = text(r.title);
    if (!placeId || !name) return [];
    const gps = r.gps_coordinates;
    return [
      {
        placeId,
        name,
        address: text(r.address),
        lat: num(gps?.latitude),
        lng: num(gps?.longitude),
        phone: text(r.phone),
        website: text(r.website),
      },
    ];
  });
}

const HAT_YAI = "@7.0084,100.4767,12z";
const TTL_MS = 24 * 60 * 60 * 1000;
// ponytail: แคชในหน่วยความจำของ process เดียว (เซิร์ฟเวอร์เครื่องเดียว) ล้างทั้งก้อนเมื่อเกิน 500 คำค้น
// ประหยัดโควตา SerpApi และทำให้ findPlace ตอนส่งฟอร์มได้ผลเดียวกับที่ผู้ใช้เห็นตอนเลือก
const cache = new Map<string, { at: number; places: Place[] }>();

export async function searchPlaces(q: string): Promise<Place[]> {
  const key = process.env.SERPAPI_KEY;
  const query = q.trim().toLowerCase();
  if (!key || query.length < 2) return [];
  const hit = cache.get(query);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.places;

  const params = new URLSearchParams({ engine: "google_maps", type: "search", q: q.trim(), ll: HAT_YAI, hl: "th", gl: "th", api_key: key });
  try {
    const res = await fetch(`https://serpapi.com/search.json?${params}`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    // ห้าม log URL หรือ res.url — มี api_key อยู่ใน query string
    if (!res.ok) {
      console.error("SerpApi status", res.status);
      return [];
    }
    const places = parsePlaces(await res.json());
    if (cache.size >= 500) cache.clear();
    cache.set(query, { at: Date.now(), places });
    return places;
  } catch (e) {
    console.error("SerpApi error", e instanceof Error ? e.name : "unknown");
    return [];
  }
}

/** หาสถานที่ที่ผู้ใช้เลือกจากผลค้นหาเดิม — ไม่เชื่อชื่อ/พิกัดที่ client ส่งมา */
export async function findPlace(q: string, placeId: string): Promise<Place | null> {
  return (await searchPlaces(q)).find((p) => p.placeId === placeId) ?? null;
}
