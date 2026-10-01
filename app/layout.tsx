import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Sans_Thai, Instrument_Serif, Trirong } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";
import { Footer } from "@/components/Footer";
import { TopNav } from "@/components/TopNav";
import { actionFor, navFor } from "@/lib/nav";
import { getCurrentUser } from "@/lib/session";

const plexSans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-sans" });
const plexThai = IBM_Plex_Sans_Thai({ subsets: ["thai"], weight: ["400", "500"], variable: "--font-plex-thai" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono" });
const instrument = Instrument_Serif({ subsets: ["latin"], weight: "400", variable: "--font-instrument" });
const trirong = Trirong({ subsets: ["thai"], weight: "400", variable: "--font-trirong" });

export const metadata: Metadata = {
  title: "HTC Insights",
  description: "ฐานข้อมูลสถานประกอบการสำหรับนักศึกษาวิทยาลัยเทคนิคหาดใหญ่ ค้นหาที่ฝึกงาน อ่านรีวิวจากรุ่นพี่ และหาตำแหน่งงาน",
};

// viewport-fit=cover ทำให้ env(safe-area-inset-bottom) มีค่าบน iPhone — BottomNav ต้องใช้
export const viewport: Viewport = { viewportFit: "cover" };

// ตั้งธีมก่อนเบราว์เซอร์วาดหน้าแรก กันจอกระพริบ (node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md)
// ค่าที่เก็บ: "paper" | "night" | ไม่มี (= ตามเครื่อง) — ThemePicker ใช้กติกาเดียวกัน
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("theme");if(t!=="paper"&&t!=="night")t=matchMedia("(prefers-color-scheme: dark)").matches?"night":"paper";document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

const fontVars = [plexSans, plexThai, plexMono, instrument, trirong].map((f) => f.variable).join(" ");

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // รู้บทบาทบนเซิร์ฟเวอร์ก่อนส่ง HTML — เมนูถูกตั้งแต่เฟรมแรก ไม่กระพริบแบบ v1
  const user = await getCurrentUser();
  const role = user?.role ?? null;
  const links = navFor(role);

  return (
    <html lang="th" className={fontVars} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {/* display=block: กันชื่อไอคอนโผล่เป็นตัวหนังสือระหว่างโหลด
            กฎ no-page-custom-font เป็นของ Pages Router — root layout ครอบทุกหน้าอยู่แล้ว */}
        {/* eslint-disable-next-line @next/next/google-font-display, @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL@20,300,0..1&display=block"
        />
      </head>
      {/* pb บนมือถือ = ความสูง BottomNav + safe-area ให้ footer ไม่ถูกบัง */}
      <body className="flex min-h-dvh flex-col pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0">
        <TopNav links={links} action={actionFor(role)} />
        <main className="flex-1">{children}</main>
        <Footer />
        <BottomNav links={links} />
      </body>
    </html>
  );
}
