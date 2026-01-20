import { SettingsPageWrapper } from "@/components/management/SettingsPageWrapper";
import FlockManager from "@/components/dashboard/FlockManager";

export default function FlocksPage() {
  return (
    <SettingsPageWrapper
      title="Flock Manager"
      description="Add, edit, and manage your bird flocks"
    >
      <div className="p-6">
        <FlockManager />
      </div>
    </SettingsPageWrapper>
  );
}
