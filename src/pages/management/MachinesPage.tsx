import { SettingsPageWrapper } from "@/components/management/SettingsPageWrapper";
import MachineManager from "@/components/dashboard/MachineManager";
import { usePermissions } from "@/hooks/usePermissions";
import { ReadOnlyBanner } from "@/components/ui/read-only-banner";

export default function MachinesPage() {
  const { hasWriteAccess } = usePermissions();
  return (
    <SettingsPageWrapper
      title="Machine Manager"
      description="Configure and maintain incubator machines"
    >
      <div className="p-6">
        <ReadOnlyBanner show={!hasWriteAccess('machines_management')} />
        <MachineManager />
      </div>
    </SettingsPageWrapper>
  );
}
