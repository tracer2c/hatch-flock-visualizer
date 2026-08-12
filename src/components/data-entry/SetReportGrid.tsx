import { useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowDownToLine, Copy, Eraser, Search, X } from "lucide-react";
import { BUGGY_SIZES, DEFAULT_BUGGY_SIZE } from "@/config/multiStage";
import type { DraftRow, FlockOption, SetterOption } from "@/hooks/useMultiStage";

export const POSITIONS = [1, 2, 3] as const;

interface Props {
  setters: SetterOption[];
  flocks: FlockOption[];
  rows: DraftRow[];
  onRowsChange: (rows: DraftRow[]) => void;
  /** Header set date — every new line defaults to it. */
  defaultDate: string;
  canWrite: boolean;
}

const newLine = (
  machine_id: string,
  position: number,
  set_date: string,
  eggs_per_buggy: number
): DraftRow => ({
  tempId: crypto.randomUUID(),
  machine_id,
  flock_id: "",
  house_number: "",
  age_weeks: null,
  expected_hatch_percent: null,
  buggies_set: 1,
  buggies_transferred: 0,
  eggs_per_buggy,
  location: "",
  buggy_numbers: [],
  notes: "",
  position,
  set_date,
});

/**
 * Paper "SET REPORT" style bulk entry: every multi-setter machine is a card
 * with three position lines. The technician types flock numbers straight in —
 * no dialogs, no per-machine selection — which is what makes a full sheet a
 * couple of minutes instead of 45.
 */
