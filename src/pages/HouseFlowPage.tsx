import { useEffect } from "react";
import BatchFlowSankey from "@/components/dashboard/BatchFlowSankey";
import { HatcheryIcon } from "@/components/icons/HatcheryIcons";

const HouseFlowPage = () => {
  useEffect(() => {
    document.title = "House Flow Analysis | Hatchery Dashboard";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "Detailed house flow analysis and batch processing visualization."
      );
    } else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = "Detailed house flow analysis and batch processing visualization.";
      document.head.appendChild(m);
    }
  }, []);

  return (
    <div className="p-6">
      {/* Page Header with Hatchery Icon */}
      <div className="mb-6 flex items-center gap-4">
        <HatcheryIcon size={64} className="animate-fade-in" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">House Flow Analysis</h1>
          <p className="text-sm text-muted-foreground">Detailed house flow analysis and batch processing visualization</p>
        </div>
      </div>
      <BatchFlowSankey />
    </div>
  );
};

export default HouseFlowPage;
