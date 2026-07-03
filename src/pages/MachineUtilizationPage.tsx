import { Factory } from 'lucide-react';
import MachineUtilizationDashboard from '@/components/dashboard/MachineUtilizationDashboard';
import { AnalyticsPageShell } from '@/components/analytics/AnalyticsPageShell';

const MachineUtilizationPage: React.FC = () => {
  return (
    <AnalyticsPageShell
      title="Machine Utilization & Flow"
      description="Setter and hatcher utilization, process flow and machine performance."
      icon={<Factory className="h-5 w-5" />}
      showMode={false}
    >
      <MachineUtilizationDashboard />
    </AnalyticsPageShell>
  );
};

export default MachineUtilizationPage;
