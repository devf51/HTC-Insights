// ข้อมูลตัวอย่างสำหรับเครื่อง dev — `npx prisma db seed` (ตั้งไว้ใน prisma.config.ts)
// รันซ้ำได้: upsert ด้วย id คงที่ขึ้นต้น seed_ · ชื่อบริษัทเป็นชื่อสมมติทั้งหมด
// สร้าง PrismaClient เองเพราะ jiti (ตัวรัน .ts ที่มากับ prisma) ไม่รู้จัก alias @/ ที่ lib/db.ts ใช้
// โค้ดแอปยังใช้ db จาก lib/db.ts เท่านั้น
import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient, type ContentStatus, type PostType } from "../app/generated/prisma/client";

if (process.env.NODE_ENV === "production") throw new Error("ห้าม seed ข้อมูลตัวอย่างบนเซิร์ฟเวอร์จริง");
if (process.env.DATABASE_URL !== "file:./prisma/dev.db") throw new Error("seed ใช้กับฐานข้อมูล dev (file:./prisma/dev.db) เท่านั้น");

const db = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! }) });

const USERS = [1, 2, 3, 4].map((n) => ({
  id: `seed_u${n}`,
  email: `seed-${n}@example.invalid`,
  name: `ผู้ทดสอบ ${n}`,
  role: "STUDENT" as const,
}));

const COMPANIES = [
  { id: "seed_c1", name: "บริษัท หาดใหญ่ออโต้เซอร์วิส จำกัด", industry: "ซ่อมบำรุงรถยนต์", address: "ถ.เพชรเกษม อ.หาดใหญ่ จ.สงขลา", lat: 7.0067, lng: 100.471, phone: "074-000-001", website: "https://example.com", isVerified: true },
  { id: "seed_c2", name: "บริษัท สงขลาไอทีโซลูชั่น จำกัด", industry: "เทคโนโลยีสารสนเทศ", address: "ถ.นิพัทธ์อุทิศ 3 อ.หาดใหญ่", lat: 7.0089, lng: 100.4745, phone: null, website: "javascript:alert(1)", isVerified: false },
  { id: "seed_c3", name: "ห้างหุ้นส่วนจำกัด ควนลังการไฟฟ้า", industry: "ติดตั้งระบบไฟฟ้า", address: "ต.ควนลัง อ.หาดใหญ่", lat: 6.9853, lng: 100.4489, phone: null, website: null, isVerified: false },
  { id: "seed_c4", name: "บริษัท ทักษิณโลจิสติกส์ จำกัด", industry: "โลจิสติกส์", address: "ถ.กาญจนวนิช อ.หาดใหญ่", lat: 7.0301, lng: 100.4812, phone: "074-000-004", website: "www.example.org", isVerified: true },
  { id: "seed_c5", name: "บริษัท หาดใหญ่ซีเอ็นซี จำกัด", industry: "งานกลึงและซีเอ็นซี", address: null, lat: null, lng: null, phone: null, website: null, isVerified: false },
  { id: "seed_c6", name: "บริษัท คอหงส์อิเล็กทรอนิกส์ จำกัด", industry: "ซ่อมอุปกรณ์อิเล็กทรอนิกส์", address: "ต.คอหงส์ อ.หาดใหญ่", lat: 7.0176, lng: 100.5021, phone: null, website: null, isVerified: false },
];

type SeedReview = {
  id: string;
  companyId: string;
  userId: string;
  department: string;
  status: ContentStatus;
  scores: [work: number, env: number, mentor: number, welfare: number];
  allowance: number | null;
  text: string;
  isAnonymous?: boolean;
  rejectionReason?: string;
};

