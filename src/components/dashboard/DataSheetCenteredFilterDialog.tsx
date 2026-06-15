import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Filter, X, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";

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
  // Local draft so nothing applies until the user clicks "Apply Filters".
  const [draft, setDraft] = useState<DataSheetFilters>(filters);

  // Reset the draft from the live filters every time the dialog opens.
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
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1">{activeFilterCount}</Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Filter Options</DialogTitle>
            <Button variant="ghost" size="sm" onClick={handleClearDraft}>
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[55vh] pr-4">
          <div className="space-y-6">
            {/* Sorting Section */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm">Sorting</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Sort By</Label>
                  <Select
                    value={draft.sortBy}
                    onValueChange={(value) => setDraft((prev) => ({ ...prev, sortBy: value }))}
                  >
                    <SelectTrigger className="h-9">
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

                <div className="space-y-2">
                  <Label className="text-xs">Order</Label>
                  <Select
                    value={draft.sortOrder}
                    onValueChange={(value: 'asc' | 'desc') => setDraft((prev) => ({ ...prev, sortOrder: value }))}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">Ascending</SelectItem>
                      <SelectItem value="desc">Descending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Date Range Section */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm">Date Range</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">From</Label>
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
                <div className="space-y-2">
                  <Label className="text-xs">To</Label>
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
            </div>

            {/* Technician Search */}
            <div className="space-y-2">
              <Label className="text-xs">Technician Name</Label>
              <Input
                placeholder="Search by technician..."
                value={draft.technicianSearch}
                onChange={(e) => setDraft((prev) => ({ ...prev, technicianSearch: e.target.value }))}
                className="h-9"
              />
            </div>

            {/* Hatcheries Section */}
            <div className="space-y-3">
              <h3 className="font-medium text-sm">Hatcheries</h3>
              <ScrollArea className="h-[140px] border rounded-md p-3">
                <div className="space-y-2">
                  {hatcheries.map((hatchery) => (
                    <div key={hatchery.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`hatchery-${hatchery.id}`}
                        checked={draft.selectedHatcheries.includes(hatchery.id)}
                        onCheckedChange={() => toggleDraftHatchery(hatchery.id)}
                      />
                      <label
                        htmlFor={`hatchery-${hatchery.id}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {hatchery.name}
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Machines Section */}
            <div className="space-y-3">
              <h3 className="font-medium text-sm">Machines</h3>
              <ScrollArea className="h-[140px] border rounded-md p-3">
                <div className="space-y-2">
                  {machines.map((machine) => (
                    <div key={machine.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`machine-${machine.id}`}
                        checked={draft.selectedMachines.includes(machine.id)}
                        onCheckedChange={() => toggleDraftMachine(machine.id)}
                      />
                      <label
                        htmlFor={`machine-${machine.id}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {machine.name}
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleApply}>
            <Check className="h-4 w-4 mr-1" />
            Apply Filters
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
