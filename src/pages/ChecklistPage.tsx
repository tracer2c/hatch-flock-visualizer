import React from 'react';
import { useParams } from 'react-router-dom';
import Header from "@/components/Header";
import DailyChecklist from "@/components/dashboard/DailyChecklist";

const ChecklistPage = () => {
  const { batchId } = useParams();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="p-6">
        <div className="max-w-full mx-auto">
          <DailyChecklist selectedBatchId={batchId} />
        </div>
      </main>
    </div>
  );
};

export default ChecklistPage;