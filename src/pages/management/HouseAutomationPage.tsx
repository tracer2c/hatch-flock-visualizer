import { SettingsPageWrapper } from "@/components/management/SettingsPageWrapper";
import BatchStatusSettings from "@/components/dashboard/BatchStatusSettings";

export default function HouseAutomationPage() {
  return (
    <SettingsPageWrapper
      title="House Status Automation"
      description="Configure automatic batch progression rules"
    >
      <div className="p-6">
        <BatchStatusSettings />
      </div>
    </SettingsPageWrapper>
  );
}
