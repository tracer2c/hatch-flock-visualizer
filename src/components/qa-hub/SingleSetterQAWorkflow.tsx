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
  RotateCcw,
  Timer
} from "lucide-react";
import { useHatcheries, useSingleSetterMachines } from '@/hooks/useQAHubData';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { submitSpecificGravityTest, submitWeightTracking } from '@/services/qaSubmissionService';
import Setter18PointTempGrid from '@/components/dashboard/Setter18PointTempGrid';
import RectalTempEntry from './RectalTempEntry';
import TrayWashEntry from './TrayWashEntry';
import CullChecksEntry from './CullChecksEntry';
import SpecificGravityEntry from './SpecificGravityEntry';
import SetterAnglesEntry from './SetterAnglesEntry';
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

const SingleSetterQAWorkflow: React.FC = () => {
  const [selectedHatcheryId, setSelectedHatcheryId] = useState<string>('all');
  const [selectedMachine, setSelectedMachine] = useState<SelectedMachine | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [technicianName, setTechnicianName] = useState('');
  const [notes, setNotes] = useState('');
  const [checkDate, setCheckDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: hatcheries, isLoading: hatcheriesLoading } = useHatcheries();
  const { data: machines, isLoading: machinesLoading, refetch } = useSingleSetterMachines(
    selectedHatcheryId === 'all' ? undefined : selectedHatcheryId
  );

  const filteredMachines = machines?.filter(machine => {
    const searchLower = searchTerm.toLowerCase();
    return (
      machine.machine_number?.toLowerCase().includes(searchLower) ||
      machine.currentHouse?.flock?.flock_name?.toLowerCase().includes(searchLower) ||
      machine.currentHouse?.batch_number?.toLowerCase().includes(searchLower) ||
      machine.location?.toLowerCase().includes(searchLower)
    );
  });

  const handleSubmit18PointTemp = async (data: { values: Record<string, number>; averages: { overall: number | null; front: number | null; middle: number | null; back: number | null } }) => {
    if (!selectedMachine || !technicianName.trim()) {
      toast.error('Please enter technician name');
      return;
    }

    if (!selectedMachine.currentHouse) {
      toast.error('No house loaded in this machine');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('qa_monitoring').insert({
        batch_id: selectedMachine.currentHouse.id,
        machine_id: selectedMachine.id,
        check_date: checkDate,
        check_time: new Date().toTimeString().split(' ')[0],
        day_of_incubation: selectedMachine.daysInIncubation,
        temperature: data.averages.overall || 0,
        humidity: 55,
        inspector_name: technicianName,
        notes: notes || null,
        entry_mode: 'house',
        temp_front_top_left: data.values.temp_front_top_left,
        temp_front_top_right: data.values.temp_front_top_right,
        temp_front_mid_left: data.values.temp_front_mid_left,
        temp_front_mid_right: data.values.temp_front_mid_right,
        temp_front_bottom_left: data.values.temp_front_bottom_left,
        temp_front_bottom_right: data.values.temp_front_bottom_right,
        temp_middle_top_left: data.values.temp_middle_top_left,
        temp_middle_top_right: data.values.temp_middle_top_right,
        temp_middle_mid_left: data.values.temp_middle_mid_left,
        temp_middle_mid_right: data.values.temp_middle_mid_right,
        temp_middle_bottom_left: data.values.temp_middle_bottom_left,
        temp_middle_bottom_right: data.values.temp_middle_bottom_right,
        temp_back_top_left: data.values.temp_back_top_left,
        temp_back_top_right: data.values.temp_back_top_right,
        temp_back_mid_left: data.values.temp_back_mid_left,
        temp_back_mid_right: data.values.temp_back_mid_right,
        temp_back_bottom_left: data.values.temp_back_bottom_left,
        temp_back_bottom_right: data.values.temp_back_bottom_right,
        temp_avg_overall: data.averages.overall,
        temp_avg_front: data.averages.front,
        temp_avg_middle: data.averages.middle,
        temp_avg_back: data.averages.back,
        candling_results: JSON.stringify({ type: 'setter_temperature_18point', setterNumber: selectedMachine.machine_number })
      });

      if (error) throw error;
      toast.success('18-point temperature saved!');
      setNotes('');
      refetch();
    } catch (error: any) {
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

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

  // Fixed: Now saves to qa_monitoring with proper flock/batch linkage
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

  // Fixed: Now saves to specific_gravity_tests table
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

  const handleSubmitSetterAngles = async (data: { setterNumber: string; angles: any; checkDate: string }) => {
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
        angle_top_left: data.angles.topLeft,
        angle_mid_left: data.angles.midLeft,
        angle_bottom_left: data.angles.bottomLeft,
        angle_top_right: data.angles.topRight,
        angle_mid_right: data.angles.midRight,
        angle_bottom_right: data.angles.bottomRight,
        inspector_name: technicianName,
        notes: notes || null,
        entry_mode: 'house',
        candling_results: JSON.stringify({ type: 'setter_angles', setterNumber: data.setterNumber })
      });
      if (error) throw error;
      toast.success('Setter angles saved!');
    } catch (error: any) {
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fixed: Now saves with proper flock/batch linkage
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

  // Fixed: Now saves to weight_tracking table
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
              Single Setter QA (per machine)
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
                  placeholder="Search by machine, flock, or house..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Single-Setter Machines</CardTitle>
              <Badge variant="secondary">{filteredMachines?.length || 0} machines</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {machinesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
              </div>
            ) : filteredMachines?.length === 0 ? (
              <Alert><AlertDescription>No single-setter machines found.</AlertDescription></Alert>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredMachines?.map(machine => (
                  <Card 
                    key={machine.id}
                    className={`cursor-pointer hover:border-blue-300 hover:shadow-md transition-all group ${!machine.hasOccupant ? 'opacity-60' : ''}`}
                    onClick={() => machine.hasOccupant && setSelectedMachine(machine as SelectedMachine)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Settings className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">{machine.machine_number}</span>
                        </div>
                        <Badge variant={machine.hasOccupant ? 'default' : 'outline'} className="text-xs">
                          {machine.hasOccupant ? 'Occupied' : 'Empty'}
                        </Badge>
                      </div>
                      {machine.location && (
                        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />{machine.location}
                        </p>
                      )}
                      {machine.currentHouse ? (
                        <div className="bg-muted/50 rounded-md p-2 mt-2">
                          <p className="text-xs font-medium text-foreground">Current House:</p>
                          <p className="text-sm font-medium text-primary">{machine.currentHouse.flock?.flock_name || 'Unknown Flock'}</p>
                          <p className="text-xs text-muted-foreground">House: {machine.currentHouse.batch_number}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-muted-foreground">Set: {new Date(machine.currentHouse.set_date).toLocaleDateString()}</span>
                            <span className="font-medium text-xs text-blue-600">Day {machine.daysInIncubation}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-muted/30 rounded-md p-2 mt-2">
                          <p className="text-xs text-muted-foreground text-center">No house currently loaded</p>
                        </div>
                      )}
                      <div className="mt-3 pt-2 border-t">
                        <Button size="sm" variant="ghost" className="w-full h-7 text-xs group-hover:bg-blue-100" disabled={!machine.hasOccupant}>
                          {machine.hasOccupant ? 'Select Machine' : 'No House to QA'}
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

  // QA Entry View with 8 Tabs
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setSelectedMachine(null)} className="gap-2">
              <ArrowLeft className="h-4 w-4" />Back to Machines
            </Button>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-medium">{selectedMachine.machine_number}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedMachine.currentHouse?.flock?.flock_name} - House {selectedMachine.currentHouse?.batch_number}
                </p>
              </div>
              <Badge variant="outline" className="bg-blue-50 text-blue-700">Day {selectedMachine.daysInIncubation}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

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

      <Tabs defaultValue="setter-temps" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
          <TabsTrigger value="setter-temps" className="flex items-center gap-1 text-xs">
            <Thermometer className="h-3 w-3" />Setter
          </TabsTrigger>
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
          <TabsTrigger value="angles" className="flex items-center gap-1 text-xs">
            <RotateCcw className="h-3 w-3" />Angles
          </TabsTrigger>
          <TabsTrigger value="hatch" className="flex items-center gap-1 text-xs">
            <Timer className="h-3 w-3" />Hatch
          </TabsTrigger>
          <TabsTrigger value="moisture" className="flex items-center gap-1 text-xs">
            <Droplets className="h-3 w-3" />Moisture
          </TabsTrigger>
        </TabsList>

        <TabsContent value="setter-temps">
          <Setter18PointTempGrid
            onSubmit={handleSubmit18PointTemp}
            checkDate={checkDate}
            onCheckDateChange={setCheckDate}
            setterNumber={selectedMachine.machine_number}
            onSetterNumberChange={() => {}}
            setterMachines={[]}
            currentMachine={{ machine_number: selectedMachine.machine_number }}
          />
        </TabsContent>

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
            flockId={selectedMachine.currentHouse?.flock?.id}
            flockNumber={selectedMachine.currentHouse?.flock?.flock_number}
            flockName={selectedMachine.currentHouse?.flock?.flock_name}
            batchId={selectedMachine.currentHouse?.id}
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

        <TabsContent value="angles">
          <SetterAnglesEntry technicianName={technicianName} checkDate={checkDate} setterNumber={selectedMachine.machine_number} onSubmit={handleSubmitSetterAngles} />
        </TabsContent>

        <TabsContent value="hatch">
          <HatchProgressionEntry 
            technicianName={technicianName} 
            checkDate={checkDate} 
            flockId={selectedMachine.currentHouse?.flock?.id}
            flockNumber={selectedMachine.currentHouse?.flock?.flock_number}
            flockName={selectedMachine.currentHouse?.flock?.flock_name}
            batchId={selectedMachine.currentHouse?.id}
            onSubmit={handleSubmitHatchProgression} 
          />
        </TabsContent>

        <TabsContent value="moisture">
          <MoistureLossEntry 
            technicianName={technicianName} 
            checkDate={checkDate} 
            flockId={selectedMachine.currentHouse?.flock?.id}
            flockNumber={selectedMachine.currentHouse?.flock?.flock_number}
            flockName={selectedMachine.currentHouse?.flock?.flock_name}
            batchId={selectedMachine.currentHouse?.id}
            machineId={selectedMachine.id}
            daysInIncubation={selectedMachine.daysInIncubation}
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
