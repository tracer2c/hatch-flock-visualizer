import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Save, RotateCcw, Box } from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  DEFAULT_TOTAL_BUGGIES,
  DEFAULT_BUGGY_SIZE,
  BUGGY_SIZES,
  computeHatchDate,
  computeTransferDate,
  computeFlockAgeWeeks,
  toIsoDate,
} from "@/config/multiStage";
import { useMultiStageOptions } from "@/hooks/useMultiStage";
import {
  useSaveSingleStageOperation,
  type SingleStageDraft,
} from "@/hooks/useSingleStage";
import { SetColorPicker } from "@/components/dashboard/SetColorPicker";
import { usePermissions } from "@/hooks/usePermissions";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const weekdayOf = (iso: string): string => {
  const wd = format(parseISO(iso), "EEE");
  return (WEEKDAYS as readonly string[]).includes(wd) ? wd : "Mon";
};
// Single-setter slot positions 1–18.
const LOCATIONS_1_18 = Array.from({ length: 18 }, (_, i) => String(i + 1));

const initialDraft = (): SingleStageDraft => {
  const today = new Date();
  const set_date = toIsoDate(today);
  return {
    set_date,
    hatch_date: toIsoDate(computeHatchDate(today)),
    transfer_date: toIsoDate(computeTransferDate(today)),
    day_of_week: weekdayOf(set_date),
    number_of_machines: null,
    carry_overs: 0,
    machine_id: "",
    flock_id: "",
    house_number: "",
    age_weeks: null,
    total_buggies: DEFAULT_TOTAL_BUGGIES,
    eggs_per_buggy: DEFAULT_BUGGY_SIZE,
    location: "",
    expected_hatch_percent: null,
    set_color: "blue",
    buggy_numbers: [],
    notes: "",
  };
};

/** Small badge that signals a field was auto-filled by the system. */
const AutoBadge = () => (
  <span
    className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground"
    title="Auto-filled — edit if needed"
  >
    <Sparkles className="h-2.5 w-2.5" />
    auto
  </span>
);

