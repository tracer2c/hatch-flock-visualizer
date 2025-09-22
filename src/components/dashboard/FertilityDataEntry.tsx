import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Save, X, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

interface FertilityRecord {
  id: string;
  batch_id: string;
  sample_size: number;
  infertile_eggs: number;
  fertile_eggs: number;
  early_dead: number;
  late_dead: number;
  cull_chicks: number;
  fertility_percent: number;
  hatch_percent: number;
  hof_percent: number;
  hoi_percent?: number | null;
  if_dev_percent?: number | null;
  analysis_date: string;
  technician_name?: string | null;
  notes?: string | null;
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
    totalEggs: '',
    infertileEggs: '',
    earlyDead: ''
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

  const calculateValues = (totalEggs: number, infertile: number) => {
    const fertileEggs = Math.max(0, totalEggs - infertile);
    
    return {
      fertileEggs
    };
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const totalEggs = Number(formData.totalEggs || 0);
    const infertile = Number(formData.infertileEggs || 0);
    const earlyDead = Number(formData.earlyDead || 0);

    if (!formData.totalEggs || totalEggs <= 0) {
      return { isValid: false, error: "Total Eggs is required and must be greater than 0" };
    }

    if (!formData.infertileEggs || infertile < 0) {
      return { isValid: false, error: "Infertile Eggs is required and cannot be negative" };
    }

    if (earlyDead < 0) {
      return { isValid: false, error: "Early Dead cannot be negative" };
    }

    if (infertile > totalEggs) {
      return { 
        isValid: false, 
        error: `Infertile eggs (${infertile}) cannot exceed total eggs (${totalEggs})` 
      };
    }
    
    return { isValid: true, error: "" };
  };

  const isFormValid = () => {
    return validateForm().isValid;
  };

  const handleSubmit = async () => {
    const validation = validateForm();
    if (!validation.isValid || loading) {
      if (!validation.isValid) {
        toast({
          title: "Validation Error",
          description: validation.error,
          variant: "destructive"
        });
      }
      return;
    }
    
    setLoading(true);
    
    try {
      const totalEggs = Number(formData.totalEggs || 0);
      const infertile = Number(formData.infertileEggs || 0);
      const earlyDead = Number(formData.earlyDead || 0);
      
      const calculated = calculateValues(totalEggs, infertile);
      
      const recordData = {
        batch_id: batchInfo.id,
        sample_size: totalEggs,
        infertile_eggs: infertile,
        fertile_eggs: calculated.fertileEggs,
        early_dead: earlyDead,
        late_dead: 0,
        cull_chicks: 0,
        // fertility_percent is a generated column - removed to prevent insert error
        hatch_percent: 0,
        hof_percent: 0,
        hoi_percent: 0,
        if_dev_percent: 0,
        analysis_date: new Date().toISOString().split('T')[0],
        technician_name: null,
        notes: null
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
          description: "Residue record updated successfully"
        });
      } else {
        onDataUpdate([...data, result.data]);
        toast({
          title: "Record Added",
          description: "New Residue record added successfully"
        });
      }

      // Check and update batch status
      await checkBatchStatus();
      
      handleCancel();
    } catch (error: any) {
      console.error('Error saving fertility data:', error);
      const errorMessage = error?.message || error?.details || "Failed to save Residue analysis data";
      toast({
        title: "Error saving record",
        description: errorMessage,
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
      totalEggs: record.sample_size.toString(),
      infertileEggs: record.infertile_eggs.toString(),
      earlyDead: record.early_dead.toString()
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
      totalEggs: '',
      infertileEggs: '',
      earlyDead: ''
    });
  };

  const calculateOverallAverages = () => {
    if (data.length === 0) return null;
    
    const totalSampleSize = data.reduce((sum, record) => sum + record.sample_size, 0);
    const totalInfertile = data.reduce((sum, record) => sum + record.infertile_eggs, 0);
    const totalFertile = data.reduce((sum, record) => sum + record.fertile_eggs, 0);
    const totalEarlyDead = data.reduce((sum, record) => sum + record.early_dead, 0);
    
    return {
      totalSampleSize,
      totalInfertile,
      totalFertile,
      totalEarlyDead
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
            {editingId ? 'Edit Fertility Record' : 'Add New Residue Record'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="totalEggs">Total No. of Eggs *</Label>
              <Input
                id="totalEggs"
                type="number"
                min="1"
                placeholder="e.g., 648"
                value={formData.totalEggs}
                onChange={(e) => handleInputChange('totalEggs', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="infertileEggs">Infertile Eggs *</Label>
              <Input
                id="infertileEggs"
                type="number"
                min="0"
                placeholder="e.g., 210"
                value={formData.infertileEggs}
                onChange={(e) => handleInputChange('infertileEggs', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Fertile Eggs (auto)
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 opacity-70" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Total eggs - Infertile eggs
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Input
                disabled
                value={(() => {
                  const total = Number(formData.totalEggs || 0);
                  const inf = Number(formData.infertileEggs || 0);
                  return calculateValues(total, inf).fertileEggs;
                })()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="earlyDead">Early Dead</Label>
              <Input
                id="earlyDead"
                type="number"
                min="0"
                placeholder="e.g., 25"
                value={formData.earlyDead}
                onChange={(e) => handleInputChange('earlyDead', e.target.value)}
              />
            </div>
          </div>
          
          {/* Validation Summary */}
          {!isFormValid() && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mt-4">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-yellow-800 font-medium">Validation Summary:</span>
              </div>
              <p className="text-sm text-yellow-700 mt-1">{validateForm().error}</p>
            </div>
          )}
          
          <div className="flex gap-2 mt-4">
            <Button onClick={handleSubmit} disabled={loading || !isFormValid()} className="flex items-center gap-2">
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
          <CardTitle>Residue Records</CardTitle>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <div className="text-center py-8">
              <Info className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Residue Records</h3>
              <p className="text-gray-600">No fertility analysis records found. Click "Add New Residue Record" to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Total Eggs</TableHead>
                    <TableHead>Infertile Eggs</TableHead>
                    <TableHead>Fertile Eggs</TableHead>
                    <TableHead>Early Dead</TableHead>
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
                      <TableCell>{record.fertile_eggs}</TableCell>
                      <TableCell>{record.early_dead}</TableCell>
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
                    <TableRow className="bg-gray-50 font-medium border-t-2 border-gray-200">
                      <TableCell>TOTALS</TableCell>
                      <TableCell>{overallAverages.totalSampleSize}</TableCell>
                      <TableCell>{overallAverages.totalInfertile}</TableCell>
                      <TableCell>{overallAverages.totalFertile}</TableCell>
                      <TableCell>{overallAverages.totalEarlyDead}</TableCell>
                      <TableCell>-</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FertilityDataEntry;