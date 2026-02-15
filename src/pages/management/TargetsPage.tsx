import { SettingsPageWrapper } from "@/components/management/SettingsPageWrapper";
import { TargetManager } from "@/components/management/TargetManager";
import { usePermissions } from "@/hooks/usePermissions";
import { ReadOnlyBanner } from "@/components/ui/read-only-banner";

export default function TargetsPage() {
  const { hasWriteAccess } = usePermissions();
  return (
    <SettingsPageWrapper
      title="Custom Targets"
      description="Set performance targets for hatcheries, flocks, and houses"
    >
      <div className="p-6">
        <ReadOnlyBanner show={!hasWriteAccess('targets')} />
        <TargetManager />
      </div>
    </SettingsPageWrapper>
  );
}
