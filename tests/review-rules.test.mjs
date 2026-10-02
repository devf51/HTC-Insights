import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_PHOTO_BYTES,
  canEditReview,
  overallScore,
  parseThaiDate,
  periodError,
  photoError,
  splitReviewForm,
  toThaiDateInput,
  workTimeError,
} from "../lib/review-rules.ts";

test("overallScore คือค่าเฉลี่ย 4 ด้าน", () => {
  assert.equal(overallScore({ scoreWork: 4, scoreEnv: 3, scoreMentor: 5, scoreWelfare: 3 }), 3.75);
  assert.equal(overallScore({ scoreWork: 5, scoreEnv: 5, scoreMentor: 5, scoreWelfare: 5 }), 5);
});

test("parseThaiDate: เที่ยงคืนเวลาไทย และปฏิเสธวันที่ที่ JS ปัดเอง", () => {
  assert.equal(parseThaiDate("2026-05-01").toISOString(), "2026-04-30T17:00:00.000Z");
  assert.equal(parseThaiDate("2024-02-29").toISOString(), "2024-02-28T17:00:00.000Z");
  assert.equal(parseThaiDate("2026-02-30"), null);
  assert.equal(parseThaiDate("2026-04-31"), null);
  assert.equal(parseThaiDate("2026-13-01"), null);
  assert.equal(parseThaiDate("01/05/2026"), null);
  assert.equal(parseThaiDate(""), null);
});

test("toThaiDateInput กลับเป็นค่าเดิมของ <input type=date>", () => {
  assert.equal(toThaiDateInput(parseThaiDate("2026-05-01")), "2026-05-01");
  assert.equal(toThaiDateInput(new Date("2026-09-30T20:00:00Z")), "2026-10-01");
});

test("periodError: วันสิ้นสุดก่อนวันเริ่ม และวันเริ่มในอนาคต", () => {
  const now = parseThaiDate("2026-10-02");
  assert.equal(periodError(parseThaiDate("2026-05-01"), parseThaiDate("2026-09-30"), now), null);
  assert.equal(periodError(parseThaiDate("2026-05-01"), parseThaiDate("2026-05-01"), now), null);
  assert.match(periodError(parseThaiDate("2026-09-30"), parseThaiDate("2026-05-01"), now), /ก่อนวันเริ่ม/);
  assert.match(periodError(parseThaiDate("2026-11-01"), parseThaiDate("2027-02-01"), now), /อนาคต/);
  // ยังฝึกอยู่: วันสิ้นสุดในอนาคตได้
  assert.equal(periodError(parseThaiDate("2026-09-01"), parseThaiDate("2027-01-31"), now), null);
});

test("workTimeError: กรอกครบทั้งคู่หรือเว้นทั้งคู่ กะดึกได้", () => {
  assert.equal(workTimeError(null, null), null);
  assert.equal(workTimeError("08:00", "17:00"), null);
  assert.equal(workTimeError("22:00", "06:00"), null);
  assert.match(workTimeError("08:00", null), /ทั้งคู่/);
  assert.match(workTimeError(null, "17:00"), /ทั้งคู่/);
});

test("photoError: จำนวน ชนิด และขนาด", () => {
  const png = { type: "image/png", size: 1000 };
  assert.equal(photoError([]), null);
  assert.equal(photoError([png, { type: "image/webp", size: 1 }]), null);
  assert.match(photoError([png, png, png]), /ไม่เกิน 2/);
  assert.match(photoError([{ type: "image/gif", size: 1 }]), /JPG/);
  assert.match(photoError([{ type: "image/jpeg", size: MAX_PHOTO_BYTES + 1 }]), /5 MB/);
});

test("splitReviewForm: แยกข้อความกับรูป และทิ้งไฟล์ว่างจากช่องที่ไม่ได้เลือกรูป", () => {
  const fd = new FormData();
  fd.append("textWork", "ทดสอบ");
  fd.append("photos", new File([], "", { type: "application/octet-stream" }));
  fd.append("photos", new File([new Uint8Array(3)], "a.png", { type: "image/png" }));
  fd.append("avatar", new File([new Uint8Array(3)], "b.png", { type: "image/png" }));
  const { fields, photos } = splitReviewForm(fd);
  assert.deepEqual(fields, { textWork: "ทดสอบ" });
  assert.equal(photos.length, 1);
  assert.equal(photos[0].name, "a.png");
});

test("canEditReview: เฉพาะเจ้าของ และเฉพาะที่ถูกปฏิเสธ", () => {
  assert.equal(canEditReview({ userId: "u1", status: "REJECTED" }, "u1"), true);
  assert.equal(canEditReview({ userId: "u1", status: "REJECTED" }, "u2"), false);
  assert.equal(canEditReview({ userId: "u1", status: "PENDING" }, "u1"), false);
  assert.equal(canEditReview({ userId: "u1", status: "APPROVED" }, "u1"), false);
});
