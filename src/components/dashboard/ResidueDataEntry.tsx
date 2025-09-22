
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Edit, Trash2, Save, X, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "@/components/ui/image-upload";

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
  pipNumber: number;
  totalEggs: number;
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
  const [isFormOpen, setIsFormOpen] = useState(false);
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
    pipNumber: ''
  });
  const { toast } = useToast();

  const TOTAL_EGGS = 648;

  const calculatePercentage = (value: number) => {
    return Number(((value / TOTAL_EGGS) * 100).toFixed(2));
  };

  const calculateTotalUsed = () => {
    const values = ['infertile', 'chicks', 'earlyDeath', 'live', 'dead', 'midDeath', 'lateDeath', 'cullChicks', 'handlingCracks', 'transferCrack', 'contamination', 'mold', 'abnormal', 'brain', 'dryEgg', 'malpositioned', 'upsideDown', 'pipNumber'];
    
    return values.reduce((sum, field) => {
      const value = Number(formData[field as keyof typeof formData]) || 0;
      return sum + value;
    }, 0);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const totalUsed = calculateTotalUsed();
    
    if (totalUsed > TOTAL_EGGS) {
      toast({
        title: "Validation Error",
        description: `Total eggs used (${totalUsed}) exceeds ${TOTAL_EGGS}`,
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
    
    const newRecord: ResidueRecord = {
      id: editingId || Date.now().toString(),
      name: formData.name,
      flockNumber: Number(formData.flockNumber),
      houseNumber: Number(formData.houseNumber),
      infertile: Number(formData.infertile) || 0,
      infertilePercent: calculatePercentage(Number(formData.infertile) || 0),
      chicks: Number(formData.chicks) || 0,
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
      pipNumber: Number(formData.pipNumber) || 0,
      totalEggs: TOTAL_EGGS
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
    setIsFormOpen(true);
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
      pipNumber: record.pipNumber.toString()
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
    setIsFormOpen(false);
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
      pipNumber: ''
    });
  };

  const totalUsed = calculateTotalUsed();
  const remaining = TOTAL_EGGS - totalUsed;

  return (
    <div className="space-y-6">
      {/* Collapsible Form Section */}
      <Collapsible open={isFormOpen} onOpenChange={setIsFormOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  {editingId ? 'Edit Residue Record' : 'Add New Residue Record'}
                </div>
                {isFormOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="bg-muted/30 p-4 rounded-lg mb-6">
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>Selected Batch:</strong> {batchInfo.batch_number} - {batchInfo.flock_name} (Flock #{batchInfo.flock_number})
                </p>
                <p className="text-sm text-muted-foreground">Residue analysis data will be automatically linked to this batch.</p>
              </div>

              {/* Basic Information Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Flock Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="flockNumber">Flock Number</Label>
                  <Input
                    id="flockNumber"
                    type="number"
                    value={formData.flockNumber}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="houseNumber">House Number</Label>
                  <Input
                    id="houseNumber"
                    type="number"
                    value={formData.houseNumber}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>

              {/* 3-Column Grid Layout for All Residue Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {/* Left Column */}
                <div className="space-y-4">
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
                    <Label htmlFor="live">Live (at transfer)</Label>
                    <Input
                      id="live"
                      type="number"
                      placeholder="e.g., 520"
                      value={formData.live}
                      onChange={(e) => handleInputChange('live', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lateDeath">Late Death (15-21 days)</Label>
                    <Input
                      id="lateDeath"
                      type="number"
                      placeholder="e.g., 22"
                      value={formData.lateDeath}
                      onChange={(e) => handleInputChange('lateDeath', e.target.value)}
                    />
                  </div>
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
                    <Label htmlFor="malpositioned">Malpositioned</Label>
                    <Input
                      id="malpositioned"
                      type="number"
                      placeholder="e.g., 6"
                      value={formData.malpositioned}
                      onChange={(e) => handleInputChange('malpositioned', e.target.value)}
                    />
                  </div>
                </div>

                {/* Middle Column */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="chicks">Chicks</Label>
                    <Input
                      id="chicks"
                      type="number"
                      placeholder="e.g., 496"
                      value={formData.chicks}
                      onChange={(e) => handleInputChange('chicks', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dead">Dead (at transfer)</Label>
                    <Input
                      id="dead"
                      type="number"
                      placeholder="e.g., 12"
                      value={formData.dead}
                      onChange={(e) => handleInputChange('dead', e.target.value)}
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
                    <Label htmlFor="upsideDown">Upside Down</Label>
                    <Input
                      id="upsideDown"
                      type="number"
                      placeholder="e.g., 2"
                      value={formData.upsideDown}
                      onChange={(e) => handleInputChange('upsideDown', e.target.value)}
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
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
                    <Label htmlFor="handlingCracks">Handling Cracks</Label>
                    <Input
                      id="handlingCracks"
                      type="number"
                      placeholder="e.g., 3"
                      value={formData.handlingCracks}
                      onChange={(e) => handleInputChange('handlingCracks', e.target.value)}
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
                  <div className="space-y-2">
                    <Label htmlFor="dryEgg">Dry Egg</Label>
                    <Input
                      id="dryEgg"
                      type="number"
                      placeholder="e.g., 3"
                      value={formData.dryEgg}
                      onChange={(e) => handleInputChange('dryEgg', e.target.value)}
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
                </div>
              </div>

              {/* Summary Display */}
              <div className="bg-muted/30 p-4 rounded-lg mb-6">
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="font-medium">Total Used: {totalUsed}</span>
                    <span className="mx-2">|</span>
                    <span className="font-medium">Remaining: {remaining}</span>
                    <span className="mx-2">|</span>
                    <span className="font-medium">Target: {TOTAL_EGGS}</span>
                  </div>
                  {remaining < 0 && (
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm font-medium">Exceeds total eggs!</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
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
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Fertility Analysis Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Flock Name</TableHead>
                  <TableHead>Flock #</TableHead>
                  <TableHead>House #</TableHead>
                  <TableHead>Infertile</TableHead>
                  <TableHead>Chicks</TableHead>
                  <TableHead>Early Dead</TableHead>
                  <TableHead>Live</TableHead>
                  <TableHead>Dead</TableHead>
                  <TableHead>Total Used</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No Fertility analysis records found. Click "Add New Residue Record" to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((record) => {
                    const totalUsedForRecord = record.infertile + record.chicks + record.earlyDeath + 
                      record.live + record.dead + record.midDeath + record.lateDeath + record.cullChicks + 
                      record.handlingCracks + record.transferCrack + record.contamination + record.mold + 
                      record.abnormal + record.brain + record.dryEgg + record.malpositioned + 
                      record.upsideDown + record.pipNumber;
                    
                    return (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.name}</TableCell>
                        <TableCell>{record.flockNumber}</TableCell>
                        <TableCell>{record.houseNumber}</TableCell>
                        <TableCell>{record.infertile}</TableCell>
                        <TableCell>{record.chicks}</TableCell>
                        <TableCell>{record.earlyDeath}</TableCell>
                        <TableCell>{record.live}</TableCell>
                        <TableCell>{record.dead}</TableCell>
                        <TableCell className="font-medium">{totalUsedForRecord}</TableCell>
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
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive/80"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResidueDataEntry;
