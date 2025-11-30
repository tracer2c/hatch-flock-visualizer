import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Calculator } from "lucide-react";
import { calculateFertilityPercent } from "@/utils/hatcheryFormulas";

interface CandlingEntryProps {
  availableFlocks?: { flock_id: string; flock_name: string; flock_number: number; batch_id: string | null }[];
  defaultFlockId?: string;
  defaultBatchId?: string;
  onSubmit: (data: {
    flock_id: string;
    batch_id: string | null;
    checkDate: string;
    sampleSize: number;
    fertileEggs: number;
    infertileEggs: number;
    fertilityPercent: number;
    notes: string;
  }) => Promise<void>;
  isSubmitting?: boolean;
  mode?: 'single' | 'multi';
}

const CandlingEntry: React.FC<CandlingEntryProps> = ({
  availableFlocks = [],
  defaultFlockId,
  defaultBatchId,
  onSubmit,
  isSubmitting = false,
  mode = 'single'
}) => {
  const [selectedFlockId, setSelectedFlockId] = useState(defaultFlockId || '');
  const [checkDate, setCheckDate] = useState(new Date().toISOString().split('T')[0]);
  const [sampleSize, setSampleSize] = useState<number>(648);
  const [fertileEggs, setFertileEggs] = useState<string>('');
  const [infertileEggs, setInfertileEggs] = useState<string>('');
  const [notes, setNotes] = useState('');

  // Auto-calculate infertile when fertile changes
  const handleFertileChange = (value: string) => {
    setFertileEggs(value);
    const fertile = parseInt(value) || 0;
    if (fertile <= sampleSize) {
      setInfertileEggs((sampleSize - fertile).toString());
    }
  };

  // Auto-calculate fertile when infertile changes
  const handleInfertileChange = (value: string) => {
    setInfertileEggs(value);
    const infertile = parseInt(value) || 0;
    if (infertile <= sampleSize) {
      setFertileEggs((sampleSize - infertile).toString());
    }
  };

  const fertilityPercent = calculateFertilityPercent(sampleSize, parseInt(infertileEggs) || 0);

  const handleSubmit = async () => {
    const flockId = mode === 'single' && defaultFlockId ? defaultFlockId : selectedFlockId;
    const batchId = mode === 'single' && defaultBatchId ? defaultBatchId : 
      availableFlocks.find(f => f.flock_id === selectedFlockId)?.batch_id || null;

    if (!flockId) return;

    await onSubmit({
      flock_id: flockId,
      batch_id: batchId,
      checkDate,
      sampleSize,
      fertileEggs: parseInt(fertileEggs) || 0,
      infertileEggs: parseInt(infertileEggs) || 0,
      fertilityPercent,
      notes
    });

    // Reset form
    setFertileEggs('');
    setInfertileEggs('');
    setNotes('');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Eye className="h-4 w-4 text-blue-600" />
          Candling / Fertility Check
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {mode === 'multi' && availableFlocks.length > 0 && (
          <div className="space-y-2">
            <Label>Select Flock</Label>
            <Select value={selectedFlockId} onValueChange={setSelectedFlockId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a flock" />
              </SelectTrigger>
              <SelectContent>
                {availableFlocks.map(flock => (
                  <SelectItem key={flock.flock_id} value={flock.flock_id}>
                    {flock.flock_name} (#{flock.flock_number})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Check Date</Label>
            <Input
              type="date"
              value={checkDate}
              onChange={(e) => setCheckDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Sample Size</Label>
            <Input
              type="number"
              value={sampleSize}
              onChange={(e) => setSampleSize(parseInt(e.target.value) || 648)}
              className="bg-muted"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Fertile Eggs</Label>
            <Input
              type="number"
              value={fertileEggs}
              onChange={(e) => handleFertileChange(e.target.value)}
              placeholder="Enter count"
            />
          </div>
          <div className="space-y-2">
            <Label>Infertile Eggs</Label>
            <Input
              type="number"
              value={infertileEggs}
              onChange={(e) => handleInfertileChange(e.target.value)}
              placeholder="Enter count"
            />
          </div>
        </div>

        <div className="p-3 bg-primary/5 rounded-lg flex items-center gap-3">
          <Calculator className="h-5 w-5 text-primary" />
          <div>
            <span className="text-sm text-muted-foreground">Fertility %: </span>
            <span className="text-lg font-semibold text-primary">{fertilityPercent.toFixed(1)}%</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any observations..."
            rows={2}
          />
        </div>

        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting || (!defaultFlockId && !selectedFlockId)}
          className="w-full"
        >
          {isSubmitting ? 'Saving...' : 'Save Candling Results'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default CandlingEntry;
