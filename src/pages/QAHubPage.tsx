import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Thermometer,
  Clock,
  ClipboardCheck,
  Ruler,
  Droplets,
  Timer,
  Factory,
  FlaskConical,
  Bird,
  Info,
} from 'lucide-react';
import { useQAStats } from '@/hooks/useQAHubData';
import SingleSetterQAWorkflow from '@/components/qa-hub/SingleSetterQAWorkflow';
import MultiSetterQAWorkflow from '@/components/qa-hub/MultiSetterQAWorkflow';
import ProcessScopedShell from '@/components/qa-hub/shells/ProcessScopedShell';
import FlockScopedShell from '@/components/qa-hub/shells/FlockScopedShell';
import QAOverviewDashboard from '@/components/qa-hub/overview/QAOverviewDashboard';
import { usePermissions } from '@/hooks/usePermissions';
import { ReadOnlyBanner } from '@/components/ui/read-only-banner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DayPickerCard } from '@/components/uui/DayPickerCard';
import { format, parseISO } from 'date-fns';

/**
 * QA Hub — reorganized by scope:
 *   • Overview
 *   • 🏭 Machine-Based       (Temperature / Angles / Hatch Progression / Humidity)
 *   • 🧪 Process / Room      (Tray Wash / Rectal Temps)
 *   • 🐣 Flock-Based         (Specific Gravity / Culls)
 */
type Group = 'overview' | 'machine' | 'process' | 'flock';
type MachineSub = 'temps' | 'angles' | 'hatch';
type Scope = 'single' | 'multi';

const MACHINE_SUB: Record<MachineSub, {
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  hint: string;
  single?: string;
  multi?: string;
}> = {
  temps:    { label: 'Temperature',       icon: Thermometer, hint: 'Machine-wide temperatures.', multi: 'temperatures' },
  angles:   { label: 'Angles',            icon: Ruler,       hint: 'Left / Right side angles.',   multi: 'angles' },
  hatch:    { label: 'Hatch Progression', icon: Timer,       hint: 'Hatcher progression counts.', single: 'hatch', multi: 'hatch' },
};

