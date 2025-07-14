
import { useState } from 'react';
import { FileInput } from "lucide-react";
import Navigation from "@/components/Navigation";
import BatchManager from "@/components/dashboard/BatchManager";
import DataTypeSelection from "@/components/dashboard/DataTypeSelection";

const DataEntryPage = () => {
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  const handleBatchSelect = (batchId: string) => {
    setSelectedBatchId(batchId);
  };

  const handleBackToBatchSelection = () => {
    setSelectedBatchId(null);
  };

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      <Navigation />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Batch Management */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileInput className="h-5 w-5" />
              Batch Management
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Select a batch to enter data
            </p>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <BatchManager 
              onBatchSelect={handleBatchSelect}
              selectedBatch={selectedBatchId}
              compact={true}
            />
          </div>
        </div>

        {/* Right Panel - Data Type Selection or Welcome */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedBatchId ? (
            <DataTypeSelection 
              batchId={selectedBatchId} 
              onBack={handleBackToBatchSelection}
              embedded={true}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-md">
                <FileInput className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Data Entry Center
                </h3>
                <p className="text-gray-600 text-lg">
                  Select a batch from the sidebar to start entering data for your hatchery operations
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataEntryPage;
