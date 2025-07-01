
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileInput } from "lucide-react";
import Navigation from "@/components/Navigation";
import BatchManager from "@/components/dashboard/BatchManager";
import BatchDataEntry from "@/components/dashboard/BatchDataEntry";

const DataEntryPage = () => {
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  const handleBatchSelect = (batchId: string) => {
    setSelectedBatchId(batchId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        <Navigation />
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <FileInput className="h-8 w-8" />
            Data Entry Center
          </h1>
          <p className="text-gray-600 text-lg">
            Track your hatchery operations from egg pack to residue analysis
          </p>
        </div>

        {/* Batch Management */}
        <div className="space-y-6">
          <BatchManager 
            onBatchSelect={handleBatchSelect}
            selectedBatch={selectedBatchId}
          />
          
          {/* Data Entry for Selected Batch */}
          {selectedBatchId && (
            <BatchDataEntry batchId={selectedBatchId} />
          )}
        </div>
      </div>
    </div>
  );
};

export default DataEntryPage;
