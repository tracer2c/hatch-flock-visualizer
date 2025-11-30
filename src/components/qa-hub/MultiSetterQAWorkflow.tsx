import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings, 
  Building2, 
  ArrowLeft, 
  Search,
  Layers,
  Thermometer,
  Ruler,
  Droplets
} from "lucide-react";
import { useHatcheries, useMultiSetterMachines } from '@/hooks/useQAHubData';
import { usePositionOccupancy } from '@/hooks/usePositionOccupancy';
import { toast } from 'sonner';
import { submitMachineLevelQA, submitMachineWideQA, type FlockLinkage } from '@/services/qaSubmissionService';
import MultiSetterQAEntry from '@/components/dashboard/MultiSetterQAEntry';
import MachineWideAnglesEntry from '@/components/qa-hub/MachineWideAnglesEntry';
import MachineWideHumidityEntry from '@/components/qa-hub/MachineWideHumidityEntry';
import { OccupancyInfo } from '@/utils/setterPositionMapping';

interface SelectedMachine {
  id: string;
  machine_number: string;
  location: string | null;
  occupiedPositions: number;
  totalPositions: number;
  activeFlocks: number;
  unit?: { name: string } | null;
}

const MultiSetterQAWorkflow: React.FC = () => {
  const [selectedHatcheryId, setSelectedHatcheryId] = useState<string>('all');
  const [selectedMachine, setSelectedMachine] = useState<SelectedMachine | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [technicianName, setTechnicianName] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkDate, setCheckDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: hatcheries } = useHatcheries();
  const { data: machines, isLoading: machinesLoading, refetch } = useMultiSetterMachines(
    selectedHatcheryId === 'all' ? undefined : selectedHatcheryId
  );

  // Get position occupancy for the selected machine and date
  const { uniqueFlockDetails } = usePositionOccupancy(
    selectedMachine?.id || null,
    checkDate
  );

  const filteredMachines = machines?.filter(machine => {
    const searchLower = searchTerm.toLowerCase();
    return (
      machine.machine_number?.toLowerCase().includes(searchLower) ||
      machine.location?.toLowerCase().includes(searchLower)
    );
  });

  const handleSubmitTemperatures = async (data: {
    temperatures: Record<string, number>;
    averages: { overall: number | null; front: number | null; middle: number | null; back: number | null };
    checkDate: string;
    positionOccupancy: Map<string, OccupancyInfo>;
  }) => {
    if (!selectedMachine || !technicianName.trim()) {
      toast.error('Please enter technician name');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitMachineLevelQA(
        {
          machine_id: selectedMachine.id,
          check_date: data.checkDate,
          check_time: new Date().toTimeString().split(' ')[0],
          day_of_incubation: 0,
          temperature: data.averages.overall || 0,
          humidity: 55,
          inspector_name: technicianName,
          notes: notes || undefined,
          temperatures: data.temperatures,
          temp_avg_overall: data.averages.overall,
          temp_avg_front: data.averages.front,
          temp_avg_middle: data.averages.middle,
          temp_avg_back: data.averages.back,
        },
        data.positionOccupancy
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      toast.success('Machine-level temperature QA saved successfully!');
      setNotes('');
      refetch();
    } catch (error: any) {
      toast.error(`Failed to save QA: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitAngles = async (data: {
    angles: {
      angle_top_left: number;
      angle_mid_left: number;
      angle_bottom_left: number;
      angle_top_right: number;
      angle_mid_right: number;
      angle_bottom_right: number;
    };
    checkDate: string;
    uniqueFlocks: { flock_id: string; batch_id: string | null; flock_name: string; flock_number: number }[];
  }) => {
    if (!selectedMachine || !technicianName.trim()) {
      toast.error('Please enter technician name');
      return;
    }

    setIsSubmitting(true);
    try {
      const flockLinkages: FlockLinkage[] = data.uniqueFlocks.map(f => ({
        flock_id: f.flock_id,
        batch_id: f.batch_id
      }));

      const result = await submitMachineWideQA(
        {
          machine_id: selectedMachine.id,
          check_date: data.checkDate,
          check_time: new Date().toTimeString().split(' ')[0],
          temperature: 100,
          humidity: 55,
          inspector_name: technicianName,
          notes: notes || undefined,
          qa_type: 'angles',
          angle_top_left: data.angles.angle_top_left,
          angle_mid_left: data.angles.angle_mid_left,
          angle_bottom_left: data.angles.angle_bottom_left,
          angle_top_right: data.angles.angle_top_right,
          angle_mid_right: data.angles.angle_mid_right,
          angle_bottom_right: data.angles.angle_bottom_right,
        },
        flockLinkages
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      toast.success('Machine-wide angles saved successfully!');
      setNotes('');
      refetch();
    } catch (error: any) {
      toast.error(`Failed to save angles: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitHumidity = async (data: {
    humidity: number;
    temperature: number;
    checkDate: string;
    uniqueFlocks: { flock_id: string; batch_id: string | null; flock_name: string; flock_number: number }[];
  }) => {
    if (!selectedMachine || !technicianName.trim()) {
      toast.error('Please enter technician name');
      return;
    }

    setIsSubmitting(true);
    try {
      const flockLinkages: FlockLinkage[] = data.uniqueFlocks.map(f => ({
        flock_id: f.flock_id,
        batch_id: f.batch_id
      }));

      const result = await submitMachineWideQA(
        {
          machine_id: selectedMachine.id,
          check_date: data.checkDate,
          check_time: new Date().toTimeString().split(' ')[0],
          temperature: data.temperature,
          humidity: data.humidity,
          inspector_name: technicianName,
          notes: notes || undefined,
          qa_type: 'humidity',
        },
        flockLinkages
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      toast.success('Machine-wide humidity saved successfully!');
      setNotes('');
      refetch();
    } catch (error: any) {
      toast.error(`Failed to save humidity: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Machine Selection View
  if (!selectedMachine) {
    return (
      <div className="space-y-4">
        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="h-5 w-5 text-purple-600" strokeWidth={1.5} />
              Multi Setter QA (per machine/positions)
            </CardTitle>
            <CardDescription>
              Select a hatchery and machine to enter position-level QA readings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Hatchery
                </Label>
                <Select value={selectedHatcheryId} onValueChange={setSelectedHatcheryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select hatchery" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Hatcheries</SelectItem>
                    {hatcheries?.map(h => (
                      <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Search Machines
                </Label>
                <Input
                  placeholder="Search by machine number or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Machines List */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Multi-Setter Machines
              </CardTitle>
              <Badge variant="secondary">
                {filteredMachines?.length || 0} machines
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {machinesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : filteredMachines?.length === 0 ? (
              <Alert>
                <AlertDescription>
                  No multi-setter machines found for the selected criteria.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredMachines?.map(machine => (
                  <Card 
                    key={machine.id}
                    className="cursor-pointer hover:border-purple-300 hover:shadow-md transition-all group"
                    onClick={() => setSelectedMachine(machine)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Settings className="h-4 w-4 text-purple-600" />
                          <span className="font-medium">
                            {machine.machine_number}
                          </span>
                        </div>
                        <Badge 
                          variant="outline"
                          className="text-xs bg-purple-50 text-purple-700 border-purple-200"
                        >
                          Multi-Setter
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {machine.location || 'No location set'}
                      </p>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-purple-500 h-full transition-all"
                            style={{ width: `${(machine.occupiedPositions / machine.totalPositions) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium">
                          {machine.occupiedPositions}/{machine.totalPositions}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Layers className="h-3 w-3" />
                          {machine.activeFlocks} flocks
                        </div>
                        <Button size="sm" variant="ghost" className="h-7 text-xs group-hover:bg-purple-100">
                          Select
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // QA Entry View with Tabs
  return (
    <div className="space-y-4">
      {/* Header with Back Button */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setSelectedMachine(null)} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Machines
            </Button>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-medium">{selectedMachine.machine_number}</p>
                <p className="text-sm text-muted-foreground">{selectedMachine.location || 'Multi-Setter'}</p>
              </div>
              <Badge variant="outline" className="bg-purple-50 text-purple-700">
                {selectedMachine.occupiedPositions}/{selectedMachine.totalPositions} positions
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technician Info & Check Date */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Technician Name *</Label>
              <Input
                value={technicianName}
                onChange={(e) => setTechnicianName(e.target.value)}
                placeholder="Enter your name"
              />
            </div>
            <div className="space-y-2">
              <Label>Check Date</Label>
              <Input
                type="date"
                value={checkDate}
                onChange={(e) => setCheckDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any observations..."
                className="h-10 resize-none"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* QA Type Tabs */}
      <Tabs defaultValue="temperatures" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="temperatures" className="flex items-center gap-2">
            <Thermometer className="h-4 w-4" />
            18-Point Temps
          </TabsTrigger>
          <TabsTrigger value="angles" className="flex items-center gap-2">
            <Ruler className="h-4 w-4" />
            Setter Angles
          </TabsTrigger>
          <TabsTrigger value="humidity" className="flex items-center gap-2">
            <Droplets className="h-4 w-4" />
            Humidity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="temperatures">
          <MultiSetterQAEntry
            machine={{ id: selectedMachine.id, machine_number: selectedMachine.machine_number }}
            technicianName={technicianName}
            notes={notes}
            onSubmit={handleSubmitTemperatures}
          />
        </TabsContent>

        <TabsContent value="angles">
          <MachineWideAnglesEntry
            machine={{ id: selectedMachine.id, machine_number: selectedMachine.machine_number }}
            technicianName={technicianName}
            notes={notes}
            checkDate={checkDate}
            uniqueFlocks={uniqueFlockDetails}
            onSubmit={handleSubmitAngles}
          />
        </TabsContent>

        <TabsContent value="humidity">
          <MachineWideHumidityEntry
            machine={{ id: selectedMachine.id, machine_number: selectedMachine.machine_number }}
            technicianName={technicianName}
            notes={notes}
            checkDate={checkDate}
            uniqueFlocks={uniqueFlockDetails}
            onSubmit={handleSubmitHumidity}
          />
        </TabsContent>
      </Tabs>

      {isSubmitting && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
          <div className="flex items-center gap-3 bg-card p-4 rounded-lg shadow-lg">
            <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
            <span>Saving machine-level QA entry...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSetterQAWorkflow;
