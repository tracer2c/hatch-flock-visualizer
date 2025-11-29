import React from 'react';
import MachineUtilizationDashboard from '@/components/dashboard/MachineUtilizationDashboard';

const MachineUtilizationPage: React.FC = () => {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          Machine Utilization & Flow
        </h1>
        <p className="text-muted-foreground">
          Monitor setter and hatcher utilization, view machine status, and manage multi-setter configurations.
        </p>
      </div>
      
      <MachineUtilizationDashboard />
    </div>
  );
};

export default MachineUtilizationPage;
