import { requireRole } from "@/lib/auth";

export default async function CommunityLayout({ children }: LayoutProps<"/community">) {
  await requireRole("STUDENT", "ADMIN");
  return children;
}
