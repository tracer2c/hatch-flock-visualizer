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
import { ArrowDownToLine, Copy, Eraser, Search } from "lucide-react";
import { BUGGY_SIZES, DEFAULT_BUGGY_SIZE, rowEggsSet } from "@/config/multiStage";
import type { FlockOption, SetterOption } from "@/hooks/useMultiStage";
import type { SingleStageRow } from "@/hooks/useSingleStage";

/** The paper sheet has 20 numbered buggy lines per setter (1–10 | 11–20). */
export const BUGGY_LINES = Array.from({ length: 20 }, (_, i) => i + 1);
const LEFT_LINES = BUGGY_LINES.slice(0, 10);
const RIGHT_LINES = BUGGY_LINES.slice(10);

/** Egg height code written next to the flock number on the sheet. */
export type HeightCode = "T" | "S";
const HEIGHT_LABEL: Record<HeightCode, string> = { T: "Tall", S: "Short" };

/** Wayne single-stage buggies: tall holds 5,508 eggs, short holds 4,860. */
export const TALL_BUGGY_EGGS = 5508;
export const SHORT_BUGGY_EGGS = 4860;
type HeightSizes = Record<HeightCode, number>;
const DEFAULT_HEIGHT_SIZES: HeightSizes = { T: TALL_BUGGY_EGGS, S: SHORT_BUGGY_EGGS };

type Cell = { flock_id: string; height: HeightCode };
type CellMap = Map<string, Cell>; // `${machine_id}:${line}` → cell


interface Props {
  setters: SetterOption[];
  flocks: FlockOption[];
  rows: SingleStageRow[];
  onRowsChange: (rows: SingleStageRow[]) => void;
  /** Header set date — used for the sheet strip context only. */
  defaultDate: string;
  carryOver: string;
  onCarryOverChange: (v: string) => void;
  canWrite: boolean;
}

const key = (machineId: string, line: number) => `${machineId}:${line}`;

/**
 * Explode saved rows back into per-line cells. A row carries the lines it
 * occupies in `buggy_numbers` and its egg height in `notes`.
 */
function rowsToCells(rows: SingleStageRow[]): CellMap {
  const cells: CellMap = new Map();
  for (const r of rows) {
    if (!r.flock_id) continue;
    const height: HeightCode = r.notes === "S" ? "S" : "T";
    const lines = (r.buggy_numbers ?? [])
      .map((n) => parseInt(String(n), 10))
      .filter((n) => Number.isFinite(n));
    for (const line of lines) {
      cells.set(key(r.machine_id, line), { flock_id: r.flock_id, height });
    }
  }
  return cells;
}

/**
 * Collapse the per-line cells of one setter back into save-ready rows:
 * one row per flock + height group, buggies_set = how many lines it fills.
 * Each group carries the egg count of its own buggy height (tall vs short).
 */
function cellsToRows(
  machineId: string,
  cells: CellMap,
  flocks: FlockOption[],
  sizes: HeightSizes
): SingleStageRow[] {
  const groups = new Map<string, { flock_id: string; height: HeightCode; lines: number[] }>();
  for (const line of BUGGY_LINES) {
    const cell = cells.get(key(machineId, line));
    if (!cell?.flock_id) continue;
    const gk = `${cell.flock_id}|${cell.height}`;
    const g = groups.get(gk) ?? { flock_id: cell.flock_id, height: cell.height, lines: [] };
    g.lines.push(line);
    groups.set(gk, g);
  }
  return [...groups.values()].map((g) => {
    const flock = flocks.find((f) => f.id === g.flock_id);
    return {
      tempId: crypto.randomUUID(),
      machine_id: machineId,
      flock_id: g.flock_id,
      house_number: flock?.house_number ?? "",
      age_weeks: flock?.age_weeks ?? null,
      expected_hatch_percent: null,
      buggies_set: g.lines.length,
      buggies_transferred: 0,
      eggs_per_buggy: sizes[g.height] ?? DEFAULT_HEIGHT_SIZES[g.height],
      location: String(Math.min(...g.lines)),
      buggy_numbers: g.lines.map(String),
      notes: g.height,
      confirmed: true,
    } satisfies SingleStageRow;
  });
}


