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
  Thermometer, 
  Building2, 
  Calendar, 
  ArrowLeft, 
  Search,
  Settings,
  MapPin,
  Droplets,
  AlertTriangle,
  Scale,
  Timer
} from "lucide-react";
import { useHatcheries, useSingleSetterMachines } from '@/hooks/useQAHubData';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { submitSpecificGravityTest, submitWeightTracking } from '@/services/qaSubmissionService';
import RectalTempEntry from './RectalTempEntry';
import TrayWashEntry from './TrayWashEntry';
import CullChecksEntry from './CullChecksEntry';
import SpecificGravityEntry from './SpecificGravityEntry';
import HatchProgressionEntry from './HatchProgressionEntry';
import MoistureLossEntry from './MoistureLossEntry';

interface SelectedMachine {
  id: string;
  machine_number: string;
  location: string | null;
  currentHouse: {
    id: string;
    batch_number: string;
    set_date: string;
    flock: { id: string; flock_name: string; flock_number: number } | null;
  } | null;
  daysInIncubation: number;
}

interface SingleSetterQAWorkflowProps {
  preSelectedHouseId?: string | null;
  preSelectedAction?: string | null;
}

const SingleSetterQAWorkflow: React.FC<SingleSetterQAWorkflowProps> = ({ 
  preSelectedHouseId, 
  preSelectedAction 
}) => {
  const [selectedHatcheryId, setSelectedHatcheryId] = useState<string>('all');
  const [selectedMachine, setSelectedMachine] = useState<SelectedMachine | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [technicianName, setTechnicianName] = useState('');
  const [notes, setNotes] = useState('');
  const [checkDate, setCheckDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeQATab, setActiveQATab] = useState('rectal-temps');

  const { data: hatcheries, isLoading: hatcheriesLoading } = useHatcheries();
  const { data: machines, isLoading: machinesLoading, refetch } = useSingleSetterMachines(
    selectedHatcheryId === 'all' ? undefined : selectedHatcheryId
  );

  // Auto-select machine if preSelectedHouseId is provided
  React.useEffect(() => {
    if (preSelectedHouseId && machines && machines.length > 0) {
      const machineWithHouse = machines.find(m => m.currentHouse?.id === preSelectedHouseId);
      if (machineWithHouse) {
        setSelectedMachine(machineWithHouse as SelectedMachine);
      }
    }
  }, [preSelectedHouseId, machines]);

  const filteredMachines = machines?.filter(machine => {
    const searchLower = searchTerm.toLowerCase();
    return (
      machine.machine_number?.toLowerCase().includes(searchLower) ||
      machine.currentHouse?.flock?.flock_name?.toLowerCase().includes(searchLower) ||
      machine.currentHouse?.batch_number?.toLowerCase().includes(searchLower) ||
      machine.location?.toLowerCase().includes(searchLower)
    );
  });

  const handleSubmitRectalTemp = async (data: { location: string; temperature: number; checkTime: string; checkDate: string }) => {
    if (!selectedMachine?.currentHouse || !technicianName.trim()) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('qa_monitoring').insert({
        batch_id: selectedMachine.currentHouse.id,
        machine_id: selectedMachine.id,
        check_date: data.checkDate,
        check_time: data.checkTime || new Date().toTimeString().split(' ')[0],
        day_of_incubation: selectedMachine.daysInIncubation,
        temperature: data.temperature,
        humidity: 55,
        inspector_name: technicianName,
        notes: notes || null,
        entry_mode: 'house',
        candling_results: JSON.stringify({ type: 'rectal_temperature', location: data.location })
      });
      if (error) throw error;
      toast.success('Rectal temperature saved!');
    } catch (error: any) {
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitTrayWash = async (data: { firstCheck: number; secondCheck: number; thirdCheck: number; washDate: string }) => {
    if (!selectedMachine?.currentHouse || !technicianName.trim()) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('qa_monitoring').insert({
        batch_id: selectedMachine.currentHouse.id,
        machine_id: selectedMachine.id,
        check_date: data.washDate,
        check_time: new Date().toTimeString().split(' ')[0],
        day_of_incubation: selectedMachine.daysInIncubation,
        temperature: (data.firstCheck + data.secondCheck + data.thirdCheck) / 3,
        humidity: 55,
        inspector_name: technicianName,
        notes: notes || null,
        entry_mode: 'house',
        candling_results: JSON.stringify({ type: 'tray_wash', firstCheck: data.firstCheck, secondCheck: data.secondCheck, thirdCheck: data.thirdCheck })
      });
      if (error) throw error;
      toast.success('Tray wash temperatures saved!');
    } catch (error: any) {
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitCullCheck = async (data: { flock_id: string; batch_id: string | null; maleCount: number; femaleCount: number; defectType: string; checkDate: string }) => {
    if (!selectedMachine?.currentHouse || !technicianName.trim()) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('qa_monitoring').insert({
        batch_id: selectedMachine.currentHouse.id,
        machine_id: selectedMachine.id,
        check_date: data.checkDate,
        check_time: new Date().toTimeString().split(' ')[0],
        day_of_incubation: selectedMachine.daysInIncubation,
        temperature: 100,
        humidity: 55,
        mortality_count: data.maleCount + data.femaleCount,
        inspector_name: technicianName,
        notes: notes || null,
        entry_mode: 'house',
        candling_results: JSON.stringify({ type: 'cull_check', flock_id: data.flock_id, maleCount: data.maleCount, femaleCount: data.femaleCount, defectType: data.defectType })
      });
      if (error) throw error;
      toast.success('Cull check saved!');
    } catch (error: any) {
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitSpecificGravity = async (data: { flock_id: string; batch_id: string | null; age: number; sampleSize: number; floatCount: number; floatPercentage: number; testDate: string }) => {
    if (!selectedMachine?.currentHouse || !technicianName.trim()) return;
    setIsSubmitting(true);
    try {
      const result = await submitSpecificGravityTest({
        flock_id: data.flock_id,
        batch_id: selectedMachine.currentHouse.id,
        test_date: data.testDate,
        age_weeks: data.age,
        sample_size: data.sampleSize,
        float_count: data.floatCount,
        float_percentage: data.floatPercentage,
        notes: notes || null
      });

      if (!result.success) throw new Error(result.error);
      toast.success('Specific gravity test saved to dedicated table!');
      setNotes('');
    } catch (error: any) {
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitHatchProgression = async (data: { flock_id: string; batch_id: string | null; stage: string; percentageOut: number; totalCount: number; hatchedCount: number; checkHour: number; hatchDate: string }) => {
    if (!selectedMachine?.currentHouse || !technicianName.trim()) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('qa_monitoring').insert({
        batch_id: selectedMachine.currentHouse.id,
        machine_id: selectedMachine.id,
        check_date: data.hatchDate,
        check_time: new Date().toTimeString().split(' ')[0],
        day_of_incubation: selectedMachine.daysInIncubation,
        temperature: 100,
        humidity: data.percentageOut,
        inspector_name: technicianName,
        notes: notes || null,
        entry_mode: 'house',
        candling_results: JSON.stringify({ type: 'hatch_progression', flock_id: data.flock_id, stage: data.stage, percentageOut: data.percentageOut, totalCount: data.totalCount, hatchedCount: data.hatchedCount, checkHour: data.checkHour })
      });
      if (error) throw error;
      toast.success('Hatch progression saved!');
    } catch (error: any) {
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitMoistureLoss = async (data: { flock_id: string; batch_id: string | null; machine_id: string | null; day1Weight: number; day18Weight: number; lossPercentage: number; dayOfIncubation: number; testDate: string }) => {
    if (!selectedMachine?.currentHouse || !technicianName.trim()) return;
    setIsSubmitting(true);
    try {
      const result = await submitWeightTracking({
        batch_id: selectedMachine.currentHouse.id,
        flock_id: selectedMachine.currentHouse.flock?.id || null,
        machine_id: selectedMachine.id,
        check_date: data.testDate,
        day_of_incubation: data.dayOfIncubation,
        total_weight: data.day1Weight,
        percent_loss: data.lossPercentage,
        notes: notes ? `Day 1: ${data.day1Weight}g, Day 18: ${data.day18Weight}g. ${notes}` : `Day 1: ${data.day1Weight}g, Day 18: ${data.day18Weight}g`
      });

      if (!result.success) throw new Error(result.error);
      toast.success('Moisture loss saved to weight tracking table!');
      setNotes('');
    } catch (error: any) {
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Machine Selection View
  if (!selectedMachine) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Thermometer className="h-5 w-5 text-blue-600" strokeWidth={1.5} />
              Single Stage Setter QA (per machine)
            </CardTitle>
            <CardDescription>
              Select a single-setter machine to enter QA readings. System auto-links to the house currently loaded.
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
                  placeholder="Search by machine number, flock, or house..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {(hatcheriesLoading || machinesLoading) ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMachines?.map(machine => (
              <Card 
                key={machine.id} 
                className={`cursor-pointer transition-all hover:shadow-md ${machine.currentHouse ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200 bg-gray-50/30'}`}
                onClick={() => setSelectedMachine(machine as SelectedMachine)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Settings className="h-5 w-5 text-muted-foreground" />
                      <span className="font-semibold">{machine.machine_number}</span>
                    </div>
                    <Badge variant={machine.currentHouse ? 'default' : 'secondary'}>
                      {machine.currentHouse ? 'Occupied' : 'Empty'}
                    </Badge>
                  </div>

                  {machine.location && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                      <MapPin className="h-3 w-3" />
                      {machine.location}
                    </div>
                  )}

                  {machine.currentHouse ? (
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{machine.currentHouse.flock?.flock_name || 'Unknown Flock'}</span>
                      </div>
                      <div className="text-muted-foreground">
                        House #{machine.currentHouse.batch_number}
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        Day {machine.daysInIncubation} of incubation
                      </div>
                    </div>
                  ) : (
                    <Alert className="mt-2 py-2">
                      <AlertDescription className="text-xs">
                        No house currently loaded in this machine
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {filteredMachines?.length === 0 && !machinesLoading && (
          <Alert>
            <AlertDescription>
              No single-setter machines found. Check your search filters or hatchery selection.
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  // QA Entry View (machine selected)
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setSelectedMachine(null)}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <div>
                <CardTitle className="text-lg">{selectedMachine.machine_number}</CardTitle>
                <CardDescription>
                  {selectedMachine.currentHouse ? (
                    <>
                      {selectedMachine.currentHouse.flock?.flock_name} • House #{selectedMachine.currentHouse.batch_number} • Day {selectedMachine.daysInIncubation}
                    </>
                  ) : (
                    'No house loaded'
                  )}
                </CardDescription>
              </div>
            </div>
            <Badge variant={selectedMachine.currentHouse ? 'default' : 'secondary'}>
              {selectedMachine.currentHouse ? `Day ${selectedMachine.daysInIncubation}` : 'Empty'}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {!selectedMachine.currentHouse ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This machine has no house loaded. QA entry requires a house to be set in the machine.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Technician Name *</Label>
              <Input value={technicianName} onChange={(e) => setTechnicianName(e.target.value)} placeholder="Enter your name" />
            </div>
            <div className="space-y-2">
              <Label>Check Date</Label>
              <Input type="date" value={checkDate} onChange={(e) => setCheckDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add observations..." className="h-10 resize-none" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeQATab} onValueChange={setActiveQATab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="rectal-temps" className="flex items-center gap-1 text-xs">
            <Thermometer className="h-3 w-3" />Rectal
          </TabsTrigger>
          <TabsTrigger value="tray-wash" className="flex items-center gap-1 text-xs">
            <Droplets className="h-3 w-3" />Wash
          </TabsTrigger>
          <TabsTrigger value="culls" className="flex items-center gap-1 text-xs">
            <AlertTriangle className="h-3 w-3" />Culls
          </TabsTrigger>
          <TabsTrigger value="gravity" className="flex items-center gap-1 text-xs">
            <Scale className="h-3 w-3" />Gravity
          </TabsTrigger>
          <TabsTrigger value="hatch" className="flex items-center gap-1 text-xs">
            <Timer className="h-3 w-3" />Hatch
          </TabsTrigger>
          <TabsTrigger value="moisture" className="flex items-center gap-1 text-xs">
            <Droplets className="h-3 w-3" />Moisture
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rectal-temps">
          <RectalTempEntry technicianName={technicianName} checkDate={checkDate} onSubmit={handleSubmitRectalTemp} />
        </TabsContent>

        <TabsContent value="tray-wash">
          <TrayWashEntry technicianName={technicianName} checkDate={checkDate} onSubmit={handleSubmitTrayWash} />
        </TabsContent>

        <TabsContent value="culls">
          <CullChecksEntry 
            technicianName={technicianName} 
            checkDate={checkDate} 
            defaultFlockId={selectedMachine.currentHouse?.flock?.id}
            defaultBatchId={selectedMachine.currentHouse?.id}
            onSubmit={handleSubmitCullCheck} 
          />
        </TabsContent>

        <TabsContent value="gravity">
          <SpecificGravityEntry 
            technicianName={technicianName} 
            checkDate={checkDate} 
            flockId={selectedMachine.currentHouse?.flock?.id}
            flockNumber={selectedMachine.currentHouse?.flock?.flock_number}
            flockName={selectedMachine.currentHouse?.flock?.flock_name}
            batchId={selectedMachine.currentHouse?.id}
            onSubmit={handleSubmitSpecificGravity} 
          />
        </TabsContent>

        <TabsContent value="hatch">
          <HatchProgressionEntry 
            technicianName={technicianName} 
            checkDate={checkDate} 
            defaultFlockId={selectedMachine.currentHouse?.flock?.id}
            defaultBatchId={selectedMachine.currentHouse?.id}
            onSubmit={handleSubmitHatchProgression} 
          />
        </TabsContent>

        <TabsContent value="moisture">
          <MoistureLossEntry 
            technicianName={technicianName} 
            checkDate={checkDate} 
            defaultFlockId={selectedMachine.currentHouse?.flock?.id}
            defaultBatchId={selectedMachine.currentHouse?.id}
            machineId={selectedMachine.id}
            dayOfIncubation={selectedMachine.daysInIncubation}
            onSubmit={handleSubmitMoistureLoss} 
          />
        </TabsContent>
      </Tabs>

      {isSubmitting && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
          <div className="flex items-center gap-3 bg-card p-4 rounded-lg shadow-lg">
            <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
            <span>Saving QA entry...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SingleSetterQAWorkflow;
