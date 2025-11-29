import { useEffect } from "react";
import OverviewOperations from "@/components/dashboard/OverviewOperations";
import { HatchingChickIcon } from "@/components/icons/HatcheryIcons";

const Index = () => {
  useEffect(() => {
    document.title = "Dashboard Overview | Hatchery Pro";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "Live overview of hatchery operations with KPIs, alerts, and system status."
      );
    } else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = "Live overview of hatchery operations with KPIs, alerts, and system status.";
      document.head.appendChild(m);
    }
  }, []);

  return (
    <div className="p-3 md:p-6 max-w-full overflow-x-hidden">
      {/* Dashboard Header with Eggs Icon */}
      <div className="mb-4 md:mb-6 flex items-center gap-3 md:gap-4">
        <HatchingChickIcon size={64} className="animate-fade-in flex-shrink-0" />
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground truncate">Dashboard Overview</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Live overview of hatchery operations</p>
        </div>
      </div>
      <OverviewOperations />
    </div>
  );
};

export default Index;
