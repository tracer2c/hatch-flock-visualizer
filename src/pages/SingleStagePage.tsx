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
import { Sparkles, Save, RotateCcw, Box, History, Check } from "lucide-react";
import SingleStageSetSheetGrid from "@/components/data-entry/SingleStageSetSheetGrid";
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
} from "@/config/multiStage";
import { useMultiStageOptions } from "@/hooks/useMultiStage";
import {
  useSaveSingleStageOperation,
  type SingleStageRow,
  type SingleStageHeader,
} from "@/hooks/useSingleStage";
import { useOperationDraft } from "@/hooks/useOperationDraft";
import { SetColorPicker } from "@/components/dashboard/SetColorPicker";
import { usePermissions } from "@/hooks/usePermissions";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const weekdayOf = (iso: string): string => {
  const wd = format(parseISO(iso), "EEE");
  return (WEEKDAYS as readonly string[]).includes(wd) ? wd : "Mon";
};
// Single-setter slot positions 1–18.
const LOCATIONS_1_18 = Array.from({ length: 18 }, (_, i) => String(i + 1));

const newRow = (): SingleStageRow => ({
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

const initialHeader = (): SingleStageHeader => {
  const today = new Date();
  const set_date = toIsoDate(today);
  return {
    set_date,
    hatch_date: toIsoDate(computeHatchDate(today)),
    transfer_date: toIsoDate(computeTransferDate(today)),
    day_of_week: weekdayOf(set_date),
    number_of_machines: null,
    carry_overs: 0,
    total_buggies: DEFAULT_TOTAL_BUGGIES,
    eggs_per_buggy: DEFAULT_BUGGY_SIZE,
    set_color: "blue",
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

  const [header, setHeader] = useState<SingleStageHeader>(initialHeader);
  const [rows, setRows] = useState<SingleStageRow[]>(() => [newRow()]);
  const saveMutation = useSaveSingleStageOperation();
  const [carryOver, setCarryOver] = useState("");

  // Resumable draft: autosaves as the tech types so a closed tab / shift
  // change doesn't lose an in-progress operation.
  const { draft, isLoadingDraft, saveDraft, lastSavedAt, clearDraft } =
    useOperationDraft<SingleStageHeader, SingleStageRow>("single");
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

  // Keep hatch/transfer in sync with set_date
  const updateSetDate = (iso: string) => {
    if (!iso) return;
    const d = parseISO(iso);
    setHeader((h) => ({
      ...h,
      set_date: iso,
      day_of_week: weekdayOf(iso),
      hatch_date: toIsoDate(computeHatchDate(d)),
      transfer_date: toIsoDate(computeTransferDate(d)),
    }));
  };

  const flockLookup = (id: string) => flocks.find((f) => f.id === id);

  // Live totals — use each row's chosen buggy size
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

  const handleSave = async () => {
    const validRows = rows.filter((r) => r.machine_id && r.flock_id);
    if (validRows.length === 0) {
      return; // useSaveSingleStageOperation will toast a sensible error
    }
    // Carry-over from the sheet rides along in the operation notes.
    const notes = [header.notes, carryOver.trim() ? `Carry-over: ${carryOver.trim()}` : ""]
      .filter(Boolean)
      .join(" · ");
    await saveMutation.mutateAsync({
      header: { ...header, notes },
      rows: validRows,
      flockLookup,
    });
    await clearDraft();
    setHeader(initialHeader());
    setRows([newRow()]);
    setCarryOver("");
  };

  const handleReset = () => {
    if (!confirm("Discard the current entry?")) return;
    clearDraft();
    setHeader(initialHeader());
    setRows([newRow()]);
    setCarryOver("");
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Box className="h-6 w-6 text-primary" />
            Single-Stage Set Sheet
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
                      setHeader((h) => ({ ...h, total_buggies: parseInt(e.target.value) || 0 }))
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
                      setHeader((h) => ({ ...h, carry_overs: parseInt(e.target.value) || 0 }))
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
                    value={header.set_date}
                    onChange={(e) => updateSetDate(e.target.value)}
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

      {/* Paper-style sheet grid */}

        <Card>
          <CardHeader>
            <CardTitle>Set Sheet</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              One card per single-stage setter with the sheet&apos;s 20 buggy lines. Type flock
              numbers straight in — house and age fill themselves. <strong>T</strong> = Tall,{" "}
              <strong>S</strong> = Short. Enter / ↓ moves to the next line.
            </p>
          </CardHeader>
          <CardContent>
            <div className="mb-4 space-y-1.5">
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
            <SingleStageSetSheetGrid
              setters={setters}
              flocks={flocks}
              rows={rows}
              onRowsChange={setRows}
              defaultDate={header.set_date}
              carryOver={carryOver}
              onCarryOverChange={setCarryOver}
              canWrite={canWrite}
            />
            <div className="mt-4 pt-4 border-t flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Buggies in:</span>{" "}
                <strong className="tabular-nums">{totals.buggiesSet}</strong>
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

export default SingleStagePage;
