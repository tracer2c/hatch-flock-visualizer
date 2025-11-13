
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Save, X, AlertTriangle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "@/components/ui/image-upload";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { 
  calculateHatchPercent, 
  calculateHOFPercent, 
  calculateHOIPercent, 
  calculateIFPercent,
  calculateChicksHatched,
  calculateFertileEggs
} from "@/utils/hatcheryFormulas";

interface ResidueRecord {
  id: string;
  name: string;
  flockNumber: number;
  houseNumber: number;
  infertile: number;
  infertilePercent: number;
  chicks: number;
  earlyDeath: number;
  earlyDeathPercent: number;
  live: number;
  livePercent: number;
  dead: number;
  deadPercent: number;
  midDeath: number;
  midDeathPercent: number;
  lateDeath: number;
  lateDeathPercent: number;
  cullChicks: number;
  handlingCracks: number;
  handlingCracksPercent: number;
  transferCrack: number;
  transferCrackPercent: number;
  contamination: number;
  contaminationPercent: number;
  mold: number;
  moldPercent: number;
  abnormal: number;
  abnormalPercent: number;
  brain: number;
  brainPercent: number;
  dryEgg: number;
  dryEggPercent: number;
  malpositioned: number;
  malpositionedPercent: number;
  upsideDown: number;
  upsideDownPercent: number;
  livePipNumber: number;
  deadPipNumber: number;
  pipNumber: number;
  totalEggs: number;
  // Hatchability metrics from fertility analysis
  sampleSize?: number;
  fertileEggs?: number;
  hatchPercent?: number;
  hofPercent?: number;
  hoiPercent?: number;
  ifDevPercent?: number;
  technicianName?: string;
  notes?: string;
}

interface BatchInfo {
  id: string;
  batch_number: string;
  flock_name: string;
  flock_number: number;
  house_number?: string;
  eggs_injected: number;
}

interface ResidueDataEntryProps {
  data: ResidueRecord[];
  onDataUpdate: (data: ResidueRecord[]) => void;
  batchInfo: BatchInfo;
}

