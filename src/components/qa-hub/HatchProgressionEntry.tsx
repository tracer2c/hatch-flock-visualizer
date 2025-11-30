import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Timer } from "lucide-react";

interface FlockOption {
  flock_id: string;
  batch_id: string;
  flock_name: string;
  flock_number: number;
}

interface HatchProgressionEntryProps {
  technicianName: string;
  checkDate: string;
  flockOptions?: FlockOption[];
  defaultFlockId?: string;
  defaultBatchId?: string;
  onSubmit: (data: {
    flock_id: string;
    batch_id: string;
    stage: string;
    percentageOut: number;
    totalCount: number;
    hatchedCount: number;
    checkHour: number;
    hatchDate: string;
  }) => void;
}

const stages = [
  { value: 'A', label: 'Stage A - Initial Hatch' },
  { value: 'B', label: 'Stage B - Mid Hatch' },
  { value: 'C', label: 'Stage C - Final Hatch' },
];

const HatchProgressionEntry: React.FC<HatchProgressionEntryProps> = ({ 
  technicianName, 
  checkDate,
  flockOptions = [],
  defaultFlockId,
  defaultBatchId,
  onSubmit 
}) => {
  const [selectedFlockId, setSelectedFlockId] = useState(defaultFlockId || '');
  const [stage, setStage] = useState('A');
  const [totalCount, setTotalCount] = useState('');
  const [hatchedCount, setHatchedCount] = useState('');
  const [checkHour, setCheckHour] = useState('');
  const [percentageOut, setPercentageOut] = useState('');

  const selectedFlock = flockOptions.find(f => f.flock_id === selectedFlockId);
  const batchId = selectedFlock?.batch_id || defaultBatchId || '';

  // Auto-calculate percentage when counts change
  useEffect(() => {
    const total = parseInt(totalCount);
    const hatched = parseInt(hatchedCount);
    if (total > 0 && hatched >= 0) {
      const pct = (hatched / total * 100).toFixed(1);
      setPercentageOut(pct);
    }
  }, [totalCount, hatchedCount]);

  const handleSubmit = () => {
    if (!technicianName.trim()) return;
    if (!selectedFlockId || !batchId) return;

    onSubmit({
      flock_id: selectedFlockId,
      batch_id: batchId,
      stage,
      percentageOut: parseFloat(percentageOut) || 0,
      totalCount: parseInt(totalCount) || 0,
      hatchedCount: parseInt(hatchedCount) || 0,
      checkHour: parseInt(checkHour) || 0,
      hatchDate: checkDate
    });

    setTotalCount('');
    setHatchedCount('');
    setCheckHour('');
    setPercentageOut('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Timer className="h-5 w-5 text-green-500" />
          Hatch Progression
        </CardTitle>
        <p className="text-sm text-muted-foreground">Track hatching progress at each stage</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <Label>Stage</Label>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger>
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                {stages.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Check Hour (0-24)</Label>
            <Input
              type="number"
              min="0"
              max="24"
              value={checkHour}
              onChange={(e) => setCheckHour(e.target.value)}
              placeholder="e.g., 12"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Total Count</Label>
            <Input
              type="number"
              min="0"
              value={totalCount}
              onChange={(e) => setTotalCount(e.target.value)}
              placeholder="Total eggs"
            />
          </div>
          <div className="space-y-2">
            <Label>Hatched Count</Label>
            <Input
              type="number"
              min="0"
              value={hatchedCount}
              onChange={(e) => setHatchedCount(e.target.value)}
              placeholder="Hatched chicks"
            />
          </div>
          <div className="space-y-2">
            <Label>% Out (Auto-calculated)</Label>
            <Input
              type="number"
              step="0.1"
              value={percentageOut}
              onChange={(e) => setPercentageOut(e.target.value)}
              placeholder="Auto"
              className="bg-muted/50"
            />
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

        {/* Progress indicator */}
        {percentageOut && (
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Progress:</span>
              <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-green-500 h-full transition-all"
                  style={{ width: `${Math.min(parseFloat(percentageOut), 100)}%` }}
                />
              </div>
              <span className="text-sm font-medium text-green-600">{percentageOut}%</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default HatchProgressionEntry;
