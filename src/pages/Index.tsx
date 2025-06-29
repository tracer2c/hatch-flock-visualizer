
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, BarChart3, LineChart, PieChart, TrendingUp, Filter, FileInput, Egg, AlertTriangle, Package, Activity } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import OverviewDashboard from "@/components/dashboard/OverviewDashboard";
import PerformanceCharts from "@/components/dashboard/PerformanceCharts";
import ComparisonAnalysis from "@/components/dashboard/ComparisonAnalysis";
import DataUpload from "@/components/dashboard/DataUpload";
import DataEntry from "@/components/dashboard/DataEntry";
import FertilityDataEntry from "@/components/dashboard/FertilityDataEntry";
import ResidueDataEntry from "@/components/dashboard/ResidueDataEntry";
import EggPackDataEntry from "@/components/dashboard/EggPackDataEntry";
import QADataEntry from "@/components/dashboard/QADataEntry";

// Sample data
const initialData = [
  { hatchery: "DHN", name: "Bertha Valley", flock: 6367, age: 56, fertility: 79.32, ifDev: -1.89, hatch: 70.58, hoi: 91.15, hof: 88.98, earlyDead: 2.7 },
  { hatchery: "DHN", name: "Jimmy Trawick", flock: 6371, age: 52, fertility: 82.41, ifDev: -1.73, hatch: 74.54, hoi: 92.39, hof: 90.45, earlyDead: 3.09 },
  { hatchery: "DHN", name: "Randall Trawick", flock: 6374, age: 49, fertility: 83.33, ifDev: -1.26, hatch: 78.51, hoi: 95.66, hof: 94.22, earlyDead: 2.62 },
  { hatchery: "DHN", name: "3 Chicks", flock: 6362, age: 59, fertility: 60.65, ifDev: -4.41, hatch: 48.99, hoi: 87.11, hof: 80.77, earlyDead: 3.6 },
  { hatchery: "DHN", name: "Whitakers", flock: 6368, age: 55, fertility: 83.28, ifDev: -2.49, hatch: 74.43, hoi: 92.13, hof: 89.37, earlyDead: 2.98 },
  { hatchery: "DHN", name: "Red Leather", flock: 6389, age: 40, fertility: 90.90, ifDev: -0.99, hatch: 84.31, hoi: 93.77, hof: 92.75, earlyDead: 2.47 },
  { hatchery: "DHN", name: "C&H", flock: 6384, age: 46, fertility: 84.41, ifDev: -2.91, hatch: 78.36, hoi: 96.15, hof: 92.83, earlyDead: 2.78 },
  { hatchery: "DHN", name: "Lo", flock: 6385, age: 43, fertility: 89.61, ifDev: -3.31, hatch: 82.08, hoi: 95.11, hof: 91.60, earlyDead: 2.98 },
  { hatchery: "DHN", name: "Hunter", flock: 6386, age: 42, fertility: 91.98, ifDev: -3.18, hatch: 83.82, hoi: 94.39, hof: 91.13, earlyDead: 2.62 },
  { hatchery: "SAM", name: "Jeff Vu", flock: 6380, age: 47, fertility: 85.42, ifDev: -3.48, hatch: 76.19, hoi: 92.98, hof: 89.19, earlyDead: 2.7 },
  { hatchery: "SAM", name: "James", flock: 6388, age: 39, fertility: 93.36, ifDev: -2.4, hatch: 86.21, hoi: 94.78, hof: 92.34, earlyDead: 2.7 },
  { hatchery: "SAM", name: "Shaken 3&4", flock: 6392, age: 38, fertility: 95.68, ifDev: -3.63, hatch: 86.02, hoi: 93.45, hof: 89.90, earlyDead: 4.25 },
  { hatchery: "SAM", name: "Shaken 1&2", flock: 6393, age: 47, fertility: 96.37, ifDev: -2.79, hatch: 88.36, hoi: 94.42, hof: 91.69, earlyDead: 3.71 },
  { hatchery: "SAM", name: "Mikel 1&2", flock: 6406, age: 26, fertility: 90.05, ifDev: -3.31, hatch: 81.19, hoi: 93.60, hof: 90.16, earlyDead: 4.25 },
  { hatchery: "ENT", name: "Triple J", flock: 6364, age: 57, fertility: 73.30, ifDev: -3.7, hatch: 65.02, hoi: 93.42, hof: 88.70, earlyDead: 3.81 },
  { hatchery: "ENT", name: "Till 1&2", flock: 6395, age: 36, fertility: 96.99, ifDev: -3.73, hatch: 89.41, hoi: 95.87, hof: 92.18, earlyDead: 2.31 },
  { hatchery: "ENT", name: "Till 3&4", flock: 6397, age: 35, fertility: 95.99, ifDev: -3.58, hatch: 88.67, hoi: 95.95, hof: 92.37, earlyDead: 2.55 },
  { hatchery: "ENT", name: "Wing 1&2", flock: 6369, age: 55, fertility: 68.83, ifDev: -3.9, hatch: 58.16, hoi: 89.57, hof: 84.50, earlyDead: 4.4 }
];

const Index = () => {
  const [data, setData] = useState(initialData);
  const [fertilityData, setFertilityData] = useState([]);
  const [residueData, setResidueData] = useState([]);
  const [eggPackData, setEggPackData] = useState([]);
  const [qaData, setQAData] = useState([]);
  const [selectedHatchery, setSelectedHatchery] = useState("all");
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

  const filteredData = selectedHatchery === "all" 
    ? data 
    : data.filter(item => item.hatchery === selectedHatchery);

  const hatcheries = [...new Set(data.map(item => item.hatchery))];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Hatchery Performance Dashboard
          </h1>
          <p className="text-gray-600 text-lg">
            Comprehensive analytics and insights for hatchery operations
          </p>
        </div>

        {/* Filter Controls */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Controls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="hatchery-select">Hatchery</Label>
                <Select value={selectedHatchery} onValueChange={setSelectedHatchery}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select hatchery" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Hatcheries</SelectItem>
                    {hatcheries.map((hatchery) => (
                      <SelectItem key={hatchery} value={hatchery}>
                        {hatchery}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-md">
                Showing {filteredData.length} of {data.length} records
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Dashboard Tabs - Reordered to follow process workflow */}
        <Tabs defaultValue="entry" className="space-y-6">
          <TabsList className="grid w-full grid-cols-9 lg:w-[1350px]">
            <TabsTrigger value="entry" className="flex items-center gap-2">
              <FileInput className="h-4 w-4" />
              Data Entry
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
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="comparison" className="flex items-center gap-2">
              <LineChart className="h-4 w-4" />
              Comparison
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Data Upload
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

          <TabsContent value="overview">
            <OverviewDashboard 
              data={filteredData} 
              fertilityData={fertilityData}
              residueData={residueData}
              eggPackData={eggPackData}
              qaData={qaData}
            />
          </TabsContent>

          <TabsContent value="performance">
            <PerformanceCharts data={filteredData} />
          </TabsContent>

          <TabsContent value="comparison">
            <ComparisonAnalysis data={filteredData} />
          </TabsContent>

          <TabsContent value="upload">
            <DataUpload onDataUpdate={handleDataUpdate} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
