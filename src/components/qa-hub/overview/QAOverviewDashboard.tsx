import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Activity, AlertTriangle, ClipboardCheck, Clock, Factory,
  Thermometer, Ruler, Droplets, Timer, Waves, Scale, Bird, Eye, ChevronRight, CheckCircle2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useQAOverviewData, type QAEntry, type QACheckType, type ComplianceCell } from '@/hooks/useQAOverviewData';
import QAEntryDetailSheet from './QAEntryDetailSheet';

const TYPE_ICON: Record<QACheckType | 'overdue', React.ComponentType<any>> = {
  temperature: Thermometer,
  humidity: Droplets,
  angles: Ruler,
  hatch_progression: Timer,
  tray_wash: Waves,
  rectal_temperature: Thermometer,
  gravity: Scale,
  cull_check: Bird,
  overdue: Clock,
};

interface Props {
  checkDate?: string;
  onJumpTo?: (target: {
    group: 'machine' | 'process' | 'flock';
    sub?: string;
  }) => void;
}

const KpiCard: React.FC<{
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon: React.ComponentType<any>;
  tone?: 'default' | 'critical' | 'warning' | 'success';
}> = ({ label, value, sub, icon: Icon, tone = 'default' }) => {
  const toneCls =
    tone === 'critical' ? 'border-red-300 bg-red-50/60'
    : tone === 'warning' ? 'border-amber-300 bg-amber-50/60'
    : tone === 'success' ? 'border-emerald-300 bg-emerald-50/60'
    : '';
  const iconCls =
    tone === 'critical' ? 'text-red-600 bg-red-100'
    : tone === 'warning' ? 'text-amber-600 bg-amber-100'
    : tone === 'success' ? 'text-emerald-600 bg-emerald-100'
    : 'text-primary bg-primary/10';
  return (
    <Card className={`${toneCls}`}>
      <CardContent className="p-3 flex items-center gap-3">
        <div className={`p-2 rounded-lg ${iconCls}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground truncate">{label}</div>
          <div className="text-xl font-bold leading-tight">{value}</div>
          {sub && <div className="text-[11px] text-muted-foreground truncate">{sub}</div>}
        </div>
      </CardContent>
    </Card>
  );
};

const ComplianceDot: React.FC<{ cell: ComplianceCell; onClick?: () => void }> = ({ cell, onClick }) => {
  const cls =
    cell.status === 'ok' ? 'bg-emerald-500 border-emerald-600'
    : cell.status === 'warn' ? 'bg-amber-500 border-amber-600'
    : 'bg-muted border-border';
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={`h-4 w-4 rounded-full border ${cls} transition-transform hover:scale-125`}
            aria-label={`${cell.label} — ${cell.status}`}
          />
        </TooltipTrigger>
        <TooltipContent side="top">
          <div className="text-xs">
            <div className="font-semibold">{cell.label}</div>
            <div className="text-muted-foreground capitalize">
              {cell.status === 'missing' ? 'Not logged today' : cell.lastValue ?? cell.status}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const QAOverviewDashboard: React.FC<Props> = ({ checkDate, onJumpTo }) => {
  const { data, isLoading } = useQAOverviewData(checkDate);
  const todayStr = new Date().toISOString().split('T')[0];
  const isHistorical = !!checkDate && checkDate !== todayStr;
  const dateLabel = isHistorical
    ? new Date(`${checkDate}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : 'Today';
  const [selected, setSelected] = useState<QAEntry | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const openEntry = (id?: string) => {
    if (!id || !data) return;
    const e = data.recent.find((r) => r.id === id);
    if (e) { setSelected(e); setSheetOpen(true); }
  };

  const jumpTargets = useMemo(() => ([
    { key: 'temperature',        label: 'Log Temp',      group: 'machine' as const, sub: 'temps',    icon: Thermometer },
    { key: 'angles',             label: 'Log Angles',    group: 'machine' as const, sub: 'angles',   icon: Ruler },
    { key: 'humidity',           label: 'Log Humidity',  group: 'machine' as const, sub: 'humidity', icon: Droplets },
    { key: 'hatch_progression',  label: 'Log Hatch',     group: 'machine' as const, sub: 'hatch',    icon: Timer },
    { key: 'tray_wash',          label: 'Tray Wash',     group: 'process' as const, sub: 'wash',     icon: Waves },
    { key: 'rectal_temperature', label: 'Rectal Temps',  group: 'process' as const, sub: 'rectal',   icon: Thermometer },
    { key: 'gravity',            label: 'Gravity',       group: 'flock'   as const, sub: 'gravity',  icon: Scale },
    { key: 'cull_check',         label: 'Culls',         group: 'flock'   as const, sub: 'culls',    icon: Bird },
  ]), []);

  if (isLoading || !data) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[0,1,2,3,4].map((i) => <Skeleton key={i} className="h-16" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Skeleton className="h-96" /><Skeleton className="h-96" /><Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  const { kpis, compliance, attention, recent } = data;

  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-260px)] min-h-[600px]">
      {/* KPI STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 flex-shrink-0">
        <KpiCard label="Today's Checks"    value={kpis.today} icon={ClipboardCheck} />
        <KpiCard label="This Week"         value={kpis.week}  icon={Activity} />
        <KpiCard label="Out of Range (24h)" value={kpis.outOfRange24h} icon={AlertTriangle}
          tone={kpis.outOfRange24h > 0 ? 'critical' : 'success'} />
        <KpiCard label="Overdue Checks"    value={kpis.overdue} icon={Clock}
          tone={kpis.overdue > 0 ? 'warning' : 'success'} />
        <KpiCard label="Machines Active Today"
          value={`${kpis.activeMachinesToday}/${kpis.totalActiveMachines || '—'}`}
          icon={Factory}
          sub="reporting in last 24h" />
      </div>

      {/* 3-COLUMN BODY */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1 min-h-0">
        {/* Compliance */}
        <Card className="flex flex-col min-h-0">
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Today's Compliance
            </CardTitle>
          </CardHeader>
          <ScrollArea className="flex-1">
            <CardContent className="pt-0 space-y-3">
              {compliance.map((row) => {
                const Icon = TYPE_ICON[row.type];
                return (
                  <div key={row.type} className="border rounded-lg p-2.5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-xs font-medium">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        {row.label}
                      </div>
                      <Badge variant="outline" className="text-[10px] h-5">
                        {row.doneCount}/{row.totalCount || '—'}
                      </Badge>
                    </div>
                    {row.cells.length === 0 ? (
                      <div className="text-[11px] text-muted-foreground">No active targets</div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {row.cells.map((c) => (
                          <ComplianceDot key={c.key} cell={c} onClick={() => openEntry(c.entryId)} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </ScrollArea>
        </Card>

        {/* Attention */}
        <Card className="flex flex-col min-h-0">
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" /> Attention Needed
              {attention.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 text-[10px]">{attention.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <ScrollArea className="flex-1">
            <CardContent className="pt-0 space-y-1.5">
              {attention.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                  <div className="text-sm">All clear.</div>
                  <div className="text-xs">No out-of-range readings or overdue checks.</div>
                </div>
              ) : attention.map((item) => {
                const Icon = TYPE_ICON[item.type as any] ?? AlertTriangle;
                const isCrit = item.severity === 'critical';
                return (
                  <button
                    key={item.id}
                    onClick={() => item.entryId && openEntry(item.entryId)}
                    className={`w-full text-left border rounded-md p-2 text-xs flex items-start gap-2 hover:bg-muted/50 transition-colors ${
                      isCrit ? 'border-red-200 bg-red-50/50' : 'border-amber-200 bg-amber-50/50'
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 mt-0.5 ${isCrit ? 'text-red-600' : 'text-amber-600'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{item.target}</div>
                      <div className="text-muted-foreground truncate">{item.reason}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                      </div>
                    </div>
                    {item.entryId && <Eye className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />}
                  </button>
                );
              })}
            </CardContent>
          </ScrollArea>
        </Card>

        {/* Recent Activity */}
        <Card className="flex flex-col min-h-0">
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <ScrollArea className="flex-1">
            <CardContent className="pt-0 space-y-1">
              {recent.length === 0 ? (
                <div className="text-xs text-muted-foreground py-6 text-center">No recent entries.</div>
              ) : recent.map((r) => {
                const cr = typeof r.candling_results === 'string'
                  ? (() => { try { return JSON.parse(r.candling_results); } catch { return null; } })()
                  : r.candling_results;
                const type: QACheckType =
                  cr?.type ?? (cr?.qa_type === 'angles' ? 'angles' : 'temperature');
                const Icon = TYPE_ICON[type] ?? Thermometer;
                const label =
                  r.machine?.machine_number ??
                  (cr?.location ? String(cr.location).replace(/_/g, ' ') : null) ??
                  r.batch?.batch_number ?? '—';
                return (
                  <button
                    key={r.id}
                    onClick={() => { setSelected(r); setSheetOpen(true); }}
                    className="w-full text-left border rounded-md p-2 text-xs flex items-start gap-2 hover:bg-muted/50 transition-colors"
                  >
                    <Icon className="h-3.5 w-3.5 mt-0.5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate capitalize">
                        {String(type).replace(/_/g, ' ')} · {label}
                      </div>
                      <div className="text-muted-foreground truncate">
                        {r.inspector_name ?? '—'} · {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                      </div>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  </button>
                );
              })}
            </CardContent>
          </ScrollArea>
        </Card>
      </div>

      {/* JUMP CHIPS */}
      <div className="flex-shrink-0 border rounded-lg p-2 bg-muted/30">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground pl-1">Jump to entry:</span>
          {jumpTargets.map((t) => {
            const Icon = t.icon;
            return (
              <Button
                key={t.key}
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => onJumpTo?.({ group: t.group, sub: t.sub })}
              >
                <Icon className="h-3 w-3" /> {t.label}
              </Button>
            );
          })}
        </div>
      </div>

      <QAEntryDetailSheet entry={selected} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
};

export default QAOverviewDashboard;
