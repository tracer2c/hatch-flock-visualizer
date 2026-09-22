import { useEffect, useMemo, useRef, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Save, RotateCcw, Layers, History, Check, Printer } from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  DEFAULT_TOTAL_BUGGIES,
  DEFAULT_BUGGY_SIZE,
  computeHatchDate,
  computeTransferDate,
  computeFlockAgeWeeks,
  rowEggsSet,
  rowProjectedHatch,
  toIsoDate,
  type SetColor,
} from "@/config/multiStage";
import { SetColorPicker } from "@/components/dashboard/SetColorPicker";
import {
  useMultiStageOptions,
  useNextDayNumber,
  useSaveMultiStageOperation,
  type DraftRow,
  type DraftHeader,
} from "@/hooks/useMultiStage";
import { useOperationDraft } from "@/hooks/useOperationDraft";
import { usePermissions } from "@/hooks/usePermissions";
import SetReportGrid from "@/components/data-entry/SetReportGrid";
import SetSheetPrintView, {
  type PrintSetter,
} from "@/components/data-entry/SetSheetPrintView";
import { usePrintMeta } from "@/hooks/usePrintMeta";
import { POSITION_LABELS } from "@/components/data-entry/SetReportGrid";

// Operating weekdays.
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** Weekday abbreviation for a YYYY-MM-DD date. */
const weekdayOf = (iso: string): string => {
  const wd = format(parseISO(iso), "EEE"); // Sun..Sat
  return (WEEKDAYS as readonly string[]).includes(wd) ? wd : "Mon";
};

const newRow = (): DraftRow => ({
  tempId: crypto.randomUUID(),
  machine_id: "",
  flock_id: "",
  house_number: "",
  age_weeks: null,
  expected_hatch_percent: null,
  buggies_set: 0,
  buggies_transferred: 0,
  eggs_per_buggy: DEFAULT_BUGGY_SIZE,
  location: "",
  buggy_numbers: [],
  notes: "",
  confirmed: false,
});


