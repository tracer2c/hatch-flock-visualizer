import { format } from "date-fns";
import { parseLocalDate } from "@/utils/localDate";
import type { ClearsSheetRowSnapshot } from "./WeeklyClearsSheet";

interface Props {
  companyName: string;
  printedBy: string;
  role?: string;
  flockLabel: string;
  weekLabel: string;
  technician: string;
  rows: ClearsSheetRowSnapshot[];
}

const fmtInt = (n: number | null | undefined) =>
  n == null ? "" : Math.round(n).toLocaleString();
const fmtPct = (n: number | null | undefined) =>
  n == null ? "" : `${n.toFixed(2)}%`;
const dayLabel = (iso: string) => {
  const d = parseLocalDate(iso);
  return d ? format(d, "EEE MMM d") : iso;
};

/** Print-only paper copy of the weekly Clears / Injected / Hatch sheet. */
const WeeklyClearsPrintView = ({
  companyName,
  printedBy,
  role,
  flockLabel,
  weekLabel,
  technician,
  rows,
}: Props) => {
  const printedAt = new Date();
  const sum = (pick: (r: ClearsSheetRowSnapshot) => number | null) =>
    rows.reduce((s, r) => s + (pick(r) ?? 0), 0);
  const sample = sum((r) => r.sampleSize);
  const clears = sum((r) => r.clears);
  const injected = sum((r) => r.injected);
  const hatch = sum((r) => r.hatch);

  return (
    <div id="sheet-print-root" className="print-only text-black text-[11px] leading-tight">
      <div className="border-b-2 border-black pb-2 mb-3">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-base font-bold uppercase tracking-wide">{companyName}</div>
            <div className="text-sm font-semibold">Clears, Injected &amp; Hatch — Set Week</div>
            <div>{flockLabel}</div>
            <div>Set week: {weekLabel}</div>
          </div>
          <div className="text-right">
            <div>
              Printed by: <strong>{printedBy}</strong>
              {role ? ` (${role})` : ""}
            </div>
            <div>Printed on: {format(printedAt, "EEE, MMM d, yyyy · h:mm a")}</div>
            {technician && (
              <div>
                Technician: <strong>{technician}</strong>
              </div>
            )}
            <div>
              {rows.length} {rows.length === 1 ? "set record" : "set records"}
            </div>
          </div>
        </div>
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-black text-left">
            <th className="px-1 py-0.5 font-semibold">Set Date</th>
            <th className="px-1 py-0.5 font-semibold">House</th>
            <th className="px-1 py-0.5 font-semibold text-right">Sample Size</th>
            <th className="px-1 py-0.5 font-semibold text-right">Clears</th>
            <th className="px-1 py-0.5 font-semibold text-right">Injected</th>
            <th className="px-1 py-0.5 font-semibold text-right">Injection %</th>
            <th className="px-1 py-0.5 font-semibold text-right">Hatch</th>
            <th className="px-1 py-0.5 font-semibold text-right">Hatch %</th>
            <th className="px-1 py-0.5 font-semibold text-right">HOI %</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.setDate}-${r.houseNumber}-${i}`} className="border-b border-neutral-300">
              <td className="px-1 py-0.5">{dayLabel(r.setDate)}</td>
              <td className="px-1 py-0.5">House {r.houseNumber || "—"}</td>
              <td className="px-1 py-0.5 text-right tabular-nums">{fmtInt(r.sampleSize)}</td>
              <td className="px-1 py-0.5 text-right tabular-nums">{fmtInt(r.clears)}</td>
              <td className="px-1 py-0.5 text-right tabular-nums">{fmtInt(r.injected)}</td>
              <td className="px-1 py-0.5 text-right tabular-nums">{fmtPct(r.injectionPct)}</td>
              <td className="px-1 py-0.5 text-right tabular-nums">{fmtInt(r.hatch)}</td>
              <td className="px-1 py-0.5 text-right tabular-nums">{fmtPct(r.hatchPct)}</td>
              <td className="px-1 py-0.5 text-right tabular-nums">{fmtPct(r.hoiPct)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-black font-semibold">
            <td className="px-1 py-0.5">Flock total</td>
            <td className="px-1 py-0.5" />
            <td className="px-1 py-0.5 text-right tabular-nums">{fmtInt(sample)}</td>
            <td className="px-1 py-0.5 text-right tabular-nums">{fmtInt(clears)}</td>
            <td className="px-1 py-0.5 text-right tabular-nums">{fmtInt(injected)}</td>
            <td className="px-1 py-0.5 text-right tabular-nums">
              {sample > 0 ? fmtPct((injected / sample) * 100) : ""}
            </td>
            <td className="px-1 py-0.5 text-right tabular-nums">{fmtInt(hatch)}</td>
            <td className="px-1 py-0.5 text-right tabular-nums">
              {sample > 0 ? fmtPct((hatch / sample) * 100) : ""}
            </td>
            <td className="px-1 py-0.5 text-right tabular-nums">
              {injected > 0 ? fmtPct((hatch / injected) * 100) : ""}
            </td>
          </tr>
        </tfoot>
      </table>

      <div className="mt-3 pt-1 border-t border-neutral-400 text-[10px]">
        Printed from Hatchery Pro
      </div>
    </div>
  );
};

export default WeeklyClearsPrintView;
