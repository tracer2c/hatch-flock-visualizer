import { SettingsPageWrapper } from "@/components/management/SettingsPageWrapper";
import SOPDashboard from "@/components/dashboard/SOPDashboard";

export default function SOPDashboardPage() {
  return (
    <SettingsPageWrapper
      title="Daily SOP Dashboard"
      description="View today's SOPs for houses, machines, transfers, and alerts"
    >
      <div className="p-6">
        <SOPDashboard />
      </div>
    </SettingsPageWrapper>
  );
}