const REVIEWS: SeedReview[] = [
  { id: "seed_r1", companyId: "seed_c1", userId: "seed_u1", department: "แผนกวิชาช่างยนต์", status: "APPROVED", scores: [4, 4, 5, 3], allowance: 250, text: "ได้ซ่อมเครื่องยนต์จริง พี่เลี้ยงสอนละเอียด" },
  { id: "seed_r2", companyId: "seed_c1", userId: "seed_u2", department: "แผนกวิชาช่างยนต์", status: "APPROVED", scores: [5, 4, 4, 4], allowance: 350, text: "งานตรงสาขา มีรถรับส่ง" },
  { id: "seed_r3", companyId: "seed_c1", userId: "seed_u3", department: "แผนกวิชาช่างยนต์", status: "REJECTED", scores: [1, 1, 1, 1], allowance: 1000, text: "ข้อความรีวิวที่ถูกปฏิเสธ", rejectionReason: "ยังไม่ได้เล่าลักษณะงานที่ทำจริง เพิ่มรายละเอียดอย่างน้อย 30 ตัวอักษร" },
  { id: "seed_r4", companyId: "seed_c1", userId: "seed_u4", department: "แผนกวิชาช่างยนต์", status: "PENDING", scores: [5, 5, 5, 5], allowance: 500, text: "ข้อความรีวิวที่รออนุมัติ" },
  { id: "seed_r5", companyId: "seed_c2", userId: "seed_u1", department: "แผนกวิชาเทคโนโลยีสารสนเทศ", status: "APPROVED", scores: [5, 5, 4, 3], allowance: 300, text: "ได้เขียนเว็บให้ลูกค้าจริง", isAnonymous: true },
  { id: "seed_r6", companyId: "seed_c3", userId: "seed_u2", department: "แผนกวิชาช่างไฟฟ้ากำลัง", status: "PENDING", scores: [4, 4, 4, 4], allowance: 300, text: "ข้อความรีวิวที่รออนุมัติ" },
  { id: "seed_r7", companyId: "seed_c5", userId: "seed_u2", department: "แผนกวิชาช่างกลโรงงาน", status: "APPROVED", scores: [3, 4, 3, 2], allowance: null, text: "ได้ใช้เครื่องกลึงซีเอ็นซี" },
  { id: "seed_r8", companyId: "seed_c6", userId: "seed_u4", department: "แผนกวิชาช่างอิเล็กทรอนิกส์", status: "APPROVED", scores: [2, 2, 3, 1], allowance: 150, text: "งานซ้ำ ๆ ไม่ค่อยได้เรียนรู้" },
];

type SeedPost = { id: string; userId: string; type: PostType; department: string | null; status: ContentStatus; title: string; body: string };

const POSTS: SeedPost[] = [
  { id: "seed_post1", userId: "seed_u1", type: "QA", department: "แผนกวิชาช่างยนต์", status: "APPROVED", title: "ฝึกงานช่างยนต์ที่ไหนได้เบี้ยเลี้ยงดีบ้าง", body: "ปีหน้าจะออกฝึกแล้ว อยากได้ที่ที่มีเบี้ยเลี้ยงและได้ลงมือซ่อมจริง แนะนำหน่อยครับ" },
  { id: "seed_post2", userId: "seed_u2", type: "EXPERIENCE", department: "แผนกวิชาเทคโนโลยีสารสนเทศ", status: "APPROVED", title: "เล่าประสบการณ์ฝึกงานบริษัทไอทีในหาดใหญ่", body: "ได้ช่วยดูแลเว็บและแก้คอมพิวเตอร์ในออฟฟิศ พี่ ๆ ใจดี สอนละเอียดมาก" },
  { id: "seed_post3", userId: "seed_u3", type: "TIPS", department: null, status: "PENDING", title: "เทคนิคเขียนรายงานฝึกงานให้เสร็จเร็ว", body: "จดงานที่ทำทุกวันตั้งแต่วันแรก แล้วรายงานจะเขียนง่ายมาก" },
  { id: "seed_post4", userId: "seed_u4", type: "TEAM", department: "แผนกวิชาช่างอิเล็กทรอนิกส์", status: "REJECTED", title: "กระทู้ที่ถูกปฏิเสธ", body: "ข้อความกระทู้ที่ถูกปฏิเสธ ไม่ควรแสดงในบอร์ด" },
  { id: "seed_post5", userId: "seed_u3", type: "QA", department: null, status: "APPROVED", title: "ต้องเตรียมเอกสารอะไรบ้างก่อนออกฝึก", body: "มีใครมีรายการเอกสารที่ต้องเตรียมก่อนออกฝึกบ้างครับ" },
];

type SeedComment = { id: string; postId: string; userId: string; parentId: string | null; status: ContentStatus; body: string };

