"use client";

import { Bar, BarChart, CartesianGrid, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, type YAxisTickContentProps } from "recharts";

// กราฟทั้งหมดของแดชบอร์ดและรายงาน A4 — โหลดผ่าน components/DashboardCharts.tsx (dynamic ssr:false) เท่านั้น
// palette มาจากผู้เรียก: หน้าจอใช้ CSS variable ตามธีม · รายงานใช้ hex ล้วน (html2canvas อ่าน oklch ไม่ออก)

export type ChartPalette = { series: [string, string, string]; ink: string; muted: string; grid: string; surface: string };
// row: ความสูงต่อแถวของแท่งแนวนอน — รายงาน A4 ใช้ค่าต่ำกว่าเพื่อให้ 20 แผนก / 10 บริษัทพอดีแผ่น
type Props<T> = { data: T[]; palette: ChartPalette; animate: boolean; row?: number };

// ป้ายแกนยาวสุดที่รองรับ: "เครื่องทำความเย็นและปรับอากาศ" ≈ 179px ที่ 13px — เผื่อฟอนต์ตอนจับภาพกว้างกว่าที่วัด
const LABEL_W = 196;
// ตัดตามตัวอักษรที่มองเห็น ไม่ตัดสระหรือวรรณยุกต์ออกจากพยัญชนะ
const graphemes = new Intl.Segmenter("th", { granularity: "grapheme" });
const clip = (s: string, n: number) => {
  const g = Array.from(graphemes.segment(s), (x) => x.segment);
  return g.length > n ? `${g.slice(0, n).join("")}…` : s;
};

const ROW = 32;
// ไทยห้ามเล็กกว่า 13px (Kernel)
const tick = (p: ChartPalette) => ({ fill: p.muted, fontSize: 13 });
/**
 * ป้ายแกน Y เป็น <text> บรรทัดเดียว — Text ของ Recharts วัดความกว้างไทยเกินจริงแล้วตัดขึ้นบรรทัดใหม่ทับแถวข้างเคียง
 * (ชื่อบริษัท 169px ในช่อง 196px ก็ยังโดนตัด) ความยาวคุมด้วย LABEL_W และ clip() แทน
 */
function yTick(p: ChartPalette, format: (s: string) => string = (s) => s) {
  return function YTick({ x, y, payload }: YAxisTickContentProps) {
    return (
      <text x={x} y={y} dy="0.355em" textAnchor="end" fill={p.muted} fontSize={13}>
        {format(String(payload.value))}
      </text>
    );
  };
}
const tooltip = (p: ChartPalette) => ({
  // Kernel Tooltip: พื้น ink ตัวอักษรสีพื้น
  contentStyle: { background: p.ink, border: "none", borderRadius: 8, color: p.surface, fontSize: 13 },
  labelStyle: { color: p.surface },
  itemStyle: { color: p.surface },
  cursor: { fill: p.grid, opacity: 0.4 },
});

/** รีวิวที่เผยแพร่ต่อแผนก — แท่งแนวนอน ซีรีส์เดียว */
export function DepartmentChart({ data, palette, animate, row = ROW }: Props<{ label: string; count: number }>) {
  return (
    <ResponsiveContainer width="100%" height={data.length * row + 24}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 0 }}>
        <CartesianGrid horizontal={false} stroke={palette.grid} />
        <XAxis type="number" allowDecimals={false} tick={tick(palette)} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="label" width={LABEL_W} interval={0} tick={yTick(palette)} axisLine={false} tickLine={false} />
        <Tooltip {...tooltip(palette)} formatter={(v) => [`${v} รีวิว`, "จำนวน"]} />
        <Bar dataKey="count" fill={palette.series[0]} radius={[0, 3, 3, 0]} barSize={14} isAnimationActive={animate}>
          <LabelList dataKey="count" position="right" fill={palette.ink} fontSize={13} />
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
        <YAxis type="category" dataKey="label" width={LABEL_W} interval={0} tick={yTick(palette)} axisLine={false} tickLine={false} />
        <Tooltip {...tooltip(palette)} formatter={(v) => [`${v} / 5`, "ค่าเฉลี่ย"]} />
        <Bar dataKey="avg" fill={palette.series[0]} radius={[0, 3, 3, 0]} barSize={16} isAnimationActive={animate}>
          <LabelList dataKey="avg" position="right" fill={palette.ink} fontSize={13} />
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

