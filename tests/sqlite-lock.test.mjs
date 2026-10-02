import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { serializedAdapter } from "../lib/sqlite-lock.ts";

// การเขียนนอกทรานแซกชันต้องไม่หายเมื่อทรานแซกชันที่เปิดค้างอยู่ rollback (คำขออื่นได้คำตอบว่าสำเร็จไปแล้ว)
const sql = (s) => ({ sql: s, args: [], argTypes: [] });

async function writeDuringRollback(wrap) {
  const dir = mkdtempSync(join(tmpdir(), "sqlite-lock-"));
  const factory = new PrismaBetterSqlite3({ url: `file:${join(dir, "t.db")}` });
  const db = await (wrap ? serializedAdapter(factory) : factory).connect();
  try {
    await db.executeScript("CREATE TABLE t (id INTEGER)");
    const tx = await db.startTransaction();
    await tx.queryRaw(sql("SELECT count(*) FROM t"));
    // คำขออื่นเขียนระหว่างทรานแซกชันยังเปิด — ไม่ await ก่อน rollback เหมือนสองคำขอที่วิ่งพร้อมกัน
    const other = db.executeRaw(sql("INSERT INTO t VALUES (1)"));
    await new Promise((r) => setTimeout(r, 20));
    await tx.executeRaw(sql("ROLLBACK"));
    await tx.rollback();
    await other;
    const res = await db.queryRaw(sql("SELECT count(*) AS n FROM t"));
    return Number(res.rows[0][0]);
  } finally {
    await db.dispose();
    rmSync(dir, { recursive: true, force: true });
  }
}

test("adapter เดิม: การเขียนของคำขออื่นหายไปกับ rollback (เหตุผลที่ต้องมี lib/sqlite-lock.ts)", async () => {
  assert.equal(await writeDuringRollback(false), 0);
});

test("serializedAdapter: การเขียนของคำขออื่นรอทรานแซกชันปิดก่อน ไม่หาย", async () => {
  assert.equal(await writeDuringRollback(true), 1);
});
