import { SettingsPageWrapper } from "@/components/management/SettingsPageWrapper";
import ReportsManager from "@/components/management/ReportsManager";

export default function ReportsPage() {
  return (
    <SettingsPageWrapper
      title="Reports"
      description="Generate and download PDF reports for houses and weekly summaries"
    >
      <div className="p-6">
        <ReportsManager />
      </div>
    </SettingsPageWrapper>
  );
}
