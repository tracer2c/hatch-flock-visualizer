
import { useEffect } from "react";
import OverviewOperations from "@/components/dashboard/OverviewOperations";
import eggsIcon from "@/assets/eggs-icon.png";

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
    <div className="p-6">
      {/* Dashboard Header with Eggs Icon */}
      <div className="mb-6 flex items-center gap-4">
        <img 
          src={eggsIcon} 
          alt="Eggs" 
          className="w-16 h-16 object-contain animate-fade-in"
        />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard Overview</h1>
          <p className="text-sm text-muted-foreground">Live overview of hatchery operations</p>
        </div>
      </div>
      <OverviewOperations />
    </div>
  );
};

export default Index;
