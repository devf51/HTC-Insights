import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { PageShell } from "@/components/PageShell";
import { buttonClass } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";

// 4 หมวดตามสเปกข้อ 6 (enum PostType: QA | EXPERIENCE | TIPS | TEAM)
const CATEGORIES = [
  { id: "ALL", label: "ทั้งหมด" },
  { id: "QA", label: "ถามตอบ" },
  { id: "EXPERIENCE", label: "เล่าประสบการณ์" },
  { id: "TIPS", label: "เทคนิค" },
  { id: "TEAM", label: "หาเพื่อนฝึกงาน" },
];

export default function CommunityPage() {
  return (
    <PageShell
      title="ชุมชน"
      lede="ถามตอบ เล่าประสบการณ์ แลกเทคนิค และหาเพื่อนฝึกงาน"
      actions={
        <Link href="/community/new" className={buttonClass("primary")}>
          ตั้งกระทู้
        </Link>
      }
    >
      <Tabs items={CATEGORIES} />
      <EmptyState icon="forum">กระทู้ที่ผ่านการตรวจแล้วจะแสดงที่นี่</EmptyState>
    </PageShell>
  );
}
