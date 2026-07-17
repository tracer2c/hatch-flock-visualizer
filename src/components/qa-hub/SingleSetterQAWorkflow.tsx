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
import { getUserCompanyId } from '@/services/qaSubmissionService';
import { useOfflineSubmit } from '@/hooks/useOfflineSubmit';
import { useAuth } from '@/hooks/useAuth';
import { PendingSyncList } from '@/components/ui/pending-sync-list';
import { getOfflineData } from '@/lib/offlineDataCache';
import type { UserProfile } from '@/hooks/useAuth';
import RectalTempEntry from './RectalTempEntry';
import TrayWashEntry, { type TrayWashSubmitData } from './TrayWashEntry';
import { useTodaysTrayWash } from '@/hooks/useTodaysTrayWash';
import { useDayScopedEntry } from '@/hooks/useDayScopedEntry';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import CullChecksEntry from './CullChecksEntry';
import SpecificGravityEntry from './SpecificGravityEntry';
import HatchProgressionEntry from './HatchProgressionEntry';
import MoistureLossEntry from './MoistureLossEntry';
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";

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
  focusSection?: string;
}

const SingleSetterQAWorkflow: React.FC<SingleSetterQAWorkflowProps> = ({ 
  preSelectedHouseId, 
  preSelectedAction,
  focusSection,
}) => {
  const [selectedHatcheryId, setSelectedHatcheryId] = useState<string>('all');
  const [selectedMachine, setSelectedMachine] = useState<SelectedMachine | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  // Technician name is locked to the signed-in user — see derived value below.
  const [notes, setNotes] = useState('');
  const [checkDate, setCheckDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeQATab, setActiveQATab] = useState(focusSection || 'rectal-temps');
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { submit: submitQAMonitoring } = useOfflineSubmit('qa_monitoring', {
    invalidateQueries: ['qa_monitoring', 'recent-qa-entries'],
  });
  const { submit: submitSpecificGravity } = useOfflineSubmit('specific_gravity_tests', {
    invalidateQueries: ['specific_gravity_tests'],
  });
  const { submit: submitWeightTrackingRecord } = useOfflineSubmit('weight_tracking', {
    invalidateQueries: ['weight_tracking'],
  });

  const resolveCompanyId = async () => {
    if (profile?.company_id) return profile.company_id;
    const cachedProfile = await getOfflineData<UserProfile>('current-user-profile');
    if (cachedProfile?.company_id) return cachedProfile.company_id;
    return getUserCompanyId();
  };

  const { data: hatcheries, isLoading: hatcheriesLoading } = useHatcheries();
  const { data: machines, isLoading: machinesLoading, refetch } = useSingleSetterMachines(
    selectedHatcheryId === 'all' ? undefined : selectedHatcheryId
  );

  // Today's tray-wash row for the selected machine + date (resume support).
  const { data: existingTrayWash, isLoading: trayWashLoading } = useTodaysTrayWash(
    selectedMachine?.id ?? null,
    checkDate
  );
  const { isPastDay, todayISO, mode: dayMode, lastSavedAt: trayWashLastSavedAt } = useDayScopedEntry({
    checkDate,
    existingRow: existingTrayWash ?? null,
  });

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
      const companyId = await resolveCompanyId();
      await submitQAMonitoring({
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
        candling_results: JSON.stringify({ type: 'rectal_temperature', location: data.location }),
        company_id: companyId,
      }, 'insert', {
        batchId: selectedMachine.currentHouse.id,
      });
      toast.success('Rectal temperature saved!');
    } catch (error: any) {
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitTrayWash = async (data: TrayWashSubmitData) => {
    if (!selectedMachine?.currentHouse || !technicianName.trim()) return;
    setIsSubmitting(true);
    try {
      const companyId = await resolveCompanyId();
      const filledTemps = [data.firstCheck, data.secondCheck, data.thirdCheck].filter(
        (v): v is number => typeof v === 'number' && Number.isFinite(v)
      );
      const avgTemp = filledTemps.length
        ? filledTemps.reduce((a, b) => a + b, 0) / filledTemps.length
        : 0;
      const payload = {
        batch_id: selectedMachine.currentHouse.id,
        machine_id: selectedMachine.id,
        check_date: data.washDate,
        check_time: new Date().toTimeString().split(' ')[0],
        day_of_incubation: selectedMachine.daysInIncubation,
        temperature: avgTemp,
        humidity: 55,
        inspector_name: technicianName,
        notes: notes || null,
        entry_mode: 'house',
        candling_results: JSON.stringify({
          type: 'tray_wash',
          firstCheck: data.firstCheck,
          secondCheck: data.secondCheck,
          thirdCheck: data.thirdCheck,
          ppm_check_1: data.ppmChecks[0]?.ppm ?? null,
          ppm_check_2: data.ppmChecks[1]?.ppm ?? null,
          ppm_check_3: data.ppmChecks[2]?.ppm ?? null,
          ppm_check_4: data.ppmChecks[3]?.ppm ?? null,
          ppm_check_5: data.ppmChecks[4]?.ppm ?? null,
          ppm_check_1_time: data.ppmChecks[0]?.time || null,
          ppm_check_2_time: data.ppmChecks[1]?.time || null,
          ppm_check_3_time: data.ppmChecks[2]?.time || null,
          ppm_check_4_time: data.ppmChecks[3]?.time || null,
          ppm_check_5_time: data.ppmChecks[4]?.time || null,
        }),
        company_id: companyId,
      };
      if (data.existingId) {
        // Update-in-place — this is the daily "continue where you left off" path.
        const { error } = await supabase
          .from('qa_monitoring')
          .update(payload)
          .eq('id', data.existingId);
        if (error) throw error;
        toast.success('Tray wash progress saved.');
      } else {
        await submitQAMonitoring(payload, 'insert', {
          batchId: selectedMachine.currentHouse.id,
        });
        toast.success('Tray wash daily log started.');
      }
      queryClient.invalidateQueries({ queryKey: ['tray-wash-daily'] });
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
      const companyId = await resolveCompanyId();
      await submitQAMonitoring({
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
        candling_results: JSON.stringify({ type: 'cull_check', flock_id: data.flock_id, maleCount: data.maleCount, femaleCount: data.femaleCount, defectType: data.defectType }),
        company_id: companyId,
      }, 'insert', {
        batchId: selectedMachine.currentHouse.id,
      });
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
      const sinkCount = data.sampleSize - data.floatCount;
      const threshold = data.age >= 25 && data.age <= 40 ? 10 : 15;
      const companyId = await resolveCompanyId();

      await submitSpecificGravity({
        flock_id: data.flock_id,
        batch_id: selectedMachine.currentHouse.id,
        test_date: data.testDate,
        age_weeks: data.age,
        sample_size: data.sampleSize,
        float_count: data.floatCount,
        sink_count: sinkCount,
        float_percentage: data.floatPercentage,
        meets_standard: data.floatPercentage < threshold,
        standard_min: 0,
        standard_max: threshold,
        difference: data.floatPercentage - threshold,
        notes: notes || null,
        company_id: companyId,
      }, 'insert', {
        batchId: selectedMachine.currentHouse.id,
      });
      toast.success('Specific gravity test saved!');
      setNotes('');
    } catch (error: any) {
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitHatchProgression = async (data: { flock_id: string; batch_id: string | null; stage: string; percentageOut: number; totalCount: number; hatchedCount: number; checkHour: number; hatchDate: string }) => {
    if (!technicianName.trim()) {
      toast.error('Enter technician name.');
      return;
    }
    if (!selectedMachine) {
      toast.error('Select a machine first.');
      return;
    }
    if (!selectedMachine.currentHouse) {
      toast.error('This machine has no house assigned — assign a house before recording hatch progression.');
      return;
    }
    setIsSubmitting(true);
    try {
      const companyId = await resolveCompanyId();
      await submitQAMonitoring({
        batch_id: selectedMachine.currentHouse.id,
        machine_id: selectedMachine.id,
        check_date: data.hatchDate,
        check_time: new Date().toTimeString().split(' ')[0],
        day_of_incubation: selectedMachine.daysInIncubation ?? 0,
        temperature: 100,
        humidity: data.percentageOut,
        inspector_name: technicianName,
        notes: notes || null,
        entry_mode: 'house',
        candling_results: JSON.stringify({
          type: 'hatch_progression',
          flock_id: data.flock_id,
          batch_id: selectedMachine.currentHouse.id,
          machine_id: selectedMachine.id,
          stage: data.stage,
          percentageOut: data.percentageOut,
          totalCount: data.totalCount,
          hatchedCount: data.hatchedCount,
          checkHour: data.checkHour,
        }),
        company_id: companyId,
      }, 'insert', {
        batchId: selectedMachine.currentHouse.id,
      });
      toast.success('Hatch progression saved!');
    } catch (error: any) {
      toast.error(`Failed to save: ${error.message}`);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitMoistureLoss = async (data: { flock_id: string; batch_id: string | null; machine_id: string | null; day1Weight: number; day18Weight: number; lossPercentage: number; dayOfIncubation: number; testDate: string }) => {
    if (!selectedMachine?.currentHouse || !technicianName.trim()) return;
    setIsSubmitting(true);
    try {
      const companyId = await resolveCompanyId();
      await submitWeightTrackingRecord({
        batch_id: selectedMachine.currentHouse.id,
        flock_id: selectedMachine.currentHouse.flock?.id || null,
        machine_id: selectedMachine.id,
        check_date: data.testDate,
        day_of_incubation: data.dayOfIncubation,
        total_weight: data.day1Weight,
        percent_loss: data.lossPercentage,
        notes: notes ? `Day 1: ${data.day1Weight}g, Day 18: ${data.day18Weight}g. ${notes}` : `Day 1: ${data.day1Weight}g, Day 18: ${data.day18Weight}g`,
        company_id: companyId,
      }, 'insert', {
        batchId: selectedMachine.currentHouse.id,
      });
      toast.success('Moisture loss saved!');
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

      <PendingSyncList
        table="qa_monitoring"
        batchId={selectedMachine.currentHouse?.id}
        title="QA records waiting to sync"
      />
      <PendingSyncList
        table="specific_gravity_tests"
        batchId={selectedMachine.currentHouse?.id}
        title="Specific gravity records waiting to sync"
      />
      <PendingSyncList
        table="weight_tracking"
        batchId={selectedMachine.currentHouse?.id}
        title="Moisture loss records waiting to sync"
      />

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

      <Tabs value={activeQATab} onValueChange={setActiveQATab} className="space-y-4">
        {!focusSection && (
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
        )}

        <TabsContent value="rectal-temps">
          <RectalTempEntry
            technicianName={technicianName}
            checkDate={checkDate}
            machineId={selectedMachine?.id}
            isPastDay={false}
            onSubmit={handleSubmitRectalTemp}
          />
        </TabsContent>

        <TabsContent value="tray-wash">
          <TrayWashEntry
            technicianName={technicianName}
            checkDate={checkDate}
            existingRow={existingTrayWash ?? null}
            readOnly={false}
            loadingExisting={trayWashLoading}
            onSubmit={handleSubmitTrayWash}
          />
        </TabsContent>

        <TabsContent value="culls">
          <CullChecksEntry 
            technicianName={technicianName} 
            checkDate={checkDate} 
            defaultFlockId={selectedMachine.currentHouse?.flock?.id}
            defaultBatchId={selectedMachine.currentHouse?.id}
            machineId={selectedMachine?.id}
            isPastDay={false}
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
            machineId={selectedMachine?.id}
            isPastDay={false}
            machineLabel={`Machine ${selectedMachine.machine_number}`}
            houseLabel={selectedMachine.currentHouse ? `House ${selectedMachine.currentHouse.batch_number}` : undefined}
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