const ResidueDataEntry = ({ data, onDataUpdate, batchInfo }: ResidueDataEntryProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: batchInfo.flock_name,
    flockNumber: batchInfo.flock_number.toString(),
    houseNumber: batchInfo.house_number || '1',
    infertile: '',
    chicks: '',
    earlyDeath: '',
    live: '',
    dead: '',
    midDeath: '',
    lateDeath: '',
    cullChicks: '',
    handlingCracks: '',
    transferCrack: '',
    contamination: '',
    mold: '',
    abnormal: '',
    brain: '',
    dryEgg: '',
    malpositioned: '',
    upsideDown: '',
    livePipNumber: '',
    deadPipNumber: '',
    // Hatchability metrics
    sampleSize: '648',
    technicianName: '',
    notes: ''
  });
  const { toast } = useToast();

  const TOTAL_EGGS = 648;

  const calculatePercentage = (value: number) => {
    return Number(((value / TOTAL_EGGS) * 100).toFixed(2));
  };

  // IMPORTANT: Using standardized hatchery formulas
  // Calculate hatchability metrics using centralized formulas
  const calculateHatchabilityMetrics = (
    sampleSize: number, 
    infertile: number, 
    earlyDead: number, 
    midDead: number, 
    lateDead: number, 
    cullChicks: number,
    livePips: number,
    deadPips: number,
    eggsInjected: number
  ) => {
    const fertileEggs = calculateFertileEggs(sampleSize, infertile);
    const chicksHatched = calculateChicksHatched(sampleSize, infertile, earlyDead, midDead, lateDead, cullChicks, livePips, deadPips);
    
    // Use standardized formulas
    const hatchPercent = calculateHatchPercent(chicksHatched, sampleSize);
    // HOF% = (Chicks Hatched / Fertile Eggs) × 100
    const hofPercent = calculateHOFPercent(chicksHatched, fertileEggs);
    // HOI% = (Chicks Hatched / Eggs Injected) × 100
    const hoiPercent = calculateHOIPercent(chicksHatched, eggsInjected);
    const ifPercent = calculateIFPercent(infertile, fertileEggs);
    
    return {
      fertileEggs,
      chicksHatched,
      hatchPercent,
      hofPercent,
      hoiPercent,
      ifDevPercent: ifPercent,
    };
  };

  // Calculate only the core mortality categories that count toward sample size
  const calculateTotalUsed = () => {
    const coreValues = ['infertile', 'earlyDeath', 'midDeath', 'lateDeath', 'cullChicks', 'livePipNumber', 'deadPipNumber'];
    
    return coreValues.reduce((sum, field) => {
      const value = Number(formData[field as keyof typeof formData]) || 0;
      return sum + value;
    }, 0);
  };

  // Calculate total dead (early + mid + late)
  const calculateTotalDead = () => {
    const earlyDead = Number(formData.earlyDeath) || 0;
    const midDead = Number(formData.midDeath) || 0;
    const lateDead = Number(formData.lateDeath) || 0;
    return earlyDead + midDead + lateDead;
  };

  // Auto-calculate chicks based on sample size minus core mortality
  const calculateChicks = () => {
    const sampleSize = Number(formData.sampleSize) || TOTAL_EGGS;
    const totalUsed = calculateTotalUsed();
    return Math.max(0, sampleSize - totalUsed);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const sampleSize = Number(formData.sampleSize) || TOTAL_EGGS;
    const totalUsed = calculateTotalUsed();
    
    if (totalUsed > sampleSize) {
      toast({
        title: "Validation Error",
        description: `Total mortality (${totalUsed}) exceeds sample size (${sampleSize})`,
        variant: "destructive"
      });
      return false;
    }
    
    if (!formData.name || !formData.flockNumber || !formData.houseNumber) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return false;
    }
    
    return true;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;
    
    // Calculate hatchability metrics using standardized formulas
    const sampleSize = Number(formData.sampleSize) || TOTAL_EGGS;
    const infertile = Number(formData.infertile) || 0;
    const earlyDead = Number(formData.earlyDeath) || 0;
    const midDead = Number(formData.midDeath) || 0;
    const lateDead = Number(formData.lateDeath) || 0;
    const cullChicks = Number(formData.cullChicks) || 0;
    const livePips = Number(formData.livePipNumber) || 0;
    const deadPips = Number(formData.deadPipNumber) || 0;
    
    const hatchabilityMetrics = calculateHatchabilityMetrics(
      sampleSize, infertile, earlyDead, midDead, lateDead, cullChicks, livePips, deadPips, batchInfo.eggs_injected
    );
    const calculatedChicks = hatchabilityMetrics.chicksHatched;
    
    const newRecord: ResidueRecord = {
      id: editingId || Date.now().toString(),
      name: formData.name,
      flockNumber: Number(formData.flockNumber),
      houseNumber: Number(formData.houseNumber),
      infertile: Number(formData.infertile) || 0,
      infertilePercent: calculatePercentage(Number(formData.infertile) || 0),
      chicks: calculatedChicks,
      earlyDeath: Number(formData.earlyDeath) || 0,
      earlyDeathPercent: calculatePercentage(Number(formData.earlyDeath) || 0),
      live: Number(formData.live) || 0,
      livePercent: calculatePercentage(Number(formData.live) || 0),
      dead: Number(formData.dead) || 0,
      deadPercent: calculatePercentage(Number(formData.dead) || 0),
      midDeath: Number(formData.midDeath) || 0,
      midDeathPercent: calculatePercentage(Number(formData.midDeath) || 0),
      lateDeath: Number(formData.lateDeath) || 0,
      lateDeathPercent: calculatePercentage(Number(formData.lateDeath) || 0),
      cullChicks: Number(formData.cullChicks) || 0,
      handlingCracks: Number(formData.handlingCracks) || 0,
      handlingCracksPercent: calculatePercentage(Number(formData.handlingCracks) || 0),
      transferCrack: Number(formData.transferCrack) || 0,
      transferCrackPercent: calculatePercentage(Number(formData.transferCrack) || 0),
      contamination: Number(formData.contamination) || 0,
      contaminationPercent: calculatePercentage(Number(formData.contamination) || 0),
      mold: Number(formData.mold) || 0,
      moldPercent: calculatePercentage(Number(formData.mold) || 0),
      abnormal: Number(formData.abnormal) || 0,
      abnormalPercent: calculatePercentage(Number(formData.abnormal) || 0),
      brain: Number(formData.brain) || 0,
      brainPercent: calculatePercentage(Number(formData.brain) || 0),
      dryEgg: Number(formData.dryEgg) || 0,
      dryEggPercent: calculatePercentage(Number(formData.dryEgg) || 0),
      malpositioned: Number(formData.malpositioned) || 0,
      malpositionedPercent: calculatePercentage(Number(formData.malpositioned) || 0),
      upsideDown: Number(formData.upsideDown) || 0,
      upsideDownPercent: calculatePercentage(Number(formData.upsideDown) || 0),
      livePipNumber: Number(formData.livePipNumber) || 0,
      deadPipNumber: Number(formData.deadPipNumber) || 0,
      pipNumber: (Number(formData.livePipNumber) || 0) + (Number(formData.deadPipNumber) || 0),
      totalEggs: TOTAL_EGGS,
      // Include hatchability metrics
      sampleSize: sampleSize,
      fertileEggs: hatchabilityMetrics.fertileEggs,
      hatchPercent: hatchabilityMetrics.hatchPercent,
      hofPercent: hatchabilityMetrics.hofPercent,
      hoiPercent: hatchabilityMetrics.hoiPercent,
      ifDevPercent: hatchabilityMetrics.ifDevPercent,
      technicianName: formData.technicianName,
      notes: formData.notes
    };

    if (editingId) {
      const updatedData = data.map(item => item.id === editingId ? newRecord : item);
      onDataUpdate(updatedData);
      toast({
        title: "Record Updated",
        description: "Residue record updated successfully"
      });
    } else {
      onDataUpdate([...data, newRecord]);
      toast({
        title: "Record Added",
        description: "New residue record added successfully"
      });
    }

    handleCancel();
  };

  const handleEdit = (record: ResidueRecord) => {
    setEditingId(record.id);
    setFormData({
      name: record.name,
      flockNumber: record.flockNumber.toString(),
      houseNumber: record.houseNumber.toString(),
      infertile: record.infertile.toString(),
      chicks: record.chicks.toString(),
      earlyDeath: record.earlyDeath.toString(),
      live: record.live.toString(),
      dead: record.dead.toString(),
      midDeath: record.midDeath.toString(),
      lateDeath: record.lateDeath.toString(),
      cullChicks: record.cullChicks.toString(),
      handlingCracks: record.handlingCracks.toString(),
      transferCrack: record.transferCrack.toString(),
      contamination: record.contamination.toString(),
      mold: record.mold.toString(),
      abnormal: record.abnormal.toString(),
      brain: record.brain.toString(),
      dryEgg: record.dryEgg.toString(),
      malpositioned: record.malpositioned.toString(),
      upsideDown: record.upsideDown.toString(),
      livePipNumber: (record.livePipNumber || 0).toString(),
      deadPipNumber: (record.deadPipNumber || 0).toString(),
      sampleSize: (record.sampleSize || TOTAL_EGGS).toString(),
      technicianName: '',
      notes: ''
    });
  };

  const handleDelete = (id: string) => {
    const updatedData = data.filter(item => item.id !== id);
    onDataUpdate(updatedData);
    toast({
      title: "Record Deleted",
      description: "Residue record deleted successfully"
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({
      name: batchInfo.flock_name,
      flockNumber: batchInfo.flock_number.toString(),
      houseNumber: batchInfo.house_number || '1',
      infertile: '',
      chicks: '',
      earlyDeath: '',
      live: '',
      dead: '',
      midDeath: '',
      lateDeath: '',
      cullChicks: '',
      handlingCracks: '',
      transferCrack: '',
      contamination: '',
      mold: '',
      abnormal: '',
      brain: '',
      dryEgg: '',
      malpositioned: '',
      upsideDown: '',
      livePipNumber: '',
      deadPipNumber: '',
      sampleSize: '648',
      technicianName: '',
      notes: ''
    });
  };

  const totalUsed = calculateTotalUsed();
  const remaining = TOTAL_EGGS - totalUsed;

  return (
    <div className="space-y-6">
      {/* Form Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {editingId ? 'Edit Residue Record' : 'Add New Residue Record'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <p className="text-sm text-gray-600 mb-2">
              <strong>Selected House:</strong> {batchInfo.batch_number} - {batchInfo.flock_name} (Flock #{batchInfo.flock_number})
            </p>
            <p className="text-sm text-gray-600">Residue analysis data will be automatically linked to this house.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Basic Information - Auto-populated from batch */}
            <div className="space-y-2">
              <Label htmlFor="name">Flock Name</Label>
              <Input
                id="name"
                value={formData.name}
                disabled
                className="bg-gray-100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="flockNumber">Flock Number</Label>
              <Input
                id="flockNumber"
                type="number"
                value={formData.flockNumber}
                disabled
                className="bg-gray-100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="houseNumber">House Number</Label>
              <Input
                id="houseNumber"
                type="number"
                value={formData.houseNumber}
                disabled
                className="bg-gray-100"
              />
            </div>
            
            {/* Sample Size - Fixed at 648 */}
            <div className="space-y-2">
              <Label htmlFor="sampleSize">Sample Size</Label>
              <Input
                id="sampleSize"
                type="number"
                value={648}
                disabled
                className="bg-gray-100"
              />
            </div>

            {/* Eggs Injected - Read-only from Clears & Injected tab */}
            <div className="space-y-2">
              <Label htmlFor="eggsInjected" className="flex items-center gap-1">
                Eggs Injected
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 opacity-70" />
                  </TooltipTrigger>
                  <TooltipContent>
                    This value comes from the Clears & Injected data entry tab
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Input
                id="eggsInjected"
                type="number"
                value={batchInfo.eggs_injected || 0}
                disabled
                className="bg-gray-100 font-medium"
              />
            </div>

            {/* Core Metrics - These count toward sample size */}
            <div className="space-y-2">
              <Label htmlFor="infertile">Infertile</Label>
              <Input
                id="infertile"
                type="number"
                placeholder="e.g., 93"
                value={formData.infertile}
                onChange={(e) => handleInputChange('infertile', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="earlyDeath">Early Dead (1-7 days)</Label>
              <Input
                id="earlyDeath"
                type="number"
                placeholder="e.g., 15"
                value={formData.earlyDeath}
                onChange={(e) => handleInputChange('earlyDeath', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="midDeath">Mid Dead (7-14 days)</Label>
              <Input
                id="midDeath"
                type="number"
                placeholder="e.g., 8"
                value={formData.midDeath}
                onChange={(e) => handleInputChange('midDeath', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lateDeath">Late Dead (15-21 days)</Label>
              <Input
                id="lateDeath"
                type="number"
                placeholder="e.g., 22"
                value={formData.lateDeath}
                onChange={(e) => handleInputChange('lateDeath', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cullChicks">Cull Chicks</Label>
              <Input
                id="cullChicks"
                type="number"
                placeholder="e.g., 5"
                value={formData.cullChicks}
                onChange={(e) => handleInputChange('cullChicks', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="livePipNumber">Live Pips</Label>
              <Input
                id="livePipNumber"
                type="number"
                placeholder="e.g., 10"
                value={formData.livePipNumber}
                onChange={(e) => handleInputChange('livePipNumber', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deadPipNumber">Dead Pips</Label>
              <Input
                id="deadPipNumber"
                type="number"
                placeholder="e.g., 5"
                value={formData.deadPipNumber}
                onChange={(e) => handleInputChange('deadPipNumber', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalPips" className="flex items-center gap-1">
                Total Pips
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 opacity-70" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Auto-calculated: Live Pips + Dead Pips
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Input
                id="totalPips"
                type="number"
                disabled
                className="bg-gray-100 font-semibold"
                value={(Number(formData.livePipNumber) || 0) + (Number(formData.deadPipNumber) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalDead" className="flex items-center gap-1">
                Embryonic Mortality
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 opacity-70" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Auto-calculated: Early Dead + Mid Dead + Late Dead
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Input
                id="totalDead"
                type="number"
                disabled
                className="bg-gray-100 font-semibold"
                value={calculateTotalDead()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalDeadPercent" className="flex items-center gap-1">
                Embryonic Mortality %
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 opacity-70" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Percentage of embryonic mortality out of sample size
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Input
                id="totalDeadPercent"
                type="number"
                disabled
                className="bg-gray-100 font-semibold"
                value={calculatePercentage(calculateTotalDead())}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="chicks" className="flex items-center gap-1">
                Chicks Hatched
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 opacity-70" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Auto-calculated: Sample Size - (Infertile + Early + Mid + Late Dead + Culls + Live Pips + Dead Pips)
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Input
                id="chicks"
                type="number"
                disabled
                className="bg-gray-100 font-semibold"
                value={calculateChicks()}
              />
            </div>

            {/* Characteristics - These don't count toward sample size */}
            <div className="col-span-3 mt-4 mb-2">
              <h4 className="text-sm font-semibold text-muted-foreground border-b pb-2">
                Characteristics (descriptive categories of the above)
              </h4>
            </div>

            {/* Transfer Data */}
            <div className="space-y-2">
              <Label htmlFor="handlingCracks">Handling Cracks</Label>
              <Input
                id="handlingCracks"
                type="number"
                placeholder="e.g., 3"
                value={formData.handlingCracks}
                onChange={(e) => handleInputChange('handlingCracks', e.target.value)}
              />
            </div>

            {/* Quality Issues */}
            <div className="space-y-2">
              <Label htmlFor="transferCrack">Transfer Crack</Label>
              <Input
                id="transferCrack"
                type="number"
                placeholder="e.g., 2"
                value={formData.transferCrack}
                onChange={(e) => handleInputChange('transferCrack', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contamination">Contamination</Label>
              <Input
                id="contamination"
                type="number"
                placeholder="e.g., 2"
                value={formData.contamination}
                onChange={(e) => handleInputChange('contamination', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mold">Mold</Label>
              <Input
                id="mold"
                type="number"
                placeholder="e.g., 1"
                value={formData.mold}
                onChange={(e) => handleInputChange('mold', e.target.value)}
              />
            </div>

            {/* Embryo Problems */}
            <div className="space-y-2">
              <Label htmlFor="abnormal">Abnormal</Label>
              <Input
                id="abnormal"
                type="number"
                placeholder="e.g., 4"
                value={formData.abnormal}
                onChange={(e) => handleInputChange('abnormal', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brain">Brain Defects</Label>
              <Input
                id="brain"
                type="number"
                placeholder="e.g., 1"
                value={formData.brain}
                onChange={(e) => handleInputChange('brain', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dryEgg">DY Egg</Label>
              <Input
                id="dryEgg"
                type="number"
                placeholder="e.g., 3"
                value={formData.dryEgg}
                onChange={(e) => handleInputChange('dryEgg', e.target.value)}
              />
            </div>

            {/* Position Issues */}
            <div className="space-y-2">
              <Label htmlFor="malpositioned">Malpositioned</Label>
              <Input
                id="malpositioned"
                type="number"
                placeholder="e.g., 6"
                value={formData.malpositioned}
                onChange={(e) => handleInputChange('malpositioned', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="upsideDown">Upside Down</Label>
              <Input
                id="upsideDown"
                type="number"
                placeholder="e.g., 2"
                value={formData.upsideDown}
                onChange={(e) => handleInputChange('upsideDown', e.target.value)}
              />
            </div>
            
            {/* PIP Numbers - moved after Cull Chicks, now removed as they're in core section */}
          </div>

          {/* Hatchability Metrics Section */}
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-semibold">Hatchability Metrics</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    const inf = Number(formData.infertile || 0);
                    const ed = Number(formData.earlyDeath || 0);
                    const md = Number(formData.midDeath || 0);
                    const ld = Number(formData.lateDeath || 0);
                    const cc = Number(formData.cullChicks || 0);
                    const lp = Number(formData.livePipNumber || 0);
                    const dp = Number(formData.deadPipNumber || 0);
                    return calculateHatchabilityMetrics(s, inf, ed, md, ld, cc, lp, dp, batchInfo.eggs_injected).hatchPercent;
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
                    const inf = Number(formData.infertile || 0);
                    const ed = Number(formData.earlyDeath || 0);
                    const md = Number(formData.midDeath || 0);
                    const ld = Number(formData.lateDeath || 0);
                    const cc = Number(formData.cullChicks || 0);
                    const lp = Number(formData.livePipNumber || 0);
                    const dp = Number(formData.deadPipNumber || 0);
                    return calculateHatchabilityMetrics(s, inf, ed, md, ld, cc, lp, dp, batchInfo.eggs_injected).hofPercent;
                  })()}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  I/F dev. %
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
                  className="bg-white"
                  value={(() => {
                    const s = Number(formData.sampleSize || 648);
                    const inf = Number(formData.infertile || 0);
                    const ed = Number(formData.earlyDeath || 0);
                    const md = Number(formData.midDeath || 0);
                    const ld = Number(formData.lateDeath || 0);
                    const cc = Number(formData.cullChicks || 0);
                    const lp = Number(formData.livePipNumber || 0);
                    const dp = Number(formData.deadPipNumber || 0);
                    return calculateHatchabilityMetrics(s, inf, ed, md, ld, cc, lp, dp, batchInfo.eggs_injected).ifDevPercent;
                  })()}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  Fertile Eggs
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
                  className="bg-white"
                  value={(() => {
                    const s = Number(formData.sampleSize || 648);
                    const inf = Number(formData.infertile || 0);
                    const ed = Number(formData.earlyDeath || 0);
                    const md = Number(formData.midDeath || 0);
                    const ld = Number(formData.lateDeath || 0);
                    const cc = Number(formData.cullChicks || 0);
                    const lp = Number(formData.livePipNumber || 0);
                    const dp = Number(formData.deadPipNumber || 0);
                    return calculateHatchabilityMetrics(s, inf, ed, md, ld, cc, lp, dp, batchInfo.eggs_injected).fertileEggs;
                  })()}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  HOI %
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 opacity-70" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Hatch of Injection = hatched chicks ÷ eggs injected × 100
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  disabled
                  className="bg-white"
                  value={(() => {
                    const s = Number(formData.sampleSize || 648);
                    const inf = Number(formData.infertile || 0);
                    const ed = Number(formData.earlyDeath || 0);
                    const md = Number(formData.midDeath || 0);
                    const ld = Number(formData.lateDeath || 0);
                    const cc = Number(formData.cullChicks || 0);
                    const lp = Number(formData.livePipNumber || 0);
                    const dp = Number(formData.deadPipNumber || 0);
                    return calculateHatchabilityMetrics(s, inf, ed, md, ld, cc, lp, dp, batchInfo.eggs_injected).hoiPercent;
                  })()}
                />
              </div>
            </div>
          </div>

          {/* Validation Display */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="font-medium">Core Mortality: {totalUsed}</span>
                <span className="mx-2">|</span>
                <span className="font-medium text-green-600">Chicks: {calculateChicks()}</span>
                <span className="mx-2">|</span>
                <span className="font-medium">Sample Size: {Number(formData.sampleSize) || TOTAL_EGGS}</span>
              </div>
              {remaining < 0 && (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">Exceeds sample size!</span>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Core mortality includes: Infertile + Early Dead + Mid Dead + Late Dead + Culls + Live Pips + Dead Pips
            </p>
          </div>

          {/* Technician Name and Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="technicianName">Technician Name</Label>
              <Input
                id="technicianName"
                value={formData.technicianName}
                onChange={(e) => handleInputChange('technicianName', e.target.value)}
                placeholder="Enter technician name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Additional observations"
              />
            </div>
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
            <Button onClick={handleSubmit} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              {editingId ? 'Update Record' : 'Add Record'}
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
                  <TableHead>Name</TableHead>
                  <TableHead>Flock #</TableHead>
                  <TableHead>House #</TableHead>
                  <TableHead>Sample Size</TableHead>
                  <TableHead>Infertile</TableHead>
                  <TableHead>Chicks</TableHead>
                  <TableHead>Early Dead</TableHead>
                  <TableHead>Mid Dead</TableHead>
                  <TableHead>Late Dead</TableHead>
                  <TableHead>Cull Chicks</TableHead>
                  <TableHead>Live Pips</TableHead>
                  <TableHead>Dead Pips</TableHead>
                  <TableHead>Total Pips</TableHead>
                  <TableHead>Handling Cracks</TableHead>
                  <TableHead>Transfer Crack</TableHead>
                  <TableHead>Contamination</TableHead>
                  <TableHead>Mold</TableHead>
                  <TableHead>Abnormal</TableHead>
                  <TableHead>Brain Defects</TableHead>
                  <TableHead>DY Egg</TableHead>
                  <TableHead>Malpositioned</TableHead>
                  <TableHead>Upside Down</TableHead>
                  <TableHead>Technician</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Hatch %</TableHead>
                  <TableHead>HOF %</TableHead>
                  <TableHead>HOI %</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((record) => {
                  const totalPips = (record.livePipNumber || 0) + (record.deadPipNumber || 0);
                  
                  return (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.name}</TableCell>
                      <TableCell>{record.flockNumber}</TableCell>
                      <TableCell>{record.houseNumber}</TableCell>
                      <TableCell>{record.sampleSize || 648}</TableCell>
                      <TableCell>{record.infertile} ({record.infertilePercent}%)</TableCell>
                      <TableCell>{record.chicks}</TableCell>
                      <TableCell>{record.earlyDeath} ({record.earlyDeathPercent}%)</TableCell>
                      <TableCell>{record.midDeath} ({record.midDeathPercent}%)</TableCell>
                      <TableCell>{record.lateDeath} ({record.lateDeathPercent}%)</TableCell>
                      <TableCell>{record.cullChicks || 0}</TableCell>
                      <TableCell>{record.livePipNumber || 0}</TableCell>
                      <TableCell>{record.deadPipNumber || 0}</TableCell>
                      <TableCell>{totalPips}</TableCell>
                      <TableCell>{record.handlingCracks || 0}</TableCell>
                      <TableCell>{record.transferCrack || 0}</TableCell>
                      <TableCell className={record.contaminationPercent > 1 ? "text-red-600 font-medium" : ""}>
                        {record.contamination} ({record.contaminationPercent}%)
                      </TableCell>
                      <TableCell className={record.moldPercent > 1 ? "text-red-600 font-medium" : ""}>
                        {record.mold} ({record.moldPercent}%)
                      </TableCell>
                      <TableCell className={record.abnormalPercent > 2 ? "text-red-600 font-medium" : ""}>
                        {record.abnormal} ({record.abnormalPercent}%)
                      </TableCell>
                      <TableCell>{record.brain || 0}</TableCell>
                      <TableCell>{record.dryEgg || 0}</TableCell>
                      <TableCell>{record.malpositioned || 0}</TableCell>
                      <TableCell>{record.upsideDown || 0}</TableCell>
                      <TableCell>{record.technicianName || '-'}</TableCell>
                      <TableCell className="max-w-xs truncate">{record.notes || '-'}</TableCell>
                      <TableCell className="font-medium text-blue-600">
                        {record.hatchPercent ? `${record.hatchPercent}%` : '-'}
                      </TableCell>
                      <TableCell className="font-medium text-green-600">
                        {record.hofPercent ? `${record.hofPercent}%` : '-'}
                      </TableCell>
                      <TableCell className="font-medium text-purple-600">
                        {record.hoiPercent ? `${record.hoiPercent}%` : '-'}
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
                            onClick={() => handleDelete(record.id)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResidueDataEntry;
