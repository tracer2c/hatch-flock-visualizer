
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Package2, Factory, Calendar, AlertCircle, Building2, ChevronDown, X, Filter, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import chicksIcon from "@/assets/chicks-icon.png";

interface Flock {
  id: string;
  flock_number: number;
  flock_name: string;
  house_number: string;
  age_weeks: number;
  unit_id?: string | null;
}

interface Machine {
  id: string;
  machine_number: string;
  machine_type: string;
  capacity: number;
  status: string;
  location: string;
}

interface House {
  id: string;
  batch_number: string;
  flock_name: string;
  flock_number: number;
  house_number: string;
  machine_number: string;
  machine_type: string;
  set_date: string;
  expected_hatch_date: string;
  total_eggs_set: number;
  status: string;
  unit_id?: string | null;
  technician_name?: string | null;
}

interface Unit {
  id: string;
  name: string;
}

interface HouseManagerProps {
  onHouseSelect: (houseId: string) => void;
  selectedHouse: string | null;
}

const HouseManager = ({ onHouseSelect, selectedHouse }: HouseManagerProps) => {
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [houseView, setHouseView] = useState<"all" | "active" | "completed" | "incubating">("active");
  const [formData, setFormData] = useState({
    flockId: '',
    machineId: '',
    unitId: '',
    setDate: new Date().toISOString().split('T')[0],
    setTime: '09:00',
    totalEggs: '',
    customHouseNumber: '',
  });
  
  // Edit state
  const [editingHouse, setEditingHouse] = useState<House | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editFormData, setEditFormData] = useState({
    setDate: '',
    setTime: '',
    totalEggs: '',
    machineId: '',
    unitId: '',
    status: 'planned' as 'planned' | 'setting' | 'incubating' | 'hatching' | 'completed' | 'cancelled',
    notes: '',
  });
  
  // Advanced filters state
  const [filters, setFilters] = useState({
    dateRange: { from: subDays(new Date(), 30), to: new Date() },
    machineTypes: [] as string[],
    unitIds: [] as string[],
    technicianName: '',
  });
  
  const { toast } = useToast();

  useEffect(() => {
    loadFlocks();
    loadMachines();
    loadHouses();
    loadUnits();
  }, []);

  const loadFlocks = async () => {
    const { data, error } = await supabase
      .from('flocks')
      .select('*')
      .order('flock_number', { ascending: true });
    
    if (error) {
      toast({
        title: "Error loading flocks",
        description: error.message,
        variant: "destructive"
      });
    } else {
      setFlocks(data || []);
    }
  };

  const loadMachines = async () => {
    const { data, error } = await supabase
      .from('machines')
      .select('*')
      .order('machine_number', { ascending: true });
    
    if (error) {
      toast({
        title: "Error loading machines",
        description: error.message,
        variant: "destructive"
      });
    } else {
      setMachines(data || []);
    }
  };

  const loadHouses = async () => {
    const { data, error } = await supabase
      .from('batches')
      .select(`
        *,
        flocks(flock_name, flock_number, house_number, technician_name),
        machines(machine_number, machine_type)
      `)
      .order('set_date', { ascending: false });
    
    if (error) {
      toast({
        title: "Error loading houses",
        description: error.message,
        variant: "destructive"
      });
    } else {
      const formattedHouses = data?.map(batch => ({
        id: batch.id,
        batch_number: batch.batch_number,
        flock_name: batch.flocks?.flock_name || '',
        flock_number: batch.flocks?.flock_number || 0,
        house_number: batch.flocks?.house_number || '',
        machine_number: batch.machines?.machine_number || '',
        machine_type: batch.machines?.machine_type || '',
        set_date: batch.set_date,
        expected_hatch_date: batch.expected_hatch_date,
        total_eggs_set: batch.total_eggs_set,
        status: batch.status,
        unit_id: batch.unit_id ?? null,
        technician_name: batch.flocks?.technician_name || null,
      })) || [];
      setHouses(formattedHouses);
    }
  };

  const loadUnits = async () => {
    const { data, error } = await supabase
      .from('units')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      toast({
        title: "Error loading units",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    setUnits(data || []);
  };

  // Filter toggle helpers
  const toggleFilterUnit = (id: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      unitIds: checked ? [...prev.unitIds, id] : prev.unitIds.filter(u => u !== id)
    }));
  };

  const toggleFilterMachineType = (type: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      machineTypes: checked ? [...prev.machineTypes, type] : prev.machineTypes.filter(m => m !== type)
    }));
  };

  const handleQuickDateRange = (days: number) => {
    setFilters(prev => ({
      ...prev,
      dateRange: { from: subDays(new Date(), days), to: new Date() }
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      dateRange: { from: subDays(new Date(), 30), to: new Date() },
      machineTypes: [],
      unitIds: [],
      technicianName: '',
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.unitIds.length > 0) count++;
    if (filters.machineTypes.length > 0) count++;
    if (filters.technicianName) count++;
    const defaultFrom = subDays(new Date(), 30);
    if (filters.dateRange.from.getTime() !== defaultFrom.getTime() || 
        filters.dateRange.to.getTime() < new Date().getTime() - 86400000) count++;
    return count;
  };

  const uniqueMachineTypes = Array.from(new Set(machines.map(m => m.machine_type)));

const calculateHatchDate = (setDate: string) => {
    const date = new Date(setDate);
    date.setDate(date.getDate() + 21); // 21 days incubation period
    return date.toISOString().split('T')[0];
  };

  const handleEdit = async (house: House, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Fetch full batch data including notes
    const { data, error } = await supabase
      .from('batches')
      .select('*')
      .eq('id', house.id)
      .single();
    
    if (error) {
      toast({
        title: "Error loading house details",
        description: error.message,
        variant: "destructive"
      });
      return;
    }
    
    setEditingHouse(house);
    setEditFormData({
      setDate: data.set_date,
      setTime: data.set_time || '09:00',
      totalEggs: data.total_eggs_set.toString(),
      machineId: data.machine_id,
      unitId: data.unit_id || '',
      status: data.status as 'planned' | 'setting' | 'incubating' | 'hatching' | 'completed' | 'cancelled',
      notes: data.notes || '',
    });
    setShowEditDialog(true);
  };

  const handleUpdateHouse = async () => {
    if (!editingHouse) return;
    
    if (!editFormData.machineId || !editFormData.unitId) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const expectedHatchDate = calculateHatchDate(editFormData.setDate);

    const { error } = await supabase
      .from('batches')
      .update({
        set_date: editFormData.setDate,
        set_time: editFormData.setTime,
        expected_hatch_date: expectedHatchDate,
        total_eggs_set: editFormData.totalEggs ? parseInt(editFormData.totalEggs) : 0,
        machine_id: editFormData.machineId,
        unit_id: editFormData.unitId,
        status: editFormData.status,
        notes: editFormData.notes,
      })
      .eq('id', editingHouse.id);

    if (error) {
      toast({
        title: "Error updating house",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "House Updated",
        description: `House ${editingHouse.batch_number} updated successfully`
      });
      setShowEditDialog(false);
      setEditingHouse(null);
      loadHouses();
    }
  };

  const createHouse = async () => {
    if (!formData.machineId || !formData.unitId || !formData.flockId) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    if (!formData.customHouseNumber || formData.customHouseNumber.trim() === '') {
      toast({
        title: "Validation Error",
        description: "Please enter a house number",
        variant: "destructive"
      });
      return;
    }

    const selectedFlock = flocks.find(f => f.id === formData.flockId);
    
    if (!selectedFlock) {
      toast({
        title: "Validation Error",
        description: "Selected flock not found",
        variant: "destructive"
      });
      return;
    }
    
    const customNumber = formData.customHouseNumber.trim();
    const houseNumber = `${selectedFlock.flock_name} #${customNumber}`;
    
    // Check if this house number already exists for this flock
    const { data: existingBatch, error: checkError } = await supabase
      .from('batches')
      .select('id')
      .eq('flock_id', formData.flockId)
      .eq('batch_number', houseNumber)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking for duplicate:', checkError);
      toast({
        title: "Validation Error",
        description: "Failed to validate house number",
        variant: "destructive"
      });
      return;
    }

    if (existingBatch) {
      toast({
        title: "House Already Exists",
        description: `House #${customNumber} already exists for ${selectedFlock.flock_name}`,
        variant: "destructive"
      });
      return;
    }

    const expectedHatchDate = calculateHatchDate(formData.setDate);

    const { data, error } = await supabase
      .from('batches')
      .insert({
        batch_number: houseNumber,
        flock_id: formData.flockId,
        machine_id: formData.machineId,
        unit_id: formData.unitId,
        set_date: formData.setDate,
        set_time: formData.setTime,
        expected_hatch_date: expectedHatchDate,
        total_eggs_set: formData.totalEggs ? parseInt(formData.totalEggs) : 0,
        status: 'setting'
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error creating house",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "House Created",
        description: `House ${houseNumber} created successfully`
      });
      setShowCreateForm(false);
      setFormData({ 
        flockId: '', 
        machineId: '', 
        unitId: '', 
        setDate: new Date().toISOString().split('T')[0],
        setTime: '09:00',
        totalEggs: '',
        customHouseNumber: '',
      });
      loadHouses();
      onHouseSelect(data.id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned': return 'bg-gray-100 text-gray-800';
      case 'setting': return 'bg-blue-100 text-blue-800';
      case 'incubating': return 'bg-yellow-100 text-yellow-800';
      case 'hatching': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredHouses = houses
    // House view filter
    .filter((h) => {
      if (houseView === "all") return true;
      if (houseView === "active") return h.status !== "completed";
      if (houseView === "completed") return h.status === "completed";
      if (houseView === "incubating") return h.status === "incubating";
      return true;
    })
    // Date range filter (only apply when not viewing "all")
    .filter((h) => {
      if (houseView === "all") return true;
      const setDate = new Date(h.set_date);
      return setDate >= filters.dateRange.from && setDate <= filters.dateRange.to;
    })
    // Unit filter
    .filter((h) => filters.unitIds.length === 0 || (h.unit_id && filters.unitIds.includes(h.unit_id)))
    // Machine type filter
    .filter((h) => {
      if (filters.machineTypes.length === 0) return true;
      return filters.machineTypes.includes(h.machine_type);
    })
    // Technician filter
    .filter((h) => {
      if (!filters.technicianName) return true;
      return h.technician_name?.toLowerCase().includes(filters.technicianName.toLowerCase());
    })
    // Search filter
    .filter((h) => {
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        h.flock_name.toLowerCase().includes(search) ||
        h.house_number.toLowerCase().includes(search) ||
        h.batch_number.toLowerCase().includes(search) ||
        h.flock_number.toString().includes(search) ||
        h.machine_number.toLowerCase().includes(search) ||
        h.technician_name?.toLowerCase().includes(search)
      );
    });

  return (
    <div className="space-y-6">
      {/* Create New House */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              House Management
            </span>
            <Button 
              onClick={() => setShowCreateForm(!showCreateForm)}
              variant={showCreateForm ? "outline" : "default"}
            >
              {showCreateForm ? "Cancel" : "New House"}
            </Button>
          </CardTitle>
        </CardHeader>
        {showCreateForm && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Select Hatchery *</Label>
                <Select value={formData.unitId} onValueChange={(value) => setFormData(prev => ({ ...prev, unitId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a hatchery" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
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
              
              <div className="space-y-2 md:col-span-2">
                <Label>House Number *</Label>
                <Input
                  type="text"
                  placeholder="e.g., 5, 10A, #12-B"
                  value={formData.customHouseNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, customHouseNumber: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Select Machine *</Label>
                <Select value={formData.machineId} onValueChange={(value) => setFormData(prev => ({ ...prev, machineId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a machine" />
                  </SelectTrigger>
                  <SelectContent>
                    {machines.filter(m => m.status === 'available').map((machine) => (
                      <SelectItem key={machine.id} value={machine.id}>
                        {machine.machine_number} - {machine.machine_type} (Cap: {machine.capacity.toLocaleString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Set Date *</Label>
                <Input
                  type="date"
                  value={formData.setDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, setDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Set Time *</Label>
                <Input
                  type="time"
                  value={formData.setTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, setTime: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Total Eggs Set</Label>
                <Input
                  type="number"
                  placeholder="e.g., 45000"
                  value={formData.totalEggs}
                  onChange={(e) => setFormData(prev => ({ ...prev, totalEggs: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={createHouse}>Create House</Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Advanced Filters - Enterprise Design */}
      <Card className="border-primary/10 shadow-sm">
        <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-transparent">
          <Collapsible open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Filter className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      Advanced Filters
                      {getActiveFilterCount() > 0 && (
                        <Badge variant="default" className="h-6 px-2 bg-primary shadow-sm">
                          {getActiveFilterCount()} active
                        </Badge>
                      )}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Refine your search by hatchery, machine type, and date range
                    </p>
                  </div>
                </div>
                <ChevronDown className={cn(
                  "h-5 w-5 text-muted-foreground transition-all duration-200",
                  isFilterOpen && "rotate-180 text-primary"
                )} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
                {/* Date Range Filter */}
                <div className="space-y-3 p-4 rounded-lg border bg-card/50">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="h-4 w-4 text-primary" />
                    <Label className="text-sm font-semibold">Date Range</Label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      size="sm" 
                      variant={filters.dateRange.from.getTime() === subDays(new Date(), 7).getTime() ? "default" : "outline"}
                      onClick={() => handleQuickDateRange(7)}
                      className="h-8"
                    >
                      Last 7 days
                    </Button>
                    <Button 
                      size="sm" 
                      variant={filters.dateRange.from.getTime() === subDays(new Date(), 30).getTime() ? "default" : "outline"}
                      onClick={() => handleQuickDateRange(30)}
                      className="h-8"
                    >
                      Last 30 days
                    </Button>
                    <Button 
                      size="sm" 
                      variant={filters.dateRange.from.getTime() === subDays(new Date(), 90).getTime() ? "default" : "outline"}
                      onClick={() => handleQuickDateRange(90)}
                      className="h-8"
                    >
                      Last 90 days
                    </Button>
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start text-left font-normal h-10 border-primary/20 hover:border-primary/40 hover:bg-primary/5"
                      >
                        <Calendar className="mr-2 h-4 w-4 text-primary" />
                        {filters.dateRange.from && filters.dateRange.to ? (
                          <span className="text-sm">
                            {format(filters.dateRange.from, "MMM d")} - {format(filters.dateRange.to, "MMM d, yyyy")}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">Pick a date range</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="range"
                        selected={{ from: filters.dateRange.from, to: filters.dateRange.to }}
                        onSelect={(range) => {
                          if (range?.from && range?.to) {
                            setFilters(prev => ({ ...prev, dateRange: { from: range.from, to: range.to } }));
                          }
                        }}
                        numberOfMonths={2}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Machine Type Filter */}
                <div className="space-y-3 p-4 rounded-lg border bg-card/50">
                  <div className="flex items-center gap-2 mb-3">
                    <Factory className="h-4 w-4 text-primary" />
                    <Label className="text-sm font-semibold">Machine Type</Label>
                  </div>
                  <ScrollArea className="h-[140px]">
                    <div className="space-y-2.5">
                      {uniqueMachineTypes.map((type) => (
                        <label 
                          key={type} 
                          className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors group"
                        >
                          <Checkbox
                            checked={filters.machineTypes.includes(type)}
                            onCheckedChange={(c) => toggleFilterMachineType(type, Boolean(c))}
                            className="border-primary/30 data-[state=checked]:bg-primary"
                          />
                          <span className="text-sm capitalize group-hover:text-foreground">{type}</span>
                        </label>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {/* Hatchery Filter */}
                <div className="space-y-3 p-4 rounded-lg border bg-card/50">
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="h-4 w-4 text-primary" />
                    <Label className="text-sm font-semibold">Hatchery</Label>
                  </div>
                  <ScrollArea className="h-[140px]">
                    <div className="space-y-2.5">
                      {units.map((unit) => (
                        <label 
                          key={unit.id} 
                          className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors group"
                        >
                          <Checkbox
                            checked={filters.unitIds.includes(unit.id)}
                            onCheckedChange={(c) => toggleFilterUnit(unit.id, Boolean(c))}
                            className="border-primary/30 data-[state=checked]:bg-primary"
                          />
                          <span className="text-sm group-hover:text-foreground">{unit.name}</span>
                        </label>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {/* Technician Filter */}
                <div className="space-y-3 p-4 rounded-lg border bg-card/50">
                  <div className="flex items-center gap-2 mb-3">
                    <Factory className="h-4 w-4 text-primary" />
                    <Label className="text-sm font-semibold">Technician Name</Label>
                  </div>
                  <Input
                    type="text"
                    placeholder="Search by technician..."
                    value={filters.technicianName}
                    onChange={(e) => setFilters(prev => ({ ...prev, technicianName: e.target.value }))}
                    className="h-10 border-primary/20 focus:border-primary/40"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Filter houses by the technician who created the flock
                  </p>
                </div>
              </div>

              {/* Filter Actions */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="h-7 px-3 font-normal">
                    <span className="font-semibold mr-1">{filteredHouses.length}</span>
                    of {houses.length} houses
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={clearAllFilters}
                    className="h-9 border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive/50"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear All Filters
                  </Button>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardHeader>
      </Card>

      {/* Existing Houses */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle>
                {houseView === "all" && "All Houses"}
                {houseView === "active" && "Active Houses"}
                {houseView === "completed" && "Completed Houses"}
                {houseView === "incubating" && "Incubating Houses"}
              </CardTitle>
              <Badge variant="secondary">{filteredHouses.length} houses</Badge>
            </div>
            <div className="flex items-center gap-3">
              <Select value={houseView} onValueChange={(value: any) => setHouseView(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Houses</SelectItem>
                  <SelectItem value="active">Active Pipeline</SelectItem>
                  <SelectItem value="incubating">Incubating</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <div className="w-64">
                <Input
                  type="text"
                  placeholder="Search houses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredHouses.map((house) => (
              <div
                key={house.id}
                className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                  selectedHouse === house.id ? 'border-primary bg-primary/5 shadow-md' : 'border-border hover:border-primary/50 hover:shadow-sm'
                }`}
                onClick={() => onHouseSelect(house.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">{house.flock_name} #{house.house_number}</h3>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 hover:bg-primary/10"
                      onClick={(e) => handleEdit(house, e)}
                    >
                      <Pencil className="h-3.5 w-3.5 text-primary" />
                    </Button>
                    <Badge className={getStatusColor(house.status)}>
                      {house.status}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Package2 className="h-4 w-4" />
                    {house.flock_number} - {house.flock_name}
                  </div>
                  {house.technician_name && (
                    <div className="flex items-center gap-2">
                      <Factory className="h-4 w-4" />
                      <span className="font-medium text-primary">Technician: {house.technician_name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Factory className="h-4 w-4" />
                    {house.machine_number} ({house.machine_type})
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Set: {new Date(house.set_date).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {units.find(u => u.id === house.unit_id)?.name || 'Unassigned'}
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {house.total_eggs_set.toLocaleString()} eggs
                  </div>
                </div>
              </div>
            ))}
          </div>
          {houses.length === 0 && (
            <div className="text-center py-12">
              <img 
                src={chicksIcon} 
                alt="Chicks" 
                className="w-24 h-24 mx-auto mb-4 object-contain animate-fade-in opacity-70"
              />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                No houses found
              </h3>
              <p className="text-sm text-muted-foreground">
                Create your first house to get started with hatchery operations
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit House Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit House Details</DialogTitle>
          </DialogHeader>
          {editingHouse && (
            <div className="space-y-4">
              {/* Read-only Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label className="text-xs text-muted-foreground">Flock</Label>
                  <p className="font-medium">{editingHouse.flock_name}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">House Number</Label>
                  <p className="font-medium">#{editingHouse.house_number}</p>
                </div>
              </div>

              {/* Editable Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hatchery *</Label>
                  <Select value={editFormData.unitId} onValueChange={(value) => setEditFormData(prev => ({ ...prev, unitId: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a hatchery" />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Machine *</Label>
                  <Select value={editFormData.machineId} onValueChange={(value) => setEditFormData(prev => ({ ...prev, machineId: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a machine" />
                    </SelectTrigger>
                    <SelectContent>
                      {machines.map((machine) => (
                        <SelectItem key={machine.id} value={machine.id}>
                          {machine.machine_number} - {machine.machine_type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Set Date *</Label>
                  <Input
                    type="date"
                    value={editFormData.setDate}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, setDate: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Set Time *</Label>
                  <Input
                    type="time"
                    value={editFormData.setTime}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, setTime: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Expected Hatch Date</Label>
                  <Input
                    type="date"
                    value={calculateHatchDate(editFormData.setDate)}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Total Eggs Set</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 45000"
                    value={editFormData.totalEggs}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, totalEggs: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Status *</Label>
                  <Select value={editFormData.status} onValueChange={(value: any) => setEditFormData(prev => ({ ...prev, status: value as 'planned' | 'setting' | 'incubating' | 'hatching' | 'completed' | 'cancelled' }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planned">Planned</SelectItem>
                      <SelectItem value="setting">Setting</SelectItem>
                      <SelectItem value="incubating">Incubating</SelectItem>
                      <SelectItem value="hatching">Hatching</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Notes</Label>
                  <Textarea
                    placeholder="Enter any notes..."
                    value={editFormData.notes}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateHouse}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HouseManager;
