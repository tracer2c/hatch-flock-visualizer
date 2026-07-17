import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Thermometer,
  Clock,
  ClipboardCheck,
  Ruler,
  Droplets,
  AlertTriangle,
  Scale,
  Timer,
  Waves,
  Info,
} from "lucide-react";
import { useQAStats } from '@/hooks/useQAHubData';
import SingleSetterQAWorkflow from '@/components/qa-hub/SingleSetterQAWorkflow';
import MultiSetterQAWorkflow from '@/components/qa-hub/MultiSetterQAWorkflow';
import RecentQAEntries from '@/components/qa-hub/RecentQAEntries';
import RoomHumidityEntry from '@/components/qa-hub/RoomHumidityEntry';
import { usePermissions } from "@/hooks/usePermissions";
import { ReadOnlyBanner } from "@/components/ui/read-only-banner";
import { Alert, AlertDescription } from "@/components/ui/alert";

type QAType =
  | 'overview'
  | 'temps'
  | 'angles'
  | 'humidity'
  | 'rectal'
  | 'wash'
  | 'culls'
  | 'gravity'
  | 'hatch';

type Scope = 'single' | 'multi';

// Map (type, scope) → focusSection value each workflow understands.
const SECTION_MAP: Record<QAType, { single?: string; multi?: string }> = {
  overview: {},
  temps:    { multi: 'temperatures' },
  angles:   { multi: 'angles' },
  humidity: {}, // room-scoped, rendered directly
  rectal:   { single: 'rectal-temps', multi: 'rectal' },
  wash:     { single: 'tray-wash',    multi: 'wash' },
  culls:    { single: 'culls',        multi: 'culls' },
  gravity:  { single: 'gravity',      multi: 'gravity' },
  hatch:    { single: 'hatch',        multi: 'hatch' },
};

const TYPE_META: Record<Exclude<QAType, 'overview'>, {
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  hint: string;
}> = {
  temps:    { label: 'Temps',           icon: Thermometer,     hint: 'Machine-specific — pick a setter or hatcher.' },
  angles:   { label: 'Angles',          icon: Ruler,           hint: 'Machine-specific — Left / Right side only.' },
  humidity: { label: 'Humidity',        icon: Droplets,        hint: 'Room-level — pick a room (setter / hatcher / chick).' },
  rectal:   { label: 'Rectal Temps',    icon: Thermometer,     hint: 'Process-level (hatcher / chick room / separator).' },
  wash:     { label: 'Tray Wash',       icon: Waves,           hint: 'Process-level — temperature + 5 PPM checks/day.' },
  culls:    { label: 'Culls',           icon: AlertTriangle,   hint: 'Flock / house level.' },
  gravity:  { label: 'Specific Gravity',icon: Scale,           hint: 'Flock / house level.' },
  hatch:    { label: 'Hatch Progression', icon: Timer,         hint: 'Machine-specific — pick a hatcher.' },
};

const QAHubPage: React.FC = () => {
  const { hasWriteAccess } = usePermissions();
  const [searchParams] = useSearchParams();
  const houseIdFromUrl = searchParams.get('houseId');
  const actionFromUrl = searchParams.get('action');

  const [activeType, setActiveType] = useState<QAType>('overview');
  const { data: stats } = useQAStats();

  // Deep-link support: /qa-hub?houseId=... auto-opens Hatch Progression on single setter.
  useEffect(() => {
    if (houseIdFromUrl || actionFromUrl === 'candling') {
      setActiveType('hatch');
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
            <p className="text-muted-foreground">Pick a QA check, then choose the machine / house / process.</p>
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

      {/* Type-first primary tabs */}
      <Tabs value={activeType} onValueChange={(v) => setActiveType(v as QAType)} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto justify-start gap-1">
          <TabsTrigger value="overview" className="gap-1 text-xs">
            <ClipboardCheck className="h-3.5 w-3.5" />Overview
          </TabsTrigger>
          {(Object.keys(TYPE_META) as Array<Exclude<QAType, 'overview'>>).map((k) => {
            const Icon = TYPE_META[k].icon;
            return (
              <TabsTrigger key={k} value={k} className="gap-1 text-xs">
                <Icon className="h-3.5 w-3.5" />
                {TYPE_META[k].label}
              </TabsTrigger>
            );
          })}
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

        {(Object.keys(TYPE_META) as Array<Exclude<QAType, 'overview'>>).map((type) => (
          <TabsContent key={type} value={type} className="space-y-4">
            <QATypeSection
              type={type}
              preSelectedHouseId={type === 'hatch' ? houseIdFromUrl : null}
              preSelectedAction={type === 'hatch' ? actionFromUrl : null}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

const QATypeSection: React.FC<{
  type: Exclude<QAType, 'overview'>;
  preSelectedHouseId?: string | null;
  preSelectedAction?: string | null;
}> = ({ type, preSelectedHouseId, preSelectedAction }) => {
  const map = SECTION_MAP[type];
  const hasSingle = !!map.single;
  const hasMulti = !!map.multi;

  // Default scope: prefer single if available, else multi.
  const [scope, setScope] = useState<Scope>(hasSingle ? 'single' : 'multi');

  const meta = TYPE_META[type];
  const Icon = meta.icon;

  // Humidity is room-scoped — no machine layer, no single/multi.
  if (type === 'humidity') {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" strokeWidth={1.5} />
              </div>
              <div>
                <CardTitle className="text-lg">{meta.label}</CardTitle>
                <CardDescription>{meta.hint}</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
        <RoomHumidityEntry />
      </div>
    );
  }


  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" strokeWidth={1.5} />
              </div>
              <div>
                <CardTitle className="text-lg">{meta.label}</CardTitle>
                <CardDescription>{meta.hint}</CardDescription>
              </div>
            </div>

            {hasSingle && hasMulti && (
              <Tabs value={scope} onValueChange={(v) => setScope(v as Scope)}>
                <TabsList>
                  <TabsTrigger value="single" className="text-xs">Single Stage Setter</TabsTrigger>
                  <TabsTrigger value="multi" className="text-xs">Multi Stage Setter</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
            {hasSingle && !hasMulti && (
              <Badge variant="outline">Single Stage Setter</Badge>
            )}
            {!hasSingle && hasMulti && (
              <Badge variant="outline">Multi Stage Setter</Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      {scope === 'single' && hasSingle && (
        <SingleSetterQAWorkflow
          preSelectedHouseId={preSelectedHouseId ?? null}
          preSelectedAction={preSelectedAction ?? null}
          focusSection={map.single}
        />
      )}
      {scope === 'multi' && hasMulti && (
        <MultiSetterQAWorkflow focusSection={map.multi} />
      )}
      {scope === 'single' && !hasSingle && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>This QA check is only recorded on multi-stage setters. Switch scope to Multi Stage Setter above.</AlertDescription>
        </Alert>
      )}
      {scope === 'multi' && !hasMulti && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>This QA check is only recorded on single-stage setters. Switch scope to Single Stage Setter above.</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default QAHubPage;
