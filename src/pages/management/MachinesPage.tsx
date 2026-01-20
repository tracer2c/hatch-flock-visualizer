import { SettingsPageWrapper } from "@/components/management/SettingsPageWrapper";
import MachineManager from "@/components/dashboard/MachineManager";

export default function MachinesPage() {
  return (
    <SettingsPageWrapper
      title="Machine Manager"
      description="Configure and maintain incubator machines"
    >
      <div className="p-6">
        <MachineManager />
      </div>
    </SettingsPageWrapper>
  );
}