const initialHeader = (dayNumber: number | null): DraftHeader => {
  const today = new Date();
  const operation_date = toIsoDate(today);
  return {
    operation_date,
    transfer_date: toIsoDate(computeTransferDate(today)),
    hatch_date: toIsoDate(computeHatchDate(today)),
    day_number: dayNumber,
    day_of_week: weekdayOf(operation_date),
    number_of_machines: null,
    set_color: "blue",
    total_buggies: DEFAULT_TOTAL_BUGGIES,
    carry_overs: 0,
    eggs_per_buggy: DEFAULT_BUGGY_SIZE,
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

const MultiStagePage = () => {
  const { hasWriteAccess } = usePermissions();
  const canWrite = hasWriteAccess("data_entry"); // any data-entry-capable user
  const { setters, flocks, isLoading: optionsLoading } = useMultiStageOptions("multi");
  const { data: nextDay } = useNextDayNumber();

  const [header, setHeader] = useState<DraftHeader>(() => initialHeader(null));
  const [rows, setRows] = useState<DraftRow[]>(() => [newRow()]);

  // Backfill day_number once it's computed by the hook
  if (nextDay && header.day_number === null) {
    setHeader((h) => ({ ...h, day_number: nextDay }));
  }

  const saveMutation = useSaveMultiStageOperation();

  // Resumable draft: autosaves as the tech types so a closed tab / shift
  // change doesn't lose an in-progress operation.
  const { draft, isLoadingDraft, saveDraft, lastSavedAt, clearDraft } =
    useOperationDraft<DraftHeader, DraftRow>("multi");
  const [resumeDecided, setResumeDecided] = useState(false);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout>>();

  const resumeDraft = () => {
    if (!draft) return;
    setHeader(draft.header);
    setRows(draft.rows.length > 0 ? draft.rows : [newRow()]);
    setResumeDecided(true);
  };
  const discardDraft = () => {
    clearDraft();
    setResumeDecided(true);
  };

  // Debounced autosave — only once the resume prompt has been resolved (or
  // there was nothing to resume), so we never silently overwrite a draft
  // before the tech has chosen to keep or discard it.
  useEffect(() => {
    if (isLoadingDraft) return;
    if (draft && !resumeDecided) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      saveDraft(header, rows);
    }, 1500);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [header, rows, isLoadingDraft, draft, resumeDecided]);

  // Keep hatch/transfer dates in sync with operation_date
  const updateOperationDate = (iso: string) => {
    if (!iso) return;
    const d = parseISO(iso);
    setHeader((h) => ({
      ...h,
      operation_date: iso,
      day_of_week: weekdayOf(iso),
      hatch_date: toIsoDate(computeHatchDate(d)),
      transfer_date: toIsoDate(computeTransferDate(d)),
    }));
  };

  // Live totals — use the chosen buggy size
  const totals = useMemo(() => {
    const buggiesSet = rows.reduce((s, r) => s + (Number(r.buggies_set) || 0), 0);
    const buggiesTransferred = rows.reduce(
      (s, r) => s + (Number(r.buggies_transferred) || 0),
      0
    );
    const eggsSet = rows.reduce(
      (s, r) => s + rowEggsSet(Number(r.buggies_set) || 0, r.eggs_per_buggy || DEFAULT_BUGGY_SIZE),
      0
    );
    const projectedHatch = rows.reduce(
      (s, r) =>
        s +
        rowProjectedHatch(
          Number(r.buggies_set) || 0,
          Number(r.expected_hatch_percent) || 0,
          r.eggs_per_buggy || DEFAULT_BUGGY_SIZE
        ),
      0
    );
    return { buggiesSet, buggiesTransferred, eggsSet, projectedHatch };
  }, [rows]);

  const flockLookup = (id: string) => flocks.find((f) => f.id === id);

  const handleSave = async () => {
    const validRows = rows.filter((r) => r.machine_id && r.flock_id);
    if (validRows.length === 0) {
      return; // useSaveMultiStageOperation will toast a sensible error
    }
    await saveMutation.mutateAsync({
      header,
      rows: validRows,
      flockLookup,
    });
    await clearDraft();
    // Reset for next entry
    setHeader(initialHeader(nextDay ? ((nextDay % 3) + 1) : null));
    setRows([newRow()]);
  };

  const handleReset = () => {
    if (!confirm("Discard the current entry?")) return;
    clearDraft();
    setHeader(initialHeader(nextDay ?? null));
    setRows([newRow()]);
  };

  // ── Printing ───────────────────────────────────────────────────────────
  const printMeta = usePrintMeta();

  const printSetters: PrintSetter[] = useMemo(() => {
    return setters
      .map((s) => {
        const lines = rows
          .filter((r) => r.machine_id === s.id && r.flock_id)
          .sort((a, b) => (a.position ?? 1) - (b.position ?? 1))
          .map((r) => {
            const f = flocks.find((x) => x.id === r.flock_id);
            return {
              label: POSITION_LABELS[r.position ?? 1] ?? String(r.position ?? 1),
              flockNumber: f ? String(f.flock_number) : "",
              houseNumber: r.house_number || "",
              ageWeeks: r.age_weeks,
              eggsPerBuggy: r.eggs_per_buggy || DEFAULT_BUGGY_SIZE,
              buggies: Number(r.buggies_set) || 0,
            };
          });
        return { machineNumber: s.machine_number, location: s.location, lines };
      })
      .filter((s) => s.lines.length > 0);
  }, [setters, rows, flocks]);

  const printLocation = useMemo(() => {
    const used = new Set(
      setters
        .filter((s) => rows.some((r) => r.machine_id === s.id && r.flock_id))
        .map((s) => s.location)
        .filter(Boolean) as string[]
    );
    return Array.from(used).join(", ");
  }, [setters, rows]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            Multi-Stage Set Sheet
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Today&apos;s setting operation. Dates auto-compute from the set date; flock fields auto-fill when you pick a flock.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {resumeDecided && lastSavedAt && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Check className="h-3 w-3 text-green-600" />
              Draft saved {format(lastSavedAt, "h:mm:ss a")}
            </span>
          )}
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" onClick={handleReset} disabled={saveMutation.isPending}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={!canWrite || saveMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? "Saving…" : "Save Operation"}
          </Button>
        </div>
      </div>

      {/* Resume prompt — only shown until the tech picks Resume or Discard */}
      {!isLoadingDraft && draft && !resumeDecided && (
        <Alert>
          <History className="h-4 w-4" />
          <AlertTitle>Unsaved set from {format(parseISO(draft.updated_at), "MMM d, h:mm a")}</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>You left this operation mid-entry. Resume where you left off, or discard it and start fresh.</span>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="outline" onClick={discardDraft}>
                Discard
              </Button>
              <Button size="sm" onClick={resumeDraft}>
                Resume
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Header card: two columns side-by-side */}
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
                    value={header.transfer_date}
                    onChange={(e) =>
                      setHeader((h) => ({ ...h, transfer_date: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2">
                    Hatch Date <AutoBadge />
                  </Label>
                  <Input
                    type="date"
                    value={header.hatch_date}
                    onChange={(e) =>
                      setHeader((h) => ({ ...h, hatch_date: e.target.value }))
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
                    value={header.total_buggies}
                    onChange={(e) =>
                      setHeader((h) => ({
                        ...h,
                        total_buggies: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Carry Overs</Label>
                  <Input
                    type="number"
                    min={0}
                    value={header.carry_overs}
                    onChange={(e) =>
                      setHeader((h) => ({
                        ...h,
                        carry_overs: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label># of Machines</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="—"
                    value={header.number_of_machines ?? ""}
                    onChange={(e) =>
                      setHeader((h) => ({
                        ...h,
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
                    value={header.day_of_week}
                    onValueChange={(v) => setHeader((h) => ({ ...h, day_of_week: v }))}
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
                    value={header.operation_date}
                    onChange={(e) => updateOperationDate(e.target.value)}
                  />
                </div>
              </div>

              <SetColorPicker
                value={header.set_color}
                onChange={(c) => setHeader((h) => ({ ...h, set_color: c }))}
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

      {/* Paper-sheet bulk grid: all setters × 3 positions on one page */}
        <Card>
          <CardHeader>
            <CardTitle>Set Report — all setters</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Type a flock number on each position line, exactly like the paper card.
              Press{" "}
              <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-semibold">Enter</kbd>{" "}
              to jump to the next line. Blank lines are ignored on save.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Buggies entered</span>
                <span className="font-medium tabular-nums">
                  {totals.buggiesSet} / {header.total_buggies}
                </span>
              </div>
              <Progress
                value={Math.min(
                  100,
                  (totals.buggiesSet / Math.max(1, header.total_buggies)) * 100
                )}
              />
            </div>

            <SetReportGrid
              setters={setters}
              flocks={flocks}
              rows={rows}
              onRowsChange={setRows}
              defaultDate={header.operation_date}
              canWrite={canWrite}
            />

            <div className="pt-4 border-t grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="holdovers">Holdovers</Label>
                <Input
                  id="holdovers"
                  placeholder="e.g. 2 buggies flock 6501 held in DHN-04"
                  value={header.holdovers ?? ""}
                  onChange={(e) => setHeader((h) => ({ ...h, holdovers: e.target.value }))}
                />
              </div>
              <div className="flex flex-wrap items-end gap-x-6 gap-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Lines:</span>{" "}
                  <strong className="tabular-nums">
                    {rows.filter((r) => r.machine_id && r.flock_id).length}
                  </strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Eggs Set:</span>{" "}
                  <strong className="tabular-nums">{totals.eggsSet.toLocaleString()}</strong>
                </div>
                {totals.buggiesSet + header.carry_overs > header.total_buggies && (
                  <Badge variant="destructive">
                    Capacity exceeded: {totals.buggiesSet + header.carry_overs} /{" "}
                    {header.total_buggies}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

      {/* Optional notes */}
      <Card>
        <CardContent className="pt-6">
          <Label htmlFor="op-notes">Notes</Label>
          <Input
            id="op-notes"
            placeholder="Anything worth recording about today's set…"
            value={header.notes}
            onChange={(e) => setHeader((h) => ({ ...h, notes: e.target.value }))}
            className="mt-2"
          />
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Today: {format(new Date(), "EEEE, MMMM d, yyyy")} · Each saved row becomes a batch in your data sheet.
      </p>
    </div>
  );
};

export default MultiStagePage;
