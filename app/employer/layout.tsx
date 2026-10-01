import { requireRole } from "@/lib/auth";

export default async function EmployerLayout({ children }: LayoutProps<"/employer">) {
  await requireRole("EXTERNAL", "ADMIN");
  return children;
}
