import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AUDIT_PER_PAGE,
  REPORT_KIND_VALUES,
  CASCADE_REASON,
  CONTENT_KIND_VALUES,
  actionLabel,
  commentApproveError,
  commentSubtree,
  decisionNotice,
  excerpt,
  kindLabel,
  reportActionError,
  reportNotice,
  reportTarget,
  targetLabel,
} from "../lib/moderation-rules.ts";

test("ชนิดเนื้อหาที่ผ่านการคัดกรอง", () => {
  assert.deepEqual(CONTENT_KIND_VALUES, ["review", "post", "comment", "job"]);
  assert.equal(kindLabel("job"), "ประกาศงาน");
  assert.equal(kindLabel("x"), "x");
  assert.equal(AUDIT_PER_PAGE, 50);
});

test("excerpt ตัดข้อความยาวและเติม …", () => {
  assert.equal(excerpt("สั้น"), "สั้น");
  assert.equal(excerpt("ก".repeat(45)), "ก".repeat(40) + "…");
  assert.equal(excerpt("  มีช่องว่าง\nขึ้นบรรทัด  "), "มีช่องว่าง ขึ้นบรรทัด");
});

test("commentSubtree คืนต้นทางและคำตอบทุกชั้น ไม่รวมกิ่งอื่น", () => {
  const rows = [
    { id: "a", parentId: null },
    { id: "a1", parentId: "a" },
    { id: "a1x", parentId: "a1" },
    { id: "a2", parentId: "a" },
    { id: "b", parentId: null },
    { id: "b1", parentId: "b" },
  ];
  assert.deepEqual(commentSubtree(rows, "a").sort(), ["a", "a1", "a1x", "a2"]);
  assert.deepEqual(commentSubtree(rows, "b1"), ["b1"]);
  assert.deepEqual(commentSubtree(rows, "missing"), ["missing"]);
});

test("commentApproveError: กระทู้และต้นทางต้องเผยแพร่แล้ว", () => {
  assert.equal(commentApproveError({ postStatus: "APPROVED", parentStatus: null }), null);
  assert.equal(commentApproveError({ postStatus: "APPROVED", parentStatus: "APPROVED" }), null);
  assert.match(commentApproveError({ postStatus: "PENDING", parentStatus: null }), /กระทู้/);
  assert.match(commentApproveError({ postStatus: "APPROVED", parentStatus: "REJECTED" }), /ต้นทาง/);
  assert.match(commentApproveError({ postStatus: "APPROVED", parentStatus: "PENDING" }), /ต้นทาง/);
});

test("decisionNotice: ข้อความมีชื่อเนื้อหาและเหตุผล ลิงก์พาไปที่ทำต่อได้", () => {
  const review = { kind: "review", id: "r1", title: "บริษัท ก", companyId: "c1" };
  assert.deepEqual(decisionNotice(review, "APPROVED", null), {
    type: "review_approved",
    message: 'รีวิว "บริษัท ก" ผ่านการตรวจและเผยแพร่แล้ว',
    link: "/insights/c1",
  });
  const rej = decisionNotice(review, "REJECTED", "ข้อมูลไม่ครบ");
  assert.equal(rej.type, "review_rejected");
  assert.equal(rej.message, 'รีวิว "บริษัท ก" ไม่ผ่านการตรวจ เหตุผล: ข้อมูลไม่ครบ');
  assert.equal(rej.link, "/insights/write-review?edit=r1");
  assert.equal(decisionNotice({ kind: "post", id: "p1", title: "t" }, "APPROVED", null).link, "/community/p1");
  assert.equal(decisionNotice({ kind: "post", id: "p1", title: "t" }, "REJECTED", "x x x").link, "/profile");
  assert.equal(decisionNotice({ kind: "comment", id: "c9", title: "t", postId: "p1" }, "REJECTED", "x x x").link, "/community/p1");
  assert.equal(decisionNotice({ kind: "job", id: "j1", title: "t" }, "APPROVED", null).link, "/jobs/j1");
  assert.equal(decisionNotice({ kind: "job", id: "j1", title: "t" }, "REJECTED", "x x x").link, "/profile");
  assert.equal(CASCADE_REASON, "ความคิดเห็นต้นทางถูกปฏิเสธ");
});

test("actionLabel แปลงชื่อการกระทำในประวัติเป็นภาษาไทย", () => {
  assert.equal(actionLabel("approve_review"), "อนุมัติรีวิว");
  assert.equal(actionLabel("reject_comment"), "ปฏิเสธความคิดเห็น");
  assert.equal(actionLabel("toggle_ban_user"), "toggle_ban_user");
});

test("ข้อร้องเรียน: ชนิด เป้าหมาย และข้อห้าม", () => {
  assert.deepEqual(REPORT_KIND_VALUES, ["review", "post", "comment", "job", "company"]);
  const row = { reviewId: null, postId: null, commentId: "c1", jobId: null, companyId: null };
  assert.deepEqual(reportTarget(row), { kind: "comment", id: "c1" });
  assert.equal(reportTarget({ ...row, commentId: null }), null);
  assert.ok(reportActionError("company", "withdraw"));
  assert.equal(reportActionError("company", "resolve"), null);
  assert.equal(reportActionError("review", "withdraw"), null);
});

test("ข้อความแจ้งผู้รายงาน", () => {
  assert.deepEqual(reportNotice("review", "withdraw", "ข้อมูลเท็จ"), {
    type: "report_withdraw",
    message: "รายงานรีวิวของคุณได้รับการตรวจแล้ว ผู้ดูแลถอนเนื้อหานั้นออก: ข้อมูลเท็จ",
    link: null,
  });
  assert.match(reportNotice("company", "resolve", "แก้ลิงก์แล้ว").message, /^รายงานสถานประกอบการของคุณได้รับการจัดการแล้ว/);
  assert.match(reportNotice("post", "dismiss", "ไม่ผิดกฎ").message, /ไม่พบการละเมิดกฎ/);
});

test("ชื่อเป้าหมายและการกระทำในประวัติ", () => {
  assert.equal(targetLabel("user"), "บัญชี");
  assert.equal(targetLabel("comment"), "ความคิดเห็น");
  assert.equal(actionLabel("change_role"), "เปลี่ยนบทบาท");
  assert.equal(actionLabel("withdraw_report"), "ถอนเนื้อหาตามข้อร้องเรียน");
  assert.equal(actionLabel("approve_upgrade"), "อนุมัติคำขอยืนยันสิทธิ์");
  assert.equal(actionLabel("constructor"), "constructor");
});
