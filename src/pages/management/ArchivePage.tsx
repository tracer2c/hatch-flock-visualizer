import { useEffect, useState } from "react";
import { Archive, ArchiveRestore, Users, Cog, Home as HomeIcon } from "lucide-react";
import { SettingsPageWrapper } from "@/components/management/SettingsPageWrapper";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useArchive, type ArchivableEntity } from "@/hooks/useArchive";
import { usePermissions } from "@/hooks/usePermissions";
import type { FeatureKey } from "@/lib/featureKeys";
import { format } from "date-fns";
import { toast } from "sonner";

/**
 * Centralized "Archived Items" page.
 *
 * Shows all archived flocks / machines / hatcheries the user can see (RLS
 * scopes by company), with restore actions. The per-manager pages have
 * their own "Show Archived" toggle — this page is the one-stop view.
 *
 * Route: /management/archive
 * Access: any authenticated user can view; restore requires write access
 * on the respective management feature.
 */

type ArchivedRow = {
  id: string;
  primaryLabel: string;     // shown big
  secondaryLabel?: string;  // shown muted
  archivedAt: string;
  archivedBy?: string | null;
  archivedByName?: string;  // resolved display name (or email fallback)
};

/**
 * Format a user_profiles row into a friendly display name.
 * Prefers "First Last", falls back to email, then to "Unknown user".
 */
