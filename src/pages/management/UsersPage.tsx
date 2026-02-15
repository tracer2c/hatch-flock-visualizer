import { SettingsPageWrapper } from "@/components/management/SettingsPageWrapper";
import UserManager from "@/components/dashboard/UserManager";
import { usePermissions } from "@/hooks/usePermissions";
import { ReadOnlyBanner } from "@/components/ui/read-only-banner";

export default function UsersPage() {
  const { hasWriteAccess } = usePermissions();
  return (
    <SettingsPageWrapper
      title="User Management"
      description="Manage user accounts, roles, and permissions"
    >
      <div className="p-6">
        <ReadOnlyBanner show={!hasWriteAccess('user_management')} />
        <UserManager />
      </div>
    </SettingsPageWrapper>
  );
}
