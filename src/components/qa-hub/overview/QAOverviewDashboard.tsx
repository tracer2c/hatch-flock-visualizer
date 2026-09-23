import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { AlertTriangle, ArrowRight, Check, CircleDashed, Gauge, MoveHorizontal, Thermometer, Timer, Waves } from 'lucide-react';
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useQAOverviewData, type QAEntry } from '@/hooks/useQAOverviewData';
import QAEntryDetailSheet from './QAEntryDetailSheet';

interface Props {
  checkDate?: string;
  unitId?: string;
  onJumpTo?: (target: { group: 'machine' | 'process' | 'flock'; sub?: string }) => void;
}

const chartConfig = {
  eggshell: { label: 'Eggshell °F', color: 'hsl(var(--chart-1))' },
  rectal: { label: 'Rectal °F', color: 'hsl(var(--chart-3))' },
  trayWash: { label: 'Tray wash °F', color: 'hsl(var(--chart-2))' },
  leftAngle: { label: 'Left angle °', color: 'hsl(var(--chart-4))' },
  rightAngle: { label: 'Right angle °', color: 'hsl(var(--chart-5))' },
} satisfies ChartConfig;

const fmt = (value: number | null, suffix = '') => value == null ? '—' : `${value.toFixed(1)}${suffix}`;

const MetricCard = ({ title, value, detail, footer, icon: Icon }: { title: string; value: string; detail: string; footer: string; icon: React.ComponentType<any> }) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
        </div>
        <div className="rounded-md bg-primary/10 p-2 text-primary"><Icon className="h-4 w-4" /></div>
      </div>
      <p className="mt-3 text-xs font-medium">{detail}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{footer}</p>
    </CardContent>
  </Card>
);

