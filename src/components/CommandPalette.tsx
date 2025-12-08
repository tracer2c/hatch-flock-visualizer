import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import {
  Home,
  FileInput,
  ClipboardCheck,
  FileSpreadsheet,
  TrendingUp,
  Radio,
  Gauge,
  CheckSquare,
  MessageSquare,
  Settings,
  Upload,
  Plus,
  FileText,
  Building2,
  Egg,
  Cog,
  MapPin,
} from "lucide-react";

// Static navigation pages
const navigationPages = [
  { name: "Dashboard", path: "/", icon: Home, keywords: ["home", "overview", "main"] },
  { name: "Data Entry", path: "/data-entry", icon: FileInput, keywords: ["entry", "input", "houses", "flocks", "create"] },
  { name: "QA Hub", path: "/qa-hub", icon: ClipboardCheck, keywords: ["quality", "qa", "temperature", "monitoring", "setter"] },
  { name: "Data Sheet", path: "/embrex-data-sheet", icon: FileSpreadsheet, keywords: ["sheet", "table", "data", "embrex"] },
  { name: "Timeline Analysis", path: "/embrex-timeline", icon: TrendingUp, keywords: ["timeline", "chart", "graph", "analysis", "trends"] },
  { name: "Live Tracking", path: "/live-tracking", icon: Radio, keywords: ["live", "real-time", "tracking", "critical", "windows"] },
  { name: "Machine Utilization", path: "/machine-utilization", icon: Gauge, keywords: ["machine", "utilization", "capacity", "usage"] },
  { name: "Daily Tasks", path: "/checklist", icon: CheckSquare, keywords: ["checklist", "tasks", "daily", "sop", "maintenance"] },
  { name: "Smart Analytics", path: "/chat", icon: MessageSquare, keywords: ["chat", "ai", "analytics", "insights", "ask"] },
  { name: "Management", path: "/management", icon: Settings, keywords: ["settings", "admin", "manage", "targets", "users"] },
  { name: "Bulk Import", path: "/bulk-import", icon: Upload, keywords: ["import", "upload", "excel", "csv", "data"] },
  { name: "Project Report", path: "/report", icon: FileText, keywords: ["report", "summary", "project", "export"] },
];

// Quick actions
const quickActions = [
  { name: "Create New Flock", path: "/data-entry", state: { tab: "flocks", action: "create" }, icon: Plus },
  { name: "Create New House", path: "/data-entry", state: { tab: "houses", action: "create" }, icon: Plus },
  { name: "Start QA Check", path: "/qa-hub", icon: ClipboardCheck },
  { name: "View Reports", path: "/report", icon: FileText },
];

