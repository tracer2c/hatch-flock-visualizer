import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Save, X, Info, AlertTriangle, CloudOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { calculateDaysSinceSet, validateFertilityAnalysisDate } from "@/utils/dateValidation";
import { useOfflineSubmit } from "@/hooks/useOfflineSubmit";
import { PendingSyncBadge } from "@/components/ui/pending-sync-badge";

interface FertilityRecord {
  id: string;
  batch_id: string;
  sample_size: number;
  infertile_eggs: number;
  fertile_eggs: number;
  fertility_percent: number;
  analysis_date: string;
  technician_name?: string | null;
  notes?: string | null;
}

interface BatchInfo {
  id: string;
  batch_number: string;
  flock_name: string;
  flock_number: number;
  set_date: string;
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
    sampleSize: '',
    infertileEggs: '',
    analysisDate: new Date().toISOString().split('T')[0],
    technicianName: '',
    notes: ''
  });
  const { toast } = useToast();
  const { submit: offlineSubmit, isOnline } = useOfflineSubmit('fertility_analysis', {
    invalidateQueries: ['fertility_analysis', 'batches', 'houses'],
  });

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

  const calculateValues = (sampleSize: number, infertile: number) => {
    const fertileEggs = Math.max(0, sampleSize - infertile);
    const fertilityPercent = sampleSize > 0 ? (fertileEggs / sampleSize) * 100 : 0;
    
    return {
      fertileEggs,
      fertilityPercent: Number(fertilityPercent.toFixed(2)),
    };
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const sampleSize = Number(formData.sampleSize || 0);
    const infertile = Number(formData.infertileEggs || 0);

    if (!formData.sampleSize || sampleSize <= 0) {
      return { isValid: false, error: "Sample Size is required and must be greater than 0" };
    }

    if (!formData.infertileEggs || infertile < 0) {
      return { isValid: false, error: "Infertile Eggs is required and cannot be negative" };
    }

    if (infertile > sampleSize) {
      return { 
        isValid: false, 
        error: `Infertile eggs (${infertile}) cannot exceed sample size (${sampleSize})` 
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
      const sampleSize = Number(formData.sampleSize || 0);
      const infertile = Number(formData.infertileEggs || 0);
      
      const calculated = calculateValues(sampleSize, infertile);
      
      const recordData = {
        id: editingId || undefined,
        batch_id: batchInfo.id,
        sample_size: sampleSize,
        infertile_eggs: infertile,
        fertile_eggs: calculated.fertileEggs,
        analysis_date: formData.analysisDate || new Date().toISOString().split('T')[0],
        technician_name: formData.technicianName || null,
        notes: formData.notes || null
      };

      // Use offline-aware submit
      const result = await offlineSubmit(recordData, 'upsert');

      // If we got data back (online mode), update local state
      if (result) {
        const existingIndex = data.findIndex(item => item.batch_id === batchInfo.id);
        let updatedData;
        if (existingIndex >= 0) {
          updatedData = data.map(item => item.batch_id === batchInfo.id ? result[0] : item);
        } else {
          updatedData = [...data, result[0]];
        }
        onDataUpdate(updatedData);
      } else {
        // Offline mode - add temporary record for UI
        const tempRecord = {
          ...recordData,
          id: `temp-${Date.now()}`,
          fertility_percent: calculated.fertilityPercent,
        } as FertilityRecord;
        
        const existingIndex = data.findIndex(item => item.batch_id === batchInfo.id);
        if (existingIndex >= 0) {
          onDataUpdate(data.map(item => item.batch_id === batchInfo.id ? tempRecord : item));
        } else {
          onDataUpdate([...data, tempRecord]);
        }
      }

      // Check and update batch status (only if online)
      if (isOnline) {
        await checkBatchStatus();
      }
      
      handleCancel();
    } catch (error: any) {
      console.error('Error saving fertility data:', error);
      const errorMessage = error?.message || error?.details || "Failed to save fertility analysis data";
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
      } else if (daysSinceSet >= 18 && batch.status === 'in_setter') {
        newStatus = 'in_hatcher';
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
      analysisDate: record.analysis_date,
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
      sampleSize: '',
      infertileEggs: '',
      analysisDate: new Date().toISOString().split('T')[0],
      technicianName: '',
      notes: ''
    });
  };

  const daysSinceSet = formData.analysisDate && batchInfo.set_date 
    ? calculateDaysSinceSet(batchInfo.set_date, formData.analysisDate)
    : null;

  const dateValidation = formData.analysisDate && batchInfo.set_date
    ? validateFertilityAnalysisDate(batchInfo.set_date, formData.analysisDate)
    : null;

  const calculateOverallAverages = () => {
    if (data.length === 0) return null;
    
    const totalSampleSize = data.reduce((sum, record) => sum + record.sample_size, 0);
    const totalInfertile = data.reduce((sum, record) => sum + record.infertile_eggs, 0);
    const totalFertile = data.reduce((sum, record) => sum + record.fertile_eggs, 0);
    const avgFertility = data.reduce((sum, record) => sum + (record.fertility_percent || 0), 0) / data.length;
    
    return {
      totalSampleSize,
      totalInfertile,
      totalFertile,
      avgFertility: Number(avgFertility.toFixed(2))
    };
  };

  const overallAverages = calculateOverallAverages();

  return (
    <div className="space-y-6">
      {/* Offline indicator */}
      {!isOnline && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
          <CloudOff className="h-4 w-4" />
          <span className="text-sm">You're offline. Data will be saved locally and synced when back online.</span>
        </div>
      )}

      {/* Form Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {editingId ? 'Edit Fertility Record' : 'Add New Fertility Record'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sampleSize">Sample Size <span className="text-destructive">*</span></Label>
              <div className="flex gap-2">
                <Input
                  id="sampleSize"
                  type="number"
                  value={formData.sampleSize}
                  onChange={(e) => handleInputChange('sampleSize', e.target.value)}
                  placeholder="Enter sample size"
                  min="1"
                  required
                  className="w-32 text-center font-medium"
                />
                <Select onValueChange={(val) => handleInputChange('sampleSize', val)}>
                  <SelectTrigger className="w-28">
                    <SelectValue placeholder="Presets" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="648">648 (Standard)</SelectItem>
                    <SelectItem value="360">360 (Half)</SelectItem>
                    <SelectItem value="324">324 (Quarter)</SelectItem>
                    <SelectItem value="180">180 (Small)</SelectItem>
                    <SelectItem value="100">100 (Minimal)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
              <Label htmlFor="analysisDate">Analysis Date <span className="text-destructive">*</span></Label>
              <Input
                id="analysisDate"
                type="date"
                value={formData.analysisDate}
                onChange={(e) => handleInputChange('analysisDate', e.target.value)}
                required
              />
              {daysSinceSet !== null && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={
                    daysSinceSet >= 10 && daysSinceSet <= 14 ? "default" : "secondary"
                  } className="text-xs">
                    Day {daysSinceSet}
                  </Badge>
                  {dateValidation?.warning && (
                    <p className="text-xs text-yellow-600 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Days 10-14 recommended
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Fertile Eggs (calculated)
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 opacity-70" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Sample size - infertile eggs
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Input
                disabled
                value={(() => {
                  const s = Number(formData.sampleSize || 0);
                  const inf = Number(formData.infertileEggs || 0);
                  return calculateValues(s, inf).fertileEggs;
                })()}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Fertility %
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 opacity-70" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Fertile eggs ÷ sample size × 100
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Input
                disabled
                value={(() => {
                  const s = Number(formData.sampleSize || 0);
                  const inf = Number(formData.infertileEggs || 0);
                  return calculateValues(s, inf).fertilityPercent;
                })()}
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
            <div className="space-y-2 md:col-span-4">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                placeholder="Additional notes or observations"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
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
                  <TableHead>Fertile</TableHead>
                  <TableHead>Fertility %</TableHead>
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
                    <TableCell>{record.fertile_eggs}</TableCell>
                    <TableCell>{Number(record.fertility_percent ?? 0).toFixed(2)}%</TableCell>
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
                    <TableCell>{overallAverages.totalFertile}</TableCell>
                    <TableCell>{overallAverages.avgFertility}%</TableCell>
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