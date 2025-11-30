import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Droplets, CheckCircle2, AlertTriangle } from "lucide-react";

interface MoistureLossEntryProps {
  technicianName: string;
  checkDate: string;
  flockNumber?: number;
  onSubmit: (data: {
    flockNumber: string;
    day1Weight: number;
    day18Weight: number;
    lossPercentage: number;
    testDate: string;
  }) => void;
}

const OPTIMAL_MIN = 10;
const OPTIMAL_MAX = 12;

const MoistureLossEntry: React.FC<MoistureLossEntryProps> = ({ 
  technicianName, 
  checkDate, 
  flockNumber: defaultFlockNumber,
  onSubmit 
}) => {
  const [flockNumber, setFlockNumber] = useState(defaultFlockNumber?.toString() || '');
  const [day1Weight, setDay1Weight] = useState('');
  const [day18Weight, setDay18Weight] = useState('');
  const [lossPercentage, setLossPercentage] = useState('');

  // Auto-calculate loss percentage
  useEffect(() => {
    const d1 = parseFloat(day1Weight);
    const d18 = parseFloat(day18Weight);
    if (d1 > 0 && d18 > 0) {
      const loss = ((d1 - d18) / d1 * 100).toFixed(2);
      setLossPercentage(loss);
    }
  }, [day1Weight, day18Weight]);

  const lossPct = parseFloat(lossPercentage);
  const isOptimal = lossPct >= OPTIMAL_MIN && lossPct <= OPTIMAL_MAX;
  const isLow = lossPct < OPTIMAL_MIN;
  const isHigh = lossPct > OPTIMAL_MAX;

  const handleSubmit = () => {
    if (!technicianName.trim()) return;
    if (!flockNumber || !day1Weight || !day18Weight) return;

    onSubmit({
      flockNumber,
      day1Weight: parseFloat(day1Weight),
      day18Weight: parseFloat(day18Weight),
      lossPercentage: lossPct,
      testDate: checkDate
    });

    setDay1Weight('');
    setDay18Weight('');
    setLossPercentage('');
  };

  const getLossColor = () => {
    if (!lossPercentage || isNaN(lossPct)) return '';
    if (isOptimal) return 'border-green-500 bg-green-50';
    if (isLow) return 'border-amber-500 bg-amber-50';
    return 'border-red-500 bg-red-50';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Droplets className="h-5 w-5 text-cyan-500" />
          Moisture Loss Tracking
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Optimal moisture loss: {OPTIMAL_MIN}-{OPTIMAL_MAX}% (Day 1 to Day 18)
        </p>
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
            <Label>Day 1 Weight (g)</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              value={day1Weight}
              onChange={(e) => setDay1Weight(e.target.value)}
              placeholder="e.g., 65.5"
            />
          </div>
          <div className="space-y-2">
            <Label>Day 18 Weight (g)</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              value={day18Weight}
              onChange={(e) => setDay18Weight(e.target.value)}
              placeholder="e.g., 58.2"
            />
          </div>
          <div className="space-y-2">
            <Label>Loss % (Auto)</Label>
            <Input
              type="number"
              step="0.01"
              value={lossPercentage}
              onChange={(e) => setLossPercentage(e.target.value)}
              placeholder="Auto"
              className={getLossColor()}
              readOnly
            />
          </div>
          <div className="flex items-end">
            <Button 
              onClick={handleSubmit}
              disabled={!technicianName.trim() || !flockNumber || !day1Weight || !day18Weight}
              className="w-full"
            >
              Add Record
            </Button>
          </div>
        </div>

        {/* Status Badge */}
        {lossPercentage && !isNaN(lossPct) && (
          <div className="flex items-center gap-2 pt-2 border-t">
            {isOptimal ? (
              <Badge className="bg-green-100 text-green-700 gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Optimal ({lossPct.toFixed(1)}%)
              </Badge>
            ) : isLow ? (
              <Badge className="bg-amber-100 text-amber-700 gap-1">
                <AlertTriangle className="h-3 w-3" />
                Too Low ({lossPct.toFixed(1)}%) - Increase ventilation
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Too High ({lossPct.toFixed(1)}%) - Decrease ventilation
              </Badge>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded" /> {OPTIMAL_MIN}-{OPTIMAL_MAX}% (Optimal)
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-amber-500 rounded" /> &lt;{OPTIMAL_MIN}% (Low)
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded" /> &gt;{OPTIMAL_MAX}% (High)
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default MoistureLossEntry;
