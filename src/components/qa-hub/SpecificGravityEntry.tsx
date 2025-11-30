import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Scale, CheckCircle2, XCircle } from "lucide-react";

interface SpecificGravityEntryProps {
  technicianName: string;
  checkDate: string;
  flockNumber?: number;
  onSubmit: (data: {
    flockNumber: string;
    age: number;
    floatPercentage: number;
    testDate: string;
  }) => void;
}

const SpecificGravityEntry: React.FC<SpecificGravityEntryProps> = ({ 
  technicianName, 
  checkDate, 
  flockNumber: defaultFlockNumber,
  onSubmit 
}) => {
  const [flockNumber, setFlockNumber] = useState(defaultFlockNumber?.toString() || '');
  const [age, setAge] = useState('');
  const [floatPercentage, setFloatPercentage] = useState('');

  const ageNum = parseInt(age);
  const floatPct = parseFloat(floatPercentage);
  
  // Quality threshold: <10% for ages 25-40, <15% for other ages
  const getQualityThreshold = () => {
    if (ageNum >= 25 && ageNum <= 40) return 10;
    return 15;
  };
  
  const isGoodQuality = floatPct < getQualityThreshold();

  const handleSubmit = () => {
    if (!technicianName.trim()) return;
    if (!flockNumber || !age || !floatPercentage) return;

    onSubmit({
      flockNumber,
      age: ageNum,
      floatPercentage: floatPct,
      testDate: checkDate
    });

    setAge('');
    setFloatPercentage('');
  };

  const getFloatColor = () => {
    if (!floatPercentage || isNaN(floatPct)) return '';
    return isGoodQuality ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50';
  };

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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Flock Number</Label>
            <Input
              value={flockNumber}
              onChange={(e) => setFlockNumber(e.target.value)}
              placeholder="e.g., 1234"
            />
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
            <Label>Float Percentage (%)</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={floatPercentage}
              onChange={(e) => setFloatPercentage(e.target.value)}
              placeholder="e.g., 8.5"
              className={getFloatColor()}
            />
          </div>
          <div className="flex items-end">
            <Button 
              onClick={handleSubmit}
              disabled={!technicianName.trim() || !flockNumber || !age || !floatPercentage}
              className="w-full"
            >
              Add Test
            </Button>
          </div>
        </div>

        {/* Quality Status */}
        {floatPercentage && age && (
          <div className="flex items-center gap-2 pt-2 border-t">
            {isGoodQuality ? (
              <Badge className="bg-green-100 text-green-700 gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Good Shell Quality ({floatPct.toFixed(1)}% &lt; {getQualityThreshold()}%)
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="h-3 w-3" />
                Poor Shell Quality ({floatPct.toFixed(1)}% ≥ {getQualityThreshold()}%)
              </Badge>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
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
