import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Users, Home, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Flock {
  id: string;
  flock_number: number;
  flock_name: string;
  house_number: string | null;
  age_weeks: number;
  breed: 'broiler' | 'layer' | 'breeder';
  arrival_date: string;
  total_birds: number | null;
  notes: string | null;
}

const FlockManager = () => {
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingFlock, setEditingFlock] = useState<Flock | null>(null);
  const [formData, setFormData] = useState({
    flock_number: '',
    flock_name: '',
    house_number: '',
    age_weeks: '',
    breed: '',
    arrival_date: new Date().toISOString().split('T')[0],
    total_birds: '',
    notes: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    loadFlocks();
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

  const resetForm = () => {
    setFormData({
      flock_number: '',
      flock_name: '',
      house_number: '',
      age_weeks: '',
      breed: '',
      arrival_date: new Date().toISOString().split('T')[0],
      total_birds: '',
      notes: ''
    });
    setEditingFlock(null);
  };

  const handleSubmit = async () => {
    if (!formData.flock_number || !formData.flock_name || !formData.age_weeks || !formData.breed) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const flockData = {
      flock_number: parseInt(formData.flock_number),
      flock_name: formData.flock_name,
      house_number: formData.house_number || null,
      age_weeks: parseInt(formData.age_weeks),
      breed: formData.breed as 'broiler' | 'layer' | 'breeder',
      arrival_date: formData.arrival_date,
      total_birds: formData.total_birds ? parseInt(formData.total_birds) : null,
      notes: formData.notes || null
    };

    if (editingFlock) {
      const { error } = await supabase
        .from('flocks')
        .update(flockData)
        .eq('id', editingFlock.id);

      if (error) {
        toast({
          title: "Error updating flock",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({ title: "Flock updated successfully" });
        setShowDialog(false);
        resetForm();
        loadFlocks();
      }
    } else {
      const { error } = await supabase
        .from('flocks')
        .insert(flockData);

      if (error) {
        toast({
          title: "Error creating flock",
          description: error.message,
          variant: "destructive"
        });
      } else {
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
      house_number: flock.house_number || '',
      age_weeks: flock.age_weeks.toString(),
      breed: flock.breed,
      arrival_date: flock.arrival_date,
      total_birds: flock.total_birds?.toString() || '',
      notes: flock.notes || ''
    });
    setShowDialog(true);
  };

  const handleDelete = async (flock: Flock) => {
    if (!confirm(`Are you sure you want to delete flock ${flock.flock_number} - ${flock.flock_name}?`)) {
      return;
    }

    const { error } = await supabase
      .from('flocks')
      .delete()
      .eq('id', flock.id);

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
  };

  const getBreedColor = (breed: string) => {
    switch (breed) {
      case 'broiler': return 'bg-blue-100 text-blue-800';
      case 'layer': return 'bg-green-100 text-green-800';
      case 'breeder': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Flock Management
          </span>
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
                  <Label>House Number</Label>
                  <Input
                    value={formData.house_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, house_number: e.target.value }))}
                    placeholder="e.g., H1"
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
                  <Label>Breed *</Label>
                  <Select value={formData.breed} onValueChange={(value) => setFormData(prev => ({ ...prev, breed: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select breed" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="broiler">Broiler</SelectItem>
                      <SelectItem value="layer">Layer</SelectItem>
                      <SelectItem value="breeder">Breeder</SelectItem>
                    </SelectContent>
                  </Select>
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
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {flocks.map((flock) => (
            <div key={flock.id} className="p-4 border rounded-lg hover:border-primary/50 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">{flock.flock_number}</h3>
                  <Badge className={getBreedColor(flock.breed)}>
                    {flock.breed}
                  </Badge>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(flock)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(flock)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="font-medium text-foreground">{flock.flock_name}</div>
                {flock.house_number && (
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    House {flock.house_number}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {flock.age_weeks} weeks old
                </div>
                {flock.total_birds && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {flock.total_birds.toLocaleString()} birds
                  </div>
                )}
                <div className="text-xs">
                  Arrived: {new Date(flock.arrival_date).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
        {flocks.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No flocks found. Create your first flock to get started.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FlockManager;