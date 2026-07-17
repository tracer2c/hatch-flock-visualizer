import React from 'react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, AlertTriangle, Thermometer, Droplets, Ruler, Timer, Waves, Scale, Bird } from 'lucide-react';
import { format } from 'date-fns';
import type { QAEntry, QACheckType } from '@/hooks/useQAOverviewData';

const ICON: Record<string, React.ComponentType<any>> = {
  temperature: Thermometer,
  humidity: Droplets,
  angles: Ruler,
  hatch_progression: Timer,
  tray_wash: Waves,
  rectal_temperature: Thermometer,
  gravity: Scale,
  cull_check: Bird,
};

function parseCR(v: any) {
  if (v == null) return null;
  if (typeof v === 'string') { try { return JSON.parse(v); } catch { return null; } }
  return v;
}

function inferType(entry: QAEntry): QACheckType | null {
  const cr = parseCR(entry.candling_results);
  const t = cr?.type;
  if (t === 'tray_wash' || t === 'rectal_temperature' || t === 'hatch_progression' ||
      t === 'humidity' || t === 'cull_check') return t as QACheckType;
  if (cr?.qa_type === 'angles') return 'angles';
  if (entry.temp_avg_overall != null || cr?.temperatures) return 'temperature';
  return null;
}

const KV: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="space-y-0.5">
    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className="text-sm font-medium">{value ?? '—'}</div>
  </div>
);

const Verdict: React.FC<{ ok: boolean; label?: string }> = ({ ok, label }) => (
  <Badge variant={ok ? 'secondary' : 'destructive'} className="gap-1">
    {ok ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
    {label ?? (ok ? 'In range' : 'Out of range')}
  </Badge>
);

const TypeBody: React.FC<{ entry: QAEntry; type: QACheckType | null }> = ({ entry, type }) => {
  const cr = parseCR(entry.candling_results) ?? {};
  switch (type) {
    case 'temperature': {
      const t = entry.temp_avg_overall ?? entry.temperature;
      const ok = t == null || (t >= 99.5 && t <= 100.5);
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2"><Verdict ok={ok} /> <span className="text-sm text-muted-foreground">Target 99.5–100.5°F</span></div>
          <div className="grid grid-cols-4 gap-2">
            <KV label="Overall" value={<span className="text-lg">{t?.toFixed(1) ?? '—'}°F</span>} />
            <KV label="Front" value={cr.temp_avg_front != null ? `${Number(cr.temp_avg_front).toFixed(1)}°F` : '—'} />
            <KV label="Middle" value={cr.temp_avg_middle != null ? `${Number(cr.temp_avg_middle).toFixed(1)}°F` : '—'} />
            <KV label="Back" value={cr.temp_avg_back != null ? `${Number(cr.temp_avg_back).toFixed(1)}°F` : '—'} />
          </div>
          {cr.temperatures && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Position readings</div>
              <div className="grid grid-cols-6 gap-1 text-xs">
                {Object.entries(cr.temperatures).slice(0, 30).map(([pos, val]) => (
                  <div key={pos} className="border rounded px-1 py-1 text-center">
                    <div className="text-[10px] text-muted-foreground">{pos}</div>
                    <div className="font-mono">{Number(val).toFixed(1)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }
    case 'humidity': {
      const h = entry.humidity;
      const ok = h == null || (h >= 53 && h <= 58);
      return (
        <div className="space-y-3">
          <Verdict ok={ok} />
          <div className="grid grid-cols-2 gap-3">
            <KV label="Humidity" value={<span className="text-lg">{h?.toFixed(1)}%</span>} />
            <KV label="Temperature" value={`${entry.temperature?.toFixed(1) ?? '—'}°F`} />
          </div>
          <div className="text-xs text-muted-foreground">Target 53–58% humidity</div>
        </div>
      );
    }
    case 'angles': {
      const positions = [
        ['angle_top_left', 'Top L'], ['angle_top_right', 'Top R'],
        ['angle_mid_left', 'Mid L'], ['angle_mid_right', 'Mid R'],
        ['angle_bottom_left', 'Bot L'], ['angle_bottom_right', 'Bot R'],
      ] as const;
      return (
        <div className="grid grid-cols-3 gap-2">
          {positions.map(([k, lbl]) => {
            const v = cr[k];
            const ok = typeof v === 'number' && v >= 38 && v <= 47;
            return (
              <div key={k} className={`border rounded p-2 text-center ${typeof v === 'number' ? (ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200') : ''}`}>
                <div className="text-[11px] text-muted-foreground">{lbl}</div>
                <div className="text-lg font-mono">{typeof v === 'number' ? `${v}°` : '—'}</div>
              </div>
            );
          })}
        </div>
      );
    }
    case 'tray_wash': {
      const temps = [
        ['1st Check', cr.firstCheck], ['2nd Check', cr.secondCheck], ['3rd Check', cr.thirdCheck],
      ] as const;
      return (
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">Target: temps ≥ 140°F · chlorine 50–200 PPM</div>
          <div>
            <div className="text-xs font-semibold mb-1">Temperature checks</div>
            <div className="grid grid-cols-3 gap-2">
              {temps.map(([lbl, v]: any) => {
                const ok = typeof v === 'number' && v >= 140;
                return (
                  <div key={lbl} className={`border rounded p-2 text-center ${typeof v === 'number' ? (ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200') : ''}`}>
                    <div className="text-[11px] text-muted-foreground">{lbl}</div>
                    <div className="font-mono">{typeof v === 'number' ? `${v}°F` : '—'}</div>
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold mb-1">PPM checks</div>
            <div className="grid grid-cols-5 gap-2">
              {[1,2,3,4,5].map((i) => {
                const v = cr[`ppm_check_${i}`];
                const t = cr[`ppm_check_${i}_time`];
                const ok = typeof v === 'number' && v >= 50 && v <= 200;
                return (
                  <div key={i} className={`border rounded p-2 text-center ${typeof v === 'number' ? (ok ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200') : ''}`}>
                    <div className="text-[11px] text-muted-foreground">#{i}{t ? ` · ${t}` : ''}</div>
                    <div className="font-mono">{typeof v === 'number' ? v : '—'}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }
    case 'rectal_temperature': {
      const loc = cr.location;
      const min = loc === 'chick_room' ? 103 : 104;
      const max = loc === 'chick_room' ? 105 : 106;
      const t = cr.temperature ?? entry.temperature;
      const ok = t == null || (t >= min && t <= max);
      return (
        <div className="space-y-3">
          <Verdict ok={ok} label={ok ? `In range (${min}–${max}°F)` : `Outside ${min}–${max}°F`} />
          <div className="grid grid-cols-2 gap-3">
            <KV label="Location" value={<span className="capitalize">{String(loc ?? '—').replace(/_/g,' ')}</span>} />
            <KV label="Reading" value={<span className="text-lg">{t?.toFixed(1)}°F</span>} />
          </div>
        </div>
      );
    }
    case 'hatch_progression':
      return (
        <div className="grid grid-cols-2 gap-3">
          <KV label="Stage" value={cr.stage ?? '—'} />
          <KV label="% Out" value={`${cr.percentageOut ?? '—'}%`} />
          <KV label="Hatched" value={cr.hatchedCount ?? '—'} />
          <KV label="Total" value={cr.totalCount ?? '—'} />
          <KV label="Check Hour" value={cr.checkHour ?? '—'} />
        </div>
      );
    case 'cull_check':
      return (
        <div className="grid grid-cols-2 gap-3">
          <KV label="Male culls" value={cr.maleCount ?? 0} />
          <KV label="Female culls" value={cr.femaleCount ?? 0} />
          <KV label="Defect" value={<span className="capitalize">{String(cr.defectType ?? 'none')}</span>} />
          <KV label="Total" value={(cr.maleCount ?? 0) + (cr.femaleCount ?? 0)} />
        </div>
      );
    default:
      return (
        <div className="text-sm text-muted-foreground">
          No structured breakdown available for this entry type.
          <pre className="text-xs mt-2 bg-muted p-2 rounded overflow-auto max-h-48">{JSON.stringify(cr, null, 2)}</pre>
        </div>
      );
  }
};

const QAEntryDetailSheet: React.FC<{
  entry: QAEntry | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}> = ({ entry, open, onOpenChange }) => {
  if (!entry) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-lg" />
      </Sheet>
    );
  }
  const type = inferType(entry);
  const Icon = type ? ICON[type] : Thermometer;
  const typeLabel = type ? type.replace(/_/g, ' ') : 'Entry';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg w-full flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 capitalize">
            <Icon className="h-5 w-5 text-primary" />
            {typeLabel}
          </SheetTitle>
          <SheetDescription>
            {format(new Date(entry.check_date + 'T00:00:00'), 'MMM d, yyyy')}
            {entry.check_time ? ` · ${entry.check_time.slice(0,5)}` : ''}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6 mt-4">
          <div className="space-y-5 pb-8">
            <div className="grid grid-cols-2 gap-3">
              <KV label="Machine" value={entry.machine?.machine_number} />
              <KV label="House" value={entry.batch?.batch_number} />
              <KV label="Flock" value={entry.batch?.flock?.flock_name} />
              <KV label="Inspector" value={entry.inspector_name} />
              <KV label="Day of Incubation" value={entry.day_of_incubation ?? '—'} />
              <KV label="Entry Mode" value={<span className="capitalize">{entry.entry_mode ?? '—'}</span>} />
            </div>
            <Separator />
            <TypeBody entry={entry} type={type} />
            {entry.notes && (
              <>
                <Separator />
                <KV label="Notes" value={<span className="whitespace-pre-wrap">{entry.notes}</span>} />
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default QAEntryDetailSheet;
