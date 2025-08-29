import { useEffect } from "react";
import BatchFlowSankey from "@/components/dashboard/BatchFlowSankey";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Workflow } from "lucide-react";

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
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Workflow className="h-5 w-5" />
            <CardTitle>House Flow Analysis</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Comprehensive flow analysis showing the progression of batches through different stages of the incubation process.
          </p>
        </CardContent>
      </Card>
      
      <BatchFlowSankey />
    </div>
  );
};

export default HouseFlowPage;