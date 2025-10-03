import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileSpreadsheet, Table as TableIcon } from "lucide-react";
import EmbrexTimelinePage from "./EmbrexTimelinePage";
import ResidueBreakoutPage from "./ResidueBreakoutPage";

const EmbrexDataSheetPage = () => {
  const [activeTab, setActiveTab] = useState("timeline");

  return (
    <div className="h-screen w-full overflow-hidden bg-background">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <div className="border-b bg-card px-6 py-3">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="timeline" className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Embrex Timeline
            </TabsTrigger>
            <TabsTrigger value="residue" className="gap-2">
              <TableIcon className="h-4 w-4" />
              Residue Breakout
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="timeline" className="flex-1 m-0 overflow-hidden">
          <EmbrexTimelinePage />
        </TabsContent>

        <TabsContent value="residue" className="flex-1 m-0 overflow-hidden">
          <ResidueBreakoutPage />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmbrexDataSheetPage;