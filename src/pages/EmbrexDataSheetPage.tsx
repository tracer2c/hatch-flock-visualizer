import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Download, TrendingUp } from "lucide-react";
import { CompleteDataView } from "@/components/dashboard/CompleteDataView";
import { DataSheetCenteredFilterDialog } from "@/components/dashboard/DataSheetCenteredFilterDialog";
import { usePercentageToggle } from "@/hooks/usePercentageToggle";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const EmbrexDataSheetPage = () => {
  const [activeTab, setActiveTab] = useState("embrex");
  const [searchTerm, setSearchTerm] = useState("");
  const { showPercentages, setShowPercentages } = usePercentageToggle();
  const navigate = useNavigate();

  // Filter state
  const [filters, setFilters] = useState({
    sortBy: 'set_date' as string,
    sortOrder: 'desc' as 'asc' | 'desc',
    selectedHatcheries: [] as string[],
    selectedMachines: [] as string[],
    technicianSearch: '',
    dateFrom: '',
    dateTo: '',
  });

  const [hatcheries, setHatcheries] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  const loadFilterOptions = async () => {
    const [hatcheriesRes, machinesRes] = await Promise.all([
      supabase.from('units').select('id, name').order('name'),
      supabase.from('machines').select('id, machine_number').order('machine_number'),
    ]);

    if (hatcheriesRes.data) setHatcheries(hatcheriesRes.data.map(h => ({ id: h.id, name: h.name })));
    if (machinesRes.data) setMachines(machinesRes.data.map(m => ({ id: m.id, name: m.machine_number })));
  };

  const activeFilterCount = 
    (filters.selectedHatcheries.length > 0 ? 1 : 0) +
    (filters.selectedMachines.length > 0 ? 1 : 0) +
    (filters.technicianSearch ? 1 : 0) +
    (filters.dateFrom || filters.dateTo ? 1 : 0);

  const clearAllFilters = () => {
    setFilters({
      sortBy: 'set_date',
      sortOrder: 'desc',
      selectedHatcheries: [],
      selectedMachines: [],
      technicianSearch: '',
      dateFrom: '',
      dateTo: '',
    });
  };

  const toggleHatchery = (id: string) => {
    setFilters(prev => ({
      ...prev,
      selectedHatcheries: prev.selectedHatcheries.includes(id)
        ? prev.selectedHatcheries.filter(h => h !== id)
        : [...prev.selectedHatcheries, id]
    }));
  };

  const toggleMachine = (id: string) => {
    setFilters(prev => ({
      ...prev,
      selectedMachines: prev.selectedMachines.includes(id)
        ? prev.selectedMachines.filter(m => m !== id)
        : [...prev.selectedMachines, id]
    }));
  };

  // Sort options based on active tab
  const getSortByOptions = () => {
    const commonOptions = [
      { value: 'set_date', label: 'Set Date' },
      { value: 'flock_number', label: 'Flock #' },
      { value: 'flock_name', label: 'Flock Name' },
      { value: 'house_number', label: 'House #' },
      { value: 'age_weeks', label: 'Age (weeks)' },
    ];

    switch (activeTab) {
      case 'embrex':
        return [...commonOptions, 
          { value: 'eggs_cleared', label: 'Cleared' },
          { value: 'eggs_injected', label: 'Injected' }
        ];
      case 'residue':
        return [...commonOptions,
          { value: 'total_residue_count', label: 'Total Residue' },
          { value: 'residue_percent', label: 'Residue %' }
        ];
      case 'egg-pack':
        return [...commonOptions,
          { value: 'cracked', label: 'Cracked' },
          { value: 'dirty', label: 'Dirty' }
        ];
      case 'hatch':
        return [...commonOptions,
          { value: 'hatch_percent', label: 'Hatch %' },
          { value: 'hof_percent', label: 'HOF %' }
        ];
      case 'qa':
        return [...commonOptions,
          { value: 'check_date', label: 'Check Date' },
          { value: 'temperature', label: 'Temperature' }
        ];
      default:
        return commonOptions;
    }
  };

  useEffect(() => {
    document.title = "Data Sheet | Hatchery Dashboard";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "View and analyze all hatchery data including flock information, fertility analysis, egg pack quality, and hatch performance metrics."
      );
    } else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = "View and analyze all hatchery data including flock information, fertility analysis, egg pack quality, and hatch performance metrics.";
      document.head.appendChild(m);
    }
  }, []);

  const handleExportCSV = () => {
    toast.success("CSV export started");
    // Export functionality will be implemented based on active tab
  };

  const handleTimelineView = () => {
    navigate("/embrex-timeline");
  };

  return (
    <div className="h-screen w-full overflow-hidden bg-background flex flex-col">
      {/* Header Section */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Data Sheet</h1>
            <p className="text-sm text-muted-foreground mt-1">View and analyze all hatchery data in one place.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch
                id="percentage-toggle"
                checked={showPercentages}
                onCheckedChange={setShowPercentages}
              />
              <Label htmlFor="percentage-toggle" className="text-sm cursor-pointer">
                Show percentages
              </Label>
            </div>
            <Button variant="outline" onClick={handleTimelineView} className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Timeline View
            </Button>
            <Button variant="outline" onClick={handleExportCSV} className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="embrex">Embrex/HOI</TabsTrigger>
              <TabsTrigger value="residue">Residue Analysis</TabsTrigger>
              <TabsTrigger value="egg-pack">Egg Quality</TabsTrigger>
              <TabsTrigger value="hatch">Hatch Results</TabsTrigger>
              <TabsTrigger value="qa">Quality Assurance</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
              <DataSheetCenteredFilterDialog
                filters={filters}
                setFilters={setFilters}
                hatcheries={hatcheries}
                machines={machines}
                sortByOptions={getSortByOptions()}
                activeFilterCount={activeFilterCount}
                onClearFilters={clearAllFilters}
                onToggleHatchery={toggleHatchery}
                onToggleMachine={toggleMachine}
              />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-xs"
              />
            </div>
          </div>
        </Tabs>
      </div>

      {/* Content Section */}
      <div className="flex-1 overflow-auto p-6">
        <CompleteDataView 
          key={showPercentages ? 'percentage' : 'count'}
          activeTab={activeTab} 
          searchTerm={searchTerm}
          filters={filters}
        />
      </div>
    </div>
  );
};

export default EmbrexDataSheetPage;