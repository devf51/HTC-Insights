"use client";

import dynamic from "next/dynamic";
import type { ChartPalette } from "./DashboardChartsInner";

// Recharts แตะ window — ssr: false ใช้ได้เฉพาะใน client component (CLAUDE.md)
const loading = () => <div className="h-40 w-full rounded-md bg-surface-200" />;
export const DepartmentChart = dynamic(() => import("./DashboardChartsInner").then((m) => m.DepartmentChart), { ssr: false, loading });
export const DimensionChart = dynamic(() => import("./DashboardChartsInner").then((m) => m.DimensionChart), { ssr: false, loading });
export const ApprovalChart = dynamic(() => import("./DashboardChartsInner").then((m) => m.ApprovalChart), { ssr: false, loading });
export const TopCompanyChart = dynamic(() => import("./DashboardChartsInner").then((m) => m.TopCompanyChart), { ssr: false, loading });

/** หน้าจอ: ตามธีมผ่าน CSS variable */
export const SCREEN_PALETTE: ChartPalette = {
  series: ["var(--viz-1)", "var(--viz-2)", "var(--viz-3)"],
  ink: "var(--ink)",
  muted: "var(--ink-muted)",
  grid: "var(--line)",
  surface: "var(--surface-100)",
};

/** รายงาน A4: hex ล้วน พื้นขาวเสมอ — ค่าเดียวกับธีมสว่าง */
export const PRINT_PALETTE: ChartPalette = {
  series: ["#2a78d6", "#eb6834", "#1baf7a"],
  ink: "#15181b",
  muted: "#565b60",
  grid: "#d9dbd5",
  surface: "#ffffff",
};
