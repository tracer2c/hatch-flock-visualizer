import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Filter, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FilterOption {
  id: string;
  name: string;
}

interface DataSheetCenteredFilterDialogProps {
  filters: {
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    selectedHatcheries: string[];
    selectedMachines: string[];
    technicianSearch: string;
    dateFrom: string;
    dateTo: string;
    dataType: 'all' | 'original' | 'dummy';
  };
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
  return (
    <Dialog>
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
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={onClearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Sorting Section */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm">Sorting</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Sort By</Label>
                  <Select 
                    value={filters.sortBy} 
                    onValueChange={(value) => setFilters((prev: any) => ({ ...prev, sortBy: value }))}
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
                    value={filters.sortOrder} 
                    onValueChange={(value: 'asc' | 'desc') => setFilters((prev: any) => ({ ...prev, sortOrder: value }))}
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
                  <Input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters((prev: any) => ({ ...prev, dateFrom: e.target.value }))}
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">To</Label>
                  <Input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters((prev: any) => ({ ...prev, dateTo: e.target.value }))}
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
                value={filters.technicianSearch}
                onChange={(e) => setFilters((prev: any) => ({ ...prev, technicianSearch: e.target.value }))}
                className="h-9"
              />
            </div>

            {/* Data Type Filter */}
            <div className="space-y-3">
              <h3 className="font-medium text-sm">Data Type</h3>
              <Select 
                value={filters.dataType} 
                onValueChange={(value: 'all' | 'original' | 'dummy') => setFilters((prev: any) => ({ ...prev, dataType: value }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Data</SelectItem>
                  <SelectItem value="original">✓ Original Data Only</SelectItem>
                  <SelectItem value="dummy">🎓 Dummy Data Only</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Filter to show only original production data or dummy training data
              </p>
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
                        checked={filters.selectedHatcheries.includes(hatchery.id)}
                        onCheckedChange={() => onToggleHatchery(hatchery.id)}
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
                        checked={filters.selectedMachines.includes(machine.id)}
                        onCheckedChange={() => onToggleMachine(machine.id)}
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
      </DialogContent>
    </Dialog>
  );
};
