// ไฟล์นี้ต้อง pure — ไฟล์ pure อื่นและเทสต์ import ตรงด้วย Node
// เวลาไทยทั้งระบบ (บทเรียน v1 "เวลาเพี้ยน") — ทุกหน้าจัดรูปแบบวันที่ผ่านที่นี่ th-TH แสดงปี พ.ศ.

const TZ = "Asia/Bangkok";

export const thaiDate = (d: Date, month: "short" | "long" = "short") =>
  d.toLocaleDateString("th-TH", { day: "numeric", month, year: "numeric", timeZone: TZ });

export const thaiDateTime = (d: Date, month: "short" | "long" = "short") =>
  d.toLocaleString("th-TH", { day: "numeric", month, year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: TZ });

export const thaiMonthYear = (d: Date) => d.toLocaleDateString("th-TH", { month: "short", year: "numeric", timeZone: TZ });
