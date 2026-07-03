import { GitBranch } from "lucide-react";
import ProcessFlowDashboard from "@/components/dashboard/ProcessFlowDashboard";
import { AnalyticsPageShell } from "@/components/analytics/AnalyticsPageShell";

const ProcessFlowPage = () => {
  return (
    <AnalyticsPageShell
      title="Process Flow Analysis"
      description="Batch performance metrics, age trends, and breed comparisons."
      icon={<GitBranch className="h-5 w-5" />}
    >
      <ProcessFlowDashboard />
    </AnalyticsPageShell>
  );
};

export default ProcessFlowPage;
