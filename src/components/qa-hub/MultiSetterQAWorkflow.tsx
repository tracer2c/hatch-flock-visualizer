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
  Droplets,
  AlertTriangle,
  Scale,
  Timer,
  Eye,
  WifiOff,
} from "lucide-react";
import { useHatcheries, useMultiSetterMachines } from '@/hooks/useQAHubData';
import { usePositionOccupancy } from '@/hooks/usePositionOccupancy';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { type FlockLinkage } from '@/services/qaSubmissionService';
import {
  submitMachineLevelQAOffline,
  submitMachineWideQAOffline,
  submitGenericQAOffline,
  submitSpecificGravityOffline,
  submitWeightTrackingMultiOffline,
  submitCandlingQAMultiOffline,
} from '@/services/offlineQASubmissionService';
import { getOfflineData } from '@/lib/offlineDataCache';
import type { UserProfile } from '@/hooks/useAuth';
import { getUserCompanyId } from '@/services/qaSubmissionService';
import MultiSetterQAEntry from '@/components/dashboard/MultiSetterQAEntry';
import MachineWideAnglesEntry from '@/components/qa-hub/MachineWideAnglesEntry';
import MachineWideHumidityEntry from '@/components/qa-hub/MachineWideHumidityEntry';
import RectalTempEntry from './RectalTempEntry';
import TrayWashEntry from './TrayWashEntry';
import CullChecksEntry from './CullChecksEntry';
import SpecificGravityEntry from './SpecificGravityEntry';
import HatchProgressionEntry from './HatchProgressionEntry';
import MoistureLossEntry from './MoistureLossEntry';
import CandlingEntry from './CandlingEntry';
import { PendingSyncList } from '@/components/ui/pending-sync-list';
import { OccupancyInfo } from '@/utils/setterPositionMapping';
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";

interface SelectedMachine {
  id: string;
  machine_number: string;
  location: string | null;
  occupiedPositions: number;
  totalPositions: number;
  activeFlocks: number;
  unit?: { name: string } | null;
}

interface MultiSetterQAWorkflowProps {
  focusSection?: string;
}

