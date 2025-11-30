import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Droplets, CheckCircle2, XCircle } from "lucide-react";

interface TrayWashEntryProps {
  technicianName: string;
  checkDate: string;
  onSubmit: (data: {
    firstCheck: number;
    secondCheck: number;
    thirdCheck: number;
    washDate: string;
  }) => void;
}

const MIN_TEMP = 140; // Minimum sanitization temperature

const TrayWashEntry: React.FC<TrayWashEntryProps> = ({ technicianName, checkDate, onSubmit }) => {
  const [firstCheck, setFirstCheck] = useState('');
  const [secondCheck, setSecondCheck] = useState('');
  const [thirdCheck, setThirdCheck] = useState('');

  const first = parseFloat(firstCheck);
  const second = parseFloat(secondCheck);
  const third = parseFloat(thirdCheck);
  
  const allPassed = first >= MIN_TEMP && second >= MIN_TEMP && third >= MIN_TEMP;
  const allFilled = firstCheck && secondCheck && thirdCheck;

  const handleSubmit = () => {
    if (!technicianName.trim()) return;
    if (!allFilled) return;

    onSubmit({
      firstCheck: first,
      secondCheck: second,
      thirdCheck: third,
      washDate: checkDate
    });

    setFirstCheck('');
    setSecondCheck('');
    setThirdCheck('');
  };

  const getTempColor = (value: string) => {
    const temp = parseFloat(value);
    if (!value || isNaN(temp)) return '';
    return temp >= MIN_TEMP ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Droplets className="h-5 w-5 text-blue-500" />
          Tray Wash Temperature
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Sanitation verification - minimum {MIN_TEMP}°F required for all checks
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>1st Check (°F)</Label>
            <Input
              type="number"
              step="0.1"
              value={firstCheck}
              onChange={(e) => setFirstCheck(e.target.value)}
              placeholder={`≥ ${MIN_TEMP}`}
              className={getTempColor(firstCheck)}
            />
          </div>
          <div className="space-y-2">
            <Label>2nd Check (°F)</Label>
            <Input
              type="number"
              step="0.1"
              value={secondCheck}
              onChange={(e) => setSecondCheck(e.target.value)}
              placeholder={`≥ ${MIN_TEMP}`}
              className={getTempColor(secondCheck)}
            />
          </div>
          <div className="space-y-2">
            <Label>3rd Check (°F)</Label>
            <Input
              type="number"
              step="0.1"
              value={thirdCheck}
              onChange={(e) => setThirdCheck(e.target.value)}
              placeholder={`≥ ${MIN_TEMP}`}
              className={getTempColor(thirdCheck)}
            />
          </div>
          <div className="flex items-end">
            <Button 
              onClick={handleSubmit}
              disabled={!technicianName.trim() || !allFilled}
              className="w-full"
            >
              Add Record
            </Button>
          </div>
        </div>

        {/* Status Badge */}
        {allFilled && (
          <div className="flex items-center gap-2 pt-2 border-t">
            {allPassed ? (
              <Badge className="bg-green-100 text-green-700 gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Sanitation PASSED
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="h-3 w-3" />
                Sanitation FAILED - Below {MIN_TEMP}°F
              </Badge>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded" /> ≥ {MIN_TEMP}°F (Pass)
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded" /> &lt; {MIN_TEMP}°F (Fail)
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default TrayWashEntry;
