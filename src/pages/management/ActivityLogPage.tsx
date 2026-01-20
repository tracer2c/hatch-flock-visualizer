import { SettingsPageWrapper } from "@/components/management/SettingsPageWrapper";
import ActivityLogViewer from "@/components/management/ActivityLogViewer";

export default function ActivityLogPage() {
  return (
    <SettingsPageWrapper
      title="User Activity Log"
      description="View all user actions with IP addresses and timestamps"
    >
      <div className="p-6">
        <ActivityLogViewer />
      </div>
    </SettingsPageWrapper>
  );
}