// ปฏิเสธ = เทาอ่อน + ลายเส้นทแยง ให้แยกจากรอตรวจได้ตอนพิมพ์ขาวดำ · id ตายตัว: หน้าละกราฟเดียว
const HATCH = "approval-hatch";
const hatch = (id: string, p: ChartPalette) => (
  <pattern id={id} width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <rect width={6} height={6} fill={p.series[2]} />
    <line x1={0} y1={0} x2={0} y2={6} stroke={p.muted} strokeWidth={2} />
  </pattern>
);

/**
 * คำอธิบายสีทำเองเป็น SVG ก้อนเดียว — html2canvas วาด SVG ทีละก้อน ลายเส้นที่ประกาศในกราฟไปไม่ถึงไอคอนของ Legend
 * และวางข้อความ HTML ข้างไอคอนต่ำกว่าจริงใน PDF ส่วนข้อความใน SVG (เหมือนชื่อแกน) ตรงเสมอ
 * ช่องละ 80px พอสำหรับชื่อสถานะสามคำนี้ · ข้อความใช้สีตัวอักษร ไม่ใช้สีซีรีส์ (dataviz)
 */
function ApprovalLegend({ palette }: { palette: ChartPalette }) {
  return (
    <svg width={STATUSES.length * 80} height={24} role="img" aria-label={STATUSES.map(([, name]) => name).join(" ")}>
      <defs>{hatch(`${HATCH}-legend`, palette)}</defs>
      {STATUSES.map(([key, name], i) => (
        <g key={key} transform={`translate(${i * 80} 0)`}>
          <rect y={4} width={12} height={12} fill={key === "REJECTED" ? `url(#${HATCH}-legend)` : palette.series[i]} />
          <text x={18} y={10} dominantBaseline="central" fontSize={13} fill={palette.ink}>
            {name}
          </text>
        </g>
      ))}
    </svg>
  );
}

/** สัดส่วนสถานะต่อชนิดเนื้อหา — แท่งซ้อนแนวนอน สามสถานะ เว้น 2px ระหว่างช่วง */
export function ApprovalChart({ data, palette, animate }: Props<{ label: string; APPROVED: number; PENDING: number; REJECTED: number }>) {
  return (
    <ResponsiveContainer width="100%" height={data.length * 44 + 56}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
        <defs>{hatch(HATCH, palette)}</defs>
        <CartesianGrid horizontal={false} stroke={palette.grid} />
        <XAxis type="number" allowDecimals={false} tick={tick(palette)} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="label" width={88} interval={0} tick={yTick(palette)} axisLine={false} tickLine={false} />
        <Tooltip {...tooltip(palette)} />
        <Legend verticalAlign="top" align="left" content={() => <ApprovalLegend palette={palette} />} />
        {STATUSES.map(([key, name], i) => (
          <Bar
            key={key}
            dataKey={key}
            name={name}
            stackId="status"
            fill={key === "REJECTED" ? `url(#${HATCH})` : palette.series[i]}
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
          tick={yTick(palette, (s) => clip(s, 22))}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip {...tooltip(palette)} formatter={(v) => [`${v} รีวิว`, "จำนวน"]} />
        <Bar dataKey="reviews" fill={palette.series[0]} radius={[0, 3, 3, 0]} barSize={14} isAnimationActive={animate}>
          <LabelList dataKey="reviews" position="right" fill={palette.ink} fontSize={13} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