const formatArchiver = (profile?: {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
}): string => {
  if (!profile) return "Unknown user";
  const full = [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim();
  return full || profile.email || "Unknown user";
};

type SectionState = {
  loading: boolean;
  rows: ArchivedRow[];
  error?: string;
};

const initialSection: SectionState = { loading: true, rows: [] };

const ArchivePage = () => {
  const { hasWriteAccess } = usePermissions();
  const [flocks, setFlocks] = useState<SectionState>(initialSection);
  const [machines, setMachines] = useState<SectionState>(initialSection);
  const [units, setUnits] = useState<SectionState>(initialSection);
  const [houses, setHouses] = useState<SectionState>(initialSection);

  const { restore: restoreFlock, isMutating: restoringFlock } = useArchive("flocks");
  const { restore: restoreMachine, isMutating: restoringMachine } = useArchive("machines");
  const { restore: restoreUnit, isMutating: restoringUnit } = useArchive("units");
  const { restore: restoreHouse, isMutating: restoringHouse } = useArchive("batches");

  const loadAll = async () => {
    setFlocks({ loading: true, rows: [] });
    setMachines({ loading: true, rows: [] });
    setUnits({ loading: true, rows: [] });
    setHouses({ loading: true, rows: [] });

    // 1) Fetch archived rows for all entities in parallel
    const [flocksRes, machinesRes, unitsRes, housesRes] = await Promise.all([
      supabase
        .from("flocks")
        .select("id, flock_number, flock_name, archived_at, archived_by")
        .not("archived_at", "is", null)
        .order("archived_at", { ascending: false }),
      supabase
        .from("machines")
        .select("id, machine_number, machine_type, archived_at, archived_by")
        .not("archived_at", "is", null)
        .order("archived_at", { ascending: false }),
      supabase
        .from("units")
        .select("id, name, code, archived_at, archived_by")
        .not("archived_at", "is", null)
        .order("archived_at", { ascending: false }),
      supabase
        .from("batches")
        .select("id, batch_number, status, archived_at, archived_by, flocks(flock_name)")
        .not("archived_at", "is", null)
        .order("archived_at", { ascending: false }),
    ]);

    // 2) Collect distinct archiver user IDs and resolve to display names.
    //    Done as one batched fetch instead of an embedded join because the FK
    //    on archived_by points at auth.users (not user_profiles), so PostgREST
    //    can't infer the relationship.
    const archiverIds = new Set<string>();
    for (const list of [flocksRes.data, machinesRes.data, unitsRes.data, housesRes.data]) {
      for (const row of (list as any[]) || []) {
        if (row.archived_by) archiverIds.add(row.archived_by);
      }
    }

    const archiverMap = new Map<string, string>();
    if (archiverIds.size > 0) {
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("id, first_name, last_name, email")
        .in("id", Array.from(archiverIds));
      for (const p of profiles || []) {
        archiverMap.set(p.id, formatArchiver(p as any));
      }
    }

    const nameFor = (uid?: string | null) =>
      uid ? archiverMap.get(uid) ?? "Unknown user" : "Unknown user";

    setFlocks({
      loading: false,
      error: flocksRes.error?.message,
      rows: (flocksRes.data || []).map((f: any) => ({
        id: f.id,
        primaryLabel: `#${f.flock_number} — ${f.flock_name}`,
        secondaryLabel: undefined,
        archivedAt: f.archived_at,
        archivedBy: f.archived_by,
        archivedByName: nameFor(f.archived_by),
      })),
    });
    setMachines({
      loading: false,
      error: machinesRes.error?.message,
      rows: (machinesRes.data || []).map((m: any) => ({
        id: m.id,
        primaryLabel: m.machine_number,
        secondaryLabel: m.machine_type,
        archivedAt: m.archived_at,
        archivedBy: m.archived_by,
        archivedByName: nameFor(m.archived_by),
      })),
    });
    setUnits({
      loading: false,
      error: unitsRes.error?.message,
      rows: (unitsRes.data || []).map((u: any) => ({
        id: u.id,
        primaryLabel: u.name,
        secondaryLabel: u.code || undefined,
        archivedAt: u.archived_at,
        archivedBy: u.archived_by,
        archivedByName: nameFor(u.archived_by),
      })),
    });
    setHouses({
      loading: false,
      error: housesRes.error?.message,
      rows: (housesRes.data || []).map((b: any) => ({
        id: b.id,
        primaryLabel: b.batch_number,
        secondaryLabel: b.flocks?.flock_name || undefined,
        archivedAt: b.archived_at,
        archivedBy: b.archived_by,
        archivedByName: nameFor(b.archived_by),
      })),
    });
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleRestore = async (
    entity: ArchivableEntity,
    id: string,
    label: string
  ) => {
    if (!confirm(`Restore ${label}? It will be visible in active dropdowns again.`)) return;
    try {
      if (entity === "flocks") await restoreFlock(id);
      else if (entity === "machines") await restoreMachine(id);
      else if (entity === "batches") await restoreHouse(id);
      else await restoreUnit(id);
      loadAll();
    } catch (e: any) {
      toast.error(`Restore failed: ${e.message || "unknown error"}`);
    }
  };

  const renderSection = (
    label: string,
    icon: React.ReactNode,
    state: SectionState,
    entity: ArchivableEntity,
    busy: boolean,
    permissionKey: FeatureKey
  ) => {
    const canRestore = hasWriteAccess(permissionKey);

    if (state.loading) {
      return <p className="text-muted-foreground text-sm p-4">Loading…</p>;
    }
    if (state.error) {
      return <p className="text-destructive text-sm p-4">Failed to load: {state.error}</p>;
    }
    if (state.rows.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <Archive className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No archived {label.toLowerCase()}.</p>
        </div>
      );
    }
    return (
      <div className="divide-y border rounded-md">
        {state.rows.map((row) => (
          <div key={row.id} className="flex items-center justify-between p-4 hover:bg-muted/40">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-muted">{icon}</div>
              <div>
                <div className="font-medium">{row.primaryLabel}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5 flex-wrap">
                  {row.secondaryLabel && (
                    <Badge variant="outline" className="text-xs">
                      {row.secondaryLabel}
                    </Badge>
                  )}
                  <span>
                    Archived by{" "}
                    <span className="font-medium text-foreground">
                      {row.archivedByName || "Unknown user"}
                    </span>{" "}
                    on {format(new Date(row.archivedAt), "MMM d, yyyy 'at' h:mm a")}
                  </span>
                </div>
              </div>
            </div>
            {canRestore && (
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => handleRestore(entity, row.id, row.primaryLabel)}
              >
                <ArchiveRestore className="h-4 w-4 mr-2" />
                Restore
              </Button>
            )}
          </div>
        ))}
      </div>
    );
  };

  const totalArchived = flocks.rows.length + machines.rows.length + units.rows.length + houses.rows.length;

  return (
    <SettingsPageWrapper
      title="Archived Items"
      description="Flocks, machines, and hatcheries that were archived. Restore any item to make it active again. Historical data attached to archived items stays visible everywhere."
    >
      <div className="p-6">
        {!flocks.loading && !machines.loading && !units.loading && !houses.loading && (
          <div className="mb-4 text-sm text-muted-foreground">
            {totalArchived === 0
              ? "Nothing is currently archived in your company."
              : `${totalArchived} archived ${totalArchived === 1 ? "item" : "items"} total.`}
          </div>
        )}
        <Tabs defaultValue="flocks">
          <TabsList>
            <TabsTrigger value="flocks">
              Flocks{flocks.rows.length > 0 && (
                <Badge variant="secondary" className="ml-2">{flocks.rows.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="machines">
              Machines{machines.rows.length > 0 && (
                <Badge variant="secondary" className="ml-2">{machines.rows.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="units">
              Hatcheries{units.rows.length > 0 && (
                <Badge variant="secondary" className="ml-2">{units.rows.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="houses">
              Houses{houses.rows.length > 0 && (
                <Badge variant="secondary" className="ml-2">{houses.rows.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="flocks" className="mt-4">
            {renderSection("Flocks", <Users className="h-4 w-4 text-orange-600" />, flocks, "flocks", restoringFlock, "flocks_management")}
          </TabsContent>
          <TabsContent value="machines" className="mt-4">
            {renderSection("Machines", <Cog className="h-4 w-4 text-purple-600" />, machines, "machines", restoringMachine, "machines_management")}
          </TabsContent>
          <TabsContent value="units" className="mt-4">
            {renderSection("Hatcheries", <HomeIcon className="h-4 w-4 text-teal-600" />, units, "units", restoringUnit, "hatcheries")}
          </TabsContent>
          <TabsContent value="houses" className="mt-4">
            {renderSection("Houses", <HomeIcon className="h-4 w-4 text-blue-600" />, houses, "batches", restoringHouse, "embrex_data_sheet")}
          </TabsContent>
        </Tabs>
      </div>
    </SettingsPageWrapper>
  );
};

export default ArchivePage;
