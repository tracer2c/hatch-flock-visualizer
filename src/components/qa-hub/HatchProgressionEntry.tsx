import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { DatePicker } from "@/components/ui/date-picker";
import { Timer, Cpu, Home, AlertTriangle, ChevronsUpDown, Check, X, TrendingUp } from "lucide-react";
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import TodaysEntriesList from './TodaysEntriesList';
import { useFlocksData } from '@/hooks/useHousesData';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import type { TodaysQAEntry } from '@/hooks/useTodaysQAEntries';
import { useTodaysQAEntries } from '@/hooks/useTodaysQAEntries';

interface FlockOption {
  flock_id: string;
  batch_id: string | null;
  flock_name: string;
  flock_number: number;
}

interface HatchProgressionEntryProps {
  technicianName: string;
  checkDate: string;
  flockOptions?: FlockOption[];
  defaultFlockId?: string;
  defaultBatchId?: string | null;
  machineId?: string | null;
  isPastDay?: boolean;
  machineLabel?: string;
  houseLabel?: string;
  onSubmit: (data: {
    flock_id: string;
    batch_id: string | null;
    stage: string;
    percentageOut: number;
    totalCount: number;
    hatchedCount: number;
    checkHour: number;
    hatchDate: string;
  }) => void | Promise<void>;
}

const stages = [
  { value: 'A', label: 'Stage A - Initial Hatch' },
  { value: 'B', label: 'Stage B - Mid Hatch' },
  { value: 'C', label: 'Stage C - Final Hatch' },
];

