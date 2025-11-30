import React, { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, AlertTriangle, Eye, Plus, Edit, Trash2, Building2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, format, parseISO, addDays } from 'date-fns';

interface ResidueSchedule {
  id: string;
  batch_id: string;
  flock_id?: string;
  scheduled_date: string;
  due_date: string;
  status: 'pending' | 'completed' | 'overdue';
  completed_at?: string;
  completed_by?: string;
  notes?: string;
  technician_name?: string;
  batch: {
    batch_number: string;
    set_date: string;
    flock: {
      flock_name: string;
      id: string;
    };
  };
}

interface Batch {
  id: string;
  batch_number: string;
  set_date: string;
  unit_id?: string;
  flock_id?: string;
  flock: {
    id: string;
    flock_name: string;
  };
}

interface Flock {
  id: string;
  flock_name: string;
  flock_number: number;
  unit_id?: string;
}

export const ResidueScheduleManager = () => {
  const [schedules, setSchedules] = useState<ResidueSchedule[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'overdue' | 'completed'>('all');
  const [selectedHatchery, setSelectedHatchery] = useState<string>('all');
  const [selectedFlock, setSelectedFlock] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ResidueSchedule | null>(null);
  const [formData, setFormData] = useState({
    batch_id: '',
    flock_id: '',
    scheduled_date: '',
    due_date: '',
    notes: '',
    technician_name: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    loadSchedules();
    loadBatches();
    loadUnits();
    loadFlocks();
  }, []);

  const loadUnits = async () => {
    const { data } = await supabase.from('units').select('id, name').order('name');
    setUnits(data || []);
  };

  const loadFlocks = async () => {
    const { data } = await supabase
      .from('flocks')
      .select('id, flock_name, flock_number, unit_id')
      .order('flock_name');
    setFlocks(data || []);
  };

  const loadBatches = async () => {
    const { data, error } = await supabase
      .from('batches')
      .select(`
        id,
        batch_number,
        set_date,
        unit_id,
        flock_id,
        flock:flocks(id, flock_name)
      `)
      .in('status', ['setting', 'incubating', 'hatching'])
      .order('set_date', { ascending: false });

    if (error) {
      console.error('Error loading batches:', error);
    } else {
      setBatches(data as any || []);
    }
  };

  const loadSchedules = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('residue_analysis_schedule')
        .select(`
          *,
          batch:batches(
            batch_number,
            set_date,
            unit_id,
            flock:flocks(id, flock_name),
            unit:units(name)
          )
        `)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;

      const today = new Date().toISOString().split('T')[0];
      const updatedSchedules = (data || []).map(schedule => ({
        ...schedule,
        status: (schedule.status === 'pending' && schedule.due_date < today ? 'overdue' : schedule.status) as 'pending' | 'completed' | 'overdue'
      })) as ResidueSchedule[];

      setSchedules(updatedSchedules);
    } catch (error) {
      console.error('Error loading schedules:', error);
      toast({
        title: "Error loading schedules",
        description: "Failed to load residue analysis schedules",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchedule = async () => {
    if (!formData.batch_id || !formData.scheduled_date || !formData.due_date) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    // Get flock_id from the selected batch
    const selectedBatch = batches.find(b => b.id === formData.batch_id);
    const flockId = selectedBatch?.flock_id || formData.flock_id || null;

    const { error } = await supabase
      .from('residue_analysis_schedule')
      .insert({
        batch_id: formData.batch_id,
        flock_id: flockId,
        scheduled_date: formData.scheduled_date,
        due_date: formData.due_date,
        notes: formData.notes || null,
        technician_name: formData.technician_name || null,
        status: 'pending'
      });

    if (error) {
      toast({ title: "Error creating schedule", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Schedule created successfully" });
      setShowCreateDialog(false);
      setFormData({ batch_id: '', flock_id: '', scheduled_date: '', due_date: '', notes: '', technician_name: '' });
      setSelectedHatchery('all');
      setSelectedFlock('all');
      loadSchedules();
    }
  };

  const handleEditSchedule = (schedule: ResidueSchedule) => {
    setEditingSchedule(schedule);
    setFormData({
      batch_id: schedule.batch_id,
      flock_id: schedule.flock_id || '',
      scheduled_date: schedule.scheduled_date,
      due_date: schedule.due_date,
      notes: schedule.notes || '',
      technician_name: schedule.technician_name || ''
    });
    setShowEditDialog(true);
  };

  const handleUpdateSchedule = async () => {
    if (!editingSchedule) return;

    const { error } = await supabase
      .from('residue_analysis_schedule')
      .update({
        scheduled_date: formData.scheduled_date,
        due_date: formData.due_date,
        notes: formData.notes || null
      })
      .eq('id', editingSchedule.id);

    if (error) {
      toast({ title: "Error updating schedule", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Schedule updated successfully" });
      setShowEditDialog(false);
      setEditingSchedule(null);
      setFormData({ batch_id: '', flock_id: '', scheduled_date: '', due_date: '', notes: '', technician_name: '' });
      loadSchedules();
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    const { error } = await supabase
      .from('residue_analysis_schedule')
      .delete()
      .eq('id', scheduleId);

    if (error) {
      toast({ title: "Error deleting schedule", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Schedule deleted successfully" });
      loadSchedules();
    }
  };

  const markCompleted = async (scheduleId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('residue_analysis_schedule')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: user.id
        })
        .eq('id', scheduleId);

      if (error) throw error;

      toast({
        title: "Analysis completed",
        description: "Residue analysis has been marked as completed"
      });

      loadSchedules();
    } catch (error) {
      console.error('Error marking completed:', error);
      toast({
        title: "Error updating status",
        description: "Failed to mark analysis as completed",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string, dueDate: string) => {
    const daysUntilDue = differenceInDays(parseISO(dueDate), new Date());
    
    switch (status) {
      case 'completed':
        return 'default';
      case 'overdue':
        return 'destructive';
      case 'pending':
        return daysUntilDue <= 1 ? 'secondary' : 'outline';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'overdue':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const filteredSchedules = schedules.filter(schedule => {
    // Status filter
    if (filter !== 'all' && schedule.status !== filter) return false;
    
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesHouse = schedule.batch.batch_number.toLowerCase().includes(search);
      const matchesFlock = schedule.batch.flock.flock_name.toLowerCase().includes(search);
      const matchesTechnician = schedule.technician_name?.toLowerCase().includes(search);
      if (!matchesHouse && !matchesFlock && !matchesTechnician) return false;
    }
    
    return true;
  });

  const stats = {
    total: schedules.length,
    pending: schedules.filter(s => s.status === 'pending').length,
    overdue: schedules.filter(s => s.status === 'overdue').length,
    completed: schedules.filter(s => s.status === 'completed').length
  };

  // Auto-fill due date when scheduled date changes (2 days after scheduled)
  const handleScheduledDateChange = (date: string) => {
    const dueDate = addDays(new Date(date), 2).toISOString().split('T')[0];
    setFormData(prev => ({ ...prev, scheduled_date: date, due_date: dueDate }));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <p>Loading schedules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Residue Analysis Schedule</h2>
          <p className="text-muted-foreground">Track scheduled and completed residue analyses</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Residue Analysis Schedule</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Hatchery *
                </Label>
                <Select value={selectedHatchery} onValueChange={(val) => {
                  setSelectedHatchery(val);
                  setSelectedFlock('all');
                  setFormData(prev => ({ ...prev, batch_id: '' }));
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Hatchery" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Hatcheries</SelectItem>
                    {units.map(unit => (
                      <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Flock</Label>
                <Select value={selectedFlock} onValueChange={(val) => {
                  setSelectedFlock(val);
                  setFormData(prev => ({ ...prev, flock_id: val === 'all' ? '' : val, batch_id: '' }));
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Flocks" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Flocks</SelectItem>
                    {flocks
                      .filter(f => selectedHatchery === 'all' || f.unit_id === selectedHatchery)
                      .map(flock => (
                        <SelectItem key={flock.id} value={flock.id}>
                          #{flock.flock_number} - {flock.flock_name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Select House *</Label>
                <Select value={formData.batch_id} onValueChange={(value) => setFormData(prev => ({ ...prev, batch_id: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a house" />
                  </SelectTrigger>
                  <SelectContent>
                    {batches
                      .filter((batch: any) => {
                        if (selectedHatchery !== 'all' && batch.unit_id !== selectedHatchery) return false;
                        if (selectedFlock !== 'all' && batch.flock_id !== selectedFlock) return false;
                        return true;
                      })
                      .map((batch: any) => (
                        <SelectItem key={batch.id} value={batch.id}>
                          {batch.batch_number} - {batch.flock?.flock_name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Scheduled Date *</Label>
                  <Input
                    type="date"
                    value={formData.scheduled_date}
                    onChange={(e) => handleScheduledDateChange(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Due Date *</Label>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label>Technician Name</Label>
                <Input
                  value={formData.technician_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, technician_name: e.target.value }))}
                  placeholder="Enter technician name"
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add any notes..."
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreateSchedule}>Create Schedule</Button>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search by house, flock, or technician..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-blue-600">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-destructive">{stats.overdue}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2">
        {['all', 'pending', 'overdue', 'completed'].map((filterOption) => (
          <Button
            key={filterOption}
            variant={filter === filterOption ? 'default' : 'outline'}
            onClick={() => setFilter(filterOption as any)}
            size="sm"
          >
            {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
          </Button>
        ))}
      </div>

      {/* Schedules Table */}
      <Card>
        <CardHeader>
          <CardTitle>Analysis Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>House</TableHead>
                <TableHead>Flock</TableHead>
                <TableHead>Hatchery</TableHead>
                <TableHead>Technician</TableHead>
                <TableHead>Set Date</TableHead>
                <TableHead>Scheduled Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSchedules.map((schedule) => {
                const daysUntilDue = differenceInDays(parseISO(schedule.due_date), new Date());
                
                return (
                  <TableRow key={schedule.id}>
                    <TableCell className="font-medium">
                      {schedule.batch.batch_number}
                    </TableCell>
                    <TableCell>{schedule.batch.flock.flock_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{(schedule.batch as any).unit?.name || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell>{schedule.technician_name || 'N/A'}</TableCell>
                    <TableCell>{format(parseISO(schedule.batch.set_date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>{format(parseISO(schedule.scheduled_date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {format(parseISO(schedule.due_date), 'MMM dd, yyyy')}
                        {schedule.status === 'pending' && daysUntilDue <= 1 && (
                          <Badge variant="secondary" className="text-xs">
                            {daysUntilDue === 0 ? 'Due Today' : `${Math.abs(daysUntilDue)} days overdue`}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(schedule.status, schedule.due_date)}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(schedule.status)}
                          {schedule.status.charAt(0).toUpperCase() + schedule.status.slice(1)}
                        </div>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {schedule.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => markCompleted(schedule.id)}
                          >
                            Mark Complete
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => handleEditSchedule(schedule)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Schedule?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete this schedule. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteSchedule(schedule.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {filteredSchedules.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No {filter !== 'all' ? filter : ''} schedules found.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Schedule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>House</Label>
              <Input value={editingSchedule?.batch.batch_number || ''} disabled className="bg-muted" />
            </div>
            <div>
              <Label>Scheduled Date *</Label>
              <Input
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => setFormData(prev => ({ ...prev, scheduled_date: e.target.value }))}
              />
            </div>
            <div>
              <Label>Due Date *</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add any notes..."
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleUpdateSchedule}>Save Changes</Button>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};