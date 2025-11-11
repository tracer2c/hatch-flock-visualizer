import { useEffect } from "react";
import BatchFlowSankey from "@/components/dashboard/BatchFlowSankey";
import hatcheryIcon from "@/assets/hatchery-icon.png";

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
        <img 
          src={hatcheryIcon} 
          alt="Hatchery" 
          className="w-16 h-16 object-contain animate-fade-in"
        />
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