import Link from "next/link";
import { notFound } from "next/navigation";
import { CompanyMap } from "@/components/CompanyMap";
import { EmptyState } from "@/components/EmptyState";
import { PageShell } from "@/components/PageShell";
import { Badge } from "@/components/ui/Badge";
import { buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { getCompany, type CompanyDetail } from "@/lib/companies";
import { safeUrl } from "@/lib/company-rules";
import { departmentLabel } from "@/lib/departments";
import { companyIdSchema } from "@/lib/validation";

const DIMENSIONS = [
  ["scoreWork", "ลักษณะงาน"],
  ["scoreEnv", "สภาพแวดล้อม"],
  ["scoreMentor", "พี่เลี้ยง"],
  ["scoreWelfare", "เบี้ยเลี้ยงและสวัสดิการ"],
] as const;

// เวลาไทยทั้งระบบ (บทเรียน v1) — th-TH แสดงปี พ.ศ.
const monthYear = (d: Date) => d.toLocaleDateString("th-TH", { month: "short", year: "numeric", timeZone: "Asia/Bangkok" });

export default async function CompanyPage({ params }: PageProps<"/insights/[id]">) {
  const id = companyIdSchema.safeParse((await params).id);
  if (!id.success) notFound();
  const data = await getCompany(id.data);
  if (!data) notFound();
  const { company: c, stats, reviews } = data;
  const website = safeUrl(c.website);

  return (
    <PageShell
      eyebrow={c.industry ?? "สถานประกอบการ"}
      title={c.name}
      lede={c.address ?? undefined}
      actions={
        <Link href="/insights/write-review" className={buttonClass("primary")}>
          เขียนรีวิว
        </Link>
      }
    >
      {c.isVerified && (
        <Badge tone="success" className="self-start">
          ยืนยันโดยวิทยาลัยแล้ว
        </Badge>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <Card eyebrow="คะแนนรวม" metric={stats.avgScore?.toFixed(1) ?? "–"}>
          จาก {stats.reviewCount} รีวิวที่ผ่านการตรวจ
        </Card>
        <Card
          eyebrow="เบี้ยเลี้ยงเฉลี่ย"
          metric={stats.avgAllowance !== null ? stats.avgAllowance.toLocaleString("th-TH") : "–"}
        >
          {stats.avgAllowance !== null ? "บาทต่อวัน" : <span className="text-ink-muted">ยังไม่มีข้อมูล</span>}
        </Card>
        <Card eyebrow="ช่องทางติดต่อ">
          {c.phone && (
            <p>
              <a className="kn-link" href={`tel:${c.phone.replace(/[^\d+]/g, "")}`}>
                {c.phone}
              </a>
            </p>
          )}
          {website && (
            <p className="break-all">
              <a className="kn-link" href={website} target="_blank" rel="noopener noreferrer">
                {website}
              </a>
            </p>
          )}
          {!c.phone && !website && <p className="text-ink-muted">ยังไม่มีข้อมูลติดต่อ</p>}
        </Card>
      </div>

      {c.description && <p className="max-w-prose whitespace-pre-line">{c.description}</p>}

      {c.lat !== null && c.lng !== null && (
        <CompanyMap
          pins={[{ id: c.id, name: c.name, lat: c.lat, lng: c.lng, avgScore: stats.avgScore }]}
          className="h-[240px] md:h-[320px]"
        />
      )}

      {stats.reviewCount > 0 && (
        <section className="flex flex-col gap-4">
          <SectionHeader title="คะแนนรายด้าน" />
          <dl className="grid max-w-xl gap-3">
            {DIMENSIONS.map(([key, label]) => {
              const v = stats.dims[key];
              return (
                <div key={key} className="grid grid-cols-[7.5rem_1fr_2.5rem] items-center gap-3 text-small">
                  <dt>{label}</dt>
                  <dd className="h-2 overflow-hidden rounded-full bg-surface-200">
                    <div className="h-full bg-signal" style={{ width: `${(v ?? 0) * 20}%` }} />
                  </dd>
                  <dd className="text-right tabular-nums">{v?.toFixed(1) ?? "–"}</dd>
                </div>
              );
            })}
          </dl>
        </section>
      )}

      <section className="flex flex-col gap-4">
        <SectionHeader title={`รีวิว (${stats.reviewCount})`} />
        {reviews.length === 0 ? (
          <EmptyState icon="rate_review" title="ยังไม่มีรีวิว">
            เป็นคนแรกที่เล่าประสบการณ์ฝึกงานที่นี่
          </EmptyState>
        ) : (
          reviews.map((r) => <ReviewCard key={r.id} r={r} />)
        )}
      </section>
    </PageShell>
  );
}

function ReviewCard({ r }: { r: CompanyDetail["reviews"][number] }) {
  return (
    <Card
      eyebrow={`${departmentLabel(r.department)} · ${monthYear(r.periodStart)} – ${monthYear(r.periodEnd)}`}
      metric={r.scoreOverall.toFixed(1)}
      title={r.author}
      footer={
        <div className="flex flex-wrap gap-2">
          {r.dailyAllowance !== null && <Badge>{`เบี้ยเลี้ยง ${r.dailyAllowance.toLocaleString("th-TH")} บาท/วัน`}</Badge>}
          {r.hasAccommodation && <Badge>มีที่พัก</Badge>}
          {r.hasTransport && <Badge>มีรถรับส่ง</Badge>}
          {r.workStartTime && r.workEndTime && <Badge>{`เวลางาน ${r.workStartTime}–${r.workEndTime} น.`}</Badge>}
        </div>
      }
    >
      <ReviewText label="ลักษณะงาน" text={r.textWork} />
      <ReviewText label="ข้อดี" text={r.textPros} />
      <ReviewText label="ข้อควรรู้" text={r.textCons} />
      <ReviewText label="คำแนะนำถึงรุ่นน้อง" text={r.textAdvice} />
    </Card>
  );
}

function ReviewText({ label, text }: { label: string; text: string | null }) {
  if (!text) return null;
  return (
    <p className="whitespace-pre-line">
      <span className="text-ink-muted">{label}: </span>
      {text}
    </p>
  );
}
