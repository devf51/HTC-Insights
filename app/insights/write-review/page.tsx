import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { PageShell } from "@/components/PageShell";
import { ReviewForm, type ReviewDefaults } from "@/components/ReviewForm";
import { Button, buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { TextField } from "@/components/ui/TextField";
import { requireRole } from "@/lib/auth";
import { uploadsEnabled } from "@/lib/cloudinary";
import { listCompanies } from "@/lib/companies";
import { findPlace, placesEnabled, searchPlaces } from "@/lib/places";
import { toThaiDateInput } from "@/lib/review-rules";
import { findCompanyIdByPlace, getCompanyForReview, getReviewForEdit } from "@/lib/reviews";
import { writeReviewParamsSchema } from "@/lib/validation";

export default async function WriteReviewPage({ searchParams }: PageProps<"/insights/write-review">) {
  // layout ยอม ADMIN ด้วย แต่การเขียนรีวิวเป็นของนักศึกษาเท่านั้น
  await requireRole("STUDENT");
  const p = writeReviewParamsSchema.parse(await searchParams);
  const uploads = uploadsEnabled();

  if (p.edit) {
    const r = await getReviewForEdit(p.edit);
    if (!r) notFound();
    return (
      <PageShell eyebrow="แก้ไขรีวิวที่ไม่ผ่านการตรวจ" title={r.company.name} lede={`เหตุผลจากผู้ดูแล: ${r.rejectionReason ?? "ไม่ระบุ"}`}>
        <ReviewForm company={{ kind: "existing", id: r.company.id }} editId={p.edit} defaults={toDefaults(r)} uploadsEnabled={uploads} />
      </PageShell>
    );
  }

  if (p.company) {
    const found = await getCompanyForReview(p.company);
    if (!found) notFound();
    const { company, myReview } = found;
    if (myReview) {
      return (
        <PageShell eyebrow="เขียนรีวิว" title={company.name}>
          <EmptyState icon="task_alt" title="คุณรีวิวที่นี่แล้ว">
            {myReview.status === "REJECTED" ? (
              <Link href={`/insights/write-review?edit=${myReview.id}`} className="kn-link">
                รีวิวไม่ผ่านการตรวจ แก้ไขแล้วส่งใหม่
              </Link>
            ) : (
              <Link href="/profile" className="kn-link">
                ดูสถานะที่หน้าโปรไฟล์
              </Link>
            )}
          </EmptyState>
        </PageShell>
      );
    }
    return (
      <PageShell eyebrow="เขียนรีวิว" title={company.name} lede={company.address ?? undefined}>
        <ReviewForm company={{ kind: "existing", id: company.id }} uploadsEnabled={uploads} />
      </PageShell>
    );
  }

  if (p.place && p.q) {
    // สถานที่นี้เคยมีคนเลือกแล้ว — ใช้บริษัทเดิม จะได้เห็นว่าตัวเองเคยรีวิวหรือยัง
    const existingId = await findCompanyIdByPlace(p.place);
    if (existingId) redirect(`/insights/write-review?company=${existingId}`);
    const place = await findPlace(p.q, p.place);
    if (place) {
      return (
        <PageShell eyebrow="เขียนรีวิว" title={place.name} lede={place.address ?? undefined}>
          <ReviewForm company={{ kind: "place", placeId: place.placeId, query: p.q }} uploadsEnabled={uploads} />
        </PageShell>
      );
    }
    // ไม่พบแล้ว (แคชหมดอายุและผลเปลี่ยน) — ตกไปหน้าค้นหาด้วยคำเดิม
  }

  if (p.new) {
    return (
      <PageShell eyebrow="เขียนรีวิว" title="เพิ่มสถานประกอบการใหม่" lede="กรอกชื่อและที่อยู่ ผู้ดูแลจะตรวจพร้อมรีวิวของคุณ">
        <ReviewForm company={{ kind: "new" }} uploadsEnabled={uploads} />
      </PageShell>
    );
  }

  const google = placesEnabled();
  const [inSystem, fromGoogle] = p.q
    ? await Promise.all([listCompanies({ q: p.q, page: 1 }).then((r) => r.items.slice(0, 8)), searchPlaces(p.q)])
    : [[], []];

  return (
    <PageShell
      title="เขียนรีวิว"
      lede={google ? "ค้นหาสถานประกอบการที่ไปฝึกงาน จากในระบบหรือจาก Google Maps" : "ค้นหาสถานประกอบการที่ไปฝึกงานจากในระบบ"}
    >
      <form role="search" className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <TextField name="q" label="ชื่อสถานประกอบการ" defaultValue={p.q} required minLength={2} className="sm:flex-1" />
        <Button type="submit" icon={<Icon name="search" />}>
          ค้นหา
        </Button>
      </form>

      {p.q && (
        <section className="flex flex-col gap-4">
          <SectionHeader title="ในระบบ" />
          {inSystem.length === 0 ? (
            <p className="text-small text-ink-muted">ไม่พบในระบบ</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {inSystem.map((c) => (
                <Card key={c.id} title={c.name} footer={<PickLink href={`/insights/write-review?company=${c.id}`} />}>
                  {c.address && <p className="text-ink-muted">{c.address}</p>}
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

      {p.q && google && (
        <section className="flex flex-col gap-4">
          <SectionHeader title="จาก Google Maps" />
          {fromGoogle.length === 0 ? (
            <p className="text-small text-ink-muted">ไม่พบใน Google Maps</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {fromGoogle.map((pl) => (
                <Card
                  key={pl.placeId}
                  title={pl.name}
                  footer={<PickLink href={`/insights/write-review?${new URLSearchParams({ place: pl.placeId, q: p.q })}`} />}
                >
                  {pl.address && <p className="text-ink-muted">{pl.address}</p>}
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

      <p className="text-small text-ink-muted">
        {"ไม่พบที่ที่ไปฝึกงาน? "}
        <Link href="/insights/write-review?new=1" className="kn-link">
          เพิ่มสถานประกอบการเอง
        </Link>
      </p>
    </PageShell>
  );
}

function PickLink({ href }: { href: string }) {
  return (
    <Link href={href} className={buttonClass("secondary", "sm")}>
      เลือกที่นี่
    </Link>
  );
}

function toDefaults(r: NonNullable<Awaited<ReturnType<typeof getReviewForEdit>>>): ReviewDefaults {
  return {
    department: r.department,
    gender: r.gender,
    periodStart: toThaiDateInput(r.periodStart),
    periodEnd: toThaiDateInput(r.periodEnd),
    dailyAllowance: r.dailyAllowance?.toString() ?? "",
    hasAccommodation: r.hasAccommodation,
    hasTransport: r.hasTransport,
    workStartTime: r.workStartTime ?? "",
    workEndTime: r.workEndTime ?? "",
    scoreWork: r.scoreWork,
    scoreEnv: r.scoreEnv,
    scoreMentor: r.scoreMentor,
    scoreWelfare: r.scoreWelfare,
    textWork: r.textWork,
    textPros: r.textPros ?? "",
    textCons: r.textCons ?? "",
    textAdvice: r.textAdvice ?? "",
    isAnonymous: r.isAnonymous,
  };
}
