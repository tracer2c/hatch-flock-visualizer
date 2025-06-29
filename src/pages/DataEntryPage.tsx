
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileInput, Package, Egg, Activity, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DataEntry from "@/components/dashboard/DataEntry";
import EggPackDataEntry from "@/components/dashboard/EggPackDataEntry";
import FertilityDataEntry from "@/components/dashboard/FertilityDataEntry";
import QADataEntry from "@/components/dashboard/QADataEntry";
import ResidueDataEntry from "@/components/dashboard/ResidueDataEntry";

const DataEntryPage = () => {
  const [data, setData] = useState([]);
  const [fertilityData, setFertilityData] = useState([]);
  const [residueData, setResidueData] = useState([]);
  const [eggPackData, setEggPackData] = useState([]);
  const [qaData, setQAData] = useState([]);
  const { toast } = useToast();

  const handleDataUpdate = (newData: any[]) => {
    setData(newData);
    toast({
      title: "Data Updated",
      description: `Successfully loaded ${newData.length} records.`,
    });
  };

  const handleFertilityDataUpdate = (newData: any[]) => {
    setFertilityData(newData);
    toast({
      title: "Fertility Data Updated",
      description: `Successfully updated ${newData.length} fertility records.`,
    });
  };

  const handleResidueDataUpdate = (newData: any[]) => {
    setResidueData(newData);
    toast({
      title: "Residue Data Updated",
      description: `Successfully updated ${newData.length} residue analysis records.`,
    });
  };

  const handleEggPackDataUpdate = (newData: any[]) => {
    setEggPackData(newData);
    toast({
      title: "Egg Pack Data Updated",
      description: `Successfully updated ${newData.length} egg pack quality records.`,
    });
  };

  const handleQADataUpdate = (newData: any[]) => {
    setQAData(newData);
    toast({
      title: "QA Data Updated",
      description: `Successfully updated ${newData.length} quality assurance records.`,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Data Entry Center
          </h1>
          <p className="text-gray-600 text-lg">
            Comprehensive data entry for all hatchery operations
          </p>
        </div>

        {/* Data Entry Tabs */}
        <Tabs defaultValue="entry" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="entry" className="flex items-center gap-2">
              <FileInput className="h-4 w-4" />
              Main Data
            </TabsTrigger>
            <TabsTrigger value="eggpack" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Egg Pack
            </TabsTrigger>
            <TabsTrigger value="fertility" className="flex items-center gap-2">
              <Egg className="h-4 w-4" />
              Fertility
            </TabsTrigger>
            <TabsTrigger value="qa" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              QA
            </TabsTrigger>
            <TabsTrigger value="residue" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Residue
            </TabsTrigger>
          </TabsList>

          <TabsContent value="entry">
            <DataEntry data={data} onDataUpdate={handleDataUpdate} />
          </TabsContent>

          <TabsContent value="eggpack">
            <EggPackDataEntry data={eggPackData} onDataUpdate={handleEggPackDataUpdate} />
          </TabsContent>

          <TabsContent value="fertility">
            <FertilityDataEntry data={fertilityData} onDataUpdate={handleFertilityDataUpdate} />
          </TabsContent>

          <TabsContent value="qa">
            <QADataEntry data={qaData} onDataUpdate={handleQADataUpdate} />
          </TabsContent>

          <TabsContent value="residue">
            <ResidueDataEntry data={residueData} onDataUpdate={handleResidueDataUpdate} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DataEntryPage;
