import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Factory, MapPin, Wrench } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Machine {
  id: string;
  machine_number: string;
  machine_type: 'setter' | 'hatcher' | 'combo';
  capacity: number;
  location: string | null;
  status: string | null;
  last_maintenance: string | null;
  notes: string | null;
}

const MachineManager = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [formData, setFormData] = useState({
    machine_number: '',
    machine_type: '',
    capacity: '',
    location: '',
    status: 'available',
    last_maintenance: '',
    notes: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    loadMachines();
  }, []);

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

  const resetForm = () => {
    setFormData({
      machine_number: '',
      machine_type: '',
      capacity: '',
      location: '',
      status: 'available',
      last_maintenance: '',
      notes: ''
    });
    setEditingMachine(null);
  };

  const handleSubmit = async () => {
    if (!formData.machine_number || !formData.machine_type || !formData.capacity) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const machineData = {
      machine_number: formData.machine_number,
      machine_type: formData.machine_type as 'setter' | 'hatcher' | 'combo',
      capacity: parseInt(formData.capacity),
      location: formData.location || null,
      status: formData.status || 'available',
      last_maintenance: formData.last_maintenance || null,
      notes: formData.notes || null
    };

    if (editingMachine) {
      const { error } = await supabase
        .from('machines')
        .update(machineData)
        .eq('id', editingMachine.id);

      if (error) {
        toast({
          title: "Error updating machine",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({ title: "Machine updated successfully" });
        setShowDialog(false);
        resetForm();
        loadMachines();
      }
    } else {
      const { error } = await supabase
        .from('machines')
        .insert(machineData);

      if (error) {
        toast({
          title: "Error creating machine",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({ title: "Machine created successfully" });
        setShowDialog(false);
        resetForm();
        loadMachines();
      }
    }
  };

  const handleEdit = (machine: Machine) => {
    setEditingMachine(machine);
    setFormData({
      machine_number: machine.machine_number,
      machine_type: machine.machine_type,
      capacity: machine.capacity.toString(),
      location: machine.location || '',
      status: machine.status || 'available',
      last_maintenance: machine.last_maintenance || '',
      notes: machine.notes || ''
    });
    setShowDialog(true);
  };

  const handleDelete = async (machine: Machine) => {
    if (!confirm(`Are you sure you want to delete machine ${machine.machine_number}?`)) {
      return;
    }

    const { error } = await supabase
      .from('machines')
      .delete()
      .eq('id', machine.id);

    if (error) {
      toast({
        title: "Error deleting machine",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({ title: "Machine deleted successfully" });
      loadMachines();
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'in-use': return 'bg-blue-100 text-blue-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'offline': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'setter': return 'bg-blue-100 text-blue-800';
      case 'hatcher': return 'bg-green-100 text-green-800';
      case 'combo': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Factory className="h-5 w-5" />
            Machine Management
          </span>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                New Machine
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingMachine ? 'Edit Machine' : 'Create New Machine'}
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Machine Number *</Label>
                  <Input
                    value={formData.machine_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, machine_number: e.target.value }))}
                    placeholder="e.g., INC-001"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Machine Type *</Label>
                  <Select value={formData.machine_type} onValueChange={(value) => setFormData(prev => ({ ...prev, machine_type: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="setter">Setter</SelectItem>
                      <SelectItem value="hatcher">Hatcher</SelectItem>
                      <SelectItem value="combo">Combo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Capacity *</Label>
                  <Input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value }))}
                    placeholder="e.g., 50000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="e.g., Building A"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="in-use">In Use</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="offline">Offline</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Last Maintenance</Label>
                  <Input
                    type="date"
                    value={formData.last_maintenance}
                    onChange={(e) => setFormData(prev => ({ ...prev, last_maintenance: e.target.value }))}
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
                  {editingMachine ? 'Update' : 'Create'} Machine
                </Button>
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Cancel
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {machines.map((machine) => (
            <div key={machine.id} className="p-4 border rounded-lg hover:border-primary/50 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">{machine.machine_number}</h3>
                  <Badge className={getTypeColor(machine.machine_type)}>
                    {machine.machine_type}
                  </Badge>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(machine)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(machine)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Status:</span>
                  <Badge className={getStatusColor(machine.status)}>
                    {machine.status || 'available'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Capacity:</span>
                  <span className="font-medium">{machine.capacity.toLocaleString()}</span>
                </div>
                {machine.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {machine.location}
                  </div>
                )}
                {machine.last_maintenance && (
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4" />
                    Last maintenance: {new Date(machine.last_maintenance).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        {machines.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No machines found. Create your first machine to get started.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MachineManager;