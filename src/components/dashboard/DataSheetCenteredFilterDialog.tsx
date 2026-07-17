import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Filter,
  Check,
  ArrowUpDown,
  CalendarRange,
  UserSearch,
  Building2,
  Cpu,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface FilterOption {
  id: string;
  name: string;
}

interface DataSheetFilters {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  selectedHatcheries: string[];
  selectedMachines: string[];
  technicianSearch: string;
  dateFrom: string;
  dateTo: string;
}

interface DataSheetCenteredFilterDialogProps {
  filters: DataSheetFilters;
  setFilters: React.Dispatch<React.SetStateAction<any>>;
  hatcheries: FilterOption[];
  machines: FilterOption[];
  sortByOptions: { value: string; label: string }[];
  activeFilterCount: number;
  onClearFilters: () => void;
  onToggleHatchery: (id: string) => void;
  onToggleMachine: (id: string) => void;
}

/* ---------- helpers ---------- */

function SectionCard({
  icon: Icon,
  title,
  action,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-muted/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-3.5 w-3.5" />
          </span>
          <h3 className="text-sm font-medium">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        selected
          ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15"
          : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {selected && <Check className="h-3 w-3" />}
      {children}
    </button>
  );
}

/* ---------- component ---------- */

export const DataSheetCenteredFilterDialog = ({
  filters,
  setFilters,
  hatcheries,
  machines,
  sortByOptions,
  activeFilterCount,
  onClearFilters,
  onToggleHatchery,
  onToggleMachine,
}: DataSheetCenteredFilterDialogProps) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DataSheetFilters>(filters);

  useEffect(() => {
    if (open) setDraft(filters);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleDraftHatchery = (id: string) =>
    setDraft((prev) => ({
      ...prev,
      selectedHatcheries: prev.selectedHatcheries.includes(id)
        ? prev.selectedHatcheries.filter((h) => h !== id)
        : [...prev.selectedHatcheries, id],
    }));

  const toggleDraftMachine = (id: string) =>
    setDraft((prev) => ({
      ...prev,
      selectedMachines: prev.selectedMachines.includes(id)
        ? prev.selectedMachines.filter((m) => m !== id)
        : [...prev.selectedMachines, id],
    }));

  const draftActiveCount = useMemo(() => {
    let n = 0;
    if (draft.selectedHatcheries.length) n++;
    if (draft.selectedMachines.length) n++;
    if (draft.technicianSearch.trim()) n++;
    if (draft.dateFrom) n++;
    if (draft.dateTo) n++;
    return n;
  }, [draft]);

  const handleApply = () => {
    setFilters(draft);
    setOpen(false);
  };

  const handleClearDraft = () => {
    setDraft({
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
      selectedHatcheries: [],
      selectedMachines: [],
      technicianSearch: '',
      dateFrom: '',
      dateTo: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2 rounded-full">
          <Filter className="h-3.5 w-3.5" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-0.5 h-5 px-1.5 text-[10px]">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[720px] max-h-[85vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-2">
            <DialogTitle className="text-lg">Filter Options</DialogTitle>
            {draftActiveCount > 0 && (
              <Badge variant="secondary" className="h-5 px-2 text-[10px] rounded-full">
                {draftActiveCount} active
              </Badge>
            )}
          </div>
          <DialogDescription className="text-xs mt-1">
            Refine what's shown in the data sheet.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="p-6 space-y-4">
            {/* Sorting */}
            <SectionCard icon={ArrowUpDown} title="Sorting">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Sort By</Label>
                  <Select
                    value={draft.sortBy}
                    onValueChange={(value) => setDraft((prev) => ({ ...prev, sortBy: value }))}
                  >
                    <SelectTrigger className="h-9 bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sortByOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Order</Label>
                  <Select
                    value={draft.sortOrder}
                    onValueChange={(value: 'asc' | 'desc') => setDraft((prev) => ({ ...prev, sortOrder: value }))}
                  >
                    <SelectTrigger className="h-9 bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">Ascending</SelectItem>
                      <SelectItem value="desc">Descending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </SectionCard>

            {/* Date Range */}
            <SectionCard icon={CalendarRange} title="Date Range">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">From</Label>
                  <DatePicker
                    date={draft.dateFrom}
                    onSelect={(date) => {
                      const dateStr = date ? format(date, 'yyyy-MM-dd') : '';
                      setDraft((prev) => ({ ...prev, dateFrom: dateStr }));
                    }}
                    placeholder="From date"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">To</Label>
                  <DatePicker
                    date={draft.dateTo}
                    onSelect={(date) => {
                      const dateStr = date ? format(date, 'yyyy-MM-dd') : '';
                      setDraft((prev) => ({ ...prev, dateTo: dateStr }));
                    }}
                    placeholder="To date"
                    className="h-9"
                  />
                </div>
              </div>
            </SectionCard>

            {/* Technician */}
            <SectionCard icon={UserSearch} title="Technician">
              <Input
                placeholder="Search by technician name…"
                value={draft.technicianSearch}
                onChange={(e) => setDraft((prev) => ({ ...prev, technicianSearch: e.target.value }))}
                className="h-9 bg-background"
              />
            </SectionCard>

            {/* Hatcheries */}
            {hatcheries.length > 0 && (
              <SectionCard
                icon={Building2}
                title="Hatcheries"
                action={
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({ ...prev, selectedHatcheries: hatcheries.map((h) => h.id) }))
                      }
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Select all
                    </button>
                    <span className="text-border">·</span>
                    <button
                      type="button"
                      onClick={() => setDraft((prev) => ({ ...prev, selectedHatcheries: [] }))}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Clear
                    </button>
                  </div>
                }
              >
                <div className="flex flex-wrap gap-1.5">
                  {hatcheries.map((h) => (
                    <Chip
                      key={h.id}
                      selected={draft.selectedHatcheries.includes(h.id)}
                      onClick={() => toggleDraftHatchery(h.id)}
                    >
                      {h.name}
                    </Chip>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* Machines */}
            {machines.length > 0 && (
              <SectionCard
                icon={Cpu}
                title="Machines"
                action={
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({ ...prev, selectedMachines: machines.map((m) => m.id) }))
                      }
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Select all
                    </button>
                    <span className="text-border">·</span>
                    <button
                      type="button"
                      onClick={() => setDraft((prev) => ({ ...prev, selectedMachines: [] }))}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Clear
                    </button>
                  </div>
                }
              >
                <div className="flex flex-wrap gap-1.5">
                  {machines.map((m) => (
                    <Chip
                      key={m.id}
                      selected={draft.selectedMachines.includes(m.id)}
                      onClick={() => toggleDraftMachine(m.id)}
                    >
                      {m.name}
                    </Chip>
                  ))}
                </div>
              </SectionCard>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-row items-center justify-between border-t bg-muted/20 px-6 py-3 sm:justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearDraft}
            disabled={draftActiveCount === 0}
            className="text-muted-foreground hover:text-foreground"
          >
            Clear all
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleApply}>
              <Check className="h-4 w-4 mr-1" />
              Apply Filters
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
