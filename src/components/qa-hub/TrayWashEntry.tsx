import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Droplets, CheckCircle2, XCircle, FlaskConical, Clock, Eye, CalendarIcon } from "lucide-react";
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import TodaysEntriesList from './TodaysEntriesList';

export interface PpmCheck {
  ppm: number | null;
  time: string; // HH:MM, optional
}

export interface TrayWashSubmitData {
  existingId?: string | null;
  firstCheck: number | null;
  secondCheck: number | null;
  thirdCheck: number | null;
  ppmChecks: PpmCheck[]; // exactly 5 entries
  washDate: string;
}

interface TrayWashEntryProps {
  technicianName: string;
  checkDate: string;
  /** Existing today's row (from useTodaysTrayWash). Used to pre-populate the form. */
  existingRow?: {
    id: string;
    candling_results: any;
    check_time?: string | null;
  } | null;
  /** True when checkDate is in the past — the whole card renders read-only. */
  readOnly?: boolean;
  loadingExisting?: boolean;
  onSubmit: (data: TrayWashSubmitData) => void;
}

const MIN_TEMP = 140;   // Minimum sanitization temperature (°F)
const PPM_MIN = 800;    // Acceptable Quat PPM lower bound
const PPM_MAX = 1000;   // Acceptable Quat PPM upper bound
const PPM_SLOTS = 5;

