import { format } from "date-fns";
import {
  SHORT_BUGGY_EGGS,
  TALL_BUGGY_EGGS,
  rowEggsSet,
  DEFAULT_BUGGY_SIZE,
} from "@/config/multiStage";

/** One printed line on a setter card. */
export type PrintLine = {
  /** Line/position label as it reads on paper ("A", "1–4", "7"). */
  label: string;
  flockNumber: string;
  houseNumber: string;
  ageWeeks: number | null;
  eggsPerBuggy: number;
  buggies: number;
};

export type PrintSetter = {
  machineNumber: string;
  location: string | null;
  lines: PrintLine[];
};

export type SetSheetPrintViewProps = {
  title: string;
  companyName: string;
  printedBy: string;
  role?: string;
  location: string;
  /** Label/value pairs shown in the Operation summary block. */
  summary: { label: string; value: string }[];
  totals: { buggies: number; eggs: number; projectedHatch: number };
  setters: PrintSetter[];
  notes?: string;
};

const heightLabel = (eggs: number): string => {
  if (eggs === TALL_BUGGY_EGGS) return "T";
  if (eggs === SHORT_BUGGY_EGGS) return "S";
  return "—";
};

/**
 * Print-only paper copy of a set sheet. Hidden on screen (see `.print-only`
 * in index.css) and the only visible element while printing.
 */
const SetSheetPrintView = ({
  title,
  companyName,
  printedBy,
  role,
  location,
  summary,
  totals,
  setters,
  notes,
}: SetSheetPrintViewProps) => {
  const printedAt = new Date();

  return (
    <div id="sheet-print-root" className="print-only text-black text-[11px] leading-tight">
      {/* Header band */}
      <div className="border-b-2 border-black pb-2 mb-3">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-base font-bold uppercase tracking-wide">{companyName}</div>
            <div className="text-sm font-semibold">{title}</div>
            {location && <div>Location: {location}</div>}
          </div>
          <div className="text-right">
            <div>
              Printed by: <strong>{printedBy}</strong>
              {role ? ` (${role})` : ""}
            </div>
            <div>Printed on: {format(printedAt, "EEE, MMM d, yyyy · h:mm a")}</div>
          </div>
        </div>
      </div>

      {/* Operation summary */}
      <div className="mb-3">
        <div className="font-semibold uppercase tracking-wide mb-1">Operation</div>
        <div className="grid grid-cols-4 gap-x-6 gap-y-1">
          {summary.map((s) => (
            <div key={s.label} className="flex justify-between border-b border-neutral-300 pb-0.5">
              <span>{s.label}</span>
              <strong>{s.value || "—"}</strong>
            </div>
          ))}
          <div className="flex justify-between border-b border-neutral-300 pb-0.5">
            <span>Buggies In</span>
            <strong>{totals.buggies}</strong>
          </div>
          <div className="flex justify-between border-b border-neutral-300 pb-0.5">
            <span>Total Eggs Set</span>
            <strong>{totals.eggs.toLocaleString()}</strong>
          </div>
          <div className="flex justify-between border-b border-neutral-300 pb-0.5">
            <span>Est. Hatch</span>
            <strong>{totals.projectedHatch.toLocaleString()}</strong>
          </div>
        </div>
      </div>

      {/* Setter cards */}
      <div className="font-semibold uppercase tracking-wide mb-1">Set Report — All Setters</div>
      <div className="grid grid-cols-2 gap-3">
        {setters.map((s) => {
          const buggies = s.lines.reduce((n, l) => n + l.buggies, 0);
          const eggs = s.lines.reduce(
            (n, l) => n + rowEggsSet(l.buggies, l.eggsPerBuggy || DEFAULT_BUGGY_SIZE),
            0
          );
          const tall = s.lines.filter((l) => heightLabel(l.eggsPerBuggy) === "T").length;
          const short = s.lines.filter((l) => heightLabel(l.eggsPerBuggy) === "S").length;
          return (
            <div key={s.machineNumber} className="border border-black avoid-break">
              <div className="flex items-baseline justify-between border-b border-black px-1.5 py-1">
                <span className="font-bold">{s.machineNumber}</span>
                {s.location && <span>{s.location}</span>}
              </div>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-neutral-400 text-left">
                    <th className="px-1 py-0.5 font-semibold">Line</th>
                    <th className="px-1 py-0.5 font-semibold">Flock</th>
                    <th className="px-1 py-0.5 font-semibold">House</th>
                    <th className="px-1 py-0.5 font-semibold">Age</th>
                    <th className="px-1 py-0.5 font-semibold">T/S</th>
                    <th className="px-1 py-0.5 font-semibold text-right">Buggies</th>
                    <th className="px-1 py-0.5 font-semibold text-right">Eggs</th>
                  </tr>
                </thead>
                <tbody>
                  {s.lines.map((l, i) => (
                    <tr key={`${l.label}-${i}`} className="border-b border-neutral-200">
                      <td className="px-1 py-0.5">{l.label}</td>
                      <td className="px-1 py-0.5">{l.flockNumber || ""}</td>
                      <td className="px-1 py-0.5">{l.houseNumber || ""}</td>
                      <td className="px-1 py-0.5">{l.ageWeeks ?? ""}</td>
                      <td className="px-1 py-0.5">{heightLabel(l.eggsPerBuggy)}</td>
                      <td className="px-1 py-0.5 text-right tabular-nums">{l.buggies || ""}</td>
                      <td className="px-1 py-0.5 text-right tabular-nums">
                        {l.buggies
                          ? rowEggsSet(l.buggies, l.eggsPerBuggy || DEFAULT_BUGGY_SIZE).toLocaleString()
                          : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-black px-1.5 py-1 flex justify-between">
                <span>
                  {tall} T · {short} S
                </span>
                <span>
                  {buggies} buggies · {eggs.toLocaleString()} eggs
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {notes && (
        <div className="mt-3 border-t border-neutral-400 pt-1">
          <span className="font-semibold">Notes: </span>
          {notes}
        </div>
      )}

      <div className="mt-3 pt-1 border-t border-neutral-400 text-[10px] flex justify-between">
        <span>Printed from Hatchery Pro</span>
        <span>
          {setters.length} setters · {totals.buggies} buggies · {totals.eggs.toLocaleString()} eggs
        </span>
      </div>
    </div>
  );
};

export default SetSheetPrintView;
