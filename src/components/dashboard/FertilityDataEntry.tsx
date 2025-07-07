
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FertilityRecord {
  id: string;
  name: string;
  flockNumber: number;
  age: number;
  size: number;
  infertile: number;
  dead: number;
  deadPercent: number;
  fertility: number;
  fertilityAvg?: number;
  hatchPercent: number;
  hofPercent: number;
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
  const [formData, setFormData] = useState({
    name: batchInfo.flock_name,
    flockNumber: batchInfo.flock_number.toString(),
    age: '',
    size: '648',
    infertile: '',
    dead: '',
    hatchPercent: ''
  });
  const { toast } = useToast();

  const calculateValues = (size: number, infertile: number, dead: number, hatchPercent: number) => {
    const deadPercent = (dead / size) * 100;
    const fertility = ((size - infertile) / size) * 100;
    const hofPercent = (hatchPercent / fertility) * 100;
    
    return {
      deadPercent: Number(deadPercent.toFixed(2)),
      fertility: Number(fertility.toFixed(2)),
      hofPercent: Number(hofPercent.toFixed(2))
    };
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const size = Number(formData.size);
    const infertile = Number(formData.infertile);
    const dead = Number(formData.dead);
    
    if (infertile + dead > size) {
      toast({
        title: "Validation Error",
        description: "Infertile + Dead eggs cannot exceed total size",
        variant: "destructive"
      });
      return false;
    }
    
    if (!formData.name || !formData.flockNumber || !formData.age) {
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
    
    const size = Number(formData.size);
    const infertile = Number(formData.infertile);
    const dead = Number(formData.dead);
    const hatchPercent = Number(formData.hatchPercent);
    
    const calculated = calculateValues(size, infertile, dead, hatchPercent);
    
    const newRecord: FertilityRecord = {
      id: editingId || Date.now().toString(),
      name: formData.name,
      flockNumber: Number(formData.flockNumber),
      age: Number(formData.age),
      size,
      infertile,
      dead,
      deadPercent: calculated.deadPercent,
      fertility: calculated.fertility,
      hatchPercent,
      hofPercent: calculated.hofPercent
    };

    if (editingId) {
      const updatedData = data.map(item => item.id === editingId ? newRecord : item);
      onDataUpdate(updatedData);
      toast({
        title: "Record Updated",
        description: "Fertility record updated successfully"
      });
    } else {
      onDataUpdate([...data, newRecord]);
      toast({
        title: "Record Added",
        description: "New fertility record added successfully"
      });
    }

    handleCancel();
  };

  const handleEdit = (record: FertilityRecord) => {
    setEditingId(record.id);
    setFormData({
      name: record.name,
      flockNumber: record.flockNumber.toString(),
      age: record.age.toString(),
      size: record.size.toString(),
      infertile: record.infertile.toString(),
      dead: record.dead.toString(),
      hatchPercent: record.hatchPercent.toString()
    });
  };

  const handleDelete = (id: string) => {
    const updatedData = data.filter(item => item.id !== id);
    onDataUpdate(updatedData);
    toast({
      title: "Record Deleted",
      description: "Fertility record deleted successfully"
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({
      name: '',
      flockNumber: '',
      age: '',
      size: '648',
      infertile: '',
      dead: '',
      hatchPercent: ''
    });
  };

  const calculateOverallAverages = () => {
    if (data.length === 0) return null;
    
    const totalEggs = data.reduce((sum, record) => sum + record.size, 0);
    const totalInfertile = data.reduce((sum, record) => sum + record.infertile, 0);
    const avgAge = data.reduce((sum, record) => sum + record.age, 0) / data.length;
    const avgFertility = data.reduce((sum, record) => sum + record.fertility, 0) / data.length;
    const avgHatch = data.reduce((sum, record) => sum + record.hatchPercent, 0) / data.length;
    const avgHOF = (avgHatch / avgFertility) * 100;
    
    return {
      avgAge: Number(avgAge.toFixed(1)),
      totalEggs,
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
              <Label htmlFor="name">Flock Name *</Label>
              <Input
                id="name"
                placeholder="e.g., LMJ #1"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="flockNumber">Flock Number *</Label>
              <Input
                id="flockNumber"
                type="number"
                placeholder="e.g., 6375"
                value={formData.flockNumber}
                onChange={(e) => handleInputChange('flockNumber', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="age">Age (weeks) *</Label>
              <Input
                id="age"
                type="number"
                placeholder="e.g., 64"
                value={formData.age}
                onChange={(e) => handleInputChange('age', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="size">Total Eggs Set</Label>
              <Input
                id="size"
                type="number"
                value={formData.size}
                onChange={(e) => handleInputChange('size', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="infertile">Infertile Eggs</Label>
              <Input
                id="infertile"
                type="number"
                placeholder="e.g., 210"
                value={formData.infertile}
                onChange={(e) => handleInputChange('infertile', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dead">Dead Embryos</Label>
              <Input
                id="dead"
                type="number"
                placeholder="e.g., 45"
                value={formData.dead}
                onChange={(e) => handleInputChange('dead', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hatchPercent">Hatch %</Label>
              <Input
                id="hatchPercent"
                type="number"
                step="0.01"
                placeholder="e.g., 60.61"
                value={formData.hatchPercent}
                onChange={(e) => handleInputChange('hatchPercent', e.target.value)}
              />
            </div>
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
          <CardTitle>Fertility Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Flock #</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Infertile</TableHead>
                  <TableHead>Dead</TableHead>
                  <TableHead>Dead %</TableHead>
                  <TableHead>Fertility %</TableHead>
                  <TableHead>Hatch %</TableHead>
                  <TableHead>HOF %</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.name}</TableCell>
                    <TableCell>{record.flockNumber}</TableCell>
                    <TableCell>{record.age}</TableCell>
                    <TableCell>{record.size}</TableCell>
                    <TableCell>{record.infertile}</TableCell>
                    <TableCell>{record.dead}</TableCell>
                    <TableCell>{record.deadPercent}%</TableCell>
                    <TableCell>{record.fertility}%</TableCell>
                    <TableCell>{record.hatchPercent}%</TableCell>
                    <TableCell>{record.hofPercent}%</TableCell>
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
                    <TableCell>-</TableCell>
                    <TableCell>{overallAverages.avgAge}</TableCell>
                    <TableCell>{overallAverages.totalEggs}</TableCell>
                    <TableCell>{overallAverages.totalInfertile}</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>{overallAverages.avgFertility}%</TableCell>
                    <TableCell>{overallAverages.avgHatch}%</TableCell>
                    <TableCell>{overallAverages.avgHOF}%</TableCell>
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