const QAOverviewDashboard: React.FC<Props> = ({ checkDate, unitId, onJumpTo }) => {
  const { data, isLoading } = useQAOverviewData(checkDate, unitId);
  const [selected, setSelected] = useState<QAEntry | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  if (isLoading || !data) return <div className="space-y-4"><Skeleton className="h-56" /><div className="grid gap-3 md:grid-cols-5">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-32" />)}</div><Skeleton className="h-80" /></div>;

  const openEntry = (id?: string) => {
    const entry = data.entries.find((row) => row.id === id);
    if (!entry) return;
    setSelected(entry);
    setSheetOpen(true);
  };
  const weekLabel = `${format(parseISO(data.weekStart), 'MMM d')}–${format(parseISO(data.weekEnd), 'MMM d, yyyy')}`;
  const { rectal, trayWash, eggshell, angles, completion } = data.metrics;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 border-b pb-3">
        <div>
          <p className="text-sm font-semibold">Weekly QA dashboard</p>
          <p className="text-xs text-muted-foreground">{weekLabel} · values include only this hatchery</p>
        </div>
        <Badge variant="outline" className="tabular-nums">{completion.done}/{completion.expected} checks</Badge>
      </div>

      <Card className="overflow-hidden border-primary/25">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 bg-primary/5 pb-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base"><Timer className="h-4 w-4 text-primary" /> Hatch Progression</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Latest weekly reading for each active hatcher</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => onJumpTo?.({ group: 'machine', sub: 'hatch' })}>Log hatch <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button>
        </CardHeader>
        <CardContent className="p-0">
          {data.hatchProgress.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">No hatch progression entered for this week.</div>
          ) : (
            <div className="grid divide-y md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-4">
              {data.hatchProgress.map((row) => (
                <button key={row.machineId} onClick={() => openEntry(row.entryId)} className="p-4 text-left transition-colors hover:bg-muted/40">
                  <div className="flex items-center justify-between gap-2"><span className="font-semibold">{row.machineLabel}</span><Badge variant={row.stale ? 'secondary' : 'outline'}>Stage {row.stage}</Badge></div>
                  <div className="mt-3 flex items-end justify-between"><span className="text-2xl font-semibold tabular-nums">{row.percentage.toFixed(1)}%</span><span className="text-xs text-muted-foreground">{row.hatched.toLocaleString()} / {row.total.toLocaleString()}</span></div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${Math.min(row.percentage, 100)}%` }} /></div>
                  <p className="mt-2 text-[11px] text-muted-foreground">{row.stale ? 'Update due' : 'Current'} · {format(new Date(row.checkedAt), 'EEE h:mm a')}</p>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard title="Rectal temperature" value={fmt(rectal.value, '°F')} detail={`${rectal.inRange}/${rectal.total || 0} readings in range`} footer={`${rectal.count} checks · room targets applied`} icon={Thermometer} />
        <MetricCard title="Tray wash" value={fmt(trayWash.value, '°F')} detail={`${trayWash.ppmInRange}/${trayWash.ppmTotal || 0} Quat checks in range`} footer={`${trayWash.completedDays}/7 days logged · target ≥140°F`} icon={Waves} />
        <MetricCard title="Eggshell temperature" value={fmt(eggshell.value, '°F')} detail={`Front ${fmt(eggshell.front)} · Mid ${fmt(eggshell.middle)} · Back ${fmt(eggshell.back)}`} footer={`${eggshell.count} checks · target 99.5–100.5°F`} icon={Thermometer} />
        <MetricCard title="Setter angles" value={`${fmt(angles.left, '°')} / ${fmt(angles.right, '°')}`} detail="Left / Right weekly average" footer={`${angles.count} checks · ${angles.outOfRange} outside range`} icon={MoveHorizontal} />
        <MetricCard title="Overall QA completion" value={`${completion.percentage.toFixed(0)}%`} detail={`${completion.done} of ${completion.expected} expected checks`} footer="Through today in the selected week" icon={Gauge} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.75fr)]">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Seven-day QA trends</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[260px] w-full aspect-auto">
              <LineChart data={data.trend} margin={{ left: 0, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={34} domain={['auto', 'auto']} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="eggshell" stroke="var(--color-eggshell)" strokeWidth={2} connectNulls dot={{ r: 3 }} />
                <Line type="monotone" dataKey="rectal" stroke="var(--color-rectal)" strokeWidth={2} connectNulls dot={{ r: 3 }} />
                <Line type="monotone" dataKey="trayWash" stroke="var(--color-trayWash)" strokeWidth={2} connectNulls dot={{ r: 3 }} />
                <Line type="monotone" dataKey="leftAngle" stroke="var(--color-leftAngle)" strokeWidth={2} connectNulls dot={{ r: 3 }} />
                <Line type="monotone" dataKey="rightAngle" stroke="var(--color-rightAngle)" strokeWidth={2} connectNulls dot={{ r: 3 }} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="min-h-[320px]">
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><AlertTriangle className="h-4 w-4 text-destructive" /> Attention needed <Badge variant="secondary">{data.attention.length}</Badge></CardTitle></CardHeader>
          <ScrollArea className="h-[265px]">
            <CardContent className="space-y-2 pt-0">
              {data.attention.length === 0 ? <div className="flex h-44 flex-col items-center justify-center gap-2 text-sm text-muted-foreground"><Check className="h-6 w-6 text-success" />No exceptions this week.</div> : data.attention.map((item) => (
                <button key={item.id} onClick={() => openEntry(item.entryId)} className="w-full rounded-md border p-2.5 text-left hover:bg-muted/50">
                  <p className="text-xs font-semibold capitalize">{item.target}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{item.reason}</p>
                </button>
              ))}
            </CardContent>
          </ScrollArea>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Weekly QA coverage</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-xs">
            <thead><tr className="border-b text-left text-muted-foreground"><th className="py-2 font-medium">Day</th>{['Hatch progression', 'Eggshell temp', 'Setter angles', 'Rectal temp', 'Tray wash'].map((label) => <th key={label} className="px-2 py-2 text-center font-medium">{label}</th>)}</tr></thead>
            <tbody>{data.coverage.map((day) => <tr key={day.date} className="border-b last:border-0"><td className="py-3 font-medium">{day.day} <span className="ml-1 text-muted-foreground">{format(parseISO(day.date), 'M/d')}</span></td>{(['hatch', 'temperature', 'angles', 'rectal', 'trayWash'] as const).map((key) => { const cell = day.values[key]; const complete = cell.expected > 0 && cell.done >= cell.expected; return <td key={key} className="px-2 py-3 text-center"><span className={`inline-flex items-center gap-1 rounded px-2 py-1 ${day.isFuture ? 'text-muted-foreground' : complete ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning-foreground'}`}>{day.isFuture ? <CircleDashed className="h-3 w-3" /> : complete ? <Check className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}{cell.done}/{cell.expected}</span></td>; })}</tr>)}</tbody>
          </table>
        </CardContent>
      </Card>

      <QAEntryDetailSheet entry={selected} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
};

export default QAOverviewDashboard;