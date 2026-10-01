import { PageShell } from "@/components/PageShell";
import { ThemePicker } from "./ThemePicker";

export default function SettingsPage() {
  return (
    <PageShell title="ตั้งค่า">
      <div className="max-w-md">
        <ThemePicker />
      </div>
    </PageShell>
  );
}
