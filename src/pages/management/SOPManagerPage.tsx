import { SettingsPageWrapper } from "@/components/management/SettingsPageWrapper";
import SOPManager from "@/components/dashboard/SOPManager";
import { usePermissions } from "@/hooks/usePermissions";
import { ReadOnlyBanner } from "@/components/ui/read-only-banner";

export default function SOPManagerPage() {
  const { hasWriteAccess } = usePermissions();
  return (
    <SettingsPageWrapper
      title="SOP Manager"
      description="Manage standard operating procedures and templates"
    >
      <div className="p-6">
        <ReadOnlyBanner show={!hasWriteAccess('sop_manager')} />
        <SOPManager />
      </div>
    </SettingsPageWrapper>
  );
}
