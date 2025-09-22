import { useEffect } from "react";
import { EnhancedEmbrexTimeline } from "@/components/dashboard/EnhancedEmbrexTimeline";

const EmbrexTimelinePage = () => {
  useEffect(() => {
    document.title = "Embrex Timeline | Hatchery Dashboard";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "Interactive timeline visualization of Embrex data with advanced filtering and analytics capabilities."
      );
    } else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = "Interactive timeline visualization of Embrex data with advanced filtering and analytics capabilities.";
      document.head.appendChild(m);
    }
  }, []);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 p-6 border-b border-border">
        <div>
          <h1 className="text-3xl font-bold">Embrex Timeline</h1>
          <p className="text-muted-foreground">
            Interactive timeline visualization with advanced filtering and analytics
          </p>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <EnhancedEmbrexTimeline className="h-full" />
      </div>
    </div>
  );
};

export default EmbrexTimelinePage;