import { SettingsPageWrapper } from "@/components/management/SettingsPageWrapper";
import { ResidueScheduleManager } from "@/components/management/ResidueScheduleManager";

export default function ResidueSchedulePage() {
  return (
    <SettingsPageWrapper
      title="Residue Analysis Schedule"
      description="Monitor and manage residue analysis schedules"
    >
      <div className="p-6">
        <ResidueScheduleManager />
      </div>
    </SettingsPageWrapper>
  );
}
