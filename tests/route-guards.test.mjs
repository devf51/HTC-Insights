import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";

// ตารางสิทธิ์ใน docs/superpowers/specs/2026-10-01-phase1-auth-design.md ส่วนที่ 3
// เทสต์นี้กันไม่ให้ guard หายจาก layout เงียบ ๆ ตอนมีคนแก้หน้า
const GUARDS = {
  "app/insights/layout.tsx": 'requireRole("STUDENT", "ADMIN")',
  "app/community/layout.tsx": 'requireRole("STUDENT", "ADMIN")',
  "app/employer/layout.tsx": 'requireRole("EXTERNAL", "ADMIN")',
  "app/profile/layout.tsx": "requireUser()",
  "app/admin/layout.tsx": "requireAdmin()",
};

test("ทุกส่วนที่ต้องกันสิทธิ์มี layout ที่เรียก guard ถูกตัว", () => {
  const wrong = Object.entries(GUARDS)
    .filter(([file, call]) => !existsSync(file) || !readFileSync(file, "utf8").includes(`await ${call}`))
    .map(([file]) => file);
  assert.deepEqual(wrong, []);
});

test("มีหน้า 401 และ 403", () => {
  assert.ok(existsSync("app/unauthorized.tsx"));
  assert.ok(existsSync("app/forbidden.tsx"));
});

// DAL ทุกไฟล์: ทุก export async function ต้องมีบรรทัด guard ระดับบนสุดของฟังก์ชันหนึ่งบรรทัด
// ยกเว้นฟังก์ชันสาธารณะที่ระบุชื่อไว้ที่นี่ — เพิ่มฟังก์ชันสาธารณะต้องแก้เทสต์นี้ ให้คนรีวิวเห็นทุกครั้ง
const DAL = {
  "lib/companies.ts": [],
  "lib/reviews.ts": [],
  "lib/community.ts": [],
  "lib/jobs.ts": ["listJobs", "getJob"], // เมนูตำแหน่งงานเปิดให้ผู้ที่ยังไม่ล็อกอิน (navFor(null))
  "lib/moderation.ts": [],
  "lib/notifications.ts": [],
  "lib/reports.ts": [],
  "lib/upgrades.ts": [],
  "lib/users.ts": [],
  "lib/dashboard.ts": [],
};
test("ทุกฟังก์ชันใน data access layer เรียก guard เอง — layout ไม่ re-render ตอนเปลี่ยนหน้า", () => {
  for (const [file, publicFns] of Object.entries(DAL)) {
    const src = existsSync(file) ? readFileSync(file, "utf8") : "";
    const fns = src.match(/^export async function \w+/gm) ?? [];
    const guards = src.match(/^ {2}(?:const \w+ = )?await require(?:User|Role|Admin|SuperAdmin)\(/gm)?.length ?? 0;
    assert.ok(fns.length > 0, `ไม่พบฟังก์ชันใน ${file}`);
    for (const name of publicFns) assert.ok(fns.includes(`export async function ${name}`), `${file}: ไม่พบ ${name}`);
    assert.equal(guards, fns.length - publicFns.length, file);
  }
});

test("ทุก Route Handler ใน app/api (ยกเว้น auth ของ Auth.js) เรียก guard เป็นบรรทัดแรก", () => {
  const files = readdirSync("app/api", { recursive: true })
    .map((f) => `app/api/${String(f).replaceAll("\\", "/")}`)
    .filter((f) => f.endsWith("/route.ts") && !f.startsWith("app/api/auth/"));
  assert.ok(files.length > 0, "ไม่พบ Route Handler");
  for (const file of files) {
    const src = readFileSync(file, "utf8");
    const all = src.match(/^export async function (?:GET|POST|PUT|PATCH|DELETE)\b/gm)?.length ?? 0;
    const guarded = src.match(/^export async function (?:GET|POST|PUT|PATCH|DELETE)\b[^\n]*\{\r?\n {2}await require\w+\(/gm)?.length ?? 0;
    assert.ok(all > 0, file);
    assert.equal(guarded, all, file);
  }
});

test("ตัวนับและ query ความคิดเห็นของบอร์ดกรอง APPROVED — บั๊ก v1 ที่พลาดซ้ำสองรอบ", () => {
  const src = readFileSync("lib/community.ts", "utf8");
  // _count ของความคิดเห็นบนการ์ดต้องนับเฉพาะที่อนุมัติ
  assert.match(src, /comments:\s*\{\s*where:\s*APPROVED\s*\}/);
  // ความคิดเห็นในหน้ากระทู้: ที่อนุมัติ หรือที่รอตรวจของผู้ชมเอง เท่านั้น
  assert.match(src, /OR:\s*\[\s*APPROVED,\s*\{\s*status:\s*"PENDING",\s*userId:\s*user\.id\s*\}\s*\]/);
  // ทุก findMany/count ของกระทู้ในบอร์ดสาธารณะใช้ where ที่มี APPROVED
  assert.match(src, /const where = \{\s*\.\.\.APPROVED/);
});

test("ตำแหน่งงานที่สาธารณะเห็นกรอง APPROVED และยังเปิดรับ และไม่ดึงอีเมลบัญชี", () => {
  const src = readFileSync("lib/jobs.ts", "utf8");
  assert.match(src, /const PUBLIC_JOB = \{ status: "APPROVED", isActive: true \} as const/);
  // listJobs (ทั้ง count และ findMany ใช้ where เดียวกัน) + getJob
  assert.equal(src.match(/\.\.\.PUBLIC_JOB/g)?.length, 2);
  // อีเมลที่แสดงคือ contactEmail เท่านั้น — user.email ห้ามออกจากไฟล์นี้
  assert.doesNotMatch(src, /\bemail: true/);
  assert.doesNotMatch(src, /\buser: \{/);
});

test("Notification และ AuditLog ถูกเขียนผ่าน lib/admin.ts เท่านั้น และการกระทำของผู้ดูแลอยู่ในทรานแซกชัน", () => {
  const files = ["lib", "app"]
    .flatMap((d) => readdirSync(d, { recursive: true }).map((f) => `${d}/${String(f).replaceAll("\\", "/")}`))
    .filter((f) => /\.tsx?$/.test(f) && !f.startsWith("app/generated/") && f !== "lib/admin.ts");
  const direct = files.filter((f) => /\.(notification|auditLog)\.(create|createMany|upsert)\(/.test(readFileSync(f, "utf8")));
  assert.deepEqual(direct, []);
  for (const f of ["lib/moderation.ts", "lib/upgrades.ts", "lib/users.ts", "lib/companies.ts"]) {
    const src = readFileSync(f, "utf8");
    assert.match(src, /db\.\$transaction/, f);
    assert.match(src, /await logAdminAction\(tx,/, f);
  }
});

test("แดชบอร์ดเฉพาะ super admin และตัวเลขเนื้อหาสาธารณะกรอง APPROVED", () => {
  const src = readFileSync("lib/dashboard.ts", "utf8");
  assert.match(src, /^ {2}await requireSuperAdmin\(\);/m);
  assert.match(src, /const approvedReviews = \{ \.\.\.created, status: "APPROVED" \} as const/);
  // ความคิดเห็นนับเฉพาะในกระทู้ที่เผยแพร่ (ข้อบังคับ Phase 6b)
  assert.match(src, /post: \{ status: "APPROVED" \}/);
  for (const f of ["app/admin/dashboard/page.tsx", "app/admin/dashboard/report/page.tsx"]) {
    assert.match(existsSync(f) ? readFileSync(f, "utf8") : "", /await requireSuperAdmin\(\)/, f);
  }
});
