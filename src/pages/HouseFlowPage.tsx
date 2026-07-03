import { Building2 } from "lucide-react";
import BatchFlowSankey from "@/components/dashboard/BatchFlowSankey";
import { AnalyticsPageShell } from "@/components/analytics/AnalyticsPageShell";

const HouseFlowPage = () => {
  return (
    <AnalyticsPageShell
      title="House Flow Analysis"
      description="Detailed house flow analysis and batch processing visualization"
      icon={<Building2 className="h-5 w-5" />}
    >
      <BatchFlowSankey />
    </AnalyticsPageShell>
  );
};

export default HouseFlowPage;
