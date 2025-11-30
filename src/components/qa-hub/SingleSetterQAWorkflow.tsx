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
import { 
  Thermometer, 
  Building2, 
  Calendar, 
  ArrowLeft, 
  Search,
  Settings,
  MapPin
} from "lucide-react";
import { useHatcheries, useSingleSetterMachines } from '@/hooks/useQAHubData';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import Setter18PointTempGrid from '@/components/dashboard/Setter18PointTempGrid';

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

  const handleSubmitQA = async (data: { values: Record<string, number>; averages: { overall: number | null; front: number | null; middle: number | null; back: number | null } }) => {
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
        // 18-point temperatures
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
        // Zone averages
        temp_avg_overall: data.averages.overall,
        temp_avg_front: data.averages.front,
        temp_avg_middle: data.averages.middle,
        temp_avg_back: data.averages.back,
        candling_results: JSON.stringify({
          type: 'setter_temperature_18point',
          setterNumber: selectedMachine.machine_number
        })
      });

      if (error) throw error;

      toast.success('QA entry saved successfully!');
      setSelectedMachine(null);
      setNotes('');
      refetch();
    } catch (error: any) {
      toast.error(`Failed to save QA: ${error.message}`);
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

        {/* Machines List */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Single-Setter Machines
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
                  No single-setter machines found for the selected criteria.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredMachines?.map(machine => (
                  <Card 
                    key={machine.id}
                    className={`cursor-pointer hover:border-blue-300 hover:shadow-md transition-all group ${
                      !machine.hasOccupant ? 'opacity-60' : ''
                    }`}
                    onClick={() => machine.hasOccupant && setSelectedMachine(machine as SelectedMachine)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Settings className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">
                            {machine.machine_number}
                          </span>
                        </div>
                        <Badge 
                          variant={machine.hasOccupant ? 'default' : 'outline'}
                          className="text-xs"
                        >
                          {machine.hasOccupant ? 'Occupied' : 'Empty'}
                        </Badge>
                      </div>
                      
                      {machine.location && (
                        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {machine.location}
                        </p>
                      )}

                      {machine.currentHouse ? (
                        <div className="bg-muted/50 rounded-md p-2 mt-2">
                          <p className="text-xs font-medium text-foreground">Current House:</p>
                          <p className="text-sm font-medium text-primary">
                            {machine.currentHouse.flock?.flock_name || 'Unknown Flock'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            House: {machine.currentHouse.batch_number}
                          </p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-muted-foreground">
                              Set: {new Date(machine.currentHouse.set_date).toLocaleDateString()}
                            </span>
                            <span className="font-medium text-xs text-blue-600">
                              Day {machine.daysInIncubation}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-muted/30 rounded-md p-2 mt-2">
                          <p className="text-xs text-muted-foreground text-center">
                            No house currently loaded
                          </p>
                        </div>
                      )}

                      <div className="mt-3 pt-2 border-t">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="w-full h-7 text-xs group-hover:bg-blue-100"
                          disabled={!machine.hasOccupant}
                        >
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

  // QA Entry View
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
                <p className="text-sm text-muted-foreground">
                  {selectedMachine.currentHouse?.flock?.flock_name} - House {selectedMachine.currentHouse?.batch_number}
                </p>
              </div>
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                Day {selectedMachine.daysInIncubation}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technician Info */}
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

      {/* 18-Point Temperature Grid */}
      <Setter18PointTempGrid
        onSubmit={handleSubmitQA}
        checkDate={checkDate}
        onCheckDateChange={setCheckDate}
        setterNumber={selectedMachine.machine_number}
        onSetterNumberChange={() => {}}
        setterMachines={[]}
        currentMachine={{ machine_number: selectedMachine.machine_number }}
      />

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