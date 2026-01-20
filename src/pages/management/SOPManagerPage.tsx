import { SettingsPageWrapper } from "@/components/management/SettingsPageWrapper";
import SOPManager from "@/components/dashboard/SOPManager";

export default function SOPManagerPage() {
  return (
    <SettingsPageWrapper
      title="SOP Manager"
      description="Manage standard operating procedures and templates"
    >
      <div className="p-6">
        <SOPManager />
      </div>
    </SettingsPageWrapper>
  );
}