const MultiSetterQAWorkflow: React.FC<MultiSetterQAWorkflowProps> = ({ focusSection }) => {
  const [selectedHatcheryId, setSelectedHatcheryId] = useState<string>('all');
  const [selectedMachine, setSelectedMachine] = useState<SelectedMachine | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [technicianName, setTechnicianName] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkDate, setCheckDate] = useState(new Date().toISOString().split('T')[0]);

  const { isOnline } = useOnlineStatus();
  const { profile } = useAuth();

  const resolveCompanyId = async (): Promise<string> => {
    if (profile?.company_id) return profile.company_id;
    const cached = await getOfflineData<UserProfile>('current-user-profile');
    if (cached?.company_id) return cached.company_id;
    return getUserCompanyId();
  };

  const { data: hatcheries } = useHatcheries();
  const { data: machines, isLoading: machinesLoading, refetch } = useMultiSetterMachines(
    selectedHatcheryId === 'all' ? undefined : selectedHatcheryId
  );

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

  // Convert uniqueFlockDetails to FlockLinkage array
  const getFlockLinkages = (): FlockLinkage[] => {
    return uniqueFlockDetails.map(f => ({ 
      flock_id: f.flock_id, 
      batch_id: f.batch_id || null 
    }));
  };

  // Convert to format for entry components
  const getAvailableFlocks = () => {
    return uniqueFlockDetails.map(f => ({
      flock_id: f.flock_id,
      flock_name: f.flock_name,
      flock_number: f.flock_number,
      batch_id: f.batch_id || null
    }));
  };

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
      const result = await submitMachineLevelQAOffline(
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
        data.positionOccupancy,
        isOnline
      );

      if (!result.success) throw new Error(result.error);
      toast.success(result.offline ? 'Saved offline — will sync when back online' : 'Machine-level temperature QA saved!');
      setNotes('');
      if (!result.offline) refetch();
    } catch (error: any) {
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitAngles = async (data: {
    angles: { angle_top_left: number; angle_mid_left: number; angle_bottom_left: number; angle_top_right: number; angle_mid_right: number; angle_bottom_right: number };
    checkDate: string;
    uniqueFlocks: { flock_id: string; batch_id: string | null; flock_name: string; flock_number: number }[];
  }) => {
    if (!selectedMachine || !technicianName.trim()) {
      toast.error('Please enter technician name');
      return;
    }

    setIsSubmitting(true);
    try {
      const flockLinkages: FlockLinkage[] = data.uniqueFlocks.map(f => ({ flock_id: f.flock_id, batch_id: f.batch_id }));

      const result = await submitMachineWideQAOffline(
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
        flockLinkages,
        isOnline
      );

      if (!result.success) throw new Error(result.error);
      toast.success(result.offline ? 'Saved offline — will sync when back online' : 'Machine-wide angles saved!');
      setNotes('');
      if (!result.offline) refetch();
    } catch (error: any) {
      toast.error(`Failed to save: ${error.message}`);
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
      const flockLinkages: FlockLinkage[] = data.uniqueFlocks.map(f => ({ flock_id: f.flock_id, batch_id: f.batch_id }));

      const result = await submitMachineWideQAOffline(
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
        flockLinkages,
        isOnline
      );

      if (!result.success) throw new Error(result.error);
      toast.success(result.offline ? 'Saved offline — will sync when back online' : 'Machine-wide humidity saved!');
      setNotes('');
      if (!result.offline) refetch();
    } catch (error: any) {
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitRectalTemp = async (data: { location: string; temperature: number; checkTime: string; checkDate: string }) => {
    if (!selectedMachine || !technicianName.trim()) {
      toast.error('Please enter technician name');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitGenericQAOffline(
        selectedMachine.id,
        technicianName,
        data.checkDate,
        'rectal_temperature',
        { location: data.location, temperature: data.temperature, checkTime: data.checkTime },
        getFlockLinkages(),
        isOnline,
        notes
      );

      if (!result.success) throw new Error(result.error);
      toast.success(result.offline ? 'Saved offline — will sync when back online' : 'Rectal temperature saved!');
      setNotes('');
    } catch (error: any) {
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitTrayWash = async (data: { firstCheck: number; secondCheck: number; thirdCheck: number; washDate: string }) => {
    if (!selectedMachine || !technicianName.trim()) {
      toast.error('Please enter technician name');
      return;
    }

    setIsSubmitting(true);
    try {
      const avgTemp = (data.firstCheck + data.secondCheck + data.thirdCheck) / 3;
      const result = await submitGenericQAOffline(
        selectedMachine.id,
        technicianName,
        data.washDate,
        'tray_wash',
        { firstCheck: data.firstCheck, secondCheck: data.secondCheck, thirdCheck: data.thirdCheck, temperature: avgTemp },
        getFlockLinkages(),
        isOnline,
        notes
      );

      if (!result.success) throw new Error(result.error);
      toast.success(result.offline ? 'Saved offline — will sync when back online' : 'Tray wash saved!');
      setNotes('');
    } catch (error: any) {
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitCullCheck = async (data: { flock_id: string; batch_id: string | null; maleCount: number; femaleCount: number; defectType: string; checkDate: string }) => {
    if (!selectedMachine || !technicianName.trim()) {
      toast.error('Please enter technician name');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitGenericQAOffline(
        selectedMachine.id,
        technicianName,
        data.checkDate,
        'cull_check',
        { flock_id: data.flock_id, maleCount: data.maleCount, femaleCount: data.femaleCount, defectType: data.defectType, mortalityCount: data.maleCount + data.femaleCount },
        [{ flock_id: data.flock_id, batch_id: data.batch_id }],
        isOnline,
        notes
      );

      if (!result.success) throw new Error(result.error);
      toast.success(result.offline ? 'Saved offline — will sync when back online' : 'Cull check saved!');
      setNotes('');
    } catch (error: any) {
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitSpecificGravity = async (data: { flock_id: string; batch_id: string | null; age: number; sampleSize: number; floatCount: number; floatPercentage: number; testDate: string }) => {
    if (!selectedMachine || !technicianName.trim()) {
      toast.error('Please enter technician name');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitSpecificGravityOffline(
        {
          flock_id: data.flock_id,
          batch_id: data.batch_id,
          test_date: data.testDate,
          age_weeks: data.age,
          sample_size: data.sampleSize,
          float_count: data.floatCount,
          float_percentage: data.floatPercentage,
          notes: notes || null
        },
        isOnline
      );

      if (!result.success) throw new Error(result.error);
      toast.success(result.offline ? 'Saved offline — will sync when back online' : 'Specific gravity saved!');
      setNotes('');
    } catch (error: any) {
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitHatchProgression = async (data: { flock_id: string; batch_id: string | null; stage: string; percentageOut: number; totalCount: number; hatchedCount: number; checkHour: number; hatchDate: string }) => {
    if (!technicianName.trim()) {
      toast.error('Please enter technician name');
      return;
    }
    if (!selectedMachine) {
      toast.error('Select a machine first.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitGenericQAOffline(
        selectedMachine.id,
        technicianName,
        data.hatchDate,
        'hatch_progression',
        {
          flock_id: data.flock_id,
          batch_id: data.batch_id,
          machine_id: selectedMachine.id,
          stage: data.stage,
          percentageOut: data.percentageOut,
          totalCount: data.totalCount,
          hatchedCount: data.hatchedCount,
          checkHour: data.checkHour,
          humidity: data.percentageOut,
        },
        [{ flock_id: data.flock_id, batch_id: data.batch_id }],
        isOnline,
        notes
      );

      if (!result.success) throw new Error(result.error);
      toast.success(result.offline ? 'Saved offline — will sync when back online' : 'Hatch progression saved!');
      setNotes('');
    } catch (error: any) {
      toast.error(`Failed to save: ${error.message}`);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitMoistureLoss = async (data: { flock_id: string; batch_id: string | null; machine_id: string | null; day1Weight: number; day18Weight: number; lossPercentage: number; dayOfIncubation: number; testDate: string }) => {
    if (!selectedMachine || !technicianName.trim()) {
      toast.error('Please enter technician name');
      return;
    }

    setIsSubmitting(true);
    try {
      const combinedNotes = notes
        ? `Day 1: ${data.day1Weight}g, Day 18: ${data.day18Weight}g. ${notes}`
        : `Day 1: ${data.day1Weight}g, Day 18: ${data.day18Weight}g`;

      const result = await submitWeightTrackingMultiOffline(
        selectedMachine.id,
        data.testDate,
        data.dayOfIncubation,
        data.day1Weight,
        data.lossPercentage,
        [{ flock_id: data.flock_id, batch_id: data.batch_id }],
        isOnline,
        combinedNotes
      );

      if (!result.success) throw new Error(result.error);
      toast.success(result.offline ? 'Saved offline — will sync when back online' : 'Moisture loss saved!');
      setNotes('');
    } catch (error: any) {
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitCandling = async (data: { flock_id: string; batch_id: string | null; checkDate: string; sampleSize: number; fertileEggs: number; infertileEggs: number; fertilityPercent: number; notes: string }) => {
    if (!selectedMachine || !technicianName.trim()) {
      toast.error('Please enter technician name');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitCandlingQAMultiOffline(
        selectedMachine.id,
        technicianName,
        data.checkDate,
        data.sampleSize,
        data.fertileEggs,
        data.infertileEggs,
        data.fertilityPercent,
        getFlockLinkages(),
        isOnline,
        data.notes || notes || null
      );

      if (!result.success) throw new Error(result.error);
      toast.success(result.offline ? 'Saved offline — will sync when back online' : 'Candling results saved!');
      setNotes('');
      if (!result.offline) refetch();
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
        {!isOnline && (
          <Alert className="border-amber-300 bg-amber-50 text-amber-800">
            <WifiOff className="h-4 w-4" />
            <AlertDescription>
              You're offline. Machine list shown from cache. QA entries will be saved locally and synced when back online.
            </AlertDescription>
          </Alert>
        )}
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
                  <Building2 className="h-4 w-4" />Hatchery
                </Label>
                <Select value={selectedHatcheryId} onValueChange={setSelectedHatcheryId}>
                  <SelectTrigger><SelectValue placeholder="Select hatchery" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Hatcheries</SelectItem>
                    {hatcheries?.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="flex items-center gap-2">
                  <Search className="h-4 w-4" />Search Machines
                </Label>
                <Input placeholder="Search by machine number or location..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Multi-Setter Machines</CardTitle>
              <Badge variant="secondary">{filteredMachines?.length || 0} machines</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {machinesLoading ? (
              <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>
            ) : filteredMachines?.length === 0 ? (
              <Alert><AlertDescription>No multi-setter machines found.</AlertDescription></Alert>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredMachines?.map(machine => (
                  <Card key={machine.id} className="cursor-pointer hover:border-purple-300 hover:shadow-md transition-all group" onClick={() => setSelectedMachine(machine)}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Settings className="h-4 w-4 text-purple-600" />
                          <span className="font-medium">{machine.machine_number}</span>
                        </div>
                        <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">Multi-Setter</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{machine.location || 'No location set'}</p>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                          <div className="bg-purple-500 h-full transition-all" style={{ width: `${(machine.occupiedPositions / machine.totalPositions) * 100}%` }} />
                        </div>
                        <span className="text-xs font-medium">{machine.occupiedPositions}/{machine.totalPositions}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Layers className="h-3 w-3" />{machine.activeFlocks} flocks
                        </div>
                        <Button size="sm" variant="ghost" className="h-7 text-xs group-hover:bg-purple-100">Select</Button>
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

  // QA Entry View with 10 Tabs
  return (
    <div className="space-y-4">
      {!isOnline && (
        <Alert className="border-amber-300 bg-amber-50 text-amber-800">
          <WifiOff className="h-4 w-4" />
          <AlertDescription>
            You're offline. QA entries will be saved locally and synced automatically when back online.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setSelectedMachine(null)} className="gap-2">
              <ArrowLeft className="h-4 w-4" />Back to Machines
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

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Technician Name *</Label>
              <Input value={technicianName} onChange={(e) => setTechnicianName(e.target.value)} placeholder="Enter your name" />
            </div>
            <div className="space-y-2">
              <Label>Check Date</Label>
              <DatePicker
                date={checkDate}
                onSelect={(date) => {
                  const dateStr = date ? format(date, 'yyyy-MM-dd') : new Date().toISOString().split('T')[0];
                  setCheckDate(dateStr);
                }}
                placeholder="Select check date"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add observations..." className="h-10 resize-none" />
            </div>
          </div>
        </CardContent>
      </Card>

      <PendingSyncList
        table="qa_monitoring"
        title="QA records waiting to sync"
      />
      <PendingSyncList
        table="specific_gravity_tests"
        title="Specific gravity records waiting to sync"
      />
      <PendingSyncList
        table="weight_tracking"
        title="Moisture loss records waiting to sync"
      />

      <Tabs defaultValue={focusSection || "temperatures"} className="space-y-4">
        {!focusSection && (
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-9">
            <TabsTrigger value="temperatures" className="flex items-center gap-1 text-xs">
              <Thermometer className="h-3 w-3" />Temps
            </TabsTrigger>
            <TabsTrigger value="angles" className="flex items-center gap-1 text-xs">
              <Ruler className="h-3 w-3" />Angles
            </TabsTrigger>
            <TabsTrigger value="humidity" className="flex items-center gap-1 text-xs">
              <Droplets className="h-3 w-3" />Humidity
            </TabsTrigger>
            <TabsTrigger value="rectal" className="flex items-center gap-1 text-xs">
              <Thermometer className="h-3 w-3" />Rectal
            </TabsTrigger>
            <TabsTrigger value="wash" className="flex items-center gap-1 text-xs">
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
            <TabsTrigger value="candling" className="flex items-center gap-1 text-xs">
              <Eye className="h-3 w-3" />Candling
            </TabsTrigger>
          </TabsList>
        )}

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

        <TabsContent value="rectal">
          <RectalTempEntry 
            technicianName={technicianName} 
            checkDate={checkDate} 
            onSubmit={handleSubmitRectalTemp} 
          />
        </TabsContent>

        <TabsContent value="wash">
          <TrayWashEntry 
            technicianName={technicianName} 
            checkDate={checkDate} 
            onSubmit={handleSubmitTrayWash} 
          />
        </TabsContent>

        <TabsContent value="culls">
          <CullChecksEntry 
            technicianName={technicianName} 
            checkDate={checkDate} 
            flockOptions={getAvailableFlocks()}
            onSubmit={handleSubmitCullCheck} 
          />
        </TabsContent>

        <TabsContent value="gravity">
          <SpecificGravityEntry 
            technicianName={technicianName} 
            checkDate={checkDate} 
            availableFlocks={getAvailableFlocks()}
            onSubmit={handleSubmitSpecificGravity} 
          />
        </TabsContent>

        <TabsContent value="hatch">
          <HatchProgressionEntry 
            technicianName={technicianName} 
            checkDate={checkDate} 
            flockOptions={getAvailableFlocks()}
            onSubmit={handleSubmitHatchProgression} 
          />
        </TabsContent>

        <TabsContent value="moisture">
          <MoistureLossEntry 
            technicianName={technicianName} 
            checkDate={checkDate} 
            machineId={selectedMachine.id}
            flockOptions={getAvailableFlocks()}
            onSubmit={handleSubmitMoistureLoss} 
          />
        </TabsContent>

        <TabsContent value="candling">
          <CandlingEntry 
            availableFlocks={getAvailableFlocks()}
            onSubmit={handleSubmitCandling}
            isSubmitting={isSubmitting}
            mode="multi"
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
