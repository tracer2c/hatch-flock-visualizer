import { useNavigate, useLocation } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Home } from "lucide-react";
import { useFlockWeekHouses } from "@/hooks/useFlockWeekHouses";

interface Props {
  /** Current houseId (batch_id) that the entry page is showing */
  currentHouseId: string;
  /** URL segment that follows /data-entry/house/:houseId/ — e.g. "egg-pack" */
  entrySegment: "egg-pack" | "fertility" | "residue" | "clears-injected";
}

/**
 * House # dropdown rendered inside Data Entry forms when the user arrived
 * from the Weekly Flock Rollup drill-down. Switching houses navigates to the
 * same entry type under the newly selected house while preserving the
 * `flockKey` and `week` query params so the switcher stays visible.
 *
 * If no `flockKey`/`week` params are present in the URL, the component
 * renders nothing — the page falls back to its legacy single-house layout.
 */
export function FlockWeekHouseSwitcher({ currentHouseId, entrySegment }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const flockKey = params.get("flockKey");
  const week = params.get("week");

  const { data: houses = [] } = useFlockWeekHouses({
    flockKey,
    weekStart: week,
    enabled: Boolean(flockKey && week),
  });

  if (!flockKey || !week) return null;
  if (!houses.length) return null;

  return (
    <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-2 rounded-md border bg-muted/40 p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Home className="h-4 w-4 text-primary" />
        House #
      </div>
      <div className="sm:w-72">
        <Select
          value={currentHouseId}
          onValueChange={(nextId) => {
            if (nextId === currentHouseId) return;
            navigate(
              `/data-entry/house/${nextId}/${entrySegment}?flockKey=${encodeURIComponent(
                flockKey
              )}&week=${encodeURIComponent(week)}`
            );
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select house #" />
          </SelectTrigger>
          <SelectContent>
            {houses.map((h) => (
              <SelectItem key={h.batch_id} value={h.batch_id}>
                House {h.house_number || "—"}
                {h.total_eggs_set
                  ? ` · ${h.total_eggs_set.toLocaleString()} eggs`
                  : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="text-xs text-muted-foreground sm:ml-2">
        Switch houses within this flock/week without leaving the form.
      </div>
    </div>
  );
}
