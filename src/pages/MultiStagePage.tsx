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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Sparkles, Save, RotateCcw, Layers, History, Check, CheckCircle2, Pencil, CheckCheck } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import {
  DEFAULT_TOTAL_BUGGIES,
  DEFAULT_BUGGY_SIZE,
  BUGGY_SIZES,
  computeHatchDate,
  computeTransferDate,
  computeFlockAgeWeeks,
  rowEggsSet,
  rowProjectedHatch,
  toIsoDate,
  type SetColor,
} from "@/config/multiStage";
import { SetColorPicker } from "@/components/dashboard/SetColorPicker";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  useMultiStageOptions,
  useNextDayNumber,
  useSaveMultiStageOperation,
  type DraftRow,
  type DraftHeader,
} from "@/hooks/useMultiStage";
import { useOperationDraft } from "@/hooks/useOperationDraft";
import { usePermissions } from "@/hooks/usePermissions";

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

const LOCATIONS_ABC = ["A", "B", "C"] as const;

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

  // When a flock is picked, auto-fill house_number + age_weeks
  const updateRowFlock = (tempId: string, flockId: string) => {
    const flock = flocks.find((f) => f.id === flockId);
    setRows((rs) =>
      rs.map((r) =>
        r.tempId === tempId
          ? {
              ...r,
              flock_id: flockId,
              house_number: flock?.house_number ?? r.house_number,
              age_weeks:
                flock?.age_weeks ??
                computeFlockAgeWeeks(flock?.arrival_date) ??
                r.age_weeks,
            }
          : r
      )
    );
  };

  const updateRow = <K extends keyof DraftRow>(
    tempId: string,
    key: K,
    value: DraftRow[K]
  ) => {
    setRows((rs) => rs.map((r) => (r.tempId === tempId ? { ...r, [key]: value } : r)));
  };

  // Sequential entry flow: confirming a row locks it into a compact "saved"
  // line and — as long as the running buggy total hasn't hit the header's
  // declared # of Buggies yet, and no other open row is already waiting —
  // opens a fresh blank row underneath so the tech can keep going without
  // touching "Add Setter" each time.
  const confirmRow = (tempId: string) => {
    const row = rows.find((r) => r.tempId === tempId);
    if (!row) return;
    if (!row.machine_id || !row.flock_id) {
      toast.error("Pick a setter and flock before confirming this row");
      return;
    }
    setRows((rs) => {
      const next = rs.map((r) => (r.tempId === tempId ? { ...r, confirmed: true } : r));
      const buggiesSoFar = next.reduce((s, r) => s + (Number(r.buggies_set) || 0), 0);
      const hasOpenRow = next.some((r) => !r.confirmed);
      if (!hasOpenRow && buggiesSoFar < header.total_buggies) {
        return [...next, newRow()];
      }
      return next;
    });
  };

  const unconfirmRow = (tempId: string) => {
    setRows((rs) => rs.map((r) => (r.tempId === tempId ? { ...r, confirmed: false } : r)));
  };

  // "Done with this set" — locks any still-open row that has enough to save,
  // and stops here even if the declared total hasn't been reached (a
  // partial set that continues tomorrow, for instance).
  const handleDoneWithSet = () => {
    setRows((rs) =>
      rs.map((r) => (!r.confirmed && r.machine_id && r.flock_id ? { ...r, confirmed: true } : r))
    );
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
  const setterLookup = (id: string) => setters.find((s) => s.id === id);

  // Options for the searchable dropdowns
  const setterOptions = useMemo(
    () =>
      setters.map((s) => ({
        value: s.id,
        label: s.machine_number,
        keywords: `${s.machine_type ?? ""} ${s.location ?? ""}`,
      })),
    [setters]
  );
  const flockOptions = useMemo(
    () =>
      flocks.map((f) => ({
        value: f.id,
        label: `#${f.flock_number} — ${f.flock_name}`,
        keywords: String(f.flock_number),
      })),
    [flocks]
  );

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

      {/* Rows table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Setters</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              One row per setter being operated on today. Fill in a row and press{" "}
              <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-semibold">Enter</kbd>{" "}
              (or hit Confirm) to lock it in and open the next one. <strong>S</strong> = buggies set in, <strong>T</strong> = buggies transferred out.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDoneWithSet}
              disabled={!canWrite || rows.every((r) => r.confirmed)}
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              Done with this set
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRows((rs) => [...rs, newRow()])}
              disabled={!canWrite}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Setter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Progress against the declared # of Buggies */}
          <div className="mb-4 space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Buggies entered</span>
              <span className="font-medium tabular-nums">
                {totals.buggiesSet} / {header.total_buggies}
              </span>
            </div>
            <Progress value={Math.min(100, (totals.buggiesSet / Math.max(1, header.total_buggies)) * 100)} />
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[170px]">Setter</TableHead>
                  <TableHead className="min-w-[90px]">Age (wks)</TableHead>
                  <TableHead className="min-w-[90px]">House</TableHead>
                  <TableHead className="min-w-[110px]">Location</TableHead>
                  <TableHead className="min-w-[100px]">Machine No.</TableHead>
                  <TableHead className="min-w-[200px]">Flock</TableHead>
                  <TableHead className="min-w-[120px]">Buggie</TableHead>
                  <TableHead className="min-w-[90px]">Hatch %</TableHead>
                  <TableHead className="min-w-[70px]">S</TableHead>
                  <TableHead className="min-w-[70px]">T</TableHead>
                  <TableHead className="w-[40px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const flock = flockLookup(r.flock_id);
                  const setter = setterLookup(r.machine_id);

                  // Confirmed rows collapse to a compact "saved" line — the
                  // detail is still there, just not taking up a full row of
                  // editable fields while the tech keeps entering new ones.
                  if (r.confirmed) {
                    return (
                      <TableRow key={r.tempId} className="bg-green-50/60 hover:bg-green-50">
                        <TableCell colSpan={10}>
                          <div className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                            <span className="font-medium">{setter?.machine_number || "—"}</span>
                            <span className="text-muted-foreground">·</span>
                            <span>{flock ? `#${flock.flock_number} — ${flock.flock_name}` : "—"}</span>
                            <span className="text-muted-foreground">·</span>
                            <span>Loc {r.location || "—"}</span>
                            <span className="text-muted-foreground">·</span>
                            <span className="tabular-nums">{r.buggies_set} buggies</span>
                            <Badge variant="outline" className="ml-1 border-green-300 text-green-700 bg-green-100">
                              Saved
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => unconfirmRow(r.tempId)}
                            title="Edit this row"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  }

                  const confirmOnEnter = (e: React.KeyboardEvent) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      confirmRow(r.tempId);
                    }
                  };

                  return (
                    <TableRow key={r.tempId}>
                      {/* Setter — searchable */}
                      <TableCell>
                        <SearchableSelect
                          options={setterOptions}
                          value={r.machine_id}
                          onChange={(v) => updateRow(r.tempId, "machine_id", v)}
                          placeholder="Select setter"
                          searchPlaceholder="Search setters…"
                          emptyText={optionsLoading ? "Loading…" : "No active setters"}
                        />
                      </TableCell>

                      {/* Age (auto from flock, range 1–56) */}
                      <TableCell>
                        <Input
                          type="number"
                          step="0.1"
                          min={1}
                          max={56}
                          value={r.age_weeks ?? ""}
                          placeholder="—"
                          onKeyDown={confirmOnEnter}
                          onChange={(e) =>
                            updateRow(
                              r.tempId,
                              "age_weeks",
                              e.target.value === "" ? null : parseFloat(e.target.value)
                            )
                          }
                        />
                      </TableCell>

                      {/* House (auto from flock, range 1–6) */}
                      <TableCell>
                        <div className="space-y-0.5">
                          <Input
                            value={r.house_number}
                            placeholder="1–6"
                            onKeyDown={confirmOnEnter}
                            onChange={(e) =>
                              updateRow(r.tempId, "house_number", e.target.value)
                            }
                          />
                          {flock?.house_number && (
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Sparkles className="h-2.5 w-2.5" />
                              from flock
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Location — A / B / C zone */}
                      <TableCell>
                        <Select
                          value={r.location}
                          onValueChange={(v) => updateRow(r.tempId, "location", v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            {LOCATIONS_ABC.map((loc) => (
                              <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* Machine No. — derived from setter */}
                      <TableCell>
                        <span className="text-sm font-medium">
                          {setter?.machine_number || "—"}
                        </span>
                      </TableCell>

                      {/* Flock — searchable */}
                      <TableCell>
                        <SearchableSelect
                          options={flockOptions}
                          value={r.flock_id}
                          onChange={(v) => updateRowFlock(r.tempId, v)}
                          placeholder="Select flock"
                          searchPlaceholder="Search flocks…"
                          emptyText="No active flocks"
                        />
                      </TableCell>

                      {/* Buggie — per-row size */}
                      <TableCell>
                        <Select
                          value={String(r.eggs_per_buggy)}
                          onValueChange={(v) =>
                            updateRow(r.tempId, "eggs_per_buggy", parseInt(v))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {BUGGY_SIZES.map((size) => (
                              <SelectItem key={size} value={String(size)}>
                                {size.toLocaleString()}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* Expected hatch % */}
                      <TableCell>
                        <Input
                          type="number"
                          step="0.1"
                          min={0}
                          max={100}
                          value={r.expected_hatch_percent ?? ""}
                          placeholder="—"
                          onKeyDown={confirmOnEnter}
                          onChange={(e) =>
                            updateRow(
                              r.tempId,
                              "expected_hatch_percent",
                              e.target.value === "" ? null : parseFloat(e.target.value)
                            )
                          }
                        />
                      </TableCell>

                      {/* S */}
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          value={r.buggies_set}
                          onKeyDown={confirmOnEnter}
                          onChange={(e) =>
                            updateRow(
                              r.tempId,
                              "buggies_set",
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="tabular-nums font-medium"
                        />
                      </TableCell>

                      {/* T */}
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          value={r.buggies_transferred}
                          onKeyDown={confirmOnEnter}
                          onChange={(e) =>
                            updateRow(
                              r.tempId,
                              "buggies_transferred",
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="tabular-nums font-medium"
                        />
                      </TableCell>

                      {/* Confirm + Remove */}
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => confirmRow(r.tempId)}
                            title="Confirm this row (or press Enter)"
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setRows((rs) => rs.filter((x) => x.tempId !== r.tempId))
                            }
                            disabled={rows.length === 1}
                            title={rows.length === 1 ? "At least one row required" : "Remove row"}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Footer summary */}
          <div className="mt-4 pt-4 border-t flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Rows:</span>{" "}
              <strong>{rows.length}</strong>
            </div>
            <div>
              <span className="text-muted-foreground">Buggies in (Σ S):</span>{" "}
              <strong className="tabular-nums">{totals.buggiesSet}</strong>
            </div>
            <div>
              <span className="text-muted-foreground">Buggies out (Σ T):</span>{" "}
              <strong className="tabular-nums">{totals.buggiesTransferred}</strong>
            </div>
            <div>
              <span className="text-muted-foreground">Total Eggs Set:</span>{" "}
              <strong className="tabular-nums">{totals.eggsSet.toLocaleString()}</strong>
            </div>
            {/* Capacity warning */}
            {totals.buggiesSet + header.carry_overs > header.total_buggies && (
              <Badge variant="destructive">
                Capacity exceeded:{" "}
                {totals.buggiesSet + header.carry_overs} / {header.total_buggies}
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

export default MultiStagePage;
