import { SettingsPageWrapper } from "@/components/management/SettingsPageWrapper";
import UnitManager from "@/components/dashboard/UnitManager";

export default function HatcheriesPage() {
  return (
    <SettingsPageWrapper
      title="Hatchery Manager"
      description="Manage hatchery units and their configurations"
    >
      <div className="p-6">
        <UnitManager />
      </div>
    </SettingsPageWrapper>
  );
}
