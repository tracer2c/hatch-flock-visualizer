import { SettingsPageWrapper } from "@/components/management/SettingsPageWrapper";
import UnitManager from "@/components/dashboard/UnitManager";
import { usePermissions } from "@/hooks/usePermissions";
import { ReadOnlyBanner } from "@/components/ui/read-only-banner";

export default function HatcheriesPage() {
  const { hasWriteAccess } = usePermissions();
  return (
    <SettingsPageWrapper
      title="Hatchery Manager"
      description="Manage hatchery units and their configurations"
    >
      <div className="p-6">
        <ReadOnlyBanner show={!hasWriteAccess('hatcheries')} />
        <UnitManager />
      </div>
    </SettingsPageWrapper>
  );
}
