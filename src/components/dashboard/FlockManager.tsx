import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, Users, Home, Calendar, Filter, X, ChevronDown, Building2, Pencil, Clock, User } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FlockHistoryService } from "@/services/flockHistoryService";
import FlockUpdateHistory from "./FlockUpdateHistory";

interface Flock {
  id: string;
  flock_number: number;
  flock_name: string;
  house_number: string | null;
  age_weeks: number;
  arrival_date: string;
  total_birds: number | null;
  notes: string | null;
  unit_id?: string | null;
  unit?: { id: string; name: string } | null;
  technician_name?: string | null;
  created_by?: string | null;
  data_type?: 'original' | 'dummy';
  updated_by?: string | null;
  last_modified_at?: string | null;
  flock_group_id?: string | null;
  updated_by_profile?: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;
  created_by_profile?: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;
}

const FlockManager = () => {
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingFlock, setEditingFlock] = useState<Flock | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [flockToDelete, setFlockToDelete] = useState<Flock | null>(null);
  const [filters, setFilters] = useState({
    flockNumber: '',
    flockName: '',
    houseNumber: '',
    minAge: '',
    maxAge: ''
  });
  const [formData, setFormData] = useState({
    flock_number: '',
    flock_name: '',
    age_weeks: '',
    arrival_date: new Date().toISOString().split('T')[0],
    total_birds: '',
    notes: '',
    unitId: '',
    technician_name: ''
  });
  const { toast } = useToast();

  // Units
  type Unit = { id: string; name: string; code?: string; status?: string };
  const [units, setUnits] = useState<Unit[]>([]);

  useEffect(() => {
    loadFlocks();
    loadUnits();
  }, []);

  const loadUnits = async () => {
    const { data, error } = await supabase
      .from('units')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      toast({
        title: "Error loading units",
        description: error.message,
        variant: "destructive"
      });
      return;
    }
    setUnits(data || []);
  };

  const loadFlocks = async () => {
    const { data, error } = await supabase
      .from('flocks')
      .select(`
        *,
        unit:units(id, name)
      `)
      .order('flock_number', { ascending: true });
    
    if (error) {
      toast({
        title: "Error loading flocks",
        description: error.message,
        variant: "destructive"
      });
      setFlocks([]);
      return;
    }

    // Fetch user profiles for updated_by and created_by
    const flocksWithProfiles = await Promise.all(
      (data || []).map(async (flock) => {
        let updated_by_profile = null;
        let created_by_profile = null;
        
        if (flock.updated_by) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('first_name, last_name, email')
            .eq('id', flock.updated_by)
            .single();
          updated_by_profile = profile;
        }
        
        if (flock.created_by) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('first_name, last_name, email')
            .eq('id', flock.created_by)
            .single();
          created_by_profile = profile;
        }
        
        return { ...flock, updated_by_profile, created_by_profile };
      })
    );

    setFlocks(flocksWithProfiles as Flock[]);
  };

  const resetForm = () => {
    setFormData({
      flock_number: '',
      flock_name: '',
      age_weeks: '',
      arrival_date: new Date().toISOString().split('T')[0],
      total_birds: '',
      notes: '',
      unitId: '',
      technician_name: '',
    });
    setEditingFlock(null);
  };

  const handleSubmit = async () => {
    if (!formData.flock_number || !formData.flock_name || !formData.age_weeks || !formData.arrival_date) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    // Require technician name when editing
    if (editingFlock && !formData.technician_name) {
      toast({
        title: "Technician Name Required",
        description: "Please enter the technician name who is making this update",
        variant: "destructive"
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    
    if (formData.unitId === 'all-hatcheries') {
      const groupId = crypto.randomUUID();
      const activeUnits = units.filter(u => u.status === 'active');
      
      if (activeUnits.length === 0) {
        toast({
          title: "No active hatcheries",
          description: "There are no active hatcheries to create flocks in.",
          variant: "destructive"
        });
        return;
      }
      
      const flocksToCreate = activeUnits.map(unit => ({
        flock_number: parseInt(formData.flock_number),
        flock_name: formData.flock_name,
        age_weeks: parseInt(formData.age_weeks),
        arrival_date: formData.arrival_date,
        total_birds: formData.total_birds ? parseInt(formData.total_birds) : null,
        notes: formData.notes || null,
        unit_id: unit.id,
        flock_group_id: groupId,
        technician_name: formData.technician_name || null,
        data_type: 'original',
        created_by: user?.id,
        updated_by: user?.id,
        breed: 'broiler' as const
      }));
      
      const { data, error } = await supabase
        .from('flocks')
        .insert(flocksToCreate)
        .select();
      
      if (error) {
        toast({
          title: "Error creating flocks",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({ 
          title: "Flocks created successfully",
          description: `Created ${data.length} flocks across all hatcheries`
        });
        setShowDialog(false);
        resetForm();
        loadFlocks();
      }
      return;
    }

    if (editingFlock) {
      // Track changes for history
      const changes: any[] = [];
      
      if (parseInt(formData.flock_number) !== editingFlock.flock_number) {
        changes.push({
          field_changed: 'flock_number',
          old_value: editingFlock.flock_number.toString(),
          new_value: formData.flock_number
        });
      }
      if (formData.flock_name !== editingFlock.flock_name) {
        changes.push({
          field_changed: 'flock_name',
          old_value: editingFlock.flock_name,
          new_value: formData.flock_name
        });
      }
      if (parseInt(formData.age_weeks) !== editingFlock.age_weeks) {
        changes.push({
          field_changed: 'age_weeks',
          old_value: editingFlock.age_weeks.toString(),
          new_value: formData.age_weeks
        });
      }
      if (formData.arrival_date !== editingFlock.arrival_date) {
        changes.push({
          field_changed: 'arrival_date',
          old_value: editingFlock.arrival_date,
          new_value: formData.arrival_date
        });
      }
      if (formData.total_birds !== (editingFlock.total_birds?.toString() || '')) {
        changes.push({
          field_changed: 'total_birds',
          old_value: editingFlock.total_birds?.toString() || 'null',
          new_value: formData.total_birds || 'null'
        });
      }
      if (formData.notes !== (editingFlock.notes || '')) {
        changes.push({
          field_changed: 'notes',
          old_value: editingFlock.notes || 'null',
          new_value: formData.notes || 'null'
        });
      }
      if (formData.unitId !== (editingFlock.unit_id || '')) {
        changes.push({
          field_changed: 'unit',
          old_value: editingFlock.unit?.name || 'null',
          new_value: units.find(u => u.id === formData.unitId)?.name || 'null'
        });
      }

      const { error } = await supabase
        .from('flocks')
        .update({
          flock_number: parseInt(formData.flock_number),
          flock_name: formData.flock_name,
          age_weeks: parseInt(formData.age_weeks),
          arrival_date: formData.arrival_date,
          total_birds: formData.total_birds ? parseInt(formData.total_birds) : null,
          notes: formData.notes || null,
          unit_id: formData.unitId || null,
          technician_name: formData.technician_name || null,
          updated_by: user?.id,
          last_modified_at: new Date().toISOString()
        })
        .eq('id', editingFlock.id);

      if (error) {
        toast({
          title: "Error updating flock",
          description: error.message,
          variant: "destructive"
        });
      } else {
        // Log changes to history
        if (changes.length > 0) {
          await FlockHistoryService.logFlockUpdate(
            editingFlock.id,
            changes,
            user?.id || '',
            formData.technician_name || 'Unknown'
          );
        }
        
        toast({ title: "Flock updated successfully" });
        setShowDialog(false);
        resetForm();
        loadFlocks();
      }
    } else {
      const { data, error } = await supabase
        .from('flocks')
        .insert({
          flock_number: parseInt(formData.flock_number),
          flock_name: formData.flock_name,
          age_weeks: parseInt(formData.age_weeks),
          arrival_date: formData.arrival_date,
          total_birds: formData.total_birds ? parseInt(formData.total_birds) : null,
          notes: formData.notes || null,
          unit_id: formData.unitId || null,
          technician_name: formData.technician_name || null,
          data_type: 'original',
          created_by: user?.id,
          updated_by: user?.id,
          breed: 'broiler' as const
        })
        .select();

      if (error) {
        toast({
          title: "Error creating flock",
          description: error.message,
          variant: "destructive"
        });
      } else {
        // Log creation to history
        if (data && data.length > 0) {
          await FlockHistoryService.logFlockCreation(
            data[0].id,
            user?.id || '',
            formData.technician_name || ''
          );
        }
        
        toast({ title: "Flock created successfully" });
        setShowDialog(false);
        resetForm();
        loadFlocks();
      }
    }
  };

  const handleEdit = (flock: Flock) => {
    setEditingFlock(flock);
    setFormData({
      flock_number: flock.flock_number.toString(),
      flock_name: flock.flock_name,
      age_weeks: flock.age_weeks.toString(),
      arrival_date: flock.arrival_date,
      total_birds: flock.total_birds?.toString() || '',
      notes: flock.notes || '',
      unitId: flock.unit_id || '',
      technician_name: flock.technician_name || '',
    });
    setShowDialog(true);
  };

  const handleDelete = async (flockId: string, flockNumber: number, flockName: string) => {
    const flock = flocks.find(f => f.id === flockId);
    if (flock) {
      setFlockToDelete(flock);
    }
  };

  const confirmDelete = async () => {
    if (!flockToDelete) return;

    const { error } = await supabase
      .from('flocks')
      .delete()
      .eq('id', flockToDelete.id);

    if (error) {
      toast({
        title: "Error deleting flock",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({ title: "Flock deleted successfully" });
      loadFlocks();
    }

    setFlockToDelete(null);
  };

  const filteredFlocks = useMemo(() => {
    return flocks.filter(flock => {
      if ((filters as any).flockNumber && !flock.flock_number.toString().includes((filters as any).flockNumber)) return false;
      if ((filters as any).flockName && !flock.flock_name.toLowerCase().includes((filters as any).flockName.toLowerCase())) return false;
      if ((filters as any).houseNumber && (filters as any).houseNumber !== "all" && flock.house_number !== (filters as any).houseNumber) return false;
      if ((filters as any).minAge && flock.age_weeks < parseInt((filters as any).minAge)) return false;
      if ((filters as any).maxAge && flock.age_weeks > parseInt((filters as any).maxAge)) return false;
      return true;
    });
  }, [flocks, filters]);

  const uniqueHouseNumbers = useMemo(() => {
    return [...new Set(flocks.map(f => f.house_number).filter(Boolean))].sort();
  }, [flocks]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.flockNumber) count++;
    if (filters.flockName) count++;
    if (filters.houseNumber && filters.houseNumber !== "all") count++;
    if (filters.minAge) count++;
    if (filters.maxAge) count++;
    return count;
  }, [filters]);

  const clearAllFilters = () => {
    setFilters({
      flockNumber: '',
      flockName: '',
      houseNumber: '',
      minAge: '',
      maxAge: ''
    });
  };

  const clearFilter = (filterKey: string) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: filterKey === 'houseNumber' ? 'all' : ''
    }));
  };

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Flock Management
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}
              </Badge>
            )}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </Button>
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                New Flock
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingFlock ? 'Edit Flock' : 'Create New Flock'}
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Flock Number *</Label>
                  <Input
                    type="number"
                    value={formData.flock_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, flock_number: e.target.value }))}
                    placeholder="e.g., 6367"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Flock Name *</Label>
                  <Input
                    value={formData.flock_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, flock_name: e.target.value }))}
                    placeholder="e.g., Bertha Valley"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Age (Weeks) *</Label>
                  <Input
                    type="number"
                    value={formData.age_weeks}
                    onChange={(e) => setFormData(prev => ({ ...prev, age_weeks: e.target.value }))}
                    placeholder="e.g., 56"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Arrival Date *</Label>
                  <Input
                    type="date"
                    value={formData.arrival_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, arrival_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total Birds</Label>
                  <Input
                    type="number"
                    value={formData.total_birds}
                    onChange={(e) => setFormData(prev => ({ ...prev, total_birds: e.target.value }))}
                    placeholder="e.g., 25000"
                  />
                </div>

                {/* Hatchery selection */}
                <div className="space-y-2 md:col-span-2">
                  <Label>Hatchery *</Label>
                  <Select
                    value={formData.unitId}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, unitId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select hatchery" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-hatcheries">🌍 All Hatcheries</SelectItem>
                      {units.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.unitId === 'all-hatcheries' && (
                    <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-sm">
                      <p className="font-medium text-primary">Multiple Flocks Will Be Created:</p>
                      <p className="text-muted-foreground mt-1">
                        One flock will be created in each of the following hatcheries:
                      </p>
                      <ul className="mt-2 space-y-1 text-foreground">
                        {units.filter(u => u.status === 'active').map(unit => (
                          <li key={unit.id}>• {unit.name} {unit.code ? `(${unit.code})` : ''}</li>
                        ))}
                      </ul>
                      <p className="text-primary mt-2 font-medium">
                        Total flocks to create: {units.filter(u => u.status === 'active').length}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Technician Name *</Label>
                  <Input
                    value={formData.technician_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, technician_name: e.target.value }))}
                    placeholder="Enter technician name"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Notes</Label>
                  <Input
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes..."
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={handleSubmit}>
                  {editingFlock ? 'Update' : 'Create'} Flock
                </Button>
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Cancel
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Collapsible open={showFilters} onOpenChange={setShowFilters}>
          <CollapsibleContent className="mb-6">
            <div className="p-4 bg-gray-50 rounded-lg border">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Flock Number</Label>
                  <div className="relative">
                    <Input
                      placeholder="Search flock number..."
                      value={filters.flockNumber}
                      onChange={(e) => setFilters(prev => ({ ...prev, flockNumber: e.target.value }))}
                    />
                    {filters.flockNumber && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                        onClick={() => clearFilter('flockNumber')}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Flock Name</Label>
                  <div className="relative">
                    <Input
                      placeholder="Search flock name..."
                      value={filters.flockName}
                      onChange={(e) => setFilters(prev => ({ ...prev, flockName: e.target.value }))}
                    />
                    {filters.flockName && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                        onClick={() => clearFilter('flockName')}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">House Number</Label>
                  <Select value={filters.houseNumber} onValueChange={(value) => setFilters(prev => ({ ...prev, houseNumber: value === "all" ? "" : value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All houses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All houses</SelectItem>
                      {uniqueHouseNumbers.map((house) => (
                        <SelectItem key={house} value={house}>{house}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Min Age (weeks)</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      placeholder="Min age..."
                      value={filters.minAge}
                      onChange={(e) => setFilters(prev => ({ ...prev, minAge: e.target.value }))}
                    />
                    {filters.minAge && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                        onClick={() => clearFilter('minAge')}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Max Age (weeks)</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      placeholder="Max age..."
                      value={filters.maxAge}
                      onChange={(e) => setFilters(prev => ({ ...prev, maxAge: e.target.value }))}
                    />
                    {filters.maxAge && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                        onClick={() => clearFilter('maxAge')}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {activeFilterCount > 0 && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <span className="text-sm text-muted-foreground">
                    {filteredFlocks.length} of {flocks.length} flocks shown
                  </span>
                  <Button variant="outline" size="sm" onClick={clearAllFilters}>
                    Clear All Filters
                  </Button>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {(() => {
          const groupedFlocks = Object.entries(
            filteredFlocks.reduce((groups, flock) => {
              const groupId = flock.flock_group_id || `single-${flock.id}`;
              if (!groups[groupId]) groups[groupId] = [];
              groups[groupId].push(flock);
              return groups;
            }, {} as Record<string, typeof filteredFlocks>)
          );
          
          const midpoint = Math.ceil(groupedFlocks.length / 2);
          const firstRow = groupedFlocks.slice(0, midpoint);
          const secondRow = groupedFlocks.slice(midpoint);
          
          const renderFlockCards = (groups: typeof groupedFlocks) => groups.map(([groupId, flocks]) => (
            <div key={groupId} className="flex-shrink-0 space-y-3" style={{ width: flocks[0].flock_group_id ? `${Math.min(flocks.length * 320, 1000)}px` : '300px' }}>
              {flocks[0].flock_group_id && (
                <div className="px-3 py-2 bg-primary/10 border-l-4 border-primary rounded">
                  <p className="text-sm font-medium text-primary flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Flock Group #{flocks[0].flock_number} - {flocks[0].flock_name}
                    <Badge variant="secondary" className="ml-2">{flocks.length} hatcheries</Badge>
                  </p>
                </div>
              )}
              <div className="flex gap-4">
                {flocks.map(flock => (
                  <div key={flock.id} className="flex-shrink-0 w-[300px] p-4 border rounded-lg hover:border-primary/50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-lg">{flock.flock_number}</h3>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(flock)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(flock.id, flock.flock_number, flock.flock_name)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p className="font-medium text-muted-foreground">{flock.flock_name}</p>
                      {flock.unit && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Building2 className="h-4 w-4" />
                          <span>{flock.unit.name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(flock.arrival_date).toLocaleDateString()}</span>
                        <Badge variant="outline" className="ml-auto">{flock.age_weeks} weeks</Badge>
                      </div>
                      {flock.total_birds && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>{flock.total_birds.toLocaleString()} birds</span>
                        </div>
                      )}
                      {flock.last_modified_at && (
                        <div className="pt-2 border-t flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <HoverCard>
                            <HoverCardTrigger asChild>
                              <button className="hover:text-primary transition-colors">
                                Updated {format(new Date(flock.last_modified_at), 'MMM d, h:mm a')}
                              </button>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-80">
                              <div className="space-y-2">
                                <h4 className="font-semibold text-sm">Update History</h4>
                                <div className="space-y-1 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Last Updated:</span>
                                    <span>{format(new Date(flock.last_modified_at), 'PPp')}</span>
                                  </div>
                                  {flock.updated_by_profile && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Updated By:</span>
                                      <span className="font-medium">
                                        {flock.updated_by_profile.first_name} {flock.updated_by_profile.last_name}
                                      </span>
                                    </div>
                                  )}
                                  {flock.technician_name && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Technician:</span>
                                      <span className="font-medium">{flock.technician_name}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </HoverCardContent>
                          </HoverCard>
                          {flock.technician_name && (
                            <Badge variant="outline" className="ml-auto">
                              {flock.technician_name}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ));
          
          return (
            <div className="space-y-6">
              {/* First Row */}
              <div className="flex overflow-x-auto gap-4 pb-4">
                {renderFlockCards(firstRow)}
              </div>
              
              {/* Second Row */}
              {secondRow.length > 0 && (
                <div className="flex overflow-x-auto gap-4 pb-4">
                  {renderFlockCards(secondRow)}
                </div>
              )}
            </div>
          );
        })()}
      {filteredFlocks.length === 0 && flocks.length > 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No flocks match your current filters. Try adjusting your search criteria.
        </div>
      )}
      {flocks.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No flocks found. Create your first flock to get started.
        </div>
       )}
       </CardContent>
     </Card>

     <AlertDialog open={!!flockToDelete} onOpenChange={() => setFlockToDelete(null)}>
       <AlertDialogContent>
         <AlertDialogHeader>
           <AlertDialogTitle>Delete Flock</AlertDialogTitle>
           <AlertDialogDescription>
             Are you sure you want to delete Flock #{flockToDelete?.flock_number} - {flockToDelete?.flock_name}? This action cannot be undone.
           </AlertDialogDescription>
         </AlertDialogHeader>
         <AlertDialogFooter>
           <AlertDialogCancel>Cancel</AlertDialogCancel>
           <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
             Delete
           </AlertDialogAction>
       </AlertDialogFooter>
       </AlertDialogContent>
     </AlertDialog>
     </>
   );
 };

 export default FlockManager;