/**
 * Paper "SINGLE STAGE SET SHEET" style bulk entry: one card per single-stage
 * setter with the sheet's 20 numbered buggy lines, flock numbers typed straight
 * in, plus the carry-over block from the bottom of the page.
 */
const SingleStageSetSheetGrid: React.FC<Props> = ({
  setters,
  flocks,
  rows,
  onRowsChange,
  defaultDate,
  carryOver,
  onCarryOverChange,
  canWrite,
}) => {
  const [search, setSearch] = useState("");
  const [onlyFilled, setOnlyFilled] = useState(false);
  /** Raw text the tech is typing per cell, keyed `${machineId}:${line}`. */
  const [flockText, setFlockText] = useState<Record<string, string>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  const cells = useMemo(() => rowsToCells(rows), [rows]);

  // flock_number → flock (first match wins when a number repeats per hatchery)
  const flocksByNumber = useMemo(() => {
    const m = new Map<number, FlockOption>();
    for (const f of flocks) if (!m.has(f.flock_number)) m.set(f.flock_number, f);
    return m;
  }, [flocks]);

  /** Per-setter tall/short buggy sizes the tech can override on the card. */
  const [sizeOverrides, setSizeOverrides] = useState<Record<string, Partial<HeightSizes>>>({});

  const sizesOf = (machineId: string): HeightSizes => {
    const override = sizeOverrides[machineId] ?? {};
    const fromRows = (h: HeightCode) =>
      rows.find(
        (r) => r.machine_id === machineId && (r.notes === "S" ? "S" : "T") === h
      )?.eggs_per_buggy;
    return {
      T: override.T ?? fromRows("T") ?? DEFAULT_HEIGHT_SIZES.T,
      S: override.S ?? fromRows("S") ?? DEFAULT_HEIGHT_SIZES.S,
    };
  };

  /** Rewrite the rows of a single setter from a mutated cell map. */
  const commit = (machineId: string, nextCells: CellMap, sizes?: HeightSizes) => {
    const others = rows.filter((r) => r.machine_id !== machineId);
    const rebuilt = cellsToRows(
      machineId,
      nextCells,
      flocks,
      sizes ?? sizesOf(machineId)
    );
    onRowsChange([...others, ...rebuilt]);
  };


  const setCell = (machineId: string, line: number, cell: Cell | null) => {
    const next = new Map(cells);
    if (cell && cell.flock_id) next.set(key(machineId, line), cell);
    else next.delete(key(machineId, line));
    commit(machineId, next);
  };

  const cellText = (machineId: string, line: number) => {
    const k = key(machineId, line);
    if (flockText[k] !== undefined) return flockText[k];
    const cell = cells.get(k);
    if (!cell) return "";
    return String(flocks.find((f) => f.id === cell.flock_id)?.flock_number ?? "");
  };

  const onFlockInput = (machineId: string, line: number, text: string) => {
    setFlockText((t) => ({ ...t, [key(machineId, line)]: text }));
    const num = parseInt(text.trim(), 10);
    const flock = Number.isFinite(num) ? flocksByNumber.get(num) : undefined;
    if (!text.trim() || !flock) {
      // Unresolved numbers stay visible in the input but hold no row yet.
      setCell(machineId, line, null);
      return;
    }
    const existing = cells.get(key(machineId, line));
    setCell(machineId, line, { flock_id: flock.id, height: existing?.height ?? "T" });
  };

  const onHeightChange = (machineId: string, line: number, height: HeightCode) => {
    const existing = cells.get(key(machineId, line));
    if (!existing) return;
    setCell(machineId, line, { ...existing, height });
  };

  /** Change the egg count of one buggy height on a setter. */
  const setSetterHeightSize = (machineId: string, height: HeightCode, size: number) => {
    const next = { ...sizesOf(machineId), [height]: size } as HeightSizes;
    setSizeOverrides((o) => ({ ...o, [machineId]: { ...(o[machineId] ?? {}), [height]: size } }));
    commit(machineId, cells, next);
  };


  /** Copy line 1 of this setter down every remaining empty line. */
  const fillDown = (machineId: string) => {
    const first = cells.get(key(machineId, 1));
    if (!first) return;
    const next = new Map(cells);
    const text = cellText(machineId, 1);
    const textPatch: Record<string, string> = {};
    for (const line of BUGGY_LINES.slice(1)) {
      if (next.has(key(machineId, line))) continue;
      next.set(key(machineId, line), { ...first });
      textPatch[key(machineId, line)] = text;
    }
    setFlockText((t) => ({ ...t, ...textPatch }));
    commit(machineId, next);
  };

  /** Copy the whole previous setter card onto this one. */
  const copyPrevious = (machineIdx: number) => {
    const target = visibleSetters[machineIdx];
    const source = visibleSetters[machineIdx - 1];
    if (!target || !source) return;
    const next = new Map(cells);
    const textPatch: Record<string, string> = {};
    for (const line of BUGGY_LINES) {
      next.delete(key(target.id, line));
      const src = cells.get(key(source.id, line));
      if (!src) continue;
      next.set(key(target.id, line), { ...src });
      textPatch[key(target.id, line)] = cellText(source.id, line);
    }
    setFlockText((t) => ({ ...t, ...textPatch }));
    commit(target.id, next, sizesOf(source.id));
  };

  const clearSetter = (machineId: string) => {
    const next = new Map(cells);
    for (const line of BUGGY_LINES) next.delete(key(machineId, line));
    setFlockText((t) => {
      const copy = { ...t };
      for (const line of BUGGY_LINES) delete copy[key(machineId, line)];
      return copy;
    });
    commit(machineId, next);
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

  /** Enter/↓ moves to the next buggy line, ↑ to the previous one. */
  const focusCell = (machineIdx: number, line: number) => {
    const setter = visibleSetters[machineIdx];
    if (!setter) return;
    const el = containerRef.current?.querySelector<HTMLInputElement>(
      `input[data-buggy-cell="${setter.id}:${line}"]`
    );
    el?.focus();
    el?.select();
  };

  const onFlockKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    machineIdx: number,
    line: number
  ) => {
    if (e.key === "Enter" || e.key === "ArrowDown") {
      e.preventDefault();
      if (line < 20) focusCell(machineIdx, line + 1);
      else focusCell(machineIdx + 1, 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (line > 1) focusCell(machineIdx, line - 1);
      else focusCell(machineIdx - 1, 20);
    }
  };

  const filledLines = useMemo(
    () => rows.reduce((s, r) => s + (r.flock_id ? r.buggies_set || 0 : 0), 0),
    [rows]
  );

  /** One buggy line — number, flock input, Tall/Short. */
  const renderLine = (s: SetterOption, machineIdx: number, line: number) => {
    const text = cellText(s.id, line);
    const cell = cells.get(key(s.id, line));
    const resolved = cell ? flocks.find((f) => f.id === cell.flock_id) : undefined;
    const unknown = !!text.trim() && !resolved;
    return (
      <div key={line} className="grid grid-cols-[20px_1fr_52px] gap-1 items-center">
        <span className="text-[10px] text-muted-foreground tabular-nums text-right">
          {line}
        </span>
        <Input
          data-buggy-cell={key(s.id, line)}
          inputMode="numeric"
          value={text}
          disabled={!canWrite}
          placeholder="—"
          onChange={(e) => onFlockInput(s.id, line, e.target.value)}
          onKeyDown={(e) => onFlockKeyDown(e, machineIdx, line)}
          title={resolved ? `${resolved.flock_name}${resolved.house_number ? ` · House ${resolved.house_number}` : ""}` : unknown ? `No flock #${text.trim()} found` : undefined}
          className={`h-7 px-1.5 text-xs tabular-nums ${unknown ? "border-destructive" : ""}`}
        />
        <Select
          value={cell?.height ?? "T"}
          onValueChange={(v) => onHeightChange(s.id, line, v as HeightCode)}
          disabled={!canWrite || !cell}
        >
          <SelectTrigger className="h-7 px-1.5 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="T">T</SelectItem>
            <SelectItem value="S">S</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  };

  return (
    <div className="space-y-4" ref={containerRef}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find a setter (e.g. 23, 25)…"
            className="pl-8"
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch id="ss-only-filled" checked={onlyFilled} onCheckedChange={setOnlyFilled} />
          <Label htmlFor="ss-only-filled" className="text-sm">Only filled</Label>
        </div>
        <Badge variant="secondary" className="tabular-nums">
          {filledLines} buggy line{filledLines === 1 ? "" : "s"} entered
        </Badge>
        <Badge variant="outline" className="tabular-nums">
          {visibleSetters.length} setters shown
        </Badge>
        <Badge variant="outline">Set date {defaultDate}</Badge>
      </div>

      {visibleSetters.length === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No single-stage setter machines match this search.
        </p>
      )}

      {/* Setter cards — 20 buggy lines each, like the paper sheet */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {visibleSetters.map((s, machineIdx) => {
          const setterRows = rows.filter((r) => r.machine_id === s.id && r.flock_id);
          const hasAny = setterRows.length > 0;
          const sizes = sizesOf(s.id);
          const buggies = setterRows.reduce((sum, r) => sum + (r.buggies_set || 0), 0);
          const tallBuggies = setterRows.reduce(
            (sum, r) => sum + (r.notes === "S" ? 0 : r.buggies_set || 0),
            0
          );
          const shortBuggies = buggies - tallBuggies;
          const eggs = setterRows.reduce(
            (sum, r) =>
              sum + rowEggsSet(r.buggies_set || 0, r.eggs_per_buggy || DEFAULT_BUGGY_SIZE),
            0
          );
          const heights = new Set(setterRows.map((r) => (r.notes === "S" ? "S" : "T")));

          return (
            <Card
              key={s.id}
              className={hasAny ? "border-primary/40 bg-primary/[0.03]" : undefined}
            >
              <CardContent className="p-3 space-y-2">
                {/* Card header — SETTER #: n  Tall/Short */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Setter #
                    </span>
                    <span className="font-semibold truncate">{s.machine_number}</span>
                    {hasAny && (
                      <span className="text-xs text-muted-foreground">
                        {[...heights].map((h) => HEIGHT_LABEL[h as HeightCode]).join(" / ")}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Fill line 1 down through the empty lines"
                      disabled={!canWrite || !cells.get(key(s.id, 1))}
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

                {/* Two columns of 10 lines, exactly like the sheet */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  <div className="space-y-1">
                    <div className="grid grid-cols-[20px_1fr_52px] gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                      <span />
                      <span>Flock #</span>
                      <span>T/S</span>
                    </div>
                    {LEFT_LINES.map((line) => renderLine(s, machineIdx, line))}
                  </div>
                  <div className="space-y-1">
                    <div className="grid grid-cols-[20px_1fr_52px] gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                      <span />
                      <span>Flock #</span>
                      <span>T/S</span>
                    </div>
                    {RIGHT_LINES.map((line) => renderLine(s, machineIdx, line))}
                  </div>
                </div>

                {/* Per-setter footer: tall/short buggy sizes + totals */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1.5 border-t">
                  {(["T", "S"] as HeightCode[]).map((h) => (
                    <div key={h} className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {HEIGHT_LABEL[h]}
                      </span>
                      <Select
                        value={String(sizes[h])}
                        onValueChange={(v) => setSetterHeightSize(s.id, h, parseInt(v))}
                        disabled={!canWrite}
                      >
                        <SelectTrigger className="h-7 w-[96px] text-xs">
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
                  ))}
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {tallBuggies} T · {shortBuggies} S · {buggies} buggies ·{" "}
                    {eggs.toLocaleString()} eggs
                  </span>
                </div>

              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Carry-over block from the bottom of the sheet */}
      <Card>
        <CardContent className="p-3 space-y-1.5">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Carry-over
          </div>
          <Input
            value={carryOver}
            disabled={!canWrite}
            placeholder="e.g. Tall 6470-1, 6471-2"
            onChange={(e) => onCarryOverChange(e.target.value)}
          />
          <p className="text-[11px] text-muted-foreground">
            Whatever is left over after this set — saved with the operation notes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SingleStageSetSheetGrid;
