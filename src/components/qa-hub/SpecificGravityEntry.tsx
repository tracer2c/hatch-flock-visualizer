import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Scale, CheckCircle2, XCircle } from "lucide-react";

interface FlockOption {
  flock_id: string;
  flock_name: string;
  flock_number: number;
  batch_id?: string | null;
}

interface SpecificGravityEntryProps {
  technicianName: string;
  checkDate: string;
  // For single-setter - auto-filled from house
  flockId?: string;
  flockNumber?: number;
  flockName?: string;
  batchId?: string;
  // For multi-setter - list of flocks to choose from
  availableFlocks?: FlockOption[];
  onSubmit: (data: {
    flock_id: string;
    batch_id: string | null;
    age: number;
    sampleSize: number;
    floatCount: number;
    floatPercentage: number;
    testDate: string;
  }) => void;
}

const SpecificGravityEntry: React.FC<SpecificGravityEntryProps> = ({ 
  technicianName, 
  checkDate, 
  flockId: defaultFlockId,
  flockNumber: defaultFlockNumber,
  flockName: defaultFlockName,
  batchId: defaultBatchId,
  availableFlocks,
  onSubmit 
}) => {
  const [selectedFlockId, setSelectedFlockId] = useState(defaultFlockId || '');
  const [age, setAge] = useState('');
  const [sampleSize, setSampleSize] = useState('100');
  const [floatCount, setFloatCount] = useState('');
  const [floatPercentage, setFloatPercentage] = useState('');

  // Auto-calculate float percentage when sample size or float count changes
  useEffect(() => {
    const sample = parseInt(sampleSize);
    const floats = parseInt(floatCount);
    if (sample > 0 && floats >= 0) {
      const pct = (floats / sample) * 100;
      setFloatPercentage(pct.toFixed(1));
    }
  }, [sampleSize, floatCount]);

  const ageNum = parseInt(age);
  const floatPct = parseFloat(floatPercentage);
  
  // Quality threshold: <10% for ages 25-40, <15% for other ages
  const getQualityThreshold = () => {
    if (ageNum >= 25 && ageNum <= 40) return 10;
    return 15;
  };
  
  const isGoodQuality = floatPct < getQualityThreshold();

  const getSelectedFlock = (): FlockOption | null => {
    if (defaultFlockId && defaultFlockName) {
      return { flock_id: defaultFlockId, flock_name: defaultFlockName, flock_number: defaultFlockNumber || 0, batch_id: defaultBatchId };
    }
    if (availableFlocks && selectedFlockId) {
      return availableFlocks.find(f => f.flock_id === selectedFlockId) || null;
    }
    return null;
  };

  const handleSubmit = () => {
    if (!technicianName.trim()) return;
    
    const flock = getSelectedFlock();
    if (!flock || !age || !floatCount || !sampleSize) return;

    onSubmit({
      flock_id: flock.flock_id,
      batch_id: flock.batch_id || null,
      age: ageNum,
      sampleSize: parseInt(sampleSize),
      floatCount: parseInt(floatCount),
      floatPercentage: floatPct,
      testDate: checkDate
    });

    setAge('');
    setFloatCount('');
    setFloatPercentage('');
  };

  const getFloatColor = () => {
    if (!floatPercentage || isNaN(floatPct)) return '';
    return isGoodQuality ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50';
  };

  const isMultiMode = !defaultFlockId && availableFlocks && availableFlocks.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Scale className="h-5 w-5 text-indigo-500" />
          Specific Gravity Test
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Shell quality assessment - Float percentage should be &lt;10% (ages 25-40) or &lt;15% (other ages)
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Flock Selection */}
          <div className="space-y-2">
            <Label>Flock</Label>
            {isMultiMode ? (
              <Select value={selectedFlockId} onValueChange={setSelectedFlockId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select flock" />
                </SelectTrigger>
                <SelectContent>
                  {availableFlocks?.map(f => (
                    <SelectItem key={f.flock_id} value={f.flock_id}>
                      {f.flock_name} ({f.flock_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={defaultFlockName || `Flock ${defaultFlockNumber || ''}`}
                disabled
                className="bg-muted"
              />
            )}
          </div>

          <div className="space-y-2">
            <Label>Age (weeks)</Label>
            <Input
              type="number"
              min="20"
              max="70"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="e.g., 35"
            />
          </div>

          <div className="space-y-2">
            <Label>Sample Size</Label>
            <Input
              type="number"
              min="1"
              value={sampleSize}
              onChange={(e) => setSampleSize(e.target.value)}
              placeholder="100"
            />
          </div>

          <div className="space-y-2">
            <Label>Float Count</Label>
            <Input
              type="number"
              min="0"
              value={floatCount}
              onChange={(e) => setFloatCount(e.target.value)}
              placeholder="e.g., 8"
            />
          </div>

          <div className="space-y-2">
            <Label>Float % (auto)</Label>
            <Input
              type="number"
              value={floatPercentage}
              disabled
              className={`bg-muted ${getFloatColor()}`}
              placeholder="Auto-calculated"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            {floatPercentage && age && (
              isGoodQuality ? (
                <Badge className="bg-green-100 text-green-700 gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Good Shell Quality ({floatPct.toFixed(1)}% &lt; {getQualityThreshold()}%)
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  Poor Shell Quality ({floatPct.toFixed(1)}% ≥ {getQualityThreshold()}%)
                </Badge>
              )
            )}
          </div>
          <Button 
            onClick={handleSubmit}
            disabled={!technicianName.trim() || !(defaultFlockId || selectedFlockId) || !age || !floatCount || !sampleSize}
          >
            Add Test
          </Button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded" /> Good Quality
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded" /> Poor Quality
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default SpecificGravityEntry;
