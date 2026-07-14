import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Home } from "lucide-react";
import type { FlockWeekBatch } from "@/hooks/useFlockWeekBatches";

export const WHOLE_FLOCK_VALUE = "__whole__";

interface Props {
  batches: FlockWeekBatch[];
  value: string; // batch_id or WHOLE_FLOCK_VALUE
  onChange: (batchId: string) => void;
  disabled?: boolean;
}

/**
 * Optional House # picker rendered inside flock-week entry forms.
 * Defaults to "Whole flock (unspecified)". If a house is selected the entry
 * is saved against that house's batch; otherwise it falls back to the flock's
 * primary (first) batch to keep schema unchanged.
 */
export function HouseSelectField({ batches, value, onChange, disabled }: Props) {
  return (
    <div className="rounded-lg border bg-background p-3 flex flex-col md:flex-row md:items-center gap-3">
      <div className="flex items-center gap-2 text-sm font-medium min-w-[140px]">
        <Home className="h-4 w-4 text-primary" />
        House # (optional)
      </div>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="max-w-sm">
          <SelectValue placeholder="Whole flock (unspecified)" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={WHOLE_FLOCK_VALUE}>
            Whole flock (unspecified)
          </SelectItem>
          {batches.map((b) => (
            <SelectItem key={b.id} value={b.id}>
              House {b.house_number || "—"} · {b.total_eggs_set.toLocaleString()}{" "}
              eggs
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Leave blank to record for the whole flock/week.
      </p>
    </div>
  );
}

/** Resolve the batch_id to save against given a selector value. */
export function resolveBatchId(
  value: string,
  batches: FlockWeekBatch[]
): string | null {
  if (value && value !== WHOLE_FLOCK_VALUE) return value;
  return batches[0]?.id ?? null;
}
