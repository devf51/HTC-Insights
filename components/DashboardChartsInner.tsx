"use client";

import { Bar, BarChart, CartesianGrid, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// กราฟทั้งหมดของแดชบอร์ดและรายงาน A4 — โหลดผ่าน components/DashboardCharts.tsx (dynamic ssr:false) เท่านั้น
// palette มาจากผู้เรียก: หน้าจอใช้ CSS variable ตามธีม · รายงานใช้ hex ล้วน (html2canvas อ่าน oklch ไม่ออก)

export type ChartPalette = { series: [string, string, string]; ink: string; muted: string; grid: string; surface: string };
// row: ความสูงต่อแถวของแท่งแนวนอน — รายงาน A4 ใช้ค่าต่ำกว่าเพื่อให้ 18 แผนก / 10 บริษัทพอดีแผ่น
type Props<T> = { data: T[]; palette: ChartPalette; animate: boolean; row?: number };

// ป้ายแกนยาวสุดที่รองรับ: "เครื่องทำความเย็นและปรับอากาศ" ≈ 165px ที่ 12px
const LABEL_W = 180;
// ตัดตามตัวอักษรที่มองเห็น ไม่ตัดสระหรือวรรณยุกต์ออกจากพยัญชนะ
const graphemes = new Intl.Segmenter("th", { granularity: "grapheme" });
const clip = (s: string, n: number) => {
  const g = Array.from(graphemes.segment(s), (x) => x.segment);
  return g.length > n ? `${g.slice(0, n).join("")}…` : s;
};

const ROW = 32;
const tick = (p: ChartPalette) => ({ fill: p.muted, fontSize: 12 });
const tooltip = (p: ChartPalette) => ({
  contentStyle: { background: p.surface, border: `1px solid ${p.grid}`, borderRadius: 8, color: p.ink, fontSize: 13 },
  labelStyle: { color: p.ink },
  itemStyle: { color: p.ink },
  cursor: { fill: p.grid, opacity: 0.4 },
});

/** รีวิวที่เผยแพร่ต่อแผนก — แท่งแนวนอน ซีรีส์เดียว */
export function DepartmentChart({ data, palette, animate, row = ROW }: Props<{ label: string; count: number }>) {
  return (
    <ResponsiveContainer width="100%" height={data.length * row + 24}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 0 }}>
        <CartesianGrid horizontal={false} stroke={palette.grid} />
        <XAxis type="number" allowDecimals={false} tick={tick(palette)} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="label" width={LABEL_W} interval={0} tick={tick(palette)} axisLine={false} tickLine={false} />
        <Tooltip {...tooltip(palette)} formatter={(v) => [`${v} รีวิว`, "จำนวน"]} />
        <Bar dataKey="count" fill={palette.series[0]} radius={[0, 4, 4, 0]} barSize={14} isAnimationActive={animate}>
          <LabelList dataKey="count" position="right" fill={palette.ink} fontSize={12} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** ค่าเฉลี่ย 4 ด้าน (เต็ม 5) — แท่งแนวนอน ซีรีส์เดียว ป้ายด้านยาวอ่านได้ทุกความกว้างจอ */
export function DimensionChart({ data, palette, animate }: Props<{ label: string; avg: number | null }>) {
  return (
    <ResponsiveContainer width="100%" height={data.length * 40 + 24}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 0 }}>
        <CartesianGrid horizontal={false} stroke={palette.grid} />
        <XAxis type="number" domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} tick={tick(palette)} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="label" width={LABEL_W} interval={0} tick={tick(palette)} axisLine={false} tickLine={false} />
        <Tooltip {...tooltip(palette)} formatter={(v) => [`${v} / 5`, "ค่าเฉลี่ย"]} />
        <Bar dataKey="avg" fill={palette.series[0]} radius={[0, 4, 4, 0]} barSize={16} isAnimationActive={animate}>
          <LabelList dataKey="avg" position="right" fill={palette.ink} fontSize={12} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

const STATUSES = [
  ["APPROVED", "อนุมัติ"],
  ["PENDING", "รอตรวจ"],
  ["REJECTED", "ปฏิเสธ"],
] as const;

/** สัดส่วนสถานะต่อชนิดเนื้อหา — แท่งซ้อนแนวนอน สามสถานะ เว้น 2px ระหว่างช่วง */
export function ApprovalChart({ data, palette, animate }: Props<{ label: string; APPROVED: number; PENDING: number; REJECTED: number }>) {
  return (
    <ResponsiveContainer width="100%" height={data.length * 44 + 56}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid horizontal={false} stroke={palette.grid} />
        <XAxis type="number" allowDecimals={false} tick={tick(palette)} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="label" width={88} interval={0} tick={tick(palette)} axisLine={false} tickLine={false} />
        <Tooltip {...tooltip(palette)} />
        {/* ข้อความใช้สีตัวอักษร ไม่ใช้สีซีรีส์ (dataviz) */}
        <Legend wrapperStyle={{ fontSize: 13 }} itemSorter="dataKey" formatter={(v) => <span style={{ color: palette.ink }}>{v}</span>} />
        {STATUSES.map(([key, name], i) => (
          <Bar
            key={key}
            dataKey={key}
            name={name}
            stackId="status"
            fill={palette.series[i]}
            stroke={palette.surface}
            strokeWidth={2}
            barSize={18}
            isAnimationActive={animate}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/** บริษัทยอดนิยม — จำนวนรีวิวที่เผยแพร่ แท่งแนวนอน ซีรีส์เดียว */
export function TopCompanyChart({ data, palette, animate, row = ROW }: Props<{ name: string; reviews: number }>) {
  return (
    <ResponsiveContainer width="100%" height={data.length * row + 24}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 0 }}>
        <CartesianGrid horizontal={false} stroke={palette.grid} />
        <XAxis type="number" allowDecimals={false} tick={tick(palette)} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={LABEL_W}
          interval={0}
          tick={tick(palette)}
          axisLine={false}
          tickLine={false}
          tickFormatter={(s: string) => clip(s, 22)}
        />
        <Tooltip {...tooltip(palette)} formatter={(v) => [`${v} รีวิว`, "จำนวน"]} />
        <Bar dataKey="reviews" fill={palette.series[0]} radius={[0, 4, 4, 0]} barSize={14} isAnimationActive={animate}>
          <LabelList dataKey="reviews" position="right" fill={palette.ink} fontSize={12} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
