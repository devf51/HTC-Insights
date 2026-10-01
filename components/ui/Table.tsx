import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

export interface TableProps {
  lang?: string;
  /** numeric: ชิดขวา ใช้ตัวเลขความกว้างเท่ากัน */
  columns: { key: string; label: ReactNode; numeric?: boolean }[];
  rows: Record<string, ReactNode>[];
  className?: string;
}

export function Table({ lang, columns, rows, className }: TableProps) {
  return (
    <div lang={lang} className={cx("kn-table-wrap", className)}>
      <table className="kn-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={c.numeric ? "kn-right" : undefined}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={String(r.id ?? i)}>
              {columns.map((c) => (
                <td key={c.key} className={c.numeric ? "kn-right" : undefined}>
                  {r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
