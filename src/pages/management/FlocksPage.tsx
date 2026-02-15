import { SettingsPageWrapper } from "@/components/management/SettingsPageWrapper";
import FlockManager from "@/components/dashboard/FlockManager";
import { usePermissions } from "@/hooks/usePermissions";
import { ReadOnlyBanner } from "@/components/ui/read-only-banner";

export default function FlocksPage() {
  const { hasWriteAccess } = usePermissions();
  return (
    <SettingsPageWrapper
      title="Flock Manager"
      description="Add, edit, and manage your bird flocks"
    >
      <div className="p-6">
        <ReadOnlyBanner show={!hasWriteAccess('flocks_management')} />
        <FlockManager />
      </div>
    </SettingsPageWrapper>
  );
}
