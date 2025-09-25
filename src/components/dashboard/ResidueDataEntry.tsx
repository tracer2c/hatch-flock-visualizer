
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Save, X, AlertTriangle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "@/components/ui/image-upload";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";

interface ResidueRecord {
  id?: string;
  batch_id: string;
  analysis_date: string;
  total_residue_count: number;
  unhatched_fertile: number;
  pipped_not_hatched: number;
  malformed_chicks: number;
  contaminated_eggs: number;
  pip_number: number;
  residue_percent?: number;
  pathology_findings?: string;
  microscopy_results?: string;
  lab_technician?: string;
  notes?: string;
  created_at?: string;
  // Hatchability metrics from fertility analysis
  sample_size?: number;
  fertile_eggs?: number;
  hatch_percent?: number;
  hof_percent?: number;
  hoi_percent?: number;
  if_dev_percent?: number;
}

interface BatchInfo {
  id: string;
  batch_number: string;
  flock_name: string;
  flock_number: number;
  house_number?: string;
}

interface ResidueDataEntryProps {
  data: ResidueRecord[];
  onDataUpdate: (data: ResidueRecord[]) => void;
  batchInfo: BatchInfo;
}

const ResidueDataEntry = ({ data, onDataUpdate, batchInfo }: ResidueDataEntryProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    totalResidueCount: '',
    unhatchedFertile: '',
    pippedNotHatched: '',
    malformedChicks: '',
    contaminatedEggs: '',
    pipNumber: '',
    pathologyFindings: '',
    microscopyResults: '',
    labTechnician: '',
    notes: '',
    // Hatchability metrics
    sampleSize: '648'
  });
  const { toast } = useToast();

  useEffect(() => {
    loadResidueData();
  }, [batchInfo.id]);

  const loadResidueData = async () => {
    try {
      const { data: residueData, error } = await supabase
        .from('residue_analysis')
        .select('*')
        .eq('batch_id', batchInfo.id)
        .order('analysis_date', { ascending: false });

      if (error) throw error;
      
      if (residueData) {
        onDataUpdate(residueData);
      }
    } catch (error) {
      console.error('Error loading residue data:', error);
      toast({
        title: "Error loading data",
        description: "Failed to load residue analysis data",
        variant: "destructive"
      });
    }
  };

  // Calculate hatchability metrics
  const calculateHatchabilityMetrics = (sampleSize: number, infertile: number, earlyDead: number, lateDead: number, cullChicks: number) => {
    const fertileEggs = Math.max(0, sampleSize - infertile);
    const viableChicks = Math.max(0, sampleSize - infertile - earlyDead - lateDead - cullChicks);
    const hatchPercent = sampleSize > 0 ? (viableChicks / sampleSize) * 100 : 0; // HOS
    const hofPercent = fertileEggs > 0 ? (viableChicks / fertileEggs) * 100 : 0; // Hatch of Fertile
    const hoiPercent = fertileEggs > 0 ? ((viableChicks + cullChicks) / fertileEggs) * 100 : 0; // Hatch incl. culls
    const ifDevPercent = hoiPercent - hofPercent; // delta due to culls
    
    return {
      fertileEggs,
      hatchPercent: Number(hatchPercent.toFixed(2)),
      hofPercent: Number(hofPercent.toFixed(2)),
      hoiPercent: Number(hoiPercent.toFixed(2)),
      ifDevPercent: Number(ifDevPercent.toFixed(2)),
    };
  };

  const calculateTotalUsed = () => {
    const values = [
      'unhatchedFertile', 'pippedNotHatched', 'malformedChicks', 'contaminatedEggs'
    ];
    
    return values.reduce((sum, field) => {
      const value = Number(formData[field as keyof typeof formData]) || 0;
      return sum + value;
    }, 0);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const totalResidueCount = Number(formData.totalResidueCount || 0);
    const totalUsed = calculateTotalUsed();
    
    if (!formData.totalResidueCount || totalResidueCount <= 0) {
      toast({
        title: "Validation Error",
        description: "Total residue count is required and must be greater than 0",
        variant: "destructive"
      });
      return false;
    }

    if (totalUsed > totalResidueCount) {
      toast({
        title: "Validation Error",
        description: `Sum of residue categories (${totalUsed}) exceeds total residue count (${totalResidueCount})`,
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
      const sampleSize = Number(formData.sampleSize) || 648;
      const totalResidueCount = Number(formData.totalResidueCount) || 0;
      const unhatchedFertile = Number(formData.unhatchedFertile) || 0;
      const pippedNotHatched = Number(formData.pippedNotHatched) || 0;
      const malformedChicks = Number(formData.malformedChicks) || 0;
      const contaminatedEggs = Number(formData.contaminatedEggs) || 0;
      
      // For hatchability calculation, we'll use residue data where available
      const infertile = 0; // This would come from fertility analysis
      const earlyDead = 0; // This would come from fertility analysis  
      const lateDead = 0; // This would come from fertility analysis
      const cullChicks = malformedChicks; // Use malformed chicks as cull chicks
      
      const hatchabilityMetrics = calculateHatchabilityMetrics(sampleSize, infertile, earlyDead, lateDead, cullChicks);
      
      const recordData = {
        batch_id: batchInfo.id,
        analysis_date: new Date().toISOString().split('T')[0],
        total_residue_count: totalResidueCount,
        unhatched_fertile: unhatchedFertile,
        pipped_not_hatched: pippedNotHatched,
        malformed_chicks: malformedChicks,
        contaminated_eggs: contaminatedEggs,
        pip_number: Number(formData.pipNumber) || 0,
        residue_percent: totalResidueCount > 0 ? Number(((totalResidueCount / sampleSize) * 100).toFixed(2)) : 0,
        pathology_findings: formData.pathologyFindings || null,
        microscopy_results: formData.microscopyResults || null,
        lab_technician: formData.labTechnician || null,
        notes: formData.notes || null,
        // Include hatchability metrics
        sample_size: sampleSize,
        fertile_eggs: hatchabilityMetrics.fertileEggs,
        hatch_percent: hatchabilityMetrics.hatchPercent,
        hof_percent: hatchabilityMetrics.hofPercent,
        hoi_percent: hatchabilityMetrics.hoiPercent,
        if_dev_percent: hatchabilityMetrics.ifDevPercent
      };

      let result;
      if (editingId) {
        result = await supabase
          .from('residue_analysis')
          .update(recordData)
          .eq('id', editingId)
          .select()
          .single();
      } else {
        result = await supabase
          .from('residue_analysis')
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
          description: "Residue analysis record updated successfully"
        });
      } else {
        onDataUpdate([...data, result.data]);
        toast({
          title: "Record Added",
          description: "New residue analysis record added successfully"
        });
      }

      handleCancel();
    } catch (error: any) {
      console.error('Error saving residue data:', error);
      const errorMessage = error?.message || error?.details || "Failed to save residue analysis data";
      toast({
        title: "Error saving record",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (record: ResidueRecord) => {
    setEditingId(record.id || '');
    setFormData({
      totalResidueCount: record.total_residue_count.toString(),
      unhatchedFertile: record.unhatched_fertile.toString(),
      pippedNotHatched: record.pipped_not_hatched.toString(),
      malformedChicks: record.malformed_chicks.toString(),
      contaminatedEggs: record.contaminated_eggs.toString(),
      pipNumber: record.pip_number.toString(),
      pathologyFindings: record.pathology_findings || '',
      microscopyResults: record.microscopy_results || '',
      labTechnician: record.lab_technician || '',
      notes: record.notes || '',
      sampleSize: (record.sample_size || 648).toString()
    });
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('residue_analysis')
        .delete()
        .eq('id', id);

      if (error) throw error;

      const updatedData = data.filter(item => item.id !== id);
      onDataUpdate(updatedData);
      toast({
        title: "Record Deleted",
        description: "Residue analysis record deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting residue record:', error);
      toast({
        title: "Error deleting record",
        description: "Failed to delete residue analysis record",
        variant: "destructive"
      });
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({
      totalResidueCount: '',
      unhatchedFertile: '',
      pippedNotHatched: '',
      malformedChicks: '',
      contaminatedEggs: '',
      pipNumber: '',
      pathologyFindings: '',
      microscopyResults: '',
      labTechnician: '',
      notes: '',
      sampleSize: '648'
    });
  };

  const totalUsed = calculateTotalUsed();
  const sampleSize = Number(formData.sampleSize) || 648;
  const remaining = sampleSize - totalUsed;

  return (
    <div className="space-y-6">
      {/* Form Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {editingId ? 'Edit Residue Analysis' : 'Add New Residue Analysis'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <p className="text-sm text-gray-600 mb-2">
              <strong>Selected Batch:</strong> {batchInfo.batch_number} - {batchInfo.flock_name} (Flock #{batchInfo.flock_number})
            </p>
            <p className="text-sm text-gray-600">Residue analysis data will be automatically linked to this batch.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Basic Information */}
            <div className="space-y-2">
              <Label htmlFor="totalResidueCount">Total Residue Count *</Label>
              <Input
                id="totalResidueCount"
                type="number"
                placeholder="e.g., 85"
                value={formData.totalResidueCount}
                onChange={(e) => handleInputChange('totalResidueCount', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unhatchedFertile">Unhatched Fertile</Label>
              <Input
                id="unhatchedFertile"
                type="number"
                placeholder="e.g., 25"
                value={formData.unhatchedFertile}
                onChange={(e) => handleInputChange('unhatchedFertile', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pippedNotHatched">Pipped Not Hatched</Label>
              <Input
                id="pippedNotHatched"
                type="number"
                placeholder="e.g., 15"
                value={formData.pippedNotHatched}
                onChange={(e) => handleInputChange('pippedNotHatched', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="malformedChicks">Malformed Chicks</Label>
              <Input
                id="malformedChicks"
                type="number"
                placeholder="e.g., 5"
                value={formData.malformedChicks}
                onChange={(e) => handleInputChange('malformedChicks', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contaminatedEggs">Contaminated Eggs</Label>
              <Input
                id="contaminatedEggs"
                type="number"
                placeholder="e.g., 10"
                value={formData.contaminatedEggs}
                onChange={(e) => handleInputChange('contaminatedEggs', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pipNumber">PIP Number</Label>
              <Input
                id="pipNumber"
                type="number"
                placeholder="e.g., 15"
                value={formData.pipNumber}
                onChange={(e) => handleInputChange('pipNumber', e.target.value)}
              />
            </div>

            {/* Analysis Details */}
            <div className="space-y-2">
              <Label htmlFor="pathologyFindings">Pathology Findings</Label>
              <Input
                id="pathologyFindings"
                placeholder="Pathology notes"
                value={formData.pathologyFindings}
                onChange={(e) => handleInputChange('pathologyFindings', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="microscopyResults">Microscopy Results</Label>
              <Input
                id="microscopyResults"
                placeholder="Microscopy findings"
                value={formData.microscopyResults}
                onChange={(e) => handleInputChange('microscopyResults', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="labTechnician">Lab Technician</Label>
              <Input
                id="labTechnician"
                placeholder="Technician name"
                value={formData.labTechnician}
                onChange={(e) => handleInputChange('labTechnician', e.target.value)}
              />
            </div>
          </div>

          {/* Hatchability Metrics Section */}
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-semibold">Hatchability Metrics</h3>
              <Info className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg">
              {/* Sample Size */}
              <div className="space-y-2">
                <Label htmlFor="sampleSize">Sample Size</Label>
                <Input
                  id="sampleSize"
                  type="number"
                  placeholder="e.g., 648"
                  value={formData.sampleSize}
                  onChange={(e) => handleInputChange('sampleSize', e.target.value)}
                />
              </div>

              {/* Calculated Hatchability Metrics */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  Hatch % (HOS)
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 opacity-70" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Hatch of Set = hatched chicks ÷ sample size × 100
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  disabled
                  className="bg-white"
                  value={(() => {
                    const s = Number(formData.sampleSize || 648);
                    const inf = 0; // Would come from fertility analysis
                    const ed = 0; // Would come from fertility analysis
                    const ld = 0; // Would come from fertility analysis
                    const cc = Number(formData.malformedChicks || 0);
                    return calculateHatchabilityMetrics(s, inf, ed, ld, cc).hatchPercent;
                  })()}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  HOF %
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 opacity-70" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Hatch of Fertile = hatched chicks ÷ fertile eggs × 100
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  disabled
                  className="bg-white"
                  value={(() => {
                    const s = Number(formData.sampleSize || 648);
                    const inf = 0;
                    const ed = 0;
                    const ld = 0;
                    const cc = Number(formData.malformedChicks || 0);
                    return calculateHatchabilityMetrics(s, inf, ed, ld, cc).hofPercent;
                  })()}
                />
              </div>
            </div>
          </div>

          {/* Validation Display */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="font-medium">Total Used: {totalUsed}</span>
                <span className="mx-2">|</span>
                <span className="font-medium">Remaining: {remaining}</span>
                <span className="mx-2">|</span>
                <span className="font-medium">Sample Size: {sampleSize}</span>
              </div>
              {remaining < 0 && (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">Exceeds sample size!</span>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="mt-4 space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              placeholder="Additional notes or observations"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
            />
          </div>

          {/* Image Upload Section */}
          <div className="mt-6">
            <Label>Residue Analysis Images</Label>
            <p className="text-sm text-muted-foreground mb-4">
              Upload images documenting the residue analysis results
            </p>
            <ImageUpload
              recordType="residue_analysis"
              recordId={editingId || 'new'}
              maxFiles={5}
              onImageUploaded={(imageUrl, imageId) => {
                console.log('Image uploaded:', { imageUrl, imageId });
              }}
            />
          </div>

          <div className="flex gap-2 mt-4">
            <Button 
              onClick={handleSubmit} 
              disabled={loading}
              className="flex items-center gap-2"
            >
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
          <CardTitle>Residue Analysis Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Total Residue</TableHead>
                  <TableHead>Unhatched Fertile</TableHead>
                  <TableHead>Pipped Not Hatched</TableHead>
                  <TableHead>Malformed</TableHead>
                  <TableHead>Contaminated</TableHead>
                  <TableHead>Hatch %</TableHead>
                  <TableHead>HOF %</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {new Date(record.analysis_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{record.total_residue_count}</TableCell>
                    <TableCell>{record.unhatched_fertile}</TableCell>
                    <TableCell>{record.pipped_not_hatched}</TableCell>
                    <TableCell 
                      className={record.malformed_chicks > 5 ? "text-red-600 font-medium" : ""}
                    >
                      {record.malformed_chicks}
                    </TableCell>
                    <TableCell 
                      className={record.contaminated_eggs > 3 ? "text-red-600 font-medium" : ""}
                    >
                      {record.contaminated_eggs}
                    </TableCell>
                    <TableCell className="font-medium text-blue-600">
                      {record.hatch_percent ? `${record.hatch_percent}%` : '-'}
                    </TableCell>
                    <TableCell className="font-medium text-green-600">
                      {record.hof_percent ? `${record.hof_percent}%` : '-'}
                    </TableCell>
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
                          onClick={() => handleDelete(record.id!)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResidueDataEntry;