const SetReportGrid: React.FC<Props> = ({
  setters,
  flocks,
  rows,
  onRowsChange,
  defaultDate,
  canWrite,
}) => {
  const [search, setSearch] = useState("");
  const [onlyFilled, setOnlyFilled] = useState(false);
  /** Raw text the tech is typing per cell, keyed `${machineId}:${pos}`. */
  const [flockText, setFlockText] = useState<Record<string, string>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  // flock_number → flock (first match wins when a number repeats per hatchery)
  const flocksByNumber = useMemo(() => {
    const m = new Map<number, FlockOption>();
    for (const f of flocks) if (!m.has(f.flock_number)) m.set(f.flock_number, f);
    return m;
  }, [flocks]);

  const rowFor = (machineId: string, pos: number) =>
    rows.find((r) => r.machine_id === machineId && (r.position ?? 1) === pos);

  const cellKey = (machineId: string, pos: number) => `${machineId}:${pos}`;

  const patchCell = (machineId: string, pos: number, patch: Partial<DraftRow>) => {
    const existing = rowFor(machineId, pos);
    if (existing) {
      onRowsChange(rows.map((r) => (r.tempId === existing.tempId ? { ...r, ...patch } : r)));
      return;
    }
    const sibling = rows.find((r) => r.machine_id === machineId);
    const line = newLine(
      machineId,
      pos,
      defaultDate,
      sibling?.eggs_per_buggy ?? DEFAULT_BUGGY_SIZE
    );
    onRowsChange([...rows, { ...line, ...patch }]);
  };

  const clearCell = (machineId: string, pos: number) => {
    const existing = rowFor(machineId, pos);
    if (!existing) return;
    onRowsChange(rows.filter((r) => r.tempId !== existing.tempId));
    setFlockText((t) => ({ ...t, [cellKey(machineId, pos)]: "" }));
  };

  /** Resolve typed flock number → flock, filling house/age like the old form. */
  const onFlockInput = (machineId: string, pos: number, text: string) => {
    setFlockText((t) => ({ ...t, [cellKey(machineId, pos)]: text }));
    const num = parseInt(text.trim(), 10);
    const flock = Number.isFinite(num) ? flocksByNumber.get(num) : undefined;
    if (!text.trim()) {
      clearCell(machineId, pos);
      return;
    }
    patchCell(machineId, pos, {
      flock_id: flock?.id ?? "",
      house_number: flock?.house_number ?? "",
      age_weeks: flock?.age_weeks ?? null,
    });
  };

  const setSetterBuggySize = (machineId: string, size: number) => {
    onRowsChange(
      rows.map((r) => (r.machine_id === machineId ? { ...r, eggs_per_buggy: size } : r))
    );
  };

  /** Copy position 1 down to positions 2 & 3 of the same setter. */
  const fillDown = (machineId: string) => {
    const first = rowFor(machineId, 1);
    if (!first) return;
    const text = flockText[cellKey(machineId, 1)] ?? String(
      flocks.find((f) => f.id === first.flock_id)?.flock_number ?? ""
    );
    let next = [...rows];
    for (const pos of [2, 3]) {
      const existing = next.find((r) => r.machine_id === machineId && (r.position ?? 1) === pos);
      const patch = {
        flock_id: first.flock_id,
        house_number: first.house_number,
        age_weeks: first.age_weeks,
        buggies_set: first.buggies_set,
        set_date: first.set_date,
        eggs_per_buggy: first.eggs_per_buggy,
      };
      if (existing) {
        next = next.map((r) => (r.tempId === existing.tempId ? { ...r, ...patch } : r));
      } else {
        next = [...next, { ...newLine(machineId, pos, first.set_date || defaultDate, first.eggs_per_buggy), ...patch }];
      }
      setFlockText((t) => ({ ...t, [cellKey(machineId, pos)]: text }));
    }
    onRowsChange(next);
  };

  /** Copy the whole previous setter card onto this one. */
  const copyPrevious = (machineIdx: number) => {
    const target = visibleSetters[machineIdx];
    const source = visibleSetters[machineIdx - 1];
    if (!target || !source) return;
    let next = rows.filter((r) => r.machine_id !== target.id);
    for (const pos of POSITIONS) {
      const src = rowFor(source.id, pos);
      if (!src) continue;
      next = [
        ...next,
        {
          ...src,
          tempId: crypto.randomUUID(),
          machine_id: target.id,
          position: pos,
        },
      ];
      setFlockText((t) => ({
        ...t,
        [cellKey(target.id, pos)]: t[cellKey(source.id, pos)] ?? "",
      }));
    }
    onRowsChange(next);
  };

  const clearSetter = (machineId: string) => {
    onRowsChange(rows.filter((r) => r.machine_id !== machineId));
    setFlockText((t) => {
      const copy = { ...t };
      for (const pos of POSITIONS) delete copy[cellKey(machineId, pos)];
      return copy;
    });
  };

  const filledMachineIds = useMemo(
    () => new Set(rows.filter((r) => r.flock_id).map((r) => r.machine_id)),
    [rows]
  );

  const visibleSetters = useMemo(() => {
    const q = search.trim().toLowerCase();
    return setters.filter((s) => {
      if (onlyFilled && !filledMachineIds.has(s.id)) return false;
      if (!q) return true;
      return (
        s.machine_number.toLowerCase().includes(q) ||
        (s.location ?? "").toLowerCase().includes(q)
      );
    });
  }, [setters, search, onlyFilled, filledMachineIds]);

  /** Enter/↓ moves to the next flock cell, ↑ to the previous one. */
  const focusCell = (machineIdx: number, pos: number) => {
    const setter = visibleSetters[machineIdx];
    if (!setter) return;
    const el = containerRef.current?.querySelector<HTMLInputElement>(
      `input[data-flock-cell="${setter.id}:${pos}"]`
    );
    el?.focus();
    el?.select();
  };

  const onFlockKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    machineIdx: number,
    pos: number
  ) => {
    if (e.key === "Enter" || e.key === "ArrowDown") {
      e.preventDefault();
      if (pos < 3) focusCell(machineIdx, pos + 1);
      else focusCell(machineIdx + 1, 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (pos > 1) focusCell(machineIdx, pos - 1);
      else focusCell(machineIdx - 1, 3);
    }
  };

  const filledLines = rows.filter((r) => r.flock_id).length;

  return (
    <div className="space-y-4" ref={containerRef}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find a setter (e.g. 15, DHN-01)…"
            className="pl-8"
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch id="only-filled" checked={onlyFilled} onCheckedChange={setOnlyFilled} />
          <Label htmlFor="only-filled" className="text-sm">Only filled</Label>
        </div>
        <Badge variant="secondary" className="tabular-nums">
          {filledLines} line{filledLines === 1 ? "" : "s"} entered
        </Badge>
        <Badge variant="outline" className="tabular-nums">
          {visibleSetters.length} setters shown
        </Badge>
      </div>

      {visibleSetters.length === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No multi-setter machines match this search.
        </p>
      )}

      {/* Setter cards — 3 positions each, like the paper card */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {visibleSetters.map((s, machineIdx) => {
          const setterRows = POSITIONS.map((p) => rowFor(s.id, p));
          const hasAny = setterRows.some((r) => r?.flock_id);
          const size = setterRows.find((r) => r)?.eggs_per_buggy ?? DEFAULT_BUGGY_SIZE;
          return (
            <Card
              key={s.id}
              className={hasAny ? "border-primary/40 bg-primary/[0.03]" : undefined}
            >
              <CardContent className="p-3 space-y-2">
                {/* Card header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold truncate">{s.machine_number}</span>
                    {s.location && (
                      <span className="text-xs text-muted-foreground truncate">{s.location}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Fill position 1 down to 2 & 3"
                      disabled={!canWrite || !setterRows[0]?.flock_id}
                      onClick={() => fillDown(s.id)}
                    >
                      <ArrowDownToLine className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Copy the previous setter"
                      disabled={!canWrite || machineIdx === 0}
                      onClick={() => copyPrevious(machineIdx)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Clear this setter"
                      disabled={!canWrite || !hasAny}
                      onClick={() => clearSetter(s.id)}
                    >
                      <Eraser className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Column labels */}
                <div className="grid grid-cols-[18px_1fr_92px_52px_24px] gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                  <span>#</span>
                  <span>Flock #</span>
                  <span>Date</span>
                  <span>Bug.</span>
                  <span />
                </div>

                {/* Three position lines */}
                {POSITIONS.map((pos) => {
                  const r = setterRows[pos - 1];
                  const text = flockText[cellKey(s.id, pos)] ??
                    (r?.flock_id
                      ? String(flocks.find((f) => f.id === r.flock_id)?.flock_number ?? "")
                      : "");
                  const resolved = r?.flock_id
                    ? flocks.find((f) => f.id === r.flock_id)
                    : undefined;
                  const unknown = !!text.trim() && !resolved;
                  return (
                    <div key={pos} className="space-y-0.5">
                      <div className="grid grid-cols-[18px_1fr_92px_52px_24px] gap-1.5 items-center">
                        <span className="text-xs text-muted-foreground tabular-nums">{pos}</span>
                        <Input
                          data-flock-cell={cellKey(s.id, pos)}
                          inputMode="numeric"
                          value={text}
                          disabled={!canWrite}
                          placeholder="6501"
                          onChange={(e) => onFlockInput(s.id, pos, e.target.value)}
                          onKeyDown={(e) => onFlockKeyDown(e, machineIdx, pos)}
                          className={`h-8 tabular-nums ${unknown ? "border-destructive" : ""}`}
                        />
                        <Input
                          type="date"
                          value={r?.set_date || defaultDate}
                          disabled={!canWrite || !r}
                          onChange={(e) => patchCell(s.id, pos, { set_date: e.target.value })}
                          className="h-8 px-1 text-xs"
                        />
                        <Input
                          type="number"
                          min={0}
                          value={r?.buggies_set ?? ""}
                          disabled={!canWrite || !r}
                          onChange={(e) =>
                            patchCell(s.id, pos, { buggies_set: parseInt(e.target.value) || 0 })
                          }
                          className="h-8 px-1 tabular-nums"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Clear line"
                          disabled={!canWrite || !r}
                          onClick={() => clearCell(s.id, pos)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      {resolved && (
                        <div className="pl-[26px] text-[10px] text-muted-foreground truncate">
                          {resolved.flock_name}
                          {resolved.house_number ? ` · House ${resolved.house_number}` : ""}
                        </div>
                      )}
                      {unknown && (
                        <div className="pl-[26px] text-[10px] text-destructive">
                          No flock #{text.trim()} found — it won&apos;t be saved
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Buggy size for the whole setter */}
                <div className="flex items-center gap-2 pt-1 border-t">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Buggy size
                  </span>
                  <Select
                    value={String(size)}
                    onValueChange={(v) => setSetterBuggySize(s.id, parseInt(v))}
                    disabled={!canWrite || !hasAny}
                  >
                    <SelectTrigger className="h-7 w-[110px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BUGGY_SIZES.map((b) => (
                        <SelectItem key={b} value={String(b)}>
                          {b.toLocaleString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default SetReportGrid;
