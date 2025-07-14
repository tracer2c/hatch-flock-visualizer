import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Package2, Factory, Calendar, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Flock {
  id: string;
  flock_number: number;
  flock_name: string;
  house_number: string;
  age_weeks: number;
}

interface Machine {
  id: string;
  machine_number: string;
  machine_type: string;
  capacity: number;
  status: string;
  location: string;
}

interface Batch {
  id: string;
  batch_number: string;
  flock_name: string;
  flock_number: number;
  machine_number: string;
  set_date: string;
  expected_hatch_date: string;
  total_eggs_set: number;
  status: string;
}

interface BatchManagerProps {
  onBatchSelect: (batchId: string) => void;
  selectedBatch: string | null;
  compact?: boolean;
}

const BatchManager = ({ onBatchSelect, selectedBatch, compact = false }: BatchManagerProps) => {
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    flockId: '',
    machineId: '',
    setDate: new Date().toISOString().split('T')[0],
    totalEggs: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    loadFlocks();
    loadMachines();
    loadBatches();
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

  const loadBatches = async () => {
    const { data, error } = await supabase
      .from('batches')
      .select(`
        *,
        flocks(flock_name, flock_number),
        machines(machine_number)
      `)
      .order('set_date', { ascending: false });
    
    if (error) {
      toast({
        title: "Error loading batches",
        description: error.message,
        variant: "destructive"
      });
    } else {
      const formattedBatches = data?.map(batch => ({
        id: batch.id,
        batch_number: batch.batch_number,
        flock_name: batch.flocks?.flock_name || '',
        flock_number: batch.flocks?.flock_number || 0,
        machine_number: batch.machines?.machine_number || '',
        set_date: batch.set_date,
        expected_hatch_date: batch.expected_hatch_date,
        total_eggs_set: batch.total_eggs_set,
        status: batch.status
      })) || [];
      setBatches(formattedBatches);
    }
  };

  const calculateHatchDate = (setDate: string) => {
    const date = new Date(setDate);
    date.setDate(date.getDate() + 21); // 21 days incubation period
    return date.toISOString().split('T')[0];
  };

  const createBatch = async () => {
    if (!formData.flockId || !formData.machineId || !formData.totalEggs) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const selectedFlock = flocks.find(f => f.id === formData.flockId);
    const batchNumber = `${selectedFlock?.flock_number}-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    const expectedHatchDate = calculateHatchDate(formData.setDate);

    const { data, error } = await supabase
      .from('batches')
      .insert({
        batch_number: batchNumber,
        flock_id: formData.flockId,
        machine_id: formData.machineId,
        set_date: formData.setDate,
        expected_hatch_date: expectedHatchDate,
        total_eggs_set: parseInt(formData.totalEggs),
        status: 'setting'
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error creating batch",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Batch Created",
        description: `Batch ${batchNumber} created successfully`
      });
      setShowCreateForm(false);
      setFormData({ flockId: '', machineId: '', setDate: new Date().toISOString().split('T')[0], totalEggs: '' });
      loadBatches();
      onBatchSelect(data.id);
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

  if (compact) {
    return (
      <div className="flex flex-col h-full">
        {/* Compact New Batch Button */}
        <div className="p-4 border-b border-gray-200">
          <Button 
            onClick={() => setShowCreateForm(!showCreateForm)}
            variant={showCreateForm ? "outline" : "default"}
            className="w-full"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            {showCreateForm ? "Cancel" : "New Batch"}
          </Button>
        </div>

        {/* Compact Create Form */}
        {showCreateForm && (
          <div className="p-4 border-b border-gray-200 space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Flock *</Label>
              <Select value={formData.flockId} onValueChange={(value) => setFormData(prev => ({ ...prev, flockId: value }))}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Choose flock" />
                </SelectTrigger>
                <SelectContent>
                  {flocks.map((flock) => (
                    <SelectItem key={flock.id} value={flock.id}>
                      {flock.flock_number} - {flock.flock_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Machine *</Label>
              <Select value={formData.machineId} onValueChange={(value) => setFormData(prev => ({ ...prev, machineId: value }))}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Choose machine" />
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
              <Label className="text-xs">Set Date *</Label>
              <Input
                type="date"
                value={formData.setDate}
                onChange={(e) => setFormData(prev => ({ ...prev, setDate: e.target.value }))}
                className="h-8"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Total Eggs *</Label>
              <Input
                type="number"
                placeholder="45000"
                value={formData.totalEggs}
                onChange={(e) => setFormData(prev => ({ ...prev, totalEggs: e.target.value }))}
                className="h-8"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={createBatch} size="sm" className="flex-1">Create</Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)} size="sm" className="flex-1">Cancel</Button>
            </div>
          </div>
        )}

        {/* Compact Batch List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-2 space-y-2">
            {batches.map((batch) => (
              <div
                key={batch.id}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedBatch === batch.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => onBatchSelect(batch.id)}
              >
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-medium text-sm">{batch.batch_number}</h4>
                  <Badge className={getStatusColor(batch.status)} variant="secondary">
                    {batch.status}
                  </Badge>
                </div>
                <div className="space-y-1 text-xs text-gray-600">
                  <div>Flock {batch.flock_number}</div>
                  <div>Machine {batch.machine_number}</div>
                  <div>{new Date(batch.set_date).toLocaleDateString()}</div>
                  <div>{(batch.total_eggs_set / 1000).toFixed(0)}k eggs</div>
                </div>
              </div>
            ))}
          </div>
          {batches.length === 0 && (
            <div className="text-center py-8 text-gray-500 text-sm">
              No batches found.
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create New Batch */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Batch Management
            </span>
            <Button 
              onClick={() => setShowCreateForm(!showCreateForm)}
              variant={showCreateForm ? "outline" : "default"}
            >
              {showCreateForm ? "Cancel" : "New Batch"}
            </Button>
          </CardTitle>
        </CardHeader>
        {showCreateForm && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <Button onClick={createBatch}>Create Batch</Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Existing Batches */}
      <Card>
        <CardHeader>
          <CardTitle>Active Batches</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {batches.map((batch) => (
              <div
                key={batch.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedBatch === batch.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => onBatchSelect(batch.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">{batch.batch_number}</h3>
                  <Badge className={getStatusColor(batch.status)}>
                    {batch.status}
                  </Badge>
                </div>
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Package2 className="h-4 w-4" />
                    {batch.flock_number} - {batch.flock_name}
                  </div>
                  <div className="flex items-center gap-2">
                    <Factory className="h-4 w-4" />
                    {batch.machine_number}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Set: {new Date(batch.set_date).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {batch.total_eggs_set.toLocaleString()} eggs
                  </div>
                </div>
              </div>
            ))}
          </div>
          {batches.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No batches found. Create your first batch to get started.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BatchManager;
