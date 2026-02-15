import React from 'react';
import { useParams } from 'react-router-dom';
import DailyChecklist from "@/components/dashboard/DailyChecklist";
import MachineDailyChecklist from "@/components/dashboard/MachineDailyChecklist";
import { usePermissions } from "@/hooks/usePermissions";
import { ReadOnlyBanner } from "@/components/ui/read-only-banner";

const ChecklistPage = () => {
  const { houseId, machineId } = useParams();
  const { hasWriteAccess } = usePermissions();
  const readOnly = !hasWriteAccess('checklist');

  return (
    <div className="p-6">
      <ReadOnlyBanner show={readOnly} />
      {machineId ? (
        <MachineDailyChecklist selectedMachineId={machineId} />
      ) : (
        <DailyChecklist selectedBatchId={houseId} />
      )}
    </div>
  );
};

export default ChecklistPage;
