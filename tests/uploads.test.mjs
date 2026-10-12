import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";

process.env.UPLOAD_DIR = mkdtempSync(path.join(tmpdir(), "htc-uploads-"));
const { readImage, saveImage } = await import("../lib/uploads.ts");

const file = (bytes, type) => new File([bytes], "x", { type });

test("saveImage: ย่อเหลือ 1600px เป็น WEBP และตัด EXIF (พิกัด GPS) ทิ้ง", async () => {
  const jpg = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: "#888" } })
    .jpeg()
    .withExif({ IFD0: { Make: "PhoneCo" } })
    .toBuffer();
  assert.ok((await sharp(jpg).metadata()).exif, "รูปทดสอบต้องมี EXIF");
  const url = await saveImage(file(jpg, "image/jpeg"), "reviews");
  assert.match(url, /^\/api\/files\/reviews\/[0-9a-f-]{36}\.webp$/);
  const saved = readFileSync(path.join(process.env.UPLOAD_DIR, "reviews", url.split("/").pop()));
  const m = await sharp(saved).metadata();
  assert.equal(m.format, "webp");
  assert.equal(Math.max(m.width, m.height), 1600);
  assert.equal(m.exif, undefined);
});

test("saveImage: ไฟล์ที่ไม่ใช่ JPG PNG WEBP ถูกปฏิเสธแม้ MIME บอกว่าเป็นรูป", async () => {
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><script>alert(1)</script></svg>');
  await assert.rejects(saveImage(file(svg, "image/png"), "cards"), { status: 400 });
  await assert.rejects(saveImage(file(Buffer.from("not an image"), "image/jpeg"), "cards"), { status: 400 });
});

test("readImage: ชื่อไฟล์นอกรูปแบบ (path traversal) คืน null", async () => {
  assert.equal(await readImage("cards", "../../prisma/dev.db"), null);
  assert.equal(await readImage("cards", "00000000-0000-4000-8000-000000000009.webp"), null);
});