const HatchProgressionEntry: React.FC<HatchProgressionEntryProps> = ({
  technicianName,
  checkDate,
  flockOptions = [],
  defaultFlockId,
  defaultBatchId,
  machineId,
  isPastDay = false,
  machineLabel,
  houseLabel,
  onSubmit,
}) => {
  const queryClient = useQueryClient();
  const [selectedFlockId, setSelectedFlockId] = useState(defaultFlockId || '');
  const [stage, setStage] = useState('A');
  const [totalCount, setTotalCount] = useState('');
  const [hatchedCount, setHatchedCount] = useState('');
  const [percentageOut, setPercentageOut] = useState('');
  const [entryDate, setEntryDate] = useState(checkDate);
  const [flockPickerOpen, setFlockPickerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: allFlocks } = useFlocksData();

  // Union: suggested (currently linked) + all company flocks
  const combinedFlocks = useMemo(() => {
    const suggestedIds = new Set(flockOptions.map(f => f.flock_id));
    const suggested = flockOptions.map(f => ({ ...f, suggested: true }));
    const rest = (allFlocks ?? [])
      .filter((f: any) => !suggestedIds.has(f.id))
      .map((f: any) => ({
        flock_id: f.id,
        batch_id: null,
        flock_name: f.flock_name,
        flock_number: f.flock_number,
        suggested: false,
      }));
    return [...suggested, ...rest];
  }, [flockOptions, allFlocks]);

  const selectedFlock = combinedFlocks.find(f => f.flock_id === selectedFlockId);
  const batchId = selectedFlock?.batch_id || defaultBatchId || null;

  useEffect(() => {
    if (defaultFlockId && !selectedFlockId) setSelectedFlockId(defaultFlockId);
  }, [defaultFlockId, selectedFlockId]);

  useEffect(() => {
    setEntryDate(checkDate);
  }, [checkDate]);

  // Auto-calc %
  useEffect(() => {
    const total = parseInt(totalCount);
    const hatched = parseInt(hatchedCount);
    if (total > 0 && hatched >= 0) setPercentageOut((hatched / total * 100).toFixed(1));
  }, [totalCount, hatchedCount]);

  // Machine total across today's entries
  const { data: todaysEntries } = useTodaysQAEntries(machineId, checkDate, 'hatch_progression');
  const machineTotal = useMemo(() => {
    const rows = todaysEntries ?? [];
    const totals = { total: 0, hatched: 0, byStage: { A: { t: 0, h: 0 }, B: { t: 0, h: 0 }, C: { t: 0, h: 0 } } as Record<string, { t: number; h: number }> };
    for (const r of rows) {
      const cr = r.candling_results || {};
      const t = Number(cr.totalCount) || 0;
      const h = Number(cr.hatchedCount) || 0;
      totals.total += t;
      totals.hatched += h;
      const s = cr.stage;
      if (s && totals.byStage[s]) {
        totals.byStage[s].t += t;
        totals.byStage[s].h += h;
      }
    }
    return totals;
  }, [todaysEntries]);

  const machinePct = machineTotal.total > 0 ? (machineTotal.hatched / machineTotal.total) * 100 : 0;

  const resetForm = () => {
    setTotalCount('');
    setHatchedCount('');
    setPercentageOut('');
    setEditingId(null);
    setStage('A');
  };

  const loadForEdit = (entry: TodaysQAEntry) => {
    const cr = entry.candling_results || {};
    setEditingId(entry.id);
    setSelectedFlockId(cr.flock_id || '');
    setStage(cr.stage || 'A');
    setTotalCount(String(cr.totalCount ?? ''));
    setHatchedCount(String(cr.hatchedCount ?? ''));
    setPercentageOut(String(cr.percentageOut ?? ''));
    setEntryDate(entry.check_date);
    // Scroll to top of form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const validate = () => {
    if (!technicianName.trim()) { toast.error('Enter a technician name.'); return null; }
    if (!selectedFlockId) { toast.error('Select a flock.'); return null; }
    const total = parseInt(totalCount);
    const hatched = parseInt(hatchedCount);
    if (!Number.isFinite(total) || total <= 0) { toast.error('Enter a total count > 0.'); return null; }
    if (!Number.isFinite(hatched) || hatched < 0) { toast.error('Enter a valid hatched count.'); return null; }
    if (hatched > total) { toast.error('Hatched count cannot exceed total.'); return null; }
    return { total, hatched };
  };

  const handleSubmit = async () => {
    const v = validate();
    if (!v) return;
    setSaving(true);
    try {
      await onSubmit({
        flock_id: selectedFlockId,
        batch_id: batchId,
        stage,
        percentageOut: parseFloat(percentageOut) || 0,
        totalCount: v.total,
        hatchedCount: v.hatched,
        checkHour: 0,
        hatchDate: entryDate,
      });
      resetForm();
    } catch {
      // parent handles toast
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    const v = validate();
    if (!v) return;
    setSaving(true);
    try {
      // Load the existing row, mutate the JSON, write back
      const { data: existing, error: fetchErr } = await supabase
        .from('qa_monitoring')
        .select('candling_results')
        .eq('id', editingId)
        .single();
      if (fetchErr) throw fetchErr;
      let cr: any = existing?.candling_results;
      if (typeof cr === 'string') { try { cr = JSON.parse(cr); } catch { cr = {}; } }
      cr = {
        ...(cr || {}),
        type: 'hatch_progression',
        flock_id: selectedFlockId,
        stage,
        percentageOut: parseFloat(percentageOut) || 0,
        totalCount: v.total,
        hatchedCount: v.hatched,
      };
      const { error } = await supabase
        .from('qa_monitoring')
        .update({
          check_date: entryDate,
          humidity: parseFloat(percentageOut) || 0,
          candling_results: JSON.stringify(cr),
        })
        .eq('id', editingId);
      if (error) throw error;
      toast.success('Entry updated.');
      queryClient.invalidateQueries({ queryKey: ['todays-qa-entries'] });
      queryClient.invalidateQueries({ queryKey: ['recent-qa-entries'] });
      resetForm();
    } catch (e: any) {
      toast.error(`Failed to update: ${e.message ?? e}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Timer className="h-5 w-5 text-green-500" />
          Hatch Progression
          {editingId && <Badge variant="secondary">Editing</Badge>}
        </CardTitle>
        <p className="text-sm text-muted-foreground">Track hatching progress at each stage</p>
        {(machineLabel || houseLabel) && (
          <div className="flex flex-wrap gap-2 pt-1">
            {machineLabel && (
              <Badge variant="outline" className="gap-1"><Cpu className="h-3 w-3" /> {machineLabel}</Badge>
            )}
            {houseLabel && (
              <Badge variant="outline" className="gap-1"><Home className="h-3 w-3" /> {houseLabel}</Badge>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Flock</Label>
            <Popover open={flockPickerOpen} onOpenChange={setFlockPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className={cn("w-full justify-between font-normal", !selectedFlock && "text-muted-foreground")}
                >
                  {selectedFlock
                    ? `${selectedFlock.flock_name} (${selectedFlock.flock_number})`
                    : 'Search flock by number or name…'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50 shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0 pointer-events-auto" align="start">
                <Command
                  filter={(value, search) => {
                    if (!search) return 1;
                    return value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
                  }}
                >
                  <CommandInput placeholder="Type flock number or name…" />
                  <CommandList>
                    <CommandEmpty>No flocks found.</CommandEmpty>
                    {flockOptions.length > 0 && (
                      <CommandGroup heading="Linked to this machine">
                        {combinedFlocks.filter(f => f.suggested).map(f => (
                          <CommandItem
                            key={f.flock_id}
                            value={`${f.flock_number} ${f.flock_name}`}
                            onSelect={() => { setSelectedFlockId(f.flock_id); setFlockPickerOpen(false); }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", selectedFlockId === f.flock_id ? "opacity-100" : "opacity-0")} />
                            {f.flock_name} <span className="ml-1 text-muted-foreground">({f.flock_number})</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                    <CommandGroup heading="All flocks">
                      {combinedFlocks.filter(f => !f.suggested).map(f => (
                        <CommandItem
                          key={f.flock_id}
                          value={`${f.flock_number} ${f.flock_name}`}
                          onSelect={() => { setSelectedFlockId(f.flock_id); setFlockPickerOpen(false); }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", selectedFlockId === f.flock_id ? "opacity-100" : "opacity-0")} />
                          {f.flock_name} <span className="ml-1 text-muted-foreground">({f.flock_number})</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label>Stage</Label>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger>
              <SelectContent>
                {stages.map(s => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Date checked</Label>
            <DatePicker
              date={entryDate ? new Date(entryDate + 'T00:00:00') : undefined}
              onDateChange={(d) => {
                if (d) setEntryDate(d.toISOString().split('T')[0]);
              }}
            />
          </div>
        </div>

        {selectedFlockId && !batchId && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-700" />
            <AlertDescription className="text-amber-800">
              This flock is not linked to a specific house for the selected date. The record will save at machine/flock level.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Total Count</Label>
            <Input type="number" min="0" value={totalCount} onChange={(e) => setTotalCount(e.target.value)} placeholder="Total eggs" />
          </div>
          <div className="space-y-2">
            <Label>Hatched Count</Label>
            <Input type="number" min="0" value={hatchedCount} onChange={(e) => setHatchedCount(e.target.value)} placeholder="Hatched chicks" />
          </div>
          <div className="space-y-2">
            <Label>% Out (Auto-calculated)</Label>
            <Input type="number" step="0.1" value={percentageOut} onChange={(e) => setPercentageOut(e.target.value)} placeholder="Auto" className="bg-muted/50" />
          </div>
          <div className="flex items-end gap-2">
            <Button
              onClick={editingId ? handleUpdate : handleSubmit}
              disabled={saving || !technicianName.trim()}
              className="flex-1"
            >
              {saving ? 'Saving…' : editingId ? 'Update Record' : 'Add Record'}
            </Button>
            {editingId && (
              <Button variant="outline" size="icon" onClick={resetForm} aria-label="Cancel edit">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Machine Total Card */}
        {machineTotal.total > 0 && (
          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <TrendingUp className="h-4 w-4 text-primary" />
                Machine Total ({machineLabel ?? 'this machine'})
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">{machineTotal.hatched.toLocaleString()} / {machineTotal.total.toLocaleString()}</span>
                <span className="ml-2 font-semibold text-primary">{machinePct.toFixed(1)}%</span>
              </div>
            </div>
            <div className="bg-muted rounded-full h-2 overflow-hidden">
              <div className="bg-green-500 h-full transition-all" style={{ width: `${Math.min(machinePct, 100)}%` }} />
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs pt-1">
              {(['A', 'B', 'C'] as const).map(s => {
                const cell = machineTotal.byStage[s];
                const pct = cell.t > 0 ? (cell.h / cell.t) * 100 : 0;
                return (
                  <div key={s} className="flex items-center justify-between rounded border bg-background px-2 py-1">
                    <span className="font-medium">Stage {s}</span>
                    <span className="text-muted-foreground">{cell.t > 0 ? `${pct.toFixed(1)}%` : '—'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <TodaysEntriesList
          machineId={machineId}
          checkDate={checkDate}
          type="hatch_progression"
          isPastDay={isPastDay}
          emptyLabel="No hatch progression checks yet today."
          onEdit={loadForEdit}
          renderSummary={(e) => {
            const stg = e.candling_results?.stage ?? '—';
            const pct = e.candling_results?.percentageOut;
            const total = e.candling_results?.totalCount;
            const hatched = e.candling_results?.hatchedCount;
            return (
              <span>
                Stage <span className="font-medium">{stg}</span>
                {typeof pct === 'number' && <> · <span className="font-medium">{pct}%</span></>}
                {typeof hatched === 'number' && typeof total === 'number' && (
                  <span className="text-muted-foreground"> ({hatched}/{total})</span>
                )}
              </span>
            );
          }}
        />
      </CardContent>
    </Card>
  );
};

export default HatchProgressionEntry;
