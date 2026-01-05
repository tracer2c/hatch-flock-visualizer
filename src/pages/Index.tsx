import { useEffect } from "react";
import OverviewOperations from "@/components/dashboard/OverviewOperations";
import { Egg } from "lucide-react";

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
    <div className="p-3 md:p-6 max-w-full overflow-x-hidden relative">
      {/* Subtle Background Orbs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-primary/5 to-primary/3 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-br from-accent/5 to-accent/3 rounded-full blur-3xl pointer-events-none" />
      
      {/* Dashboard Header */}
      <div className="mb-6 md:mb-8 relative">
        <div className="flex items-center gap-4 md:gap-5">
          {/* Enhanced Icon Container */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/70 rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity" />
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-accent/20 via-warning/15 to-accent/10 flex items-center justify-center flex-shrink-0 relative border border-accent/20 shadow-lg">
              <Egg className="w-8 h-8 md:w-9 md:h-9 text-accent" />
            </div>
          </div>
          
          {/* Title Section */}
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gradient-hero truncate">
              Dashboard Overview
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              Real-time hatchery operations monitoring
            </p>
          </div>
        </div>
        
        {/* Decorative Accent Line */}
        <div className="mt-4 h-1 w-32 md:w-48 bg-gradient-to-r from-primary via-primary/60 to-accent rounded-full opacity-60" />
      </div>
      
      <OverviewOperations />
    </div>
  );
};

export default Index;
