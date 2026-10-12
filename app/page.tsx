import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { PageShell } from "@/components/PageShell";
import { Band } from "@/components/ui/Band";
import { buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { externalHome, studentHome } from "@/lib/home";
import { getCurrentUser } from "@/lib/session";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) return <GuestHome />;
  if (user.role === "EXTERNAL") return <ExternalHome />;
  return <StudentHome />;
}

function GuestHome() {
  return (
    <>
      <Band>
        <div className="mx-auto max-w-[1200px]">
          <SectionHeader
            display
            eyebrow="วิทยาลัยเทคนิคหาดใหญ่"
            title="รู้จักที่ฝึกงานก่อนออกไปจริง"
            lede="รีวิวสถานประกอบการจากรุ่นพี่ที่ฝึกงานมาแล้ว เบี้ยเลี้ยงเท่าไร พี่เลี้ยงดูแลดีไหม งานตรงสาขาหรือเปล่า ทุกรีวิวผ่านการตรวจก่อนเผยแพร่"
            actions={
              <Link href="/login" className={buttonClass("primary")}>
                เข้าสู่ระบบ
              </Link>
            }
          />
        </div>
      </Band>
      <div className="mx-auto grid w-full max-w-[1200px] gap-6 px-4 py-16 md:grid-cols-2 md:px-12 md:py-24 lg:grid-cols-3">
        <Card eyebrow="01 · ค้นหา" title="ค้นหาที่ฝึกงานบนแผนที่">
          กรองตามแผนกวิชาและคะแนน ดูพิกัด ช่องทางติดต่อ และเบี้ยเลี้ยง
        </Card>
        <Card eyebrow="02 · รีวิว" title="อ่านรีวิวจากรุ่นพี่">
          คะแนน 4 ด้าน ลักษณะงาน สภาพแวดล้อม พี่เลี้ยง และเบี้ยเลี้ยง พร้อมคำแนะนำถึงรุ่นน้อง
        </Card>
        <Card eyebrow="03 · ตำแหน่งงาน" title="หาตำแหน่งฝึกงานที่เปิดรับ">
          ดูหน้าที่ คุณสมบัติ และข้อมูลติดต่อจากสถานประกอบการโดยตรง
        </Card>
      </div>
    </>
  );
}

async function StudentHome() {
  const d = await studentHome();
  return (
    <PageShell
      title="ภาพรวมการฝึกงาน"
      lede="สรุปจากรีวิวที่ผ่านการตรวจแล้ว"
      actions={
        <Link href="/insights" className={buttonClass("primary")}>
          ค้นหาสถานประกอบการ
        </Link>
      }
    >
      {d.reviews === 0 ? (
        <EmptyState icon="insights">สรุปข้อมูลฝึกงานจะแสดงที่นี่เมื่อมีรีวิวที่ผ่านการตรวจแล้ว</EmptyState>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card eyebrow="รีวิวที่เผยแพร่" metric={d.reviews.toLocaleString("th-TH")} />
            <Card eyebrow="สถานประกอบการที่มีรีวิว" metric={d.companies.toLocaleString("th-TH")} />
            <Card eyebrow="คะแนนเฉลี่ย (เต็ม 5)" metric={d.avgScore?.toFixed(1) ?? "–"} />
            <Card eyebrow="เบี้ยเลี้ยงเฉลี่ยต่อวัน" metric={d.avgAllowance === null ? "–" : `${d.avgAllowance.toLocaleString("th-TH")} บาท`} />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="คะแนนเฉลี่ย 4 ด้าน">
              <Bars rows={d.dimensions.map((x) => ({ label: x.label, value: x.avg ?? 0, text: x.avg?.toFixed(1) ?? "–" }))} max={5} />
            </Card>
            <Card title={`สถานประกอบการที่มีรีวิวมากที่สุด`}>
              <ol className="flex flex-col gap-3">
                {d.topCompanies.map((c, i) => (
                  <li key={c.companyId} className="flex items-baseline justify-between gap-4">
                    <Link href={`/insights/${c.companyId}`} className="kn-link min-w-0 break-words">
                      {`${i + 1}. ${c.name}`}
                    </Link>
                    <span className="shrink-0 text-small text-ink-muted">{`${c.reviews} รีวิว · ${c.avgScore?.toFixed(1) ?? "–"}`}</span>
                  </li>
                ))}
              </ol>
            </Card>
          </div>
        </>
      )}
      <Card
        eyebrow="ตำแหน่งงาน"
        title={d.openJobs > 0 ? `เปิดรับนักศึกษาฝึกงาน ${d.openJobs.toLocaleString("th-TH")} ตำแหน่ง` : "ยังไม่มีประกาศที่เปิดรับ"}
        footer={
          <Link href="/jobs" className={buttonClass("secondary")}>
            ดูตำแหน่งงาน
          </Link>
        }
      />
    </PageShell>
  );
}

async function ExternalHome() {
  const d = await externalHome();
  return (
    <PageShell
      title="ภาพรวมสำหรับสถานประกอบการ"
      lede="นักศึกษาแต่ละแผนกที่ออกฝึกงาน และประกาศรับนักศึกษาที่เปิดอยู่"
      actions={
        <Link href="/employer/register" className={buttonClass("primary")}>
          ลงประกาศรับนักศึกษา
        </Link>
      }
    >
      {d.departments.length === 0 && d.latestJobs.length === 0 ? (
        <EmptyState icon="groups">ภาพรวมจะแสดงที่นี่เมื่อมีข้อมูลในระบบ</EmptyState>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="แผนกที่นักศึกษาออกฝึกงาน" eyebrow="นับจากรีวิวที่เผยแพร่">
            {d.departments.length === 0 ? (
              <p className="text-ink-muted">ยังไม่มีรีวิวที่เผยแพร่</p>
            ) : (
              <Bars rows={d.departments.map((x) => ({ label: x.label, value: x.count, text: String(x.count) }))} max={d.departments[0].count} />
            )}
          </Card>
          <Card
            title="ประกาศที่เปิดรับล่าสุด"
            footer={
              <Link href="/jobs" className={buttonClass("secondary")}>
                ดูทั้งหมด
              </Link>
            }
          >
            {d.latestJobs.length === 0 ? (
              <p className="text-ink-muted">ยังไม่มีประกาศที่เปิดรับ</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {d.latestJobs.map((j) => (
                  <li key={j.id} className="flex flex-col">
                    <Link href={`/jobs/${j.id}`} className="kn-link break-words">
                      {j.title}
                    </Link>
                    <span className="text-small text-ink-muted">{`${j.company.name} · ${j.department}`}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </PageShell>
  );
}

/** แท่งแนวนอน HTML ล้วน — หน้าแรกไม่ต้องโหลด Recharts · ตัวเลขอยู่ข้างแท่งเสมอ สีไม่ใช่ทางเดียวที่บอกค่า */
function Bars({ rows, max }: { rows: { label: string; value: number; text: string }[]; max: number }) {
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => (
        <li key={r.label} className="flex flex-col gap-1">
          <span className="flex justify-between gap-4 text-small">
            <span className="min-w-0 break-words">{r.label}</span>
            <span className="shrink-0 tabular-nums">{r.text}</span>
          </span>
          <span className="h-2 overflow-hidden rounded-full bg-surface-200" aria-hidden>
            <span className="block h-full rounded-full bg-signal" style={{ width: `${max > 0 ? (r.value / max) * 100 : 0}%` }} />
          </span>
        </li>
      ))}
    </ul>
  );
}
