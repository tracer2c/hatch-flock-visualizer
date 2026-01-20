import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Clock, FileText, Users, Cog, UserCheck, Home, Target, 
  Calendar, ListChecks, Download, ClipboardList, ChevronRight, Search 
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface SettingItem {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  route: string;
}

interface SettingCategory {
  name: string;
  items: SettingItem[];
}

const settingsCategories: SettingCategory[] = [
  {
    name: "Operations",
    items: [
      {
        id: "sop-dashboard",
        title: "Daily SOP Dashboard",
        description: "View today's SOPs for houses, machines, transfers, and alerts",
        icon: ListChecks,
        iconColor: "text-blue-600",
        route: "/management/sop-dashboard",
      },
      {
        id: "house-automation",
        title: "House Status Automation",
        description: "Configure automatic batch progression rules",
        icon: Clock,
        iconColor: "text-blue-600",
        route: "/management/house-automation",
      },
    ],
  },
  {
    name: "Asset Management",
    items: [
      {
        id: "hatcheries",
        title: "Hatchery Manager",
        description: "Manage hatchery units and their configurations",
        icon: Home,
        iconColor: "text-teal-600",
        route: "/management/hatcheries",
      },
      {
        id: "flocks",
        title: "Flock Manager",
        description: "Add, edit, and manage your bird flocks",
        icon: Users,
        iconColor: "text-orange-600",
        route: "/management/flocks",
      },
      {
        id: "machines",
        title: "Machine Manager",
        description: "Configure and maintain incubator machines",
        icon: Cog,
        iconColor: "text-purple-600",
        route: "/management/machines",
      },
    ],
  },
  {
    name: "Configuration",
    items: [
      {
        id: "sop-manager",
        title: "SOP Manager",
        description: "Manage standard operating procedures and templates",
        icon: FileText,
        iconColor: "text-green-600",
        route: "/management/sop-manager",
      },
      {
        id: "targets",
        title: "Custom Targets",
        description: "Set performance targets for hatcheries, flocks, and houses",
        icon: Target,
        iconColor: "text-emerald-600",
        route: "/management/targets",
      },
      {
        id: "residue-schedule",
        title: "Residue Analysis Schedule",
        description: "Monitor and manage residue analysis schedules",
        icon: Calendar,
        iconColor: "text-amber-600",
        route: "/management/residue-schedule",
      },
    ],
  },
  {
    name: "Administration",
    items: [
      {
        id: "users",
        title: "User Management",
        description: "Manage user accounts, roles, and permissions",
        icon: UserCheck,
        iconColor: "text-indigo-600",
        route: "/management/users",
      },
      {
        id: "reports",
        title: "Reports",
        description: "Generate and download PDF reports for houses and weekly summaries",
        icon: Download,
        iconColor: "text-cyan-600",
        route: "/management/reports",
      },
      {
        id: "activity-log",
        title: "User Activity Log",
        description: "View all user actions with IP addresses and timestamps",
        icon: ClipboardList,
        iconColor: "text-rose-600",
        route: "/management/activity-log",
      },
    ],
  },
];

const ManagementPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCategories = settingsCategories
    .map((category) => ({
      ...category,
      items: category.items.filter(
        (item) =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((category) => category.items.length > 0);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Management</h1>
        <p className="text-muted-foreground">Configure your hatchery settings and preferences</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search settings..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Settings Categories */}
      <div className="space-y-6">
        {filteredCategories.map((category) => (
          <div key={category.name} className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {category.name}
            </h2>
            <div className="bg-card rounded-lg border shadow-sm divide-y">
              {category.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.route)}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left first:rounded-t-lg last:rounded-b-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg bg-muted ${item.iconColor}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">{item.title}</h3>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {filteredCategories.length === 0 && (
        <div className="text-center py-12">
          <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground">No settings found</h3>
          <p className="text-muted-foreground">Try adjusting your search query</p>
        </div>
      )}
    </div>
  );
};

export default ManagementPage;
