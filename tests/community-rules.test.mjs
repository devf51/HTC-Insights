import { test } from "node:test";
import assert from "node:assert/strict";
import {
  POSTS_PER_PAGE,
  POST_TYPE_VALUES,
  bestAnswerError,
  buildCommentTree,
  canView,
  countNodes,
  pageWindow,
  postTypeLabel,
} from "../lib/community-rules.ts";

const at = (min) => new Date(Date.UTC(2026, 9, 2, 0, min));
const cm = (id, extra = {}) => ({ id, parentId: null, status: "APPROVED", userId: "u1", createdAt: at(0), ...extra });
const shape = (nodes) => nodes.map((n) => [n.id, n.depth, shape(n.replies)]);

test("หมวดกระทู้ 4 หมวดตามสเปก", () => {
  assert.deepEqual(POST_TYPE_VALUES, ["QA", "EXPERIENCE", "TIPS", "TEAM"]);
  assert.equal(postTypeLabel("QA"), "ถามตอบ");
  assert.equal(postTypeLabel("NEWS"), "NEWS");
});

test("canView: คนอื่นเห็นเฉพาะ APPROVED เจ้าของเห็นของตัวเองที่รอตรวจ", () => {
  assert.equal(canView({ status: "APPROVED", userId: "a" }, "b"), true);
  assert.equal(canView({ status: "PENDING", userId: "a" }, "a"), true);
  assert.equal(canView({ status: "PENDING", userId: "a" }, "b"), false);
  assert.equal(canView({ status: "REJECTED", userId: "a" }, "a"), false);
});

test("buildCommentTree: ซ้อนตาม parentId เรียงเก่าไปใหม่ และบอกความลึก", () => {
  const rows = [
    cm("b", { createdAt: at(2) }),
    cm("a", { createdAt: at(1) }),
    cm("a1", { parentId: "a", createdAt: at(3) }),
    cm("a1x", { parentId: "a1", createdAt: at(4) }),
  ];
  assert.deepEqual(shape(buildCommentTree(rows, "viewer")), [
    ["a", 0, [["a1", 1, [["a1x", 2, []]]]]],
    ["b", 0, []],
  ]);
});

test("buildCommentTree: ซ่อนที่ถูกปฏิเสธและที่รอตรวจของคนอื่น และตัดคำตอบใต้ต้นทางที่ถูกซ่อนทั้งกิ่ง", () => {
  const rows = [
    cm("ok"),
    cm("rejected", { status: "REJECTED" }),
    cm("underRejected", { parentId: "rejected" }),
    cm("deep", { parentId: "underRejected" }),
    cm("othersPending", { status: "PENDING", userId: "other" }),
    cm("minePending", { status: "PENDING", userId: "me", parentId: "ok" }),
  ];
  assert.deepEqual(shape(buildCommentTree(rows, "me")), [["ok", 0, [["minePending", 1, []]]]]);
  assert.deepEqual(shape(buildCommentTree(rows, "stranger")), [["ok", 0, []]]);
});

test("buildCommentTree เก็บฟิลด์อื่นของแถวไว้ครบ", () => {
  const [node] = buildCommentTree([cm("a", { body: "สวัสดี", likeCount: 3 })], "x");
  assert.equal(node.body, "สวัสดี");
  assert.equal(node.likeCount, 3);
});

test("countNodes นับทุกระดับ", () => {
  const rows = [cm("a"), cm("a1", { parentId: "a" }), cm("a2", { parentId: "a" }), cm("b")];
  assert.equal(countNodes(buildCommentTree(rows, "x")), 4);
  assert.equal(countNodes([]), 0);
});

test("bestAnswerError: เจ้าของกระทู้ถามตอบ เลือกความคิดเห็นที่อนุมัติในกระทู้เดียวกันที่ไม่ใช่ของตัวเอง", () => {
  const post = { id: "p", userId: "owner", type: "QA", status: "APPROVED" };
  const c = { postId: "p", userId: "other", status: "APPROVED" };
  assert.equal(bestAnswerError(post, c, "owner"), null);
  assert.equal(bestAnswerError(post, null, "owner"), null); // ยกเลิกการเลือก
  assert.match(bestAnswerError(post, c, "other"), /เจ้าของกระทู้/);
  assert.match(bestAnswerError({ ...post, type: "TIPS" }, c, "owner"), /ถามตอบ/);
  assert.match(bestAnswerError({ ...post, status: "PENDING" }, c, "owner"), /ยังไม่ผ่าน/);
  assert.match(bestAnswerError(post, { ...c, postId: "q" }, "owner"), /ไม่พบ/);
  assert.match(bestAnswerError(post, { ...c, status: "PENDING" }, "owner"), /ไม่พบ/);
  assert.match(bestAnswerError(post, { ...c, userId: "owner" }, "owner"), /ของตัวเอง/);
});

test("pageWindow: หน้าเกินดึงกลับมาหน้าสุดท้าย ว่าง = หน้า 1 จาก 1", () => {
  assert.deepEqual(pageWindow(1, 0, 20), { page: 1, pageCount: 1, skip: 0, take: 20 });
  assert.deepEqual(pageWindow(9, 45, 20), { page: 3, pageCount: 3, skip: 40, take: 20 });
  assert.deepEqual(pageWindow(2, 45, 20), { page: 2, pageCount: 3, skip: 20, take: 20 });
  assert.deepEqual(pageWindow(0, 45, 20), { page: 1, pageCount: 3, skip: 0, take: 20 });
  assert.equal(POSTS_PER_PAGE, 20);
});
