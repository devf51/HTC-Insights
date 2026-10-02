"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui/Button";

const A4_MM = { w: 210, h: 297 };

/**
 * ส่งออก PDF: จับภาพแต่ละแผ่น [data-report-sheet] ด้วย html2canvas แล้ววางเต็มหน้า A4 ของ jsPDF หนึ่งแผ่นต่อหน้า
 * ต้องรอฟอนต์ไทยโหลดครบก่อน ไม่งั้นสระและวรรณยุกต์หาย (CLAUDE.md) · scale 2 ไม่เกินนี้ ไฟล์บวมและค้าง
 * พิมพ์ (window.print) เป็นทางสำรองที่ข้อความคมชัดจริง
 */
export function ReportExport({ filename }: { filename: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function exportPdf() {
    setBusy(true);
    setError(null);
    try {
      await document.fonts.ready;
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const sheets = [...document.querySelectorAll<HTMLElement>("[data-report-sheet]")];
      // แผ่นที่เนื้อหาล้นจะถูกตัดทิ้งเงียบ ๆ ใน PDF — หยุดแล้วบอกแทน
      if (sheets.some((s) => s.scrollHeight > s.clientHeight + 1)) {
        setError("เนื้อหาเกินหน้า A4 ส่งออกแล้วข้อมูลจะขาด แจ้งผู้พัฒนาระบบ");
        setBusy(false);
        return;
      }
      for (const [i, sheet] of sheets.entries()) {
        const canvas = await html2canvas(sheet, { scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false });
        if (i > 0) pdf.addPage();
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, A4_MM.w, A4_MM.h);
      }
      pdf.save(filename);
    } catch {
      setError("ส่งออก PDF ไม่สำเร็จ ลองใช้ปุ่มพิมพ์แล้วเลือกบันทึกเป็น PDF");
    }
    setBusy(false);
  }

  return (
    <div className="no-print flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" icon={<Icon name="picture_as_pdf" />} disabled={busy} onClick={exportPdf}>
          {busy ? "กำลังสร้าง PDF…" : "ส่งออก PDF"}
        </Button>
        <Button variant="secondary" icon={<Icon name="print" />} onClick={() => window.print()}>
          พิมพ์
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-small text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
