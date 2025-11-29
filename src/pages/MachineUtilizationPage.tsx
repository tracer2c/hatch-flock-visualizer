import React from 'react';
import { Factory } from 'lucide-react';
import MachineUtilizationDashboard from '@/components/dashboard/MachineUtilizationDashboard';

const MachineUtilizationPage: React.FC = () => {
  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Enhanced Enterprise Header */}
      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-r from-card via-card to-card">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative flex items-start gap-4 p-6">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25">
            <Factory className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Machine Utilization & Flow
            </h1>
            <p className="text-muted-foreground mt-1 max-w-2xl">
              Monitor setter and hatcher utilization, track process flow, analyze machine performance, and manage multi-setter configurations across all hatcheries.
            </p>
          </div>
        </div>
        
        {/* Gradient accent line */}
        <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary/60" />
      </div>
      
      <MachineUtilizationDashboard />
    </div>
  );
};

export default MachineUtilizationPage;
