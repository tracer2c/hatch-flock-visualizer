import { useEffect } from "react";
import { EmbrexTimeline } from "@/components/dashboard/EmbrexTimeline";

const EmbrexTimelinePage = () => {
  useEffect(() => {
    document.title = "Embrex Timeline | Hatchery Dashboard";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "Timeline visualization of Embrex data showing egg production trends over time by flock and time scale."
      );
    } else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = "Timeline visualization of Embrex data showing egg production trends over time by flock and time scale.";
      document.head.appendChild(m);
    }
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Embrex Timeline</h1>
          <p className="text-muted-foreground">
            Visualize Embrex data trends over time with flexible filtering and comparison options
          </p>
        </div>
      </div>

      <EmbrexTimeline />
    </div>
  );
};

export default EmbrexTimelinePage;