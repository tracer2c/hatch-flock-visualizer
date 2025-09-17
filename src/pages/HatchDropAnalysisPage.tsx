import { useEffect } from "react";
import HatchDropDetector from "@/components/dashboard/HatchDropDetector";

const HatchDropAnalysisPage = () => {
  useEffect(() => {
    document.title = "Hatch Drop Analysis | Hatchery Dashboard";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "Automated hatch drop detection and analysis system for identifying underperforming batches and root causes."
      );
    } else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = "Automated hatch drop detection and analysis system for identifying underperforming batches and root causes.";
      document.head.appendChild(m);
    }
  }, []);

  return (
    <div className="p-6">
      <HatchDropDetector />
    </div>
  );
};

export default HatchDropAnalysisPage;