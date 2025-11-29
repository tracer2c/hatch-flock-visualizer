import React from 'react';
import { Activity } from 'lucide-react';
import LiveHouseTracker from '@/components/dashboard/LiveHouseTracker';

const LiveTrackingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Activity className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Live House Tracking
            </h1>
            <p className="text-sm text-muted-foreground">
              Real-time incubation progress and phase tracking for all houses
            </p>
          </div>
        </div>

        {/* Main Tracker Component */}
        <LiveHouseTracker />
      </div>
    </div>
  );
};

export default LiveTrackingPage;
