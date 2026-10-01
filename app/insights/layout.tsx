import { requireRole } from "@/lib/auth";

export default async function InsightsLayout({ children }: LayoutProps<"/insights">) {
  await requireRole("STUDENT", "ADMIN");
  return children;
}
