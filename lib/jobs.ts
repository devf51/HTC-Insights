import { requireRole } from "./auth";
import { pageWindow } from "./community-rules";
import { db, isPrismaError } from "./db";
import { UserError } from "./http";
import { JOBS_PER_PAGE, parseDepartments } from "./job-rules";
import type { EmployerInput, JobInput } from "./validation";

// listJobs และ getJob เป็นสาธารณะโดยตั้งใจ (เมนูตำแหน่งงานเปิดให้ผู้ที่ยังไม่ล็อกอิน) — tests/route-guards.test.mjs ระบุชื่อไว้
// ฟังก์ชันอื่นทุกตัวเริ่มด้วย guard · ประกาศใหม่เป็น PENDING เสมอ (ค่า default ของ schema)
// ที่สาธารณะเห็นเฉพาะ APPROVED และยังเปิดรับ รวมถึงตัวนับ — หลักการโดเมนข้อ 1
// ห้าม select อีเมลบัญชีของผู้ลงประกาศ — อีเมลที่แสดงคือ contactEmail ที่กรอกเองเท่านั้น

const PUBLIC_JOB = { status: "APPROVED", isActive: true } as const;
const OPEN_TAKEN = "แผนกนี้มีประกาศที่เปิดรับอยู่แล้ว ปิดรับประกาศเดิมก่อนลงใหม่";

export async function listJobs(f: { q: string; department?: string; page: number }) {
  const where = {
    ...PUBLIC_JOB,
    department: f.department,
    // SQLite ไม่มี mode: "insensitive" — LIKE ของ SQLite ไม่สนตัวพิมพ์เล็กใหญ่ของอังกฤษอยู่แล้ว ภาษาไทยไม่มีตัวพิมพ์
    ...(f.q ? { OR: [{ title: { contains: f.q } }, { company: { name: { contains: f.q } } }] } : {}),
  };
  const total = await db.jobPosting.count({ where });
  const w = pageWindow(f.page, total, JOBS_PER_PAGE);
  const items = await db.jobPosting.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: w.skip,
    take: w.take,
    select: { id: true, title: true, department: true, allowance: true, createdAt: true, company: { select: { name: true } } },
  });
  return { items, total, page: w.page, pageCount: w.pageCount };
}

export async function getJob(id: string) {
  return db.jobPosting.findFirst({
    where: { id, ...PUBLIC_JOB },
    select: {
      id: true,
      title: true,
      department: true,
      description: true,
      qualifications: true,
      benefits: true,
      allowance: true,
      contactEmail: true,
      contactPhone: true,
      createdAt: true,
      company: { select: { name: true, address: true, lat: true, lng: true } },
    },
  });
}

/** สถานประกอบการของผู้ใช้เอง พร้อมประกาศทุกสถานะ — ให้ติดตามผลการตรวจ */
export async function myEmployer() {
  const user = await requireRole("EXTERNAL");
  const e = await db.employer.findUnique({
    where: { userId: user.id },
    select: {
      companyName: true,
      contactEmail: true,
      phone: true,
      departments: true,
      jobs: {
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, department: true, status: true, isActive: true, rejectionReason: true, createdAt: true },
      },
    },
  });
  return e && { ...e, departments: parseDepartments(e.departments) };
}

export async function registerEmployer(input: EmployerInput): Promise<{ id: string }> {
  const user = await requireRole("EXTERNAL");
  const { address, lat, lng, ...employer } = input;
  try {
    // สถานประกอบการกับที่ตั้งสร้างในคำสั่งเดียว — Company ยังไม่ isVerified จึงไม่ขึ้นหน้า /insights จนผู้ดูแลยืนยัน (แท็บสถานประกอบการใน /admin)
    return await db.employer.create({
      data: {
        ...employer,
        userId: user.id,
        companies: { create: { name: employer.companyName, address, lat, lng, phone: employer.phone } },
      },
      select: { id: true },
    });
  } catch (e) {
    // Employer.userId @unique — หนึ่งบัญชีหนึ่งสถานประกอบการ
    if (isPrismaError(e, "P2002")) throw new UserError(409, "บัญชีนี้ลงทะเบียนสถานประกอบการแล้ว");
    throw e;
  }
}

export async function createJob(input: JobInput): Promise<{ id: string }> {
  const user = await requireRole("EXTERNAL");
  const employer = await db.employer.findUnique({
    where: { userId: user.id },
    select: { id: true, departments: true, companies: { select: { id: true }, orderBy: { createdAt: "asc" }, take: 1 } },
  });
  if (!employer || employer.companies.length === 0) throw new UserError(403, "ลงทะเบียนสถานประกอบการก่อนลงประกาศ");
  if (!parseDepartments(employer.departments).includes(input.department)) {
    throw new UserError(400, "แผนกนี้ไม่อยู่ในแผนกที่สถานประกอบการเปิดรับ");
  }
  try {
    return await db.jobPosting.create({
      data: { ...input, employerId: employer.id, companyId: employer.companies[0].id },
      select: { id: true },
    });
  } catch (e) {
    // unique index JobPosting_open_per_department — ตัวตัดสินจริง ไม่ count ก่อนสร้าง (race)
    if (isPrismaError(e, "P2002")) throw new UserError(409, OPEN_TAKEN);
    throw e;
  }
}

export async function setJobActive(id: string, isActive: boolean): Promise<{ isActive: boolean }> {
  const user = await requireRole("EXTERNAL");
  try {
    // ความเป็นเจ้าของและสถานะอยู่ใน where — ไม่แยก "ไม่มี" กับ "ไม่ใช่ของคุณ" ไม่ให้เดา id ของคนอื่น
    await db.jobPosting.update({
      where: { id, employer: { userId: user.id }, status: { not: "REJECTED" } },
      data: { isActive },
    });
  } catch (e) {
    if (isPrismaError(e, "P2025")) throw new UserError(404, "ไม่พบประกาศที่เปลี่ยนสถานะได้");
    if (isPrismaError(e, "P2002")) throw new UserError(409, OPEN_TAKEN);
    throw e;
  }
  return { isActive };
}