interface CommandPaletteProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const CommandPalette = ({ open: controlledOpen, onOpenChange }: CommandPaletteProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  // Global keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, setOpen]);

  // Search houses (batches)
  const { data: houses = [] } = useQuery({
    queryKey: ["command-search-houses", search],
    queryFn: async () => {
      if (!search || search.length < 1) return [];
      
      const { data, error } = await supabase
        .from("batches")
        .select(`
          id,
          batch_number,
          status,
          flocks!inner(flock_name, flock_number),
          units(name)
        `)
        .or(`batch_number.ilike.%${search}%`)
        .limit(8);

      if (error) throw error;
      return data || [];
    },
    enabled: search.length >= 1,
    staleTime: 1000,
  });

  // Search flocks
  const { data: flocks = [] } = useQuery({
    queryKey: ["command-search-flocks", search],
    queryFn: async () => {
      if (!search || search.length < 1) return [];
      
      const { data, error } = await supabase
        .from("flocks")
        .select(`
          id,
          flock_name,
          flock_number,
          age_weeks,
          units(name)
        `)
        .or(`flock_name.ilike.%${search}%,flock_number::text.ilike.%${search}%`)
        .limit(8);

      if (error) throw error;
      return data || [];
    },
    enabled: search.length >= 1,
    staleTime: 1000,
  });

  // Search machines
  const { data: machines = [] } = useQuery({
    queryKey: ["command-search-machines", search],
    queryFn: async () => {
      if (!search || search.length < 1) return [];
      
      const { data, error } = await supabase
        .from("machines")
        .select(`
          id,
          machine_number,
          machine_type,
          setter_mode,
          units(name)
        `)
        .ilike("machine_number", `%${search}%`)
        .limit(8);

      if (error) throw error;
      return data || [];
    },
    enabled: search.length >= 1,
    staleTime: 1000,
  });

  // Search hatcheries (units)
  const { data: hatcheries = [] } = useQuery({
    queryKey: ["command-search-hatcheries", search],
    queryFn: async () => {
      if (!search || search.length < 1) return [];
      
      const { data, error } = await supabase
        .from("units")
        .select("id, name, code")
        .ilike("name", `%${search}%`)
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    enabled: search.length >= 1,
    staleTime: 1000,
  });

  // Filter pages by search
  const filteredPages = navigationPages.filter((page) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      page.name.toLowerCase().includes(searchLower) ||
      page.keywords.some((k) => k.includes(searchLower))
    );
  });

  // Filter quick actions by search
  const filteredActions = quickActions.filter((action) => {
    if (!search) return true;
    return action.name.toLowerCase().includes(search.toLowerCase());
  });

  const handleSelect = useCallback((callback: () => void) => {
    setOpen(false);
    setSearch("");
    callback();
  }, [setOpen]);

  const handleNavigate = useCallback((path: string, state?: any) => {
    handleSelect(() => navigate(path, { state }));
  }, [handleSelect, navigate]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search pages, houses, flocks, machines..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList className="max-h-[400px]">
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Pages */}
        {filteredPages.length > 0 && (
          <CommandGroup heading="Pages">
            {filteredPages.slice(0, 6).map((page) => (
              <CommandItem
                key={page.path}
                value={`page-${page.name}`}
                onSelect={() => handleNavigate(page.path)}
                className="flex items-center gap-3 cursor-pointer"
              >
                <page.icon className="h-4 w-4 text-muted-foreground" />
                <span>{page.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Houses */}
        {houses.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Houses">
              {houses.map((house: any) => (
                <CommandItem
                  key={house.id}
                  value={`house-${house.id}-${house.batch_number}`}
                  onSelect={() => handleNavigate(`/data-entry/house/${house.id}`)}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <Building2 className="h-4 w-4 text-blue-500" />
                  <div className="flex flex-col">
                    <span>House #{house.batch_number}</span>
                    <span className="text-xs text-muted-foreground">
                      {house.flocks?.flock_name} • {house.units?.name || "No hatchery"}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Flocks */}
        {flocks.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Flocks">
              {flocks.map((flock: any) => (
                <CommandItem
                  key={flock.id}
                  value={`flock-${flock.id}-${flock.flock_name}`}
                  onSelect={() => handleNavigate("/data-entry", { state: { selectedFlockId: flock.id } })}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <Egg className="h-4 w-4 text-amber-500" />
                  <div className="flex flex-col">
                    <span>{flock.flock_name} ({flock.flock_number})</span>
                    <span className="text-xs text-muted-foreground">
                      {flock.age_weeks} weeks • {flock.units?.name || "No hatchery"}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Machines */}
        {machines.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Machines">
              {machines.map((machine: any) => (
                <CommandItem
                  key={machine.id}
                  value={`machine-${machine.id}-${machine.machine_number}`}
                  onSelect={() => handleNavigate("/machine-utilization", { state: { selectedMachineId: machine.id } })}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <Cog className="h-4 w-4 text-emerald-500" />
                  <div className="flex flex-col">
                    <span>{machine.machine_number}</span>
                    <span className="text-xs text-muted-foreground">
                      {machine.machine_type} • {machine.setter_mode === 'multi_setter' ? 'Multi-Stage' : 'Single-Stage'} • {machine.units?.name || "No hatchery"}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Hatcheries */}
        {hatcheries.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Hatcheries">
              {hatcheries.map((hatchery: any) => (
                <CommandItem
                  key={hatchery.id}
                  value={`hatchery-${hatchery.id}-${hatchery.name}`}
                  onSelect={() => handleNavigate("/", { state: { hatcheryFilter: hatchery.name } })}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <MapPin className="h-4 w-4 text-red-500" />
                  <span>{hatchery.name}</span>
                  {hatchery.code && (
                    <span className="text-xs text-muted-foreground">({hatchery.code})</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Quick Actions */}
        {filteredActions.length > 0 && !search && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Quick Actions">
              {filteredActions.map((action, idx) => (
                <CommandItem
                  key={idx}
                  value={`action-${action.name}`}
                  onSelect={() => handleNavigate(action.path, action.state)}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <action.icon className="h-4 w-4 text-primary" />
                  <span>{action.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
};

export default CommandPalette;