const SingleStagePage = () => {
  const { hasWriteAccess } = usePermissions();
  const canWrite = hasWriteAccess("single_stage");
  const { setters, flocks, isLoading: optionsLoading } = useMultiStageOptions("single");
  const [draft, setDraft] = useState<SingleStageDraft>(initialDraft);
  const saveMutation = useSaveSingleStageOperation();

  // Keep hatch/transfer in sync with set_date
  const updateSetDate = (iso: string) => {
    if (!iso) return;
    const d = parseISO(iso);
    setDraft((s) => ({
      ...s,
      set_date: iso,
      day_of_week: weekdayOf(iso),
      hatch_date: toIsoDate(computeHatchDate(d)),
      transfer_date: toIsoDate(computeTransferDate(d)),
    }));
  };

  // Picking a flock auto-fills house_number + age_weeks
  const pickFlock = (flockId: string) => {
    const flock = flocks.find((f) => f.id === flockId);
    setDraft((s) => ({
      ...s,
      flock_id: flockId,
      house_number: flock?.house_number ?? s.house_number,
      age_weeks:
        flock?.age_weeks ??
        computeFlockAgeWeeks(flock?.arrival_date) ??
        s.age_weeks,
    }));
  };

  const flockLookup = (id: string) => flocks.find((f) => f.id === id);

  // Live totals — use the chosen buggy size
  const totals = useMemo(() => {
    const eggsSet = Math.max(0, draft.total_buggies * draft.eggs_per_buggy);
    const projectedHatch = draft.expected_hatch_percent
      ? Math.round(eggsSet * (draft.expected_hatch_percent / 100))
      : 0;
    return { eggsSet, projectedHatch };
  }, [draft.total_buggies, draft.eggs_per_buggy, draft.expected_hatch_percent]);

  const handleSave = async () => {
    await saveMutation.mutateAsync({ draft, flockLookup });
    setDraft(initialDraft());
  };

  const handleReset = () => {
    if (!confirm("Discard the current entry?")) return;
    setDraft(initialDraft());
  };

  const selectedFlock = flockLookup(draft.flock_id);
  const selectedSetter = setters.find((s) => s.id === draft.machine_id);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Box className="h-6 w-6 text-primary" />
            Single-Stage Set Sheet
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            One setter, one flock, one set. Dates auto-compute from the set date.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset} disabled={saveMutation.isPending}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={!canWrite || saveMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? "Saving…" : "Save Set"}
          </Button>
        </div>
      </div>

      {/* Header card: two columns side-by-side (mirrors Multi-Stage) */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* LEFT — operational dates & counts */}
            <div className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Operation
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2">
                    Transfer Date <AutoBadge />
                  </Label>
                  <Input
                    type="date"
                    value={draft.transfer_date}
                    onChange={(e) =>
                      setDraft((s) => ({ ...s, transfer_date: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2">
                    Hatch Date <AutoBadge />
                  </Label>
                  <Input
                    type="date"
                    value={draft.hatch_date}
                    onChange={(e) =>
                      setDraft((s) => ({ ...s, hatch_date: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>
                    # of Buggies <span className="text-muted-foreground">(set)</span>
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={draft.total_buggies}
                    onChange={(e) =>
                      setDraft((s) => ({ ...s, total_buggies: parseInt(e.target.value) || 0 }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Carry Overs</Label>
                  <Input
                    type="number"
                    min={0}
                    value={draft.carry_overs}
                    onChange={(e) =>
                      setDraft((s) => ({ ...s, carry_overs: parseInt(e.target.value) || 0 }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label># of Machines</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="—"
                    value={draft.number_of_machines ?? ""}
                    onChange={(e) =>
                      setDraft((s) => ({
                        ...s,
                        number_of_machines: e.target.value === "" ? null : parseInt(e.target.value),
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            {/* RIGHT — this set's identity */}
            <div className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                This Set
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2">
                    Day <AutoBadge />
                  </Label>
                  <Select
                    value={draft.day_of_week}
                    onValueChange={(v) => setDraft((s) => ({ ...s, day_of_week: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Day" />
                    </SelectTrigger>
                    <SelectContent>
                      {WEEKDAYS.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2">
                    Set Date <AutoBadge />
                  </Label>
                  <Input
                    type="date"
                    value={draft.set_date}
                    onChange={(e) => updateSetDate(e.target.value)}
                  />
                </div>
              </div>

              <SetColorPicker
                value={draft.set_color}
                onChange={(c) => setDraft((s) => ({ ...s, set_color: c }))}
              />

              {/* Live totals */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <div className="text-xs text-muted-foreground">Total Eggs Set</div>
                  <div className="text-xl font-bold tabular-nums">
                    {totals.eggsSet.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Est. Hatch</div>
                  <div className="text-xl font-bold tabular-nums text-primary">
                    {totals.projectedHatch.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Setter + Flock + counts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Set Details</CardTitle>
          <p className="text-sm text-muted-foreground">
            Pick the setter and source flock. House # and Age fill automatically once a flock is selected.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Setter */}
            <div className="space-y-1.5">
              <Label>Setter</Label>
              <Select
                value={draft.machine_id}
                onValueChange={(v) => setDraft((s) => ({ ...s, machine_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a setter machine" />
                </SelectTrigger>
                <SelectContent>
                  {optionsLoading ? (
                    <SelectItem value="_loading" disabled>
                      Loading…
                    </SelectItem>
                  ) : setters.length === 0 ? (
                    <SelectItem value="_empty" disabled>
                      No active setters
                    </SelectItem>
                  ) : (
                    setters.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.machine_number} <span className="text-muted-foreground ml-2">({s.machine_type})</span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {selectedSetter && (
                <p className="text-xs text-muted-foreground">
                  Type: <span className="capitalize">{selectedSetter.machine_type}</span>
                </p>
              )}
            </div>

            {/* Flock */}
            <div className="space-y-1.5">
              <Label>Flock</Label>
              <Select
                value={draft.flock_id}
                onValueChange={pickFlock}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source flock" />
                </SelectTrigger>
                <SelectContent>
                  {flocks.length === 0 ? (
                    <SelectItem value="_empty" disabled>
                      No active flocks
                    </SelectItem>
                  ) : (
                    flocks.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        #{f.flock_number} — {f.flock_name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {selectedFlock && (
                <p className="text-xs text-muted-foreground">
                  #{selectedFlock.flock_number} · {selectedFlock.flock_name}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2">
                House #
                {selectedFlock?.house_number && <AutoBadge />}
              </Label>
              <Input
                value={draft.house_number}
                placeholder="—"
                onChange={(e) =>
                  setDraft((s) => ({ ...s, house_number: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2">
                Age (wks)
                {draft.age_weeks != null && selectedFlock && <AutoBadge />}
              </Label>
              <Input
                type="number"
                step="0.1"
                value={draft.age_weeks ?? ""}
                placeholder="—"
                onChange={(e) =>
                  setDraft((s) => ({
                    ...s,
                    age_weeks: e.target.value === "" ? null : parseFloat(e.target.value),
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Select
                value={draft.location}
                onValueChange={(v) => setDraft((s) => ({ ...s, location: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="1–18" />
                </SelectTrigger>
                <SelectContent>
                  {LOCATIONS_1_18.map((loc) => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Buggy Size</Label>
              <Select
                value={String(draft.eggs_per_buggy)}
                onValueChange={(v) =>
                  setDraft((s) => ({ ...s, eggs_per_buggy: parseInt(v) }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BUGGY_SIZES.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size.toLocaleString()} eggs
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Expected Hatch %</Label>
              <Input
                type="number"
                step="0.1"
                min={0}
                max={100}
                value={draft.expected_hatch_percent ?? ""}
                placeholder="—"
                onChange={(e) =>
                  setDraft((s) => ({
                    ...s,
                    expected_hatch_percent:
                      e.target.value === "" ? null : parseFloat(e.target.value),
                  }))
                }
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              value={draft.notes}
              placeholder="Anything worth recording about this set…"
              onChange={(e) =>
                setDraft((s) => ({ ...s, notes: e.target.value }))
              }
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Today: {format(new Date(), "EEEE, MMMM d, yyyy")} · Saving creates a batch you'll see in the Data Sheet.
      </p>
    </div>
  );
};

export default SingleStagePage;
