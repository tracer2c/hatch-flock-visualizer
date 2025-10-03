import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileSpreadsheet, Table as TableIcon } from "lucide-react";
import { EmbrexDataTable } from "@/components/dashboard/EmbrexDataTable";
import ResidueBreakoutPage from "./ResidueBreakoutPage";

const EmbrexDataSheetPage = () => {
  const [activeTab, setActiveTab] = useState("embrex");

  useEffect(() => {
    document.title = "Embrex Data Sheet | Hatchery Dashboard";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "Comprehensive overview of all flock data including clears, injected statistics, and residue analysis."
      );
    } else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = "Comprehensive overview of all flock data including clears, injected statistics, and residue analysis.";
      document.head.appendChild(m);
    }
  }, []);

  return (
    <div className="h-screen w-full overflow-hidden bg-background">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <div className="border-b bg-card px-6 py-3">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="embrex" className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Embrex Sheet
            </TabsTrigger>
            <TabsTrigger value="residue" className="gap-2">
              <TableIcon className="h-4 w-4" />
              Residue Breakout
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="embrex" className="flex-1 m-0 overflow-auto">
          <EmbrexDataTable />
        </TabsContent>

        <TabsContent value="residue" className="flex-1 m-0 overflow-auto">
          <ResidueBreakoutPage />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmbrexDataSheetPage;