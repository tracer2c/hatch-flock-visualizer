
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
import { Plus, Package2, Factory, Calendar, AlertCircle, Building2, ChevronDown, X, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";
import { cn } from "@/lib/utils";

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
  set_date: string;
  expected_hatch_date: string;
  total_eggs_set: number;
  status: string;
  unit_id?: string | null;
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
  const [formData, setFormData] = useState({
    flockId: '',
    machineId: '',
    unitId: '',
    setDate: new Date().toISOString().split('T')[0],
    totalEggs: '',
    customHouseNumber: '',
  });
  
  // Advanced filters state
  const [filters, setFilters] = useState({
    dateRange: { from: subDays(new Date(), 30), to: new Date() },
    machineTypes: [] as string[],
    unitIds: [] as string[],
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
      .eq('status', 'available')
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
        flocks(flock_name, flock_number, house_number),
        machines(machine_number)
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
        set_date: batch.set_date,
        expected_hatch_date: batch.expected_hatch_date,
        total_eggs_set: batch.total_eggs_set,
        status: batch.status,
        unit_id: batch.unit_id ?? null,
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
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.unitIds.length > 0) count++;
    if (filters.machineTypes.length > 0) count++;
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

  const createHouse = async () => {
    if (!formData.machineId || !formData.totalEggs || !formData.unitId || !formData.flockId) {
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
        expected_hatch_date: expectedHatchDate,
        total_eggs_set: parseInt(formData.totalEggs),
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
    // Date range filter
    .filter((h) => {
      const setDate = new Date(h.set_date);
      return setDate >= filters.dateRange.from && setDate <= filters.dateRange.to;
    })
    // Unit filter
    .filter((h) => filters.unitIds.length === 0 || (h.unit_id && filters.unitIds.includes(h.unit_id)))
    // Machine type filter
    .filter((h) => {
      if (filters.machineTypes.length === 0) return true;
      const machine = machines.find(m => m.machine_number === h.machine_number);
      return machine && filters.machineTypes.includes(machine.machine_type);
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
        h.machine_number.toLowerCase().includes(search)
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
                    {machines.map((machine) => (
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
                <Label>Total Eggs Set *</Label>
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

      {/* Advanced Filters */}
      <Card>
        <CardHeader>
          <Collapsible open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  <CardTitle>Advanced Filters</CardTitle>
                  {getActiveFilterCount() > 0 && (
                    <Badge variant="default" className="ml-2">
                      {getActiveFilterCount()} active
                    </Badge>
                  )}
                </div>
                <ChevronDown className={cn("h-5 w-5 transition-transform", isFilterOpen && "rotate-180")} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Date Range Filter */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Date Range</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleQuickDateRange(7)}
                    >
                      Last 7 days
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleQuickDateRange(30)}
                    >
                      Last 30 days
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleQuickDateRange(90)}
                    >
                      Last 90 days
                    </Button>
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <Calendar className="mr-2 h-4 w-4" />
                        {filters.dateRange.from && filters.dateRange.to ? (
                          <>
                            {format(filters.dateRange.from, "MMM d")} - {format(filters.dateRange.to, "MMM d, yyyy")}
                          </>
                        ) : (
                          <span>Pick a date range</span>
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

                {/* Machine Type & Hatchery Filter */}
                <div className="space-y-4">
                  {/* Machine Type */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Machine Type</Label>
                    <div className="space-y-2">
                      {uniqueMachineTypes.map((type) => (
                        <label key={type} className="flex items-center gap-2">
                          <Checkbox
                            checked={filters.machineTypes.includes(type)}
                            onCheckedChange={(c) => toggleFilterMachineType(type, Boolean(c))}
                          />
                          <span className="text-sm capitalize">{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Hatchery/Unit */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Hatchery</Label>
                    <ScrollArea className="h-[100px]">
                      <div className="space-y-2">
                        {units.map((unit) => (
                          <label key={unit.id} className="flex items-center gap-2">
                            <Checkbox
                              checked={filters.unitIds.includes(unit.id)}
                              onCheckedChange={(c) => toggleFilterUnit(unit.id, Boolean(c))}
                            />
                            <span className="text-sm">{unit.name}</span>
                          </label>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </div>

              {/* Filter Actions */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {filteredHouses.length} of {houses.length} houses
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={clearAllFilters}>
                    <X className="h-4 w-4 mr-2" />
                    Clear All
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
            <CardTitle>Active Houses</CardTitle>
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
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredHouses.map((house) => (
              <div
                key={house.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedHouse === house.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => onHouseSelect(house.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">{house.flock_name} #{house.house_number}</h3>
                  <Badge className={getStatusColor(house.status)}>
                    {house.status}
                  </Badge>
                </div>
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Package2 className="h-4 w-4" />
                    {house.flock_number} - {house.flock_name}
                  </div>
                  <div className="flex items-center gap-2">
                    <Factory className="h-4 w-4" />
                    {house.machine_number}
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
            <div className="text-center py-8 text-gray-500">
              No houses found. Create your first house to get started.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HouseManager;