const QAHubPage: React.FC = () => {
  const { hasWriteAccess } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const houseIdFromUrl = searchParams.get('houseId');
  const actionFromUrl = searchParams.get('action');
  const dateFromUrl = searchParams.get('date');
  const groupFromUrl = searchParams.get('group') as Group | null;
  const subFromUrl = searchParams.get('sub');

  const todayStr = new Date().toISOString().split('T')[0];
  const [group, setGroup] = useState<Group>(groupFromUrl || 'overview');
  const [machineSub, setMachineSub] = useState<MachineSub>('temps');
  const [processTab, setProcessTab] = useState<'wash' | 'rectal' | 'humidity'>(
    (subFromUrl === 'wash' || subFromUrl === 'rectal' || subFromUrl === 'humidity') ? subFromUrl : 'wash'
  );
  const [flockTab, setFlockTab] = useState<'gravity' | 'culls'>('gravity');
  const [checkDate, setCheckDate] = useState<string>(dateFromUrl || todayStr);
  const { data: stats } = useQAStats();

  // Persist date in URL for return-context flows
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (checkDate && checkDate !== todayStr) next.set('date', checkDate);
    else next.delete('date');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkDate]);

  const handleJumpTo = ({ group: g, sub }: { group: 'machine' | 'process' | 'flock'; sub?: string }) => {
    setGroup(g);
    if (g === 'machine' && sub) setMachineSub(sub as MachineSub);
    if (g === 'process' && sub) setProcessTab(sub as 'wash' | 'rectal' | 'humidity');
    if (g === 'flock' && sub) setFlockTab(sub as 'gravity' | 'culls');
  };

  useEffect(() => {
    if (houseIdFromUrl || actionFromUrl === 'candling') {
      setGroup('machine');
    }
  }, [houseIdFromUrl, actionFromUrl]);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <ReadOnlyBanner show={!hasWriteAccess('qa_hub')} />

      {/* Header with unified date + technician */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <ClipboardCheck className="h-6 w-6 text-primary" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Quality Assurance Hub</h1>
            <p className="text-muted-foreground">
              Pick a scope — Machine, Process, or Flock — then log your check.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DayPickerCard
            value={checkDate ? parseISO(checkDate) : new Date()}
            onChange={(d) => setCheckDate(format(d, 'yyyy-MM-dd'))}
            maxDate={new Date()}
          />
          {stats && (
            <Badge variant="secondary">
              Today: {stats.today} | Week: {stats.thisWeek}
            </Badge>
          )}
        </div>
      </div>

      {/* Top-level scope tabs */}
      <Tabs value={group} onValueChange={(v) => setGroup(v as Group)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto gap-1">
          <TabsTrigger value="overview" className="gap-1.5 py-2">
            <ClipboardCheck className="h-4 w-4" /> Overview
          </TabsTrigger>
          <TabsTrigger value="machine" className="gap-1.5 py-2">
            <Factory className="h-4 w-4" /> Machine-Based
          </TabsTrigger>
          <TabsTrigger value="process" className="gap-1.5 py-2">
            <FlaskConical className="h-4 w-4" /> Process / Room
          </TabsTrigger>
          <TabsTrigger value="flock" className="gap-1.5 py-2">
            <Bird className="h-4 w-4" /> Flock-Based
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <QAOverviewDashboard checkDate={checkDate} onJumpTo={handleJumpTo} />
        </TabsContent>

        <TabsContent value="machine" className="space-y-4">
          <MachineGroup
            preSelectedHouseId={houseIdFromUrl}
            preSelectedAction={actionFromUrl}
            checkDate={checkDate}
            onCheckDateChange={setCheckDate}
            sub={machineSub}
            onSubChange={setMachineSub}
          />
        </TabsContent>

        <TabsContent value="process" className="space-y-4">
          <ProcessScopedShell key={processTab} initialTab={processTab} checkDate={checkDate} />
        </TabsContent>

        <TabsContent value="flock" className="space-y-4">
          <FlockScopedShell key={flockTab} initialTab={flockTab} checkDate={checkDate} onCheckDateChange={setCheckDate} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const MachineGroup: React.FC<{
  preSelectedHouseId?: string | null;
  preSelectedAction?: string | null;
  checkDate: string;
  onCheckDateChange: (date: string) => void;
  sub?: MachineSub;
  onSubChange?: (s: MachineSub) => void;
}> = ({ preSelectedHouseId, preSelectedAction, checkDate, onCheckDateChange, sub: controlledSub, onSubChange }) => {
  // Default sub-tab: hatch (available for both single & multi).
  const initialSub: MachineSub = preSelectedAction === 'candling' || preSelectedHouseId ? 'hatch' : 'temps';
  const [uncontrolledSub, setUncontrolledSub] = useState<MachineSub>(initialSub);
  const sub = controlledSub ?? uncontrolledSub;
  const setSub = (s: MachineSub) => { onSubChange ? onSubChange(s) : setUncontrolledSub(s); };
  const [scope, setScope] = useState<Scope>('multi'); // most machine-wide checks are multi

  const meta = MACHINE_SUB[sub];
  const Icon = meta.icon;
  const scopeAvailable = scope === 'single' ? !!meta.single : !!meta.multi;

  // When switching sub-tab, snap scope to whatever's available.
  useEffect(() => {
    if (!MACHINE_SUB[sub][scope]) {
      if (MACHINE_SUB[sub].multi) setScope('multi');
      else if (MACHINE_SUB[sub].single) setScope('single');
    }
  }, [sub]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      {/* Sub-tab bar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Factory className="h-5 w-5 text-primary" strokeWidth={1.5} />
              </div>
              <div>
                <CardTitle className="text-lg">Machine-Based QA</CardTitle>
                <CardDescription>
                  Choose a check, then pick a hatchery and machine below.
                </CardDescription>
              </div>
            </div>

            {/* Scope toggle only when both single & multi exist */}
            {MACHINE_SUB[sub].single && MACHINE_SUB[sub].multi && (
              <Tabs value={scope} onValueChange={(v) => setScope(v as Scope)}>
                <TabsList>
                  <TabsTrigger value="single" className="text-xs">Single Stage</TabsTrigger>
                  <TabsTrigger value="multi" className="text-xs">Multi Stage</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Tabs value={sub} onValueChange={(v) => setSub(v as MachineSub)}>
            <TabsList className="flex-wrap h-auto">
              {(Object.keys(MACHINE_SUB) as MachineSub[]).map((k) => {
                const I = MACHINE_SUB[k].icon;
                return (
                  <TabsTrigger key={k} value={k} className="gap-1 text-xs">
                    <I className="h-3.5 w-3.5" />
                    {MACHINE_SUB[k].label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
            <Icon className="h-3 w-3" /> {meta.hint}
          </p>
        </CardContent>
      </Card>

      {/* Inner workflow */}
      {scopeAvailable ? (
        scope === 'single' ? (
          <SingleSetterQAWorkflow
            preSelectedHouseId={preSelectedHouseId ?? null}
            preSelectedAction={preSelectedAction ?? null}
            checkDate={checkDate}
            onCheckDateChange={onCheckDateChange}
            focusSection={meta.single}
          />
        ) : (
          <MultiSetterQAWorkflow focusSection={meta.multi} checkDate={checkDate} onCheckDateChange={onCheckDateChange} />
        )
      ) : (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            {meta.label} is only available on {meta.multi ? 'multi-stage' : 'single-stage'} setters.
            Switch scope above.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default QAHubPage;
