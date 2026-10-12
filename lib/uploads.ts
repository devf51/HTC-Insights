import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { UserError } from "./http.ts";

// รูปเก็บบนดิสก์เซิร์ฟเวอร์ (deploy บนเซิร์ฟเวอร์ที่มีดิสก์ถาวรอยู่แล้วเพราะ SQLite) — สำรองโฟลเดอร์นี้คู่กับไฟล์ .db
// อยู่นอก public/ เสมอ: ส่งผ่าน app/api/files/ ที่มี guard — รูปบัตรนักศึกษาเปิดได้เฉพาะผู้ดูแล

export type UploadKind = "reviews" | "cards";

// turbopackIgnore: path มาจาก env ตอนรัน ไม่ใช่ไฟล์ซอร์ส — ไม่งั้น build trace ทั้งโปรเจกต์ (รวมรูปที่อัปโหลด) เข้า output
const root = () => path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR || "uploads");
// ชื่อไฟล์สร้างเองทั้งหมด — รูปแบบตายตัวกัน path traversal ตอนอ่านกลับ
const FILE_NAME = /^[0-9a-f-]{36}\.webp$/;

/**
 * เขียนรูปใหม่ทั้งไฟล์เป็น WEBP ด้านยาวไม่เกิน 1600px คืน URL ที่ใช้แสดง
 * sharp อ่านเนื้อไฟล์จริง — photoError ดูแค่ MIME ที่ client บอก ส่ง SVG แอบอ้างเป็น PNG ได้ (OWASP A08)
 * เขียนใหม่ทั้งไฟล์ = ตัด EXIF ทิ้ง รวมพิกัด GPS จากรูปมือถือ
 */
export async function saveImage(file: File, kind: UploadKind): Promise<string> {
  const input = Buffer.from(await file.arrayBuffer());
  const format = await sharp(input)
    .metadata()
    .then((m) => m.format)
    .catch(() => null);
  if (format !== "jpeg" && format !== "png" && format !== "webp") throw new UserError(400, "รองรับเฉพาะรูป JPG PNG และ WEBP");
  // rotate(): หมุนตาม EXIF ก่อนตัดทิ้ง ไม่งั้นรูปแนวตั้งจากมือถือนอนตะแคง
  const out = await sharp(input).rotate().resize(1600, 1600, { fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
  const name = `${randomUUID()}.webp`;
  await mkdir(/*turbopackIgnore: true*/ path.join(root(), kind), { recursive: true });
  await writeFile(/*turbopackIgnore: true*/ path.join(root(), kind, name), out);
  return `/api/files/${kind}/${name}`;
}

/** null = ไม่มีไฟล์ หรือชื่อผิดรูปแบบ */
export async function readImage(kind: UploadKind, name: string): Promise<Buffer | null> {
  if (!FILE_NAME.test(name)) return null;
  return readFile(/*turbopackIgnore: true*/ path.join(root(), kind, name)).catch(() => null);
}
