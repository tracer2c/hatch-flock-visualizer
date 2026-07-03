import { Activity } from 'lucide-react';
import LiveHouseTracker from '@/components/dashboard/LiveHouseTracker';
import { AnalyticsPageShell } from '@/components/analytics/AnalyticsPageShell';

const LiveTrackingPage = () => {
  return (
    <AnalyticsPageShell
      title="Live House Tracking"
      description="Real-time incubation progress and phase tracking for all houses"
      icon={<Activity className="h-5 w-5" />}
    >
      <LiveHouseTracker />
    </AnalyticsPageShell>
  );
};

export default LiveTrackingPage;
