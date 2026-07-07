import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Droplets, CheckCircle2, XCircle, FlaskConical } from "lucide-react";
import { toast } from 'sonner';

export interface PpmCheck {
  ppm: number | null;
  time: string; // HH:MM, optional
}

interface TrayWashEntryProps {
  technicianName: string;
  checkDate: string;
  onSubmit: (data: {
    firstCheck: number;
    secondCheck: number;
    thirdCheck: number;
    ppmChecks: PpmCheck[]; // exactly 5 entries
    washDate: string;
  }) => void;
}

const MIN_TEMP = 140; // Minimum sanitization temperature (°F)
const PPM_MIN = 50;   // Acceptable chlorine PPM lower bound
const PPM_MAX = 200;  // Acceptable chlorine PPM upper bound
const PPM_SLOTS = 5;

const emptyPpm = (): PpmCheck => ({ ppm: null, time: '' });

const TrayWashEntry: React.FC<TrayWashEntryProps> = ({ technicianName, checkDate, onSubmit }) => {
  const [firstCheck, setFirstCheck] = useState('');
  const [secondCheck, setSecondCheck] = useState('');
  const [thirdCheck, setThirdCheck] = useState('');
  const [ppmRows, setPpmRows] = useState<{ ppm: string; time: string }[]>(
    Array.from({ length: PPM_SLOTS }, () => ({ ppm: '', time: '' }))
  );

  const first = parseFloat(firstCheck);
  const second = parseFloat(secondCheck);
  const third = parseFloat(thirdCheck);

  const tempsAllPassed = first >= MIN_TEMP && second >= MIN_TEMP && third >= MIN_TEMP;
  const tempsAllFilled = firstCheck !== '' && secondCheck !== '' && thirdCheck !== '';

  const filledPpm = ppmRows.filter(r => r.ppm !== '');
  const ppmAllFilled = filledPpm.length === PPM_SLOTS;
  const ppmAllInRange = filledPpm.every(r => {
    const v = parseFloat(r.ppm);
    return Number.isFinite(v) && v >= PPM_MIN && v <= PPM_MAX;
  });

  const handlePpmChange = (idx: number, field: 'ppm' | 'time', value: string) => {
    setPpmRows(prev => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  };

  const handleSubmit = () => {
    if (!technicianName.trim()) {
      toast.error('Enter a technician name first.');
      return;
    }
    if (!tempsAllFilled) {
      toast.error('Fill in all 3 temperature checks.');
      return;
    }
    if (!ppmAllFilled) {
      toast.error('Fill in all 5 PPM checks for the day.');
      return;
    }

    const ppmChecks: PpmCheck[] = ppmRows.map(r => ({
      ppm: parseFloat(r.ppm),
      time: r.time || '',
    }));

    onSubmit({
      firstCheck: first,
      secondCheck: second,
      thirdCheck: third,
      ppmChecks,
      washDate: checkDate,
    });

    setFirstCheck('');
    setSecondCheck('');
    setThirdCheck('');
    setPpmRows(Array.from({ length: PPM_SLOTS }, () => ({ ppm: '', time: '' })));
  };

  const getTempColor = (value: string) => {
    const temp = parseFloat(value);
    if (!value || isNaN(temp)) return '';
    return temp >= MIN_TEMP ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50';
  };

  const getPpmColor = (value: string) => {
    const v = parseFloat(value);
    if (!value || isNaN(v)) return '';
    return v >= PPM_MIN && v <= PPM_MAX ? 'border-green-500 bg-green-50' : 'border-amber-500 bg-amber-50';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Droplets className="h-5 w-5 text-blue-500" />
          Tray Wash — Daily Log
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          One entry per day. Temps ≥ {MIN_TEMP}°F, chlorine PPM {PPM_MIN}–{PPM_MAX} across 5 checks.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Temperature checks */}
        <div>
          <Label className="text-sm font-semibold flex items-center gap-2 mb-3">
            <Droplets className="h-4 w-4 text-blue-500" />
            Wash Temperature (3 checks)
          </Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>1st Check (°F)</Label>
              <Input type="number" step="0.1" value={firstCheck} onChange={(e) => setFirstCheck(e.target.value)} placeholder={`≥ ${MIN_TEMP}`} className={getTempColor(firstCheck)} />
            </div>
            <div className="space-y-2">
              <Label>2nd Check (°F)</Label>
              <Input type="number" step="0.1" value={secondCheck} onChange={(e) => setSecondCheck(e.target.value)} placeholder={`≥ ${MIN_TEMP}`} className={getTempColor(secondCheck)} />
            </div>
            <div className="space-y-2">
              <Label>3rd Check (°F)</Label>
              <Input type="number" step="0.1" value={thirdCheck} onChange={(e) => setThirdCheck(e.target.value)} placeholder={`≥ ${MIN_TEMP}`} className={getTempColor(thirdCheck)} />
            </div>
          </div>
          {tempsAllFilled && (
            <div className="mt-3">
              {tempsAllPassed ? (
                <Badge className="bg-green-100 text-green-700 gap-1"><CheckCircle2 className="h-3 w-3" /> Sanitation PASSED</Badge>
              ) : (
                <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Sanitation FAILED — below {MIN_TEMP}°F</Badge>
              )}
            </div>
          )}
        </div>

        {/* PPM checks — 5 fixed columns per day-row */}
        <div>
          <Label className="text-sm font-semibold flex items-center gap-2 mb-3">
            <FlaskConical className="h-4 w-4 text-cyan-600" />
            Chlorine PPM (5 checks per day)
          </Label>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {ppmRows.map((row, idx) => (
              <div key={idx} className="space-y-2 p-3 rounded-lg border bg-muted/20">
                <Label className="text-xs font-medium text-muted-foreground">Check #{idx + 1}</Label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  value={row.ppm}
                  onChange={(e) => handlePpmChange(idx, 'ppm', e.target.value)}
                  placeholder={`${PPM_MIN}–${PPM_MAX}`}
                  className={getPpmColor(row.ppm)}
                />
                <Input
                  type="time"
                  value={row.time}
                  onChange={(e) => handlePpmChange(idx, 'time', e.target.value)}
                  className="text-xs"
                  aria-label={`Check ${idx + 1} time (optional)`}
                />
              </div>
            ))}
          </div>
          {filledPpm.length > 0 && (
            <div className="mt-3">
              {ppmAllFilled && ppmAllInRange ? (
                <Badge className="bg-green-100 text-green-700 gap-1"><CheckCircle2 className="h-3 w-3" /> All 5 PPM checks in range</Badge>
              ) : ppmAllFilled ? (
                <Badge className="bg-amber-100 text-amber-800 gap-1"><XCircle className="h-3 w-3" /> One or more PPM checks outside {PPM_MIN}–{PPM_MAX}</Badge>
              ) : (
                <Badge variant="outline">{filledPpm.length} of {PPM_SLOTS} PPM checks entered</Badge>
              )}
            </div>
          )}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!technicianName.trim() || !tempsAllFilled || !ppmAllFilled}
          className="w-full"
        >
          Add Daily Tray Wash Record
        </Button>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
          <span className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded" /> Temp ≥ {MIN_TEMP}°F / PPM in range</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 bg-amber-500 rounded" /> PPM outside {PPM_MIN}–{PPM_MAX}</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500 rounded" /> Temp &lt; {MIN_TEMP}°F</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default TrayWashEntry;
