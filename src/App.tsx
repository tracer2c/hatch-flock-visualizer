
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import DataEntryPage from "./pages/DataEntryPage";
import EggPackEntryPage from "./pages/EggPackEntryPage";
import FertilityEntryPage from "./pages/FertilityEntryPage";
import QAEntryPage from "./pages/QAEntryPage";
import ResidueEntryPage from "./pages/ResidueEntryPage";
import ManagementPage from "./pages/ManagementPage";
import ChecklistPage from "./pages/ChecklistPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/data-entry" element={<DataEntryPage />} />
          <Route path="/data-entry/batch/:batchId/egg-pack" element={<EggPackEntryPage />} />
          <Route path="/data-entry/batch/:batchId/fertility" element={<FertilityEntryPage />} />
          <Route path="/data-entry/batch/:batchId/qa" element={<QAEntryPage />} />
          <Route path="/data-entry/batch/:batchId/residue" element={<ResidueEntryPage />} />
          <Route path="/checklist" element={<ChecklistPage />} />
          <Route path="/checklist/batch/:batchId" element={<ChecklistPage />} />
          <Route path="/management" element={<ManagementPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
