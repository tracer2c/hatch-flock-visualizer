import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Edit, Trash2, ChevronDown, ChevronRight, Filter, X, Calendar, Layers, Activity, Thermometer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Setter18PointDisplay from "@/components/dashboard/Setter18PointDisplay";

interface MultiSetterSet {
  id: string;
  machine_id: string;
  flock_id: string;
  batch_id: string | null;
  capacity: number;
  zone: 'A' | 'B' | 'C';
  side: 'Left' | 'Right';
  set_date: string;
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

interface QARecord {
  id: string;
  check_date: string;
  check_time: string;
  inspector_name: string;
  temperature: number;
  humidity: number;
  temp_avg_overall: number | null;
  temp_avg_front: number | null;
  temp_avg_middle: number | null;
  temp_avg_back: number | null;
  temp_front_top_left: number | null;
  temp_front_top_right: number | null;
  temp_front_mid_left: number | null;
  temp_front_mid_right: number | null;
  temp_front_bottom_left: number | null;
  temp_front_bottom_right: number | null;
  temp_middle_top_left: number | null;
  temp_middle_top_right: number | null;
  temp_middle_mid_left: number | null;
  temp_middle_mid_right: number | null;
  temp_middle_bottom_left: number | null;
  temp_middle_bottom_right: number | null;
  temp_back_top_left: number | null;
  temp_back_top_right: number | null;
  temp_back_mid_left: number | null;
  temp_back_mid_right: number | null;
  temp_back_bottom_left: number | null;
  temp_back_bottom_right: number | null;
  candling_results: string | null;
  notes: string | null;
  batch?: {
    batch_number: string;
    flock?: {
      flock_name: string;
    };
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
  const [activeTab, setActiveTab] = useState('sets');
  const [sets, setSets] = useState<MultiSetterSet[]>([]);
  const [qaRecords, setQaRecords] = useState<QARecord[]>([]);
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(false);
  const [qaLoading, setQaLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [editingSet, setEditingSet] = useState<MultiSetterSet | null>(null);
  const [expandedQARows, setExpandedQARows] = useState<Set<string>>(new Set());
  
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
      loadQARecords();
    }
  }, [open, machine.id]);

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
      .order('batch_number', { ascending: true });
    
