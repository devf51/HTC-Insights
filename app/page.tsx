import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { PageShell } from "@/components/PageShell";
import { Band } from "@/components/ui/Band";
import { buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
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

function StudentHome() {
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
      <EmptyState icon="insights">สรุปข้อมูลฝึกงานจะแสดงที่นี่เมื่อมีรีวิวที่ผ่านการตรวจแล้ว</EmptyState>
    </PageShell>
  );
}

function ExternalHome() {
  return (
    <PageShell
      title="ภาพรวมสำหรับสถานประกอบการ"
      lede="ทักษะของนักศึกษาแต่ละแผนก และสถานประกอบการที่เปิดรับฝึกงาน"
      actions={
        <Link href="/employer/register" className={buttonClass("primary")}>
          ลงประกาศรับนักศึกษา
        </Link>
      }
    >
      <EmptyState icon="groups">ภาพรวมจะแสดงที่นี่เมื่อมีข้อมูลในระบบ</EmptyState>
    </PageShell>
  );
}
