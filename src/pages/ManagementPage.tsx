import Navigation from "@/components/Navigation";
import FlockManager from "@/components/dashboard/FlockManager";
import MachineManager from "@/components/dashboard/MachineManager";
import DataCleanup from "@/components/dashboard/DataCleanup";
import BatchStatusSettings from "@/components/dashboard/BatchStatusSettings";
import { Settings } from "lucide-react";

const ManagementPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        <Navigation />
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Settings className="h-8 w-8" />
            Management Center
          </h1>
          <p className="text-gray-600 text-lg">
            Manage your flocks, machines, and system data
          </p>
        </div>

        {/* Management Sections */}
        <div className="space-y-8">
          <BatchStatusSettings />
          <FlockManager />
          <MachineManager />
          <DataCleanup />
        </div>
      </div>
    </div>
  );
};

export default ManagementPage;