
import { useState } from 'react';
import Header from "@/components/Header";
import HouseManager from "@/components/dashboard/HouseManager";
import DataTypeSelection from "@/components/dashboard/DataTypeSelection";

const DataEntryPage = () => {
  const [selectedHouseId, setSelectedHouseId] = useState<string | null>(null);

  const handleHouseSelect = (houseId: string) => {
    setSelectedHouseId(houseId);
  };

  const handleBackToHouseSelection = () => {
    setSelectedHouseId(null);
  };

  // If a house is selected, show the data type selection
  if (selectedHouseId) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="p-6">
          <div className="max-w-full mx-auto">
            <DataTypeSelection 
              houseId={selectedHouseId} 
              onBack={handleBackToHouseSelection}
            />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="p-6">
        <div className="max-w-full mx-auto">
          <HouseManager 
            onHouseSelect={handleHouseSelect}
            selectedHouse={selectedHouseId}
          />
        </div>
      </main>
    </div>
  );
};

export default DataEntryPage;
