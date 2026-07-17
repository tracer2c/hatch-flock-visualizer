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
import RecentQAEntries from '@/components/qa-hub/RecentQAEntries';
import ProcessScopedShell from '@/components/qa-hub/shells/ProcessScopedShell';
import FlockScopedShell from '@/components/qa-hub/shells/FlockScopedShell';
import { usePermissions } from '@/hooks/usePermissions';
import { ReadOnlyBanner } from '@/components/ui/read-only-banner';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * QA Hub — reorganized by scope:
 *   • Overview
 *   • 🏭 Machine-Based       (Temperature / Angles / Hatch Progression / Humidity)
 *   • 🧪 Process / Room      (Tray Wash / Rectal Temps)
 *   • 🐣 Flock-Based         (Specific Gravity / Culls)
 */
type Group = 'overview' | 'machine' | 'process' | 'flock';
type MachineSub = 'temps' | 'angles' | 'hatch' | 'humidity';
type Scope = 'single' | 'multi';

const MACHINE_SUB: Record<MachineSub, {
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  hint: string;
  // section ids passed as focusSection to the inner Single/Multi workflows
  single?: string;
  multi?: string;
}> = {
  temps:    { label: 'Temperature',       icon: Thermometer, hint: 'Machine-wide temperatures.',            multi: 'temperatures' },
  angles:   { label: 'Angles',            icon: Ruler,       hint: 'Left / Right side angles.',              multi: 'angles' },
  hatch:    { label: 'Hatch Progression', icon: Timer,       hint: 'Hatcher progression counts.',            single: 'hatch', multi: 'hatch' },
  humidity: { label: 'Humidity',          icon: Droplets,    hint: 'Machine-wide humidity + temp.',          multi: 'humidity' },
};

const QAHubPage: React.FC = () => {
  const { hasWriteAccess } = usePermissions();
  const [searchParams] = useSearchParams();
  const houseIdFromUrl = searchParams.get('houseId');
  const actionFromUrl = searchParams.get('action');

  const [group, setGroup] = useState<Group>('overview');
  const { data: stats } = useQAStats();

  // Deep-link — auto-open Machine → Hatch Progression when a house is passed.
  useEffect(() => {
    if (houseIdFromUrl || actionFromUrl === 'candling') {
      setGroup('machine');
    }
  }, [houseIdFromUrl, actionFromUrl]);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <ReadOnlyBanner show={!hasWriteAccess('qa_hub')} />

      {/* Header */}
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
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-muted/50">
            <Clock className="h-3 w-3 mr-1" />
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </Badge>
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
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" strokeWidth={1.5} />
                Recent QA Entries
              </CardTitle>
              <CardDescription>View and manage recent quality assurance records</CardDescription>
            </CardHeader>
            <CardContent>
              <RecentQAEntries />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="machine" className="space-y-4">
          <MachineGroup
            preSelectedHouseId={houseIdFromUrl}
            preSelectedAction={actionFromUrl}
          />
        </TabsContent>

        <TabsContent value="process" className="space-y-4">
          <ProcessScopedShell />
        </TabsContent>

        <TabsContent value="flock" className="space-y-4">
          <FlockScopedShell />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const MachineGroup: React.FC<{
  preSelectedHouseId?: string | null;
  preSelectedAction?: string | null;
}> = ({ preSelectedHouseId, preSelectedAction }) => {
  // Default sub-tab: hatch (available for both single & multi).
  const initialSub: MachineSub = preSelectedAction === 'candling' || preSelectedHouseId ? 'hatch' : 'temps';
  const [sub, setSub] = useState<MachineSub>(initialSub);
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
            focusSection={meta.single}
          />
        ) : (
          <MultiSetterQAWorkflow focusSection={meta.multi} />
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
