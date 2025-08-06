
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface FertilityRecord {
  id: string;
  batch_id: string;
  sample_size: number;
  infertile_eggs: number;
  fertile_eggs: number;
  early_dead: number;
  late_dead: number;
  fertility_percent: number;
  hatch_percent: number;
  hof_percent: number;
  hoi_percent?: number;
  if_dev_percent?: number;
  analysis_date: string;
  technician_name?: string;
  notes?: string;
}

interface BatchInfo {
  id: string;
  batch_number: string;
  flock_name: string;
  flock_number: number;
}

interface FertilityDataEntryProps {
  data: FertilityRecord[];
  onDataUpdate: (data: FertilityRecord[]) => void;
  batchInfo: BatchInfo;
}

const FertilityDataEntry = ({ data, onDataUpdate, batchInfo }: FertilityDataEntryProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    sampleSize: '648',
    infertileEggs: '',
    earlyDead: '',
    lateDead: '',
    hatchPercent: '',
    hoiPercent: '',
    ifDevPercent: '',
    technicianName: '',
    notes: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    loadFertilityData();
  }, [batchInfo.id]);

  const loadFertilityData = async () => {
    try {
      const { data: fertilityData, error } = await supabase
        .from('fertility_analysis')
        .select('*')
        .eq('batch_id', batchInfo.id)
        .order('analysis_date', { ascending: false });

      if (error) throw error;
      
      if (fertilityData) {
        onDataUpdate(fertilityData);
      }
    } catch (error) {
      console.error('Error loading fertility data:', error);
      toast({
        title: "Error loading data",
        description: "Failed to load fertility analysis data",
        variant: "destructive"
      });
    }
  };

  const calculateValues = (sampleSize: number, infertile: number, earlyDead: number, lateDead: number, hatchPercent: number) => {
    const fertileEggs = sampleSize - infertile;
    const fertilityPercent = (fertileEggs / sampleSize) * 100;
    const hofPercent = (hatchPercent / fertilityPercent) * 100;
    
    return {
      fertileEggs,
      fertilityPercent: Number(fertilityPercent.toFixed(2)),
      hofPercent: Number(hofPercent.toFixed(2))
    };
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const sampleSize = Number(formData.sampleSize);
    const infertile = Number(formData.infertileEggs);
    const earlyDead = Number(formData.earlyDead);
    const lateDead = Number(formData.lateDead);
    
    if (infertile + earlyDead + lateDead > sampleSize) {
      toast({
        title: "Validation Error",
        description: "Infertile + Dead eggs cannot exceed sample size",
        variant: "destructive"
      });
      return false;
    }
    
    if (!formData.sampleSize || !formData.infertileEggs || !formData.hatchPercent) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return false;
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm() || loading) return;
    
    setLoading(true);
    
    try {
      const sampleSize = Number(formData.sampleSize);
      const infertile = Number(formData.infertileEggs);
      const earlyDead = Number(formData.earlyDead);
      const lateDead = Number(formData.lateDead);
      const hatchPercent = Number(formData.hatchPercent);
      
      const calculated = calculateValues(sampleSize, infertile, earlyDead, lateDead, hatchPercent);
      
      const recordData = {
        batch_id: batchInfo.id,
        sample_size: sampleSize,
        infertile_eggs: infertile,
        fertile_eggs: calculated.fertileEggs,
        early_dead: earlyDead,
        late_dead: lateDead,
        hatch_percent: hatchPercent,
        hof_percent: calculated.hofPercent,
        hoi_percent: formData.hoiPercent ? Number(formData.hoiPercent) : null,
        if_dev_percent: formData.ifDevPercent ? Number(formData.ifDevPercent) : null,
        analysis_date: new Date().toISOString().split('T')[0],
        technician_name: formData.technicianName || null,
        notes: formData.notes || null
      };

      let result;
      if (editingId) {
        result = await supabase
          .from('fertility_analysis')
          .update(recordData)
          .eq('id', editingId)
          .select()
          .single();
      } else {
        result = await supabase
          .from('fertility_analysis')
          .insert(recordData)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      // Update local state
      if (editingId) {
        const updatedData = data.map(item => item.id === editingId ? result.data : item);
        onDataUpdate(updatedData);
        toast({
          title: "Record Updated",
          description: "Fertility record updated successfully"
        });
      } else {
        onDataUpdate([...data, result.data]);
        toast({
          title: "Record Added",
          description: "New fertility record added successfully"
        });
      }

      // Check and update batch status
      await checkBatchStatus();
      
      handleCancel();
    } catch (error) {
      console.error('Error saving fertility data:', error);
      toast({
        title: "Error saving record",
        description: "Failed to save fertility analysis data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const checkBatchStatus = async () => {
    try {
      // Get batch info with set date
      const { data: batch, error: batchError } = await supabase
        .from('batches')
        .select('set_date, status')
        .eq('id', batchInfo.id)
        .single();

      if (batchError) throw batchError;

      const setDate = new Date(batch.set_date);
      const today = new Date();
      const daysSinceSet = Math.floor((today.getTime() - setDate.getTime()) / (1000 * 60 * 60 * 24));

      let newStatus = batch.status;

      // Auto-progress status based on days since set
      if (daysSinceSet >= 21 && batch.status !== 'completed') {
        // After 21 days and fertility data is recorded, mark as completed
        newStatus = 'completed';
      } else if (daysSinceSet >= 18 && batch.status === 'incubating') {
        newStatus = 'hatching';
      } else if (daysSinceSet >= 1 && batch.status === 'setting') {
        newStatus = 'incubating';
      }

      if (newStatus !== batch.status) {
        const { error: updateError } = await supabase
          .from('batches')
          .update({ status: newStatus })
          .eq('id', batchInfo.id);

        if (!updateError) {
          toast({
            title: "Batch Status Updated",
            description: `Batch status changed to ${newStatus}`,
          });
        }
      }
    } catch (error) {
      console.error('Error updating batch status:', error);
    }
  };

  const handleEdit = (record: FertilityRecord) => {
    setEditingId(record.id);
    setFormData({
      sampleSize: record.sample_size.toString(),
      infertileEggs: record.infertile_eggs.toString(),
      earlyDead: record.early_dead.toString(),
      lateDead: record.late_dead.toString(),
      hatchPercent: record.hatch_percent.toString(),
      hoiPercent: record.hoi_percent?.toString() || '',
      ifDevPercent: record.if_dev_percent?.toString() || '',
      technicianName: record.technician_name || '',
      notes: record.notes || ''
    });
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('fertility_analysis')
        .delete()
        .eq('id', id);

      if (error) throw error;

      const updatedData = data.filter(item => item.id !== id);
      onDataUpdate(updatedData);
      toast({
        title: "Record Deleted",
        description: "Fertility record deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting fertility record:', error);
      toast({
        title: "Error deleting record",
        description: "Failed to delete fertility record",
        variant: "destructive"
      });
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({
      sampleSize: '648',
      infertileEggs: '',
      earlyDead: '',
      lateDead: '',
      hatchPercent: '',
      hoiPercent: '',
      ifDevPercent: '',
      technicianName: '',
      notes: ''
    });
  };

  const calculateOverallAverages = () => {
    if (data.length === 0) return null;
    
    const totalSampleSize = data.reduce((sum, record) => sum + record.sample_size, 0);
    const totalInfertile = data.reduce((sum, record) => sum + record.infertile_eggs, 0);
    const avgFertility = data.reduce((sum, record) => sum + (record.fertility_percent || 0), 0) / data.length;
    const avgHatch = data.reduce((sum, record) => sum + (record.hatch_percent || 0), 0) / data.length;
    const avgHOF = data.reduce((sum, record) => sum + (record.hof_percent || 0), 0) / data.length;
    
    return {
      totalSampleSize,
      totalInfertile,
      avgFertility: Number(avgFertility.toFixed(2)),
      avgHatch: Number(avgHatch.toFixed(2)),
      avgHOF: Number(avgHOF.toFixed(2))
    };
  };

  const overallAverages = calculateOverallAverages();

  return (
    <div className="space-y-6">
      {/* Form Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {editingId ? 'Edit Fertility Record' : 'Add New Fertility Record'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sampleSize">Sample Size *</Label>
              <Input
                id="sampleSize"
                type="number"
                placeholder="e.g., 648"
                value={formData.sampleSize}
                onChange={(e) => handleInputChange('sampleSize', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="infertileEggs">Infertile Eggs *</Label>
              <Input
                id="infertileEggs"
                type="number"
                placeholder="e.g., 210"
                value={formData.infertileEggs}
                onChange={(e) => handleInputChange('infertileEggs', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="earlyDead">Early Dead</Label>
              <Input
                id="earlyDead"
                type="number"
                placeholder="e.g., 25"
                value={formData.earlyDead}
                onChange={(e) => handleInputChange('earlyDead', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lateDead">Late Dead</Label>
              <Input
                id="lateDead"
                type="number"
                placeholder="e.g., 20"
                value={formData.lateDead}
                onChange={(e) => handleInputChange('lateDead', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hatchPercent">Hatch % *</Label>
              <Input
                id="hatchPercent"
                type="number"
                step="0.01"
                placeholder="e.g., 60.61"
                value={formData.hatchPercent}
                onChange={(e) => handleInputChange('hatchPercent', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hoiPercent">HOI %</Label>
              <Input
                id="hoiPercent"
                type="number"
                step="0.01"
                placeholder="e.g., 85.50"
                value={formData.hoiPercent}
                onChange={(e) => handleInputChange('hoiPercent', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ifDevPercent">I/F dev. %</Label>
              <Input
                id="ifDevPercent"
                type="number"
                step="0.01"
                placeholder="e.g., 4.20"
                value={formData.ifDevPercent}
                onChange={(e) => handleInputChange('ifDevPercent', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="technicianName">Technician Name</Label>
              <Input
                id="technicianName"
                placeholder="e.g., John Doe"
                value={formData.technicianName}
                onChange={(e) => handleInputChange('technicianName', e.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                placeholder="Additional notes or observations"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleSubmit} disabled={loading} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              {loading ? 'Saving...' : (editingId ? 'Update Record' : 'Add Record')}
            </Button>
            {editingId && (
              <Button variant="outline" onClick={handleCancel} className="flex items-center gap-2">
                <X className="h-4 w-4" />
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Fertility Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Sample Size</TableHead>
                  <TableHead>Infertile</TableHead>
                  <TableHead>Early Dead</TableHead>
                  <TableHead>Late Dead</TableHead>
                  <TableHead>Fertility %</TableHead>
                  <TableHead>Hatch %</TableHead>
                  <TableHead>HOF %</TableHead>
                  <TableHead>HOI %</TableHead>
                  <TableHead>I/F dev. %</TableHead>
                  <TableHead>Technician</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {new Date(record.analysis_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{record.sample_size}</TableCell>
                    <TableCell>{record.infertile_eggs}</TableCell>
                    <TableCell>{record.early_dead}</TableCell>
                    <TableCell>{record.late_dead}</TableCell>
                    <TableCell>{record.fertility_percent}%</TableCell>
                    <TableCell>{record.hatch_percent}%</TableCell>
                    <TableCell>{record.hof_percent}%</TableCell>
                    <TableCell>{record.hoi_percent ? `${record.hoi_percent}%` : '-'}</TableCell>
                    <TableCell>{record.if_dev_percent ? `${record.if_dev_percent}%` : '-'}</TableCell>
                    <TableCell>{record.technician_name || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(record)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(record.id)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {overallAverages && (
                  <TableRow className="bg-gray-50 font-medium">
                    <TableCell>OVERALL AVERAGES</TableCell>
                    <TableCell>{overallAverages.totalSampleSize}</TableCell>
                    <TableCell>{overallAverages.totalInfertile}</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>{overallAverages.avgFertility}%</TableCell>
                    <TableCell>{overallAverages.avgHatch}%</TableCell>
                    <TableCell>{overallAverages.avgHOF}%</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>-</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FertilityDataEntry;