// Current local time as HH:MM
const nowHHMM = () => {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

const numToStr = (v: any) =>
  v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? '' : String(v);

const TrayWashEntry: React.FC<TrayWashEntryProps> = ({
  technicianName,
  checkDate,
  existingRow,
  readOnly = false,
  loadingExisting = false,
  onSubmit,
}) => {
  const [firstCheck, setFirstCheck] = useState('');
  const [secondCheck, setSecondCheck] = useState('');
  const [thirdCheck, setThirdCheck] = useState('');
  const [ppmRows, setPpmRows] = useState<{ ppm: string; time: string }[]>(
    Array.from({ length: PPM_SLOTS }, () => ({ ppm: '', time: '' }))
  );
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [entryDate, setEntryDate] = useState<string>(checkDate);

  useEffect(() => { setEntryDate(checkDate); }, [checkDate]);

  // Load from an existing today's row (resume) — or reset when the row/date changes.
  useEffect(() => {
    const cr = existingRow?.candling_results;
    if (cr && cr.type === 'tray_wash') {
      setFirstCheck(numToStr(cr.firstCheck));
      setSecondCheck(numToStr(cr.secondCheck));
      setThirdCheck(numToStr(cr.thirdCheck));
      setPpmRows(
        Array.from({ length: PPM_SLOTS }, (_, i) => ({
          ppm: numToStr(cr[`ppm_check_${i + 1}`]),
          time: cr[`ppm_check_${i + 1}_time`] || '',
        }))
      );
      setLastSavedAt(existingRow?.check_time || null);
    } else {
      setFirstCheck('');
      setSecondCheck('');
      setThirdCheck('');
      setPpmRows(Array.from({ length: PPM_SLOTS }, () => ({ ppm: '', time: '' })));
      setLastSavedAt(null);
    }
  }, [existingRow, checkDate]);

  const first = parseFloat(firstCheck);
  const second = parseFloat(secondCheck);
  const third = parseFloat(thirdCheck);

  const tempsAllPassed = first >= MIN_TEMP && second >= MIN_TEMP && third >= MIN_TEMP;
  const tempsAllFilled = firstCheck !== '' && secondCheck !== '' && thirdCheck !== '';

  const filledPpm = ppmRows.filter((r) => r.ppm !== '');
  const ppmAllFilled = filledPpm.length === PPM_SLOTS;
  const ppmAllInRange = filledPpm.every((r) => {
    const v = parseFloat(r.ppm);
    return Number.isFinite(v) && v >= PPM_MIN && v <= PPM_MAX;
  });

  const anyDataEntered = useMemo(
    () => tempsAllFilled || firstCheck !== '' || secondCheck !== '' || thirdCheck !== '' || filledPpm.length > 0,
    [firstCheck, secondCheck, thirdCheck, filledPpm.length, tempsAllFilled]
  );

  const handlePpmChange = (idx: number, field: 'ppm' | 'time', value: string) => {
    setPpmRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  };

  const handlePpmValueBlurAutofillTime = (idx: number) => {
    setPpmRows((prev) =>
      prev.map((r, i) => (i === idx && r.ppm !== '' && !r.time ? { ...r, time: nowHHMM() } : r))
    );
  };

  const handleTimeFocus = (idx: number) => {
    setPpmRows((prev) =>
      prev.map((r, i) => (i === idx && !r.time ? { ...r, time: nowHHMM() } : r))
    );
  };

  const handleSubmit = () => {
    if (readOnly) return;
    if (!technicianName.trim()) {
      toast.error('Enter a technician name first.');
      return;
    }
    if (!anyDataEntered) {
      toast.error('Enter at least one temperature or PPM check before saving.');
      return;
    }

    const ppmChecks: PpmCheck[] = ppmRows.map((r) => ({
      ppm: r.ppm === '' ? null : parseFloat(r.ppm),
      time: r.time || '',
    }));

    onSubmit({
      existingId: existingRow?.id ?? null,
      firstCheck: firstCheck === '' ? null : first,
      secondCheck: secondCheck === '' ? null : second,
      thirdCheck: thirdCheck === '' ? null : third,
      ppmChecks,
      washDate: entryDate,
    });
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

  const submitLabel = readOnly
    ? 'Read-only (historical entry)'
    : existingRow
    ? 'Save Progress'
    : ppmAllFilled && tempsAllFilled
    ? 'Save Daily Tray Wash Record'
    : 'Save Progress';

  const inputDisabled = readOnly || loadingExisting;

  const prettyDate = (() => {
    try {
      return format(new Date(checkDate + 'T00:00:00'), 'MMM d, yyyy');
    } catch {
      return checkDate;
    }
  })();

  const parsedEntryDate = (() => {
    try { return parseISO(entryDate); } catch { return new Date(); }
  })();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Droplets className="h-5 w-5 text-blue-500" />
          Tray Wash — Daily Log
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          One entry per day. Temps ≥ {MIN_TEMP}°F, Quat PPM {PPM_MIN}–{PPM_MAX} across 5 checks.
          {existingRow && !readOnly && (
            <> · <span className="text-green-700 font-medium">Resuming today's log</span>
              {lastSavedAt ? ` — last saved ${lastSavedAt.slice(0, 5)}` : ''}
            </>
          )}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {readOnly && (
          <Alert className="border-amber-200 bg-amber-50">
            <Eye className="h-4 w-4 text-amber-700" />
            <AlertDescription className="text-amber-800">
              Viewing {prettyDate} — read-only. Switch the date to today to edit.
            </AlertDescription>
          </Alert>
        )}

        {/* Check date */}
        <div className="max-w-xs">
          <Label className="text-sm font-semibold flex items-center gap-2 mb-2">
            <CalendarIcon className="h-4 w-4 text-primary" />
            Check Date
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                disabled={inputDisabled}
                className={cn("w-full justify-start text-left font-normal", !entryDate && "text-muted-foreground")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {entryDate ? format(parsedEntryDate, "MMM d, yyyy") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={parsedEntryDate}
                onSelect={(d) => d && setEntryDate(format(d, 'yyyy-MM-dd'))}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Temperature checks */}
        <div>
          <Label className="text-sm font-semibold flex items-center gap-2 mb-3">
            <Droplets className="h-4 w-4 text-blue-500" />
            Wash Temperature (3 checks)
          </Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>1st Check (°F)</Label>
              <Input type="number" step="0.1" value={firstCheck} disabled={inputDisabled} onChange={(e) => setFirstCheck(e.target.value)} placeholder={`≥ ${MIN_TEMP}`} className={getTempColor(firstCheck)} />
            </div>
            <div className="space-y-2">
              <Label>2nd Check (°F)</Label>
              <Input type="number" step="0.1" value={secondCheck} disabled={inputDisabled} onChange={(e) => setSecondCheck(e.target.value)} placeholder={`≥ ${MIN_TEMP}`} className={getTempColor(secondCheck)} />
            </div>
            <div className="space-y-2">
              <Label>3rd Check (°F)</Label>
              <Input type="number" step="0.1" value={thirdCheck} disabled={inputDisabled} onChange={(e) => setThirdCheck(e.target.value)} placeholder={`≥ ${MIN_TEMP}`} className={getTempColor(thirdCheck)} />
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

        {/* Quat PPM checks — 5 fixed columns per day-row */}
        <div>
          <Label className="text-sm font-semibold flex items-center gap-2 mb-3">
            <FlaskConical className="h-4 w-4 text-cyan-600" />
            Quat PPM (5 checks per day)
          </Label>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {ppmRows.map((row, idx) => (
              <div key={idx} className="space-y-2 p-3 rounded-lg border bg-muted/20">
                <Label className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                  <span>Check #{idx + 1}</span>
                  {row.ppm !== '' && row.time && (
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {row.time}
                    </span>
                  )}
                </Label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  value={row.ppm}
                  disabled={inputDisabled}
                  onChange={(e) => handlePpmChange(idx, 'ppm', e.target.value)}
                  onBlur={() => handlePpmValueBlurAutofillTime(idx)}
                  placeholder={`${PPM_MIN}–${PPM_MAX}`}
                  className={getPpmColor(row.ppm)}
                />
                <Input
                  type="time"
                  value={row.time}
                  disabled={inputDisabled}
                  onFocus={() => handleTimeFocus(idx)}
                  onChange={(e) => handlePpmChange(idx, 'time', e.target.value)}
                  className="text-xs"
                  aria-label={`Check ${idx + 1} time (defaults to now)`}
                />
              </div>
            ))}
          </div>
          {filledPpm.length > 0 && (
            <div className="mt-3">
              {ppmAllFilled && ppmAllInRange ? (
                <Badge className="bg-green-100 text-green-700 gap-1"><CheckCircle2 className="h-3 w-3" /> All 5 Quat PPM checks in range</Badge>
              ) : ppmAllFilled ? (
                <Badge className="bg-amber-100 text-amber-800 gap-1"><XCircle className="h-3 w-3" /> One or more Quat PPM checks outside {PPM_MIN}–{PPM_MAX}</Badge>
              ) : (
                <Badge variant="outline">{filledPpm.length} of {PPM_SLOTS} Quat PPM checks entered</Badge>
              )}
            </div>
          )}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={readOnly || loadingExisting || !technicianName.trim() || !anyDataEntered}
          className="w-full"
        >
          {submitLabel}
        </Button>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
          <span className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded" /> Temp ≥ {MIN_TEMP}°F / Quat PPM in range</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 bg-amber-500 rounded" /> Quat PPM outside {PPM_MIN}–{PPM_MAX}</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500 rounded" /> Temp &lt; {MIN_TEMP}°F</span>
        </div>

        {/* Recent tray wash logs */}
        <TodaysEntriesList
          machineId={null}
          checkDate={checkDate}
          type="tray_wash"
          entryMode="room"
          isPastDay={false}
          title="Recent tray wash logs"
          emptyLabel="No tray wash logs saved yet."
          renderSummary={(e) => {
            const cr = e.candling_results || {};
            const temps = [cr.firstCheck, cr.secondCheck, cr.thirdCheck].filter(
              (v: any) => typeof v === 'number'
            );
            const avg = temps.length ? temps.reduce((a: number, b: number) => a + b, 0) / temps.length : null;
            const ppmCount = [1, 2, 3, 4, 5].filter((i) => typeof cr[`ppm_check_${i}`] === 'number').length;
            return (
              <span>
                {avg !== null && <>Avg temp <span className="font-medium">{avg.toFixed(1)}°F</span></>}
                {avg !== null && ' · '}
                <span>{ppmCount}/5 Quat PPM</span>
              </span>
            );
          }}
        />
      </CardContent>
    </Card>
  );
};

export default TrayWashEntry;
