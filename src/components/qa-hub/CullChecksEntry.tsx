import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";

interface CullChecksEntryProps {
  technicianName: string;
  checkDate: string;
  flockNumber?: number;
  onSubmit: (data: {
    flockNumber: string;
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
  flockNumber: defaultFlockNumber,
  onSubmit 
}) => {
  const [flockNumber, setFlockNumber] = useState(defaultFlockNumber?.toString() || '');
  const [maleCount, setMaleCount] = useState('');
  const [femaleCount, setFemaleCount] = useState('');
  const [defectType, setDefectType] = useState('none');

  const totalCulls = (parseInt(maleCount) || 0) + (parseInt(femaleCount) || 0);

  const handleSubmit = () => {
    if (!technicianName.trim()) return;
    if (!flockNumber) return;

    onSubmit({
      flockNumber,
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
            <Label>Flock Number</Label>
            <Input
              value={flockNumber}
              onChange={(e) => setFlockNumber(e.target.value)}
              placeholder="e.g., 1234"
            />
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
              disabled={!technicianName.trim() || !flockNumber}
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
