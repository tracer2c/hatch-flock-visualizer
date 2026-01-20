import { SettingsPageWrapper } from "@/components/management/SettingsPageWrapper";
import UserManager from "@/components/dashboard/UserManager";

export default function UsersPage() {
  return (
    <SettingsPageWrapper
      title="User Management"
      description="Manage user accounts, roles, and permissions"
    >
      <div className="p-6">
        <UserManager />
      </div>
    </SettingsPageWrapper>
  );
}
