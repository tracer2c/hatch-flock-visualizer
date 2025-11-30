import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";

interface FlockOption {
  flock_id: string;
  batch_id: string;
  flock_name: string;
  flock_number: number;
}

interface CullChecksEntryProps {
  technicianName: string;
  checkDate: string;
  flockOptions?: FlockOption[];
  defaultFlockId?: string;
  defaultBatchId?: string;
  onSubmit: (data: {
    flock_id: string;
    batch_id: string;
    maleCount: number;
    femaleCount: number;
    defectType: string;
    checkDate: string;
  }) => void;
}

const defectTypes = [
  { value: 'none', label: 'No Defects' },
  { value: 'leg', label: 'Leg Deformity' },
  { value: 'beak', label: 'Beak Deformity' },
  { value: 'eyes', label: 'Eye Problems' },
  { value: 'naval', label: 'Naval Issues' },
  { value: 'weak', label: 'Weak/Lethargic' },
  { value: 'other', label: 'Other' },
];

const CullChecksEntry: React.FC<CullChecksEntryProps> = ({ 
  technicianName, 
  checkDate, 
  flockOptions = [],
  defaultFlockId,
  defaultBatchId,
  onSubmit 
}) => {
  const [selectedFlockId, setSelectedFlockId] = useState(defaultFlockId || '');
  const [maleCount, setMaleCount] = useState('');
  const [femaleCount, setFemaleCount] = useState('');
  const [defectType, setDefectType] = useState('none');

  const totalCulls = (parseInt(maleCount) || 0) + (parseInt(femaleCount) || 0);

  const selectedFlock = flockOptions.find(f => f.flock_id === selectedFlockId);
  const batchId = selectedFlock?.batch_id || defaultBatchId || '';

  const handleSubmit = () => {
    if (!technicianName.trim()) return;
    if (!selectedFlockId || !batchId) return;

    onSubmit({
      flock_id: selectedFlockId,
      batch_id: batchId,
      maleCount: parseInt(maleCount) || 0,
      femaleCount: parseInt(femaleCount) || 0,
      defectType,
      checkDate
    });

    setMaleCount('');
    setFemaleCount('');
    setDefectType('none');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Cull Checks
        </CardTitle>
        <p className="text-sm text-muted-foreground">Record culled chicks by gender and defect type</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="space-y-2">
            <Label>Flock</Label>
            {flockOptions.length > 0 ? (
              <Select value={selectedFlockId} onValueChange={setSelectedFlockId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select flock" />
                </SelectTrigger>
                <SelectContent>
                  {flockOptions.map(f => (
                    <SelectItem key={f.flock_id} value={f.flock_id}>
                      {f.flock_name} ({f.flock_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={selectedFlock?.flock_name || 'Auto-linked'}
                disabled
                className="bg-muted/50"
              />
            )}
          </div>
          <div className="space-y-2">
            <Label>Male Count</Label>
            <Input
              type="number"
              min="0"
              value={maleCount}
              onChange={(e) => setMaleCount(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label>Female Count</Label>
            <Input
              type="number"
              min="0"
              value={femaleCount}
              onChange={(e) => setFemaleCount(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label>Defect Type</Label>
            <Select value={defectType} onValueChange={setDefectType}>
              <SelectTrigger>
                <SelectValue placeholder="Select defect" />
              </SelectTrigger>
              <SelectContent>
                {defectTypes.map(d => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button 
              onClick={handleSubmit}
              disabled={!technicianName.trim() || (!selectedFlockId && !defaultFlockId)}
              className="w-full"
            >
              Add Record
            </Button>
          </div>
        </div>

        {/* Summary */}
        {(maleCount || femaleCount) && (
          <div className="pt-2 border-t">
            <p className="text-sm font-medium">
              Total Culls: <span className="text-amber-600">{totalCulls}</span>
              {totalCulls > 0 && defectType !== 'none' && (
                <span className="text-muted-foreground ml-2">
                  ({defectTypes.find(d => d.value === defectType)?.label})
                </span>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CullChecksEntry;
