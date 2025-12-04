/**
 * Machine Allocation Wizard
 * 
 * Multi-step wizard for creating houses with capacity visualization
 * and split allocation support across multiple machines.
 */

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle2, Factory, Package2, ArrowRight, ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAvailableMachineCapacity, useCreateAllocation } from "@/hooks/useAvailableMachineCapacity";
import { MachineCapacityInfo, Position, ZONE_LABELS, getCapacityPerPosition, validateAllocation } from "@/utils/machineCapacityUtils";
import { PositionSelectionGrid } from "./PositionSelectionGrid";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Flock {
  id: string;
  flock_number: number;
  flock_name: string;
  age_weeks: number;
  unit_id?: string | null;
}

interface Unit {
  id: string;
  name: string;
}

interface AllocationEntry {
  machineInfo: MachineCapacityInfo;
  eggsAllocated: number;
  selectedPositions: Position[];
}

interface MachineAllocationWizardProps {
  flocks: Flock[];
  units: Unit[];
  onComplete: (batchId: string) => void;
  onCancel: () => void;
}

type WizardStep = 'basic' | 'allocation' | 'positions' | 'confirm';

export function MachineAllocationWizard({ flocks, units, onComplete, onCancel }: MachineAllocationWizardProps) {
  const { toast } = useToast();
  const { createAllocation } = useCreateAllocation();
  
  // Step 1: Basic info
  const [step, setStep] = useState<WizardStep>('basic');
  const [formData, setFormData] = useState({
    flockId: '',
    unitId: '',
    customHouseNumber: '',
    setDate: new Date().toISOString().split('T')[0],
    setTime: new Date().toTimeString().slice(0, 5),
    totalEggs: '',
    technicianName: '',
  });

  // Step 2: Allocations
  const [allocations, setAllocations] = useState<AllocationEntry[]>([]);
  const [showMachineSelector, setShowMachineSelector] = useState(false);

  // Step 3: Position selection (for multi-setters in allocation list)
  const [editingAllocationIndex, setEditingAllocationIndex] = useState<number | null>(null);

  // Loading state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch available machines based on selected date and hatchery
  const { machines, isLoading: machinesLoading, totalAvailableCapacity, suggestSplit, refetch } = useAvailableMachineCapacity({
    targetSetDate: formData.setDate,
    hatcheryId: formData.unitId || null,
  });

  // Calculate remaining eggs to allocate
  const totalEggs = parseInt(formData.totalEggs) || 0;
  const allocatedEggs = allocations.reduce((sum, a) => sum + a.eggsAllocated, 0);
  const remainingEggs = totalEggs - allocatedEggs;

  // Show machine selector by default when entering allocation step with no allocations
  useEffect(() => {
    if (step === 'allocation' && allocations.length === 0) {
      setShowMachineSelector(true);
    }
  }, [step]);

  // Optional: Suggest allocations when user clicks the button
  const handleSuggestAllocation = () => {
    if (totalEggs > 0 && machines.length > 0) {
      const suggestions = suggestSplit(totalEggs);
      const newAllocations: AllocationEntry[] = suggestions.map(s => {
        const machineInfo = machines.find(m => m.machine.id === s.machine.id)!;
        return {
          machineInfo,
          eggsAllocated: s.eggsToAllocate,
          selectedPositions: []
        };
      });
      setAllocations(newAllocations);
      setShowMachineSelector(false);
    }
  };

  const selectedFlock = flocks.find(f => f.id === formData.flockId);
  const selectedUnit = units.find(u => u.id === formData.unitId);

  const canProceedBasic = formData.flockId && formData.unitId && formData.customHouseNumber && 
    formData.totalEggs && parseInt(formData.totalEggs) > 0 && formData.technicianName;

  const canProceedAllocation = allocatedEggs === totalEggs && allocations.length > 0;

  // Check if all multi-setter allocations have positions selected
  const multiSetterAllocationsValid = allocations
    .filter(a => a.machineInfo.machine.setter_mode === 'multi_setter')
    .every(a => {
      const positionsNeeded = Math.ceil(a.eggsAllocated / getCapacityPerPosition(a.machineInfo.machine.capacity));
      return a.selectedPositions.length >= positionsNeeded;
    });

  const canSubmit = canProceedAllocation && multiSetterAllocationsValid;

  const addMachine = (machineInfo: MachineCapacityInfo) => {
    const eggsToAdd = Math.min(remainingEggs, machineInfo.availableCapacity);
    setAllocations([...allocations, {
      machineInfo,
      eggsAllocated: eggsToAdd,
      selectedPositions: []
    }]);
    setShowMachineSelector(false);
  };

  const removeAllocation = (index: number) => {
    setAllocations(allocations.filter((_, i) => i !== index));
  };

  const updateAllocationEggs = (index: number, eggs: number) => {
    const updated = [...allocations];
    updated[index] = { ...updated[index], eggsAllocated: eggs };
    setAllocations(updated);
  };

  const updateAllocationPositions = (index: number, positions: Position[]) => {
    const updated = [...allocations];
    updated[index] = { ...updated[index], selectedPositions: positions };
    setAllocations(updated);
  };

  const calculateHatchDate = (setDate: string) => {
    const date = new Date(setDate);
    date.setDate(date.getDate() + 21);
    return date.toISOString().split('T')[0];
  };

  const handleSubmit = async () => {
    if (!canSubmit || !selectedFlock) return;
    
    setIsSubmitting(true);
    
    try {
      const houseNumber = `${selectedFlock.flock_name} #${formData.customHouseNumber.trim()}`;
      const expectedHatchDate = calculateHatchDate(formData.setDate);

      // Check for duplicate house number
      const { data: existingBatch } = await supabase
        .from('batches')
        .select('id')
        .eq('flock_id', formData.flockId)
        .eq('batch_number', houseNumber)
        .maybeSingle();

      if (existingBatch) {
        toast({
          title: "House Already Exists",
          description: `House #${formData.customHouseNumber} already exists for ${selectedFlock.flock_name}`,
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

      // Create batch - use first machine_id for backward compatibility (or null if split)
      const primaryMachineId = allocations.length === 1 ? allocations[0].machineInfo.machine.id : null;
      
      // Determine status based on set_date - future dates are 'scheduled'
      const today = new Date().toISOString().split('T')[0];
      const batchStatus = formData.setDate > today ? 'scheduled' : 'in_setter';

      const { data: batch, error: batchError } = await supabase
        .from('batches')
        .insert({
          batch_number: houseNumber,
          flock_id: formData.flockId,
          machine_id: primaryMachineId,
          unit_id: formData.unitId,
          set_date: formData.setDate,
          set_time: formData.setTime,
          expected_hatch_date: expectedHatchDate,
          total_eggs_set: totalEggs,
          status: batchStatus
        })
        .select()
        .single();

      if (batchError) throw batchError;

      // Create allocations for each machine
      for (const allocation of allocations) {
        const allocationData = await createAllocation({
          batch_id: batch.id,
          machine_id: allocation.machineInfo.machine.id,
          eggs_allocated: allocation.eggsAllocated,
          allocation_date: formData.setDate,
          allocation_time: formData.setTime,
          company_id: '00000000-0000-0000-0000-000000000001',
        });

        // For multi-setters, create position records
        if (allocation.machineInfo.machine.setter_mode === 'multi_setter' && allocation.selectedPositions.length > 0) {
          const positionRecords = allocation.selectedPositions.map(pos => ({
            machine_id: allocation.machineInfo.machine.id,
            flock_id: formData.flockId,
            batch_id: batch.id,
            allocation_id: allocationData.id,
            zone: pos.zone,
            side: pos.side,
            level: pos.level,
            set_date: formData.setDate,
            capacity: Math.ceil(allocation.eggsAllocated / allocation.selectedPositions.length),
          }));

          const { error: setsError } = await supabase
            .from('multi_setter_sets')
            .insert(positionRecords);

          if (setsError) {
            console.error('Error creating multi-setter sets:', setsError);
          }
        }
      }

      toast({
        title: "House Created",
        description: `${houseNumber} created with ${allocations.length} machine allocation(s)`
      });

      onComplete(batch.id);
    } catch (error: any) {
      toast({
        title: "Error creating house",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {(['basic', 'allocation', 'confirm'] as WizardStep[]).map((s, i) => (
        <div key={s} className="flex items-center">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
            step === s ? "bg-primary text-primary-foreground" : 
            ['basic'].indexOf(step) < i ? "bg-muted text-muted-foreground" : "bg-primary/20 text-primary"
          )}>
            {i + 1}
          </div>
          {i < 2 && <div className={cn("w-12 h-0.5 mx-1", step === s || ['basic', 'allocation'].indexOf(step) >= i ? "bg-primary/20" : "bg-muted")} />}
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      {renderStepIndicator()}

      {/* Step 1: Basic Info */}
      {step === 'basic' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Select Hatchery *</Label>
              <Select value={formData.unitId} onValueChange={(value) => setFormData(prev => ({ ...prev, unitId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a hatchery" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Select Flock *</Label>
              <Select value={formData.flockId} onValueChange={(value) => setFormData(prev => ({ ...prev, flockId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a flock" />
                </SelectTrigger>
                <SelectContent>
                  {flocks.map((flock) => (
                    <SelectItem key={flock.id} value={flock.id}>
                      {flock.flock_number} - {flock.flock_name} (Age: {flock.age_weeks}w)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>House Number *</Label>
              <Input
                placeholder="e.g., 5, 10A, #12-B"
                value={formData.customHouseNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, customHouseNumber: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Total Eggs Set *</Label>
              <Input
                type="number"
                placeholder="e.g., 45000"
                value={formData.totalEggs}
                onChange={(e) => setFormData(prev => ({ ...prev, totalEggs: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Set Date *</Label>
              <Input
                type="date"
                value={formData.setDate}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, setDate: e.target.value }));
                  setAllocations([]); // Reset allocations when date changes
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Set Time</Label>
              <Input
                type="time"
                value={formData.setTime}
                onChange={(e) => setFormData(prev => ({ ...prev, setTime: e.target.value }))}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Technician Name *</Label>
              <Input
                placeholder="Enter technician name"
                value={formData.technicianName}
                onChange={(e) => setFormData(prev => ({ ...prev, technicianName: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
            <Button onClick={() => setStep('allocation')} disabled={!canProceedBasic}>
              Next: Machine Allocation <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Machine Allocation */}
      {step === 'allocation' && (
        <div className="space-y-4">
          {/* Summary */}
          <Card className="bg-muted/30">
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Flock</p>
                  <p className="font-medium">{selectedFlock?.flock_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Eggs</p>
                  <p className="font-medium">{totalEggs.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Allocated</p>
                  <p className={cn("font-medium", allocatedEggs < totalEggs && "text-amber-600")}>
                    {allocatedEggs.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Remaining</p>
                  <p className={cn("font-medium", remainingEggs > 0 && "text-red-600")}>
                    {remainingEggs.toLocaleString()}
                  </p>
                </div>
              </div>
              <Progress value={(allocatedEggs / totalEggs) * 100} className="mt-3 h-2" />
            </CardContent>
          </Card>

          {/* Allocations List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Machine Allocations</Label>
              <div className="flex items-center gap-2">
                {allocations.length > 0 && (
                  <Button size="sm" variant="ghost" onClick={handleSuggestAllocation} disabled={machinesLoading}>
                    Suggest
                  </Button>
                )}
                {remainingEggs > 0 && (
                  <Button size="sm" variant="outline" onClick={() => setShowMachineSelector(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Add Machine
                  </Button>
                )}
              </div>
            </div>

            {allocations.map((allocation, index) => {
              const isMultiSetter = allocation.machineInfo.machine.setter_mode === 'multi_setter';
              const positionsNeeded = isMultiSetter 
                ? Math.ceil(allocation.eggsAllocated / getCapacityPerPosition(allocation.machineInfo.machine.capacity))
                : 0;
              const hasValidPositions = !isMultiSetter || allocation.selectedPositions.length >= positionsNeeded;

              return (
                <Card key={index} className={cn(!hasValidPositions && "border-amber-300")}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2">
                          <Factory className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{allocation.machineInfo.machine.machine_number}</span>
                          <Badge variant="outline" className="text-xs">
                            {allocation.machineInfo.machine.setter_mode === 'multi_setter' ? 'Multi-Setter' : 'Single-Setter'}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <Label className="text-xs text-muted-foreground">Eggs Allocated</Label>
                            <Input
                              type="number"
                              value={allocation.eggsAllocated}
                              onChange={(e) => updateAllocationEggs(index, parseInt(e.target.value) || 0)}
                              className="h-9"
                            />
                          </div>
                          <div className="text-xs text-muted-foreground text-right">
                            <p>Capacity: {allocation.machineInfo.availableCapacity.toLocaleString()}</p>
                          </div>
                        </div>

                        {/* Position Selection for Multi-Setters */}
                        {isMultiSetter && (
                          <div className="pt-2 border-t">
                            {editingAllocationIndex === index ? (
                              <div className="space-y-3">
                                <PositionSelectionGrid
                                  availablePositions={allocation.machineInfo.availablePositions || []}
                                  occupiedPositions={allocation.machineInfo.occupiedPositions || []}
                                  selectedPositions={allocation.selectedPositions}
                                  onSelectionChange={(positions) => updateAllocationPositions(index, positions)}
                                  machineCapacity={allocation.machineInfo.machine.capacity}
                                  eggsToAllocate={allocation.eggsAllocated}
                                />
                                <Button size="sm" onClick={() => setEditingAllocationIndex(null)}>
                                  Done
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <div className="text-sm">
                                  {allocation.selectedPositions.length > 0 ? (
                                    <span className="flex items-center gap-1">
                                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                                      {allocation.selectedPositions.length} positions selected
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1 text-amber-600">
                                      <AlertCircle className="h-4 w-4" />
                                      Select {positionsNeeded} positions
                                    </span>
                                  )}
                                </div>
                                <Button size="sm" variant="outline" onClick={() => setEditingAllocationIndex(index)}>
                                  {allocation.selectedPositions.length > 0 ? 'Edit Positions' : 'Select Positions'}
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <Button size="icon" variant="ghost" onClick={() => removeAllocation(index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {allocations.length === 0 && !showMachineSelector && (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center">
                  <Package2 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No machines allocated yet</p>
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <Button variant="outline" onClick={() => setShowMachineSelector(true)}>
                      <Plus className="h-4 w-4 mr-1" /> Add Machine
                    </Button>
                    <Button variant="secondary" onClick={handleSuggestAllocation} disabled={machinesLoading || machines.length === 0}>
                      Suggest Allocation
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Machine Selector */}
          {showMachineSelector && (
            <Card className="border-primary/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Available Machines</CardTitle>
                <CardDescription>
                  {machinesLoading ? 'Loading...' : `${machines.filter(m => m.canAcceptNewAllocation).length} machines available`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {machines
                      .filter(m => m.canAcceptNewAllocation && !allocations.some(a => a.machineInfo.machine.id === m.machine.id))
                      .map(machineInfo => (
                        <button
                          key={machineInfo.machine.id}
                          onClick={() => addMachine(machineInfo)}
                          className="w-full p-3 text-left rounded-lg border hover:border-primary/50 hover:bg-primary/5 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{machineInfo.machine.machine_number}</p>
                              <p className="text-xs text-muted-foreground">
                                {machineInfo.machine.setter_mode === 'multi_setter' ? 'Multi-Setter' : 'Single-Setter'} • 
                                {machineInfo.availablePositions?.length ?? 'N/A'} positions available
                              </p>
                            </div>
                            <Badge variant="secondary">
                              {machineInfo.availableCapacity.toLocaleString()} eggs
                            </Badge>
                          </div>
                        </button>
                      ))}
                  </div>
                </ScrollArea>
                <Button variant="ghost" className="w-full mt-2" onClick={() => setShowMachineSelector(false)}>
                  Cancel
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setStep('basic')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button onClick={() => setStep('confirm')} disabled={!canSubmit}>
              Next: Confirm <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Confirmation */}
      {step === 'confirm' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Confirm House Creation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Hatchery</p>
                  <p className="font-medium">{selectedUnit?.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Flock</p>
                  <p className="font-medium">{selectedFlock?.flock_name} ({selectedFlock?.flock_number})</p>
                </div>
                <div>
                  <p className="text-muted-foreground">House Number</p>
                  <p className="font-medium">{selectedFlock?.flock_name} #{formData.customHouseNumber}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Eggs</p>
                  <p className="font-medium">{totalEggs.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Set Date</p>
                  <p className="font-medium">{formData.setDate} at {formData.setTime}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Technician</p>
                  <p className="font-medium">{formData.technicianName}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-2">Machine Allocations ({allocations.length})</p>
                <div className="space-y-2">
                  {allocations.map((a, i) => (
                    <div key={i} className="flex items-center justify-between text-sm p-2 rounded bg-muted/30">
                      <div className="flex items-center gap-2">
                        <Factory className="h-4 w-4 text-muted-foreground" />
                        <span>{a.machineInfo.machine.machine_number}</span>
                        {a.machineInfo.machine.setter_mode === 'multi_setter' && (
                          <Badge variant="outline" className="text-xs">
                            {a.selectedPositions.length} positions
                          </Badge>
                        )}
                      </div>
                      <span className="font-medium">{a.eggsAllocated.toLocaleString()} eggs</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setStep('allocation')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Create House
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
