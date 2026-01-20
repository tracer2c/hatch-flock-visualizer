import { SettingsPageWrapper } from "@/components/management/SettingsPageWrapper";
import { TargetManager } from "@/components/management/TargetManager";

export default function TargetsPage() {
  return (
    <SettingsPageWrapper
      title="Custom Targets"
      description="Set performance targets for hatcheries, flocks, and houses"
    >
      <div className="p-6">
        <TargetManager />
      </div>
    </SettingsPageWrapper>
  );
}