    if (error) {
      console.error('Error loading batches:', error);
    } else {
      setBatches(data || []);
    }
  };

  const loadQARecords = async () => {
    setQaLoading(true);
    const { data, error } = await supabase
      .from('qa_monitoring')
      .select(`
        *,
        batch:batches(batch_number, flock:flocks(flock_name))
      `)
      .eq('machine_id', machine.id)
      .order('check_date', { ascending: false })
      .limit(50);
    
    if (error) {
      console.error('Error loading QA records:', error);
    } else {
      setQaRecords(data || []);
    }
    setQaLoading(false);
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

    const setData = {
      machine_id: machine.id,
      flock_id: formData.flock_id,
      batch_id: formData.batch_id || null,
      capacity: parseInt(formData.capacity),
      zone: formData.zone as 'A' | 'B' | 'C',
      side: formData.side as 'Left' | 'Right',
      set_date: formData.set_date,
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

  const toggleQARowExpanded = (id: string) => {
    setExpandedQARows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
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

  const getTempStatusColor = (temp: number | null) => {
    if (temp === null) return 'text-muted-foreground';
    if (temp >= 99.5 && temp <= 100.5) return 'text-green-600';
    if (temp >= 99.0 && temp <= 101.0) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getQARecordType = (record: QARecord) => {
    if (record.temp_avg_overall !== null) return '18-Point Temp';
    try {
      const candling = record.candling_results ? JSON.parse(record.candling_results) : null;
      if (candling?.type) {
        const typeMap: Record<string, string> = {
          'setter_temperature': 'Setter Temp',
          'setter_temperature_18point': '18-Point Temp',
          'rectal_temperature': 'Rectal Temp',
          'tray_wash_temperature': 'Tray Wash',
          'cull_check': 'Cull Check',
          'specific_gravity': 'Specific Gravity',
          'setter_angles': 'Setter Angles',
          'hatch_progression': 'Hatch Progress',
          'moisture_loss': 'Moisture Loss'
        };
        return typeMap[candling.type] || candling.type;
      }
    } catch {}
    return 'General QA';
  };

  const has18PointData = (record: QARecord) => {
    return record.temp_avg_overall !== null || 
           record.temp_front_top_left !== null ||
           record.temp_middle_top_left !== null ||
           record.temp_back_top_left !== null;
  };

  // Calculate total capacity used
  const totalCapacityUsed = useMemo(() => {
    return filteredSets.reduce((sum, set) => sum + set.capacity, 0);
  }, [filteredSets]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Layers className="h-5 w-5 text-primary" />
            <div>
              <span className="text-lg">Multi-Setter Manager - {machine.machine_number}</span>
              {unitName && (
                <Badge variant="outline" className="ml-2">{unitName}</Badge>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sets" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Sets ({sets.length})
            </TabsTrigger>
            <TabsTrigger value="qa" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Recent QA ({qaRecords.length})
            </TabsTrigger>
          </TabsList>

          {/* Sets Tab */}
          <TabsContent value="sets" className="space-y-4 mt-4">
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
          </TabsContent>

          {/* QA Tab */}
          <TabsContent value="qa" className="space-y-4 mt-4">
            {/* QA Summary */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Thermometer className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">Recent QA Records:</span>
                  <span className="font-semibold">{qaRecords.length}</span>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={loadQARecords} disabled={qaLoading}>
                Refresh
              </Button>
            </div>

            {/* QA Records Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>House</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Overall Avg</TableHead>
                    <TableHead>Zone Averages</TableHead>
                    <TableHead>Inspector</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {qaLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Loading QA records...
                      </TableCell>
                    </TableRow>
                  ) : qaRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No QA records found for this machine.
                      </TableCell>
                    </TableRow>
                  ) : (
                    qaRecords.map(record => (
                      <>
                        <TableRow 
                          key={record.id} 
                          className={`hover:bg-muted/30 ${has18PointData(record) ? 'cursor-pointer' : ''}`}
                          onClick={() => has18PointData(record) && toggleQARowExpanded(record.id)}
                        >
                          <TableCell className="w-8">
                            {has18PointData(record) && (
                              expandedQARows.has(record.id) 
                                ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {new Date(record.check_date).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            {record.batch ? (
                              <div className="text-sm">
                                <div>{record.batch.batch_number}</div>
                                {record.batch.flock?.flock_name && (
                                  <div className="text-xs text-muted-foreground">{record.batch.flock.flock_name}</div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{getQARecordType(record)}</Badge>
                          </TableCell>
                          <TableCell>
                            {record.temp_avg_overall !== null ? (
                              <span className={`font-semibold ${getTempStatusColor(record.temp_avg_overall)}`}>
                                {record.temp_avg_overall.toFixed(1)}°F
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {has18PointData(record) ? (
                              <div className="flex gap-2 text-xs">
                                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                  A: {record.temp_avg_front?.toFixed(1) || '—'}
                                </Badge>
                                <Badge variant="secondary" className="bg-green-100 text-green-800">
                                  B: {record.temp_avg_middle?.toFixed(1) || '—'}
                                </Badge>
                                <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                                  C: {record.temp_avg_back?.toFixed(1) || '—'}
                                </Badge>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {record.inspector_name || '—'}
                          </TableCell>
                        </TableRow>
                        {/* Expanded 18-point grid */}
                        {expandedQARows.has(record.id) && has18PointData(record) && (
                          <TableRow key={`${record.id}-expanded`}>
                            <TableCell colSpan={7} className="bg-muted/20 p-4">
                              <div className="max-w-2xl mx-auto">
                                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                                  <Thermometer className="h-4 w-4 text-primary" />
                                  18-Point Temperature Grid
                                </h4>
                                <Setter18PointDisplay 
                                  data={{
                                    temp_front_top_left: record.temp_front_top_left,
                                    temp_front_top_right: record.temp_front_top_right,
                                    temp_front_mid_left: record.temp_front_mid_left,
                                    temp_front_mid_right: record.temp_front_mid_right,
                                    temp_front_bottom_left: record.temp_front_bottom_left,
                                    temp_front_bottom_right: record.temp_front_bottom_right,
                                    temp_middle_top_left: record.temp_middle_top_left,
                                    temp_middle_top_right: record.temp_middle_top_right,
                                    temp_middle_mid_left: record.temp_middle_mid_left,
                                    temp_middle_mid_right: record.temp_middle_mid_right,
                                    temp_middle_bottom_left: record.temp_middle_bottom_left,
                                    temp_middle_bottom_right: record.temp_middle_bottom_right,
                                    temp_back_top_left: record.temp_back_top_left,
                                    temp_back_top_right: record.temp_back_top_right,
                                    temp_back_mid_left: record.temp_back_mid_left,
                                    temp_back_mid_right: record.temp_back_mid_right,
                                    temp_back_bottom_left: record.temp_back_bottom_left,
                                    temp_back_bottom_right: record.temp_back_bottom_right,
                                    temp_avg_overall: record.temp_avg_overall,
                                    temp_avg_front: record.temp_avg_front,
                                    temp_avg_middle: record.temp_avg_middle,
                                    temp_avg_back: record.temp_avg_back
                                  }}
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default MultiSetterSetsManager;
