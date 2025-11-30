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
  Egg,
  CheckCircle2
} from "lucide-react";
import { useHatcheries, useSingleSetterHouses } from '@/hooks/useQAHubData';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import Setter18PointTempGrid from '@/components/dashboard/Setter18PointTempGrid';
import { differenceInDays, parseISO } from 'date-fns';

interface SelectedHouse {
  id: string;
  batch_number: string;
  set_date: string;
  flock: { flock_name: string; flock_number: number } | null;
  machine: { id: string; machine_number: string } | null;
}

const SingleSetterQAWorkflow: React.FC = () => {
  const [selectedHatcheryId, setSelectedHatcheryId] = useState<string>('all');
  const [selectedHouse, setSelectedHouse] = useState<SelectedHouse | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [technicianName, setTechnicianName] = useState('');
  const [notes, setNotes] = useState('');
  const [checkDate, setCheckDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: hatcheries, isLoading: hatcheriesLoading } = useHatcheries();
  const { data: houses, isLoading: housesLoading, refetch } = useSingleSetterHouses(
    selectedHatcheryId === 'all' ? undefined : selectedHatcheryId
  );

  const filteredHouses = houses?.filter(house => {
    const searchLower = searchTerm.toLowerCase();
    return (
      house.batch_number?.toLowerCase().includes(searchLower) ||
      house.flock?.flock_name?.toLowerCase().includes(searchLower) ||
      house.machine?.machine_number?.toLowerCase().includes(searchLower)
    );
  });

  const getDaysInIncubation = (setDate: string) => {
    return differenceInDays(new Date(), parseISO(setDate)) + 1;
  };

  const handleSubmitQA = async (data: { values: Record<string, number>; averages: { overall: number | null; front: number | null; middle: number | null; back: number | null } }) => {
    if (!selectedHouse || !technicianName.trim()) {
      toast.error('Please enter technician name');
      return;
    }

    setIsSubmitting(true);
    try {
      const dayOfIncubation = getDaysInIncubation(selectedHouse.set_date);

      const { error } = await supabase.from('qa_monitoring').insert({
        batch_id: selectedHouse.id,
        machine_id: selectedHouse.machine?.id || null,
        check_date: checkDate,
        check_time: new Date().toTimeString().split(' ')[0],
        day_of_incubation: dayOfIncubation,
        temperature: data.averages.overall || 0,
        humidity: 55, // Default value
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
      });

      if (error) throw error;

      toast.success('QA entry saved successfully!');
      setSelectedHouse(null);
      setNotes('');
      refetch();
    } catch (error: any) {
      toast.error(`Failed to save QA: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // House Selection View
  if (!selectedHouse) {
    return (
      <div className="space-y-4">
        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Thermometer className="h-5 w-5 text-blue-600" strokeWidth={1.5} />
              Single Setter QA (per house)
            </CardTitle>
            <CardDescription>
              Select a hatchery and house to enter QA readings
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
                  Search Houses
                </Label>
                <Input
                  placeholder="Search by house, flock, or machine..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Houses List */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Houses in Single-Setter Machines
              </CardTitle>
              <Badge variant="secondary">
                {filteredHouses?.length || 0} houses
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {housesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : filteredHouses?.length === 0 ? (
              <Alert>
                <AlertDescription>
                  No houses found in single-setter machines for the selected criteria.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredHouses?.map(house => (
                  <Card 
                    key={house.id}
                    className="cursor-pointer hover:border-blue-300 hover:shadow-md transition-all group"
                    onClick={() => setSelectedHouse(house as SelectedHouse)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Egg className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">
                            {house.flock?.flock_name || 'Unknown'}
                          </span>
                        </div>
                        <Badge 
                          variant={house.status === 'incubating' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {house.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        House: {house.batch_number}
                      </p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          Machine: {house.machine?.machine_number || '-'}
                        </span>
                        <span className="font-medium text-blue-600">
                          Day {getDaysInIncubation(house.set_date)}
                        </span>
                      </div>
                      <div className="mt-2 pt-2 border-t flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          Set: {new Date(house.set_date).toLocaleDateString()}
                        </span>
                        <Button size="sm" variant="ghost" className="h-7 text-xs group-hover:bg-blue-100">
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

  // QA Entry View
  return (
    <div className="space-y-4">
      {/* Header with Back Button */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setSelectedHouse(null)} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Houses
            </Button>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-medium">{selectedHouse.flock?.flock_name}</p>
                <p className="text-sm text-muted-foreground">House: {selectedHouse.batch_number}</p>
              </div>
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                Day {getDaysInIncubation(selectedHouse.set_date)}
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
        setterNumber={selectedHouse.machine?.machine_number || ''}
        onSetterNumberChange={() => {}}
        setterMachines={[]}
        currentMachine={selectedHouse.machine}
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
