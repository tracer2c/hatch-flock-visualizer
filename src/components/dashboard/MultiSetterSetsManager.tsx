import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Edit, Trash2, ChevronDown, Filter, X, Calendar, Layers } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useViewMode } from "@/contexts/ViewModeContext";

interface MultiSetterSet {
  id: string;
  machine_id: string;
  flock_id: string;
  batch_id: string | null;
  capacity: number;
  zone: 'A' | 'B' | 'C';
  side: 'Left' | 'Right';
  set_date: string;
  data_type: string;
  notes: string | null;
  created_at: string;
  flock?: {
    flock_name: string;
    flock_number: number;
  };
  batch?: {
    batch_number: string;
  };
}

interface Flock {
  id: string;
  flock_name: string;
  flock_number: number;
  unit_id: string | null;
}

interface Batch {
  id: string;
  batch_number: string;
  flock_id: string;
}

interface MultiSetterSetsManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  machine: {
    id: string;
    machine_number: string;
    capacity: number;
    unit_id: string | null;
  };
  unitName?: string;
}

const MultiSetterSetsManager = ({ open, onOpenChange, machine, unitName }: MultiSetterSetsManagerProps) => {
  const { viewMode } = useViewMode();
  const [sets, setSets] = useState<MultiSetterSet[]>([]);
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [editingSet, setEditingSet] = useState<MultiSetterSet | null>(null);
  
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    flockId: '',
    batchId: ''
  });
  
  const [formData, setFormData] = useState({
    flock_id: '',
    batch_id: '',
    capacity: '',
    zone: '' as 'A' | 'B' | 'C' | '',
    side: '' as 'Left' | 'Right' | '',
    set_date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadSets();
      loadFlocks();
    }
  }, [open, machine.id, viewMode]);

  useEffect(() => {
    if (formData.flock_id) {
      loadBatches(formData.flock_id);
    } else {
      setBatches([]);
    }
  }, [formData.flock_id]);

  const loadSets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('multi_setter_sets')
      .select(`
        *,
        flock:flocks(flock_name, flock_number),
        batch:batches(batch_number)
      `)
      .eq('machine_id', machine.id)
      .eq('data_type', viewMode)
      .order('set_date', { ascending: false });
    
    if (error) {
      console.error('Error loading sets:', error);
    } else {
      setSets(data || []);
    }
    setLoading(false);
  };

  const loadFlocks = async () => {
    let query = supabase
      .from('flocks')
      .select('id, flock_name, flock_number, unit_id')
      .eq('data_type', viewMode)
      .order('flock_name', { ascending: true });
    
    // Filter by same hatchery if machine has unit_id
    if (machine.unit_id) {
      query = query.eq('unit_id', machine.unit_id);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error loading flocks:', error);
    } else {
      setFlocks(data || []);
    }
  };

  const loadBatches = async (flockId: string) => {
    const { data, error } = await supabase
      .from('batches')
      .select('id, batch_number, flock_id')
      .eq('flock_id', flockId)
      .eq('data_type', viewMode)
      .order('batch_number', { ascending: true });
    
    if (error) {
      console.error('Error loading batches:', error);
    } else {
      setBatches(data || []);
    }
  };

  const resetForm = () => {
    setFormData({
      flock_id: '',
      batch_id: '',
      capacity: '',
      zone: '',
      side: '',
      set_date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setEditingSet(null);
    setShowAddForm(false);
  };

  const handleSubmit = async () => {
    if (!formData.flock_id || !formData.capacity || !formData.zone || !formData.side || !formData.set_date) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (Flock, Capacity, Zone, Side, Set Date)",
        variant: "destructive"
      });
      return;
    }

    // Determine data_type from batch or flock
    let dataType = viewMode;
    if (formData.batch_id) {
      const batch = batches.find(b => b.id === formData.batch_id);
      if (batch) {
        // batch inherits from flock anyway, so use viewMode
        dataType = viewMode;
      }
    }

    const setData = {
      machine_id: machine.id,
      flock_id: formData.flock_id,
      batch_id: formData.batch_id || null,
      capacity: parseInt(formData.capacity),
      zone: formData.zone as 'A' | 'B' | 'C',
      side: formData.side as 'Left' | 'Right',
      set_date: formData.set_date,
      data_type: dataType,
      notes: formData.notes || null
    };

    if (editingSet) {
      const { error } = await supabase
        .from('multi_setter_sets')
        .update(setData)
        .eq('id', editingSet.id);

      if (error) {
        toast({
          title: "Error updating set",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({ title: "Set updated successfully" });
        resetForm();
        loadSets();
      }
    } else {
      const { error } = await supabase
        .from('multi_setter_sets')
        .insert(setData);

      if (error) {
        toast({
          title: "Error creating set",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({ title: "Set added successfully" });
        resetForm();
        loadSets();
      }
    }
  };

  const handleEdit = (set: MultiSetterSet) => {
    setEditingSet(set);
    setFormData({
      flock_id: set.flock_id,
      batch_id: set.batch_id || '',
      capacity: set.capacity.toString(),
      zone: set.zone,
      side: set.side,
      set_date: set.set_date,
      notes: set.notes || ''
    });
    setShowAddForm(true);
    // Load batches for this flock
    loadBatches(set.flock_id);
  };

  const handleDelete = async (set: MultiSetterSet) => {
    if (!confirm('Are you sure you want to delete this set?')) return;

    const { error } = await supabase
      .from('multi_setter_sets')
      .delete()
      .eq('id', set.id);

    if (error) {
      toast({
        title: "Error deleting set",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({ title: "Set deleted successfully" });
      loadSets();
    }
  };

  const filteredSets = useMemo(() => {
    return sets.filter(set => {
      if (filters.dateFrom && set.set_date < filters.dateFrom) return false;
      if (filters.dateTo && set.set_date > filters.dateTo) return false;
      if (filters.flockId && set.flock_id !== filters.flockId) return false;
      if (filters.batchId && set.batch_id !== filters.batchId) return false;
      return true;
    });
  }, [sets, filters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.dateFrom) count++;
    if (filters.dateTo) count++;
    if (filters.flockId) count++;
    if (filters.batchId) count++;
    return count;
  }, [filters]);

  const clearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      flockId: '',
      batchId: ''
    });
  };

  const getZoneLabel = (zone: string) => {
    switch (zone) {
      case 'A': return 'Front (A)';
      case 'B': return 'Middle (B)';
      case 'C': return 'Back (C)';
      default: return zone;
    }
  };

  const getZoneColor = (zone: string) => {
    switch (zone) {
      case 'A': return 'bg-blue-100 text-blue-800';
      case 'B': return 'bg-green-100 text-green-800';
      case 'C': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSideColor = (side: string) => {
    return side === 'Left' ? 'bg-amber-100 text-amber-800' : 'bg-teal-100 text-teal-800';
  };

  // Calculate total capacity used
  const totalCapacityUsed = useMemo(() => {
    return filteredSets.reduce((sum, set) => sum + set.capacity, 0);
  }, [filteredSets]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Layers className="h-5 w-5 text-primary" />
            <div>
              <span className="text-lg">Manage Sets - {machine.machine_number}</span>
              {unitName && (
                <Badge variant="outline" className="ml-2">{unitName}</Badge>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Summary Bar */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Machine Capacity:</span>
              <span className="ml-1 font-semibold">{machine.capacity.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Sets Loaded:</span>
              <span className="ml-1 font-semibold">{filteredSets.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Total Eggs:</span>
              <span className="ml-1 font-semibold">{totalCapacityUsed.toLocaleString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5">{activeFilterCount}</Badge>
              )}
            </Button>
            <Button size="sm" onClick={() => { resetForm(); setShowAddForm(true); }}>
              <Plus className="h-4 w-4 mr-1" />
              Add Set
            </Button>
          </div>
        </div>

        {/* Filters Section */}
        <Collapsible open={showFilters} onOpenChange={setShowFilters}>
          <CollapsibleContent className="pt-2">
            <div className="p-4 bg-muted/30 rounded-lg border space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Date From</Label>
                  <Input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Date To</Label>
                  <Input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Flock</Label>
                  <Select value={filters.flockId} onValueChange={(v) => setFilters(prev => ({ ...prev, flockId: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All flocks" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All flocks</SelectItem>
                      {flocks.map(f => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.flock_name} ({f.flock_number})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  {activeFilterCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <X className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Add/Edit Form */}
        <Collapsible open={showAddForm} onOpenChange={setShowAddForm}>
          <CollapsibleContent className="pt-2">
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">
                  {editingSet ? 'Edit Set' : 'Add New Set'}
                </h4>
                <Button variant="ghost" size="sm" onClick={resetForm}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Flock *</Label>
                  <Select 
                    value={formData.flock_id} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, flock_id: v, batch_id: '' }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select flock" />
                    </SelectTrigger>
                    <SelectContent>
                      {flocks.map(f => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.flock_name} ({f.flock_number})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs">House (Optional)</Label>
                  <Select 
                    value={formData.batch_id} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, batch_id: v }))}
                    disabled={!formData.flock_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={formData.flock_id ? "Select house" : "Select flock first"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {batches.map(b => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.batch_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs">Capacity (Eggs) *</Label>
                  <Input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value }))}
                    placeholder="e.g., 25000"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs">Zone *</Label>
                  <div className="flex gap-2">
                    {(['A', 'B', 'C'] as const).map(zone => (
                      <Button
                        key={zone}
                        type="button"
                        variant={formData.zone === zone ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFormData(prev => ({ ...prev, zone }))}
                        className="flex-1"
                      >
                        {zone}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs">Side *</Label>
                  <div className="flex gap-2">
                    {(['Left', 'Right'] as const).map(side => (
                      <Button
                        key={side}
                        type="button"
                        variant={formData.side === side ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFormData(prev => ({ ...prev, side }))}
                        className="flex-1"
                      >
                        {side}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs">Set Date *</Label>
                  <Input
                    type="date"
                    value={formData.set_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, set_date: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs">Notes</Label>
                <Input
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes..."
                />
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleSubmit}>
                  {editingSet ? 'Update Set' : 'Add Set'}
                </Button>
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Sets Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Set Date</TableHead>
                <TableHead>Flock</TableHead>
                <TableHead>House</TableHead>
                <TableHead className="text-right">Capacity</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>Side</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading sets...
                  </TableCell>
                </TableRow>
              ) : filteredSets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {sets.length === 0 ? 'No sets added yet. Click "Add Set" to get started.' : 'No sets match your filters.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredSets.map(set => (
                  <TableRow key={set.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {new Date(set.set_date).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      {set.flock ? (
                        <span>{set.flock.flock_name} ({set.flock.flock_number})</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {set.batch?.batch_number || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {set.capacity.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge className={getZoneColor(set.zone)}>
                        {getZoneLabel(set.zone)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getSideColor(set.side)}>
                        {set.side}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(set)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(set)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MultiSetterSetsManager;
