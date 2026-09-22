import { format } from "date-fns";
import type { HouseMatrixField, HouseMatrixRowSnapshot } from "./HouseMatrixEntry";

interface Props {
  title: string;
  companyName: string;
  printedBy: string;
  role?: string;
  flockLabel: string;
  weekLabel: string;
  technician: string;
  fields: HouseMatrixField[];
  rows: HouseMatrixRowSnapshot[];
}

/**
 * Print-only paper copy of a by-house entry sheet (Egg Pack / Fertility /
 * Residue). Shows the data exactly as entered on screen.
 */
const HouseMatrixPrintView = ({
  title,
  companyName,
  printedBy,
  role,
  flockLabel,
  weekLabel,
  technician,
  fields,
  rows,
}: Props) => {
  const printedAt = new Date();
  const num = (v: string | undefined) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const totals = fields.map((f) => rows.reduce((s, r) => s + num(r.values[f.key]), 0));

  return (
    <div id="sheet-print-root" className="print-only text-black text-[11px] leading-tight">
      <div className="border-b-2 border-black pb-2 mb-3">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-base font-bold uppercase tracking-wide">{companyName}</div>
            <div className="text-sm font-semibold">{title}</div>
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
              {rows.length} {rows.length === 1 ? "house" : "houses"}
            </div>
          </div>
        </div>
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-black text-left">
            <th className="px-1 py-0.5 font-semibold">House</th>
            <th className="px-1 py-0.5 font-semibold">Machine</th>
            <th className="px-1 py-0.5 font-semibold text-right">Eggs Set</th>
            {fields.map((f) => (
              <th key={f.key} className="px-1 py-0.5 font-semibold text-right">
                {f.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.houseNumber}-${i}`} className="border-b border-neutral-300">
              <td className="px-1 py-0.5">House {r.houseNumber || "—"}</td>
              <td className="px-1 py-0.5">{r.machineNumber || ""}</td>
              <td className="px-1 py-0.5 text-right tabular-nums">
                {r.eggsSet.toLocaleString()}
              </td>
              {fields.map((f) => (
                <td key={f.key} className="px-1 py-0.5 text-right tabular-nums">
                  {r.values[f.key] ?? ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-black font-semibold">
            <td className="px-1 py-0.5">Flock total</td>
            <td className="px-1 py-0.5" />
            <td className="px-1 py-0.5 text-right tabular-nums">
              {rows.reduce((s, r) => s + r.eggsSet, 0).toLocaleString()}
            </td>
            {totals.map((t, i) => (
              <td key={fields[i].key} className="px-1 py-0.5 text-right tabular-nums">
                {t.toLocaleString()}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>

      <div className="mt-3 pt-1 border-t border-neutral-400 text-[10px]">
        Printed from Hatchery Pro
      </div>
    </div>
  );
};

export default HouseMatrixPrintView;
