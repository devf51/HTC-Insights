import { requireUser } from "@/lib/auth";

export default async function ProfileLayout({ children }: LayoutProps<"/profile">) {
  await requireUser();
  return children;
}