// เรียงให้ต้นทางถูกสร้างก่อนคำตอบ
const COMMENTS: SeedComment[] = [
  { id: "seed_cm1", postId: "seed_post1", userId: "seed_u2", parentId: null, status: "APPROVED", body: "หาดใหญ่ออโต้เซอร์วิสให้วันละ 300 ได้ซ่อมจริงครับ" },
  { id: "seed_cm2", postId: "seed_post1", userId: "seed_u3", parentId: "seed_cm1", status: "APPROVED", body: "ยืนยันครับ พี่เลี้ยงดีมาก" },
  { id: "seed_cm3", postId: "seed_post1", userId: "seed_u4", parentId: null, status: "PENDING", body: "ความคิดเห็นที่รอตรวจของคนอื่น" },
  { id: "seed_cm4", postId: "seed_post1", userId: "seed_u2", parentId: null, status: "REJECTED", body: "ความคิดเห็นที่ถูกปฏิเสธ" },
  { id: "seed_cm5", postId: "seed_post1", userId: "seed_u3", parentId: "seed_cm1", status: "PENDING", body: "ความคิดเห็นที่รอตรวจของฉันเอง" },
  { id: "seed_cm6", postId: "seed_post5", userId: "seed_u1", parentId: null, status: "APPROVED", body: "สำเนาบัตรประชาชน หนังสือส่งตัวจากวิทยาลัย และรูปถ่ายครับ" },
  { id: "seed_cm7", postId: "seed_post5", userId: "seed_u3", parentId: null, status: "APPROVED", body: "ขอบคุณครับ" },
];

const LIKES = [
  { id: "seed_lk1", userId: "seed_u2", postId: "seed_post1" },
  { id: "seed_lk2", userId: "seed_u4", postId: "seed_post1" },
  { id: "seed_lk3", userId: "seed_u1", commentId: "seed_cm1" },
];

async function main() {
  for (const u of USERS) await db.user.upsert({ where: { id: u.id }, create: u, update: u });
  for (const c of COMPANIES) await db.company.upsert({ where: { id: c.id }, create: c, update: c });
  for (const { scores, allowance, text, ...r } of REVIEWS) {
    const [scoreWork, scoreEnv, scoreMentor, scoreWelfare] = scores;
    const data = {
      ...r,
      isAnonymous: r.isAnonymous ?? false,
      rejectionReason: r.rejectionReason ?? null,
      gender: "PREFER_NOT" as const,
      periodStart: new Date("2026-05-01T00:00:00+07:00"),
      periodEnd: new Date("2026-09-30T00:00:00+07:00"),
      workStartTime: "08:30",
      workEndTime: "17:00",
      scoreWork,
      scoreEnv,
      scoreMentor,
      scoreWelfare,
      scoreOverall: (scoreWork + scoreEnv + scoreMentor + scoreWelfare) / 4,
      dailyAllowance: allowance,
      textWork: text,
    };
    await db.review.upsert({ where: { id: r.id }, create: data, update: data });
  }
  // รูปตัวอย่างสาธารณะของ Cloudinary (บัญชี demo) — ใช้ตรวจการแสดงผลรูปโดยไม่ต้องมีคีย์
  await db.reviewPhoto.upsert({
    where: { id: "seed_p1" },
    create: { id: "seed_p1", reviewId: "seed_r2", url: "https://res.cloudinary.com/demo/image/upload/sample.jpg" },
    update: {},
  });
  // bestAnswerId ล้างทุกรอบ (สคริปต์ทดสอบเปลี่ยนค่าได้) แล้วตั้งของ seed_post1 หลังความคิดเห็นถูกสร้าง
  for (const p of POSTS) {
    const data = { ...p, bestAnswerId: null };
    await db.communityPost.upsert({ where: { id: p.id }, create: data, update: data });
  }
  for (const c of COMMENTS) await db.communityComment.upsert({ where: { id: c.id }, create: c, update: c });
  for (const l of LIKES) await db.communityLike.upsert({ where: { id: l.id }, create: l, update: l });
  await db.communityPost.update({ where: { id: "seed_post1" }, data: { bestAnswerId: "seed_cm1" } });

  const byStatus = await db.review.groupBy({ by: ["status"], where: { id: { startsWith: "seed_" } }, _count: { _all: true } });
  console.log(`seed: ${COMPANIES.length} บริษัท`, byStatus.map((s) => `${s.status}=${s._count._all}`).join(" "));
  console.log(`seed: ${POSTS.length} กระทู้ ${COMMENTS.length} ความคิดเห็น ${LIKES.length} ถูกใจ`);
}

main().finally(() => db.$disconnect());
