import React from 'react';
import { useParams } from 'react-router-dom';
import DailyChecklist from "@/components/dashboard/DailyChecklist";
import MachineDailyChecklist from "@/components/dashboard/MachineDailyChecklist";

const ChecklistPage = () => {
  const { houseId, machineId } = useParams();

  return (
    <div className="p-6">
      {machineId ? (
        <MachineDailyChecklist selectedMachineId={machineId} />
      ) : (
        <DailyChecklist selectedBatchId={houseId} />
      )}
    </div>
  );
};

export default ChecklistPage;
