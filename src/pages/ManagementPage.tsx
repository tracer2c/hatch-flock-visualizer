import Navigation from "@/components/Navigation";
import FlockManager from "@/components/dashboard/FlockManager";
import MachineManager from "@/components/dashboard/MachineManager";
import DataCleanup from "@/components/dashboard/DataCleanup";
import BatchStatusSettings from "@/components/dashboard/BatchStatusSettings";
import SOPManager from "@/components/dashboard/SOPManager";
import UserManager from "@/components/dashboard/UserManager";
import { Settings, Clock, FileText, Users, Cog, Database, UserCheck } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

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
        <Accordion type="single" collapsible className="space-y-4">
          <AccordionItem value="batch-status" className="bg-white rounded-lg shadow-sm border">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-blue-600" />
                <div className="text-left">
                  <h3 className="font-semibold text-lg">Batch Status Automation</h3>
                  <p className="text-gray-600 text-sm">Configure automatic batch progression rules</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <BatchStatusSettings />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="sop-manager" className="bg-white rounded-lg shadow-sm border">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-green-600" />
                <div className="text-left">
                  <h3 className="font-semibold text-lg">SOP Manager</h3>
                  <p className="text-gray-600 text-sm">Manage standard operating procedures and templates</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <SOPManager />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="flock-manager" className="bg-white rounded-lg shadow-sm border">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-orange-600" />
                <div className="text-left">
                  <h3 className="font-semibold text-lg">Flock Manager</h3>
                  <p className="text-gray-600 text-sm">Add, edit, and manage your bird flocks</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <FlockManager />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="machine-manager" className="bg-white rounded-lg shadow-sm border">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <Cog className="h-5 w-5 text-purple-600" />
                <div className="text-left">
                  <h3 className="font-semibold text-lg">Machine Manager</h3>
                  <p className="text-gray-600 text-sm">Configure and maintain incubator machines</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <MachineManager />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="user-manager" className="bg-white rounded-lg shadow-sm border">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <UserCheck className="h-5 w-5 text-indigo-600" />
                <div className="text-left">
                  <h3 className="font-semibold text-lg">User Management</h3>
                  <p className="text-gray-600 text-sm">Manage user accounts, roles, and permissions</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <UserManager />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="data-cleanup" className="bg-white rounded-lg shadow-sm border">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-red-600" />
                <div className="text-left">
                  <h3 className="font-semibold text-lg">Data Cleanup</h3>
                  <p className="text-gray-600 text-sm">Clean up old records and manage data retention</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <DataCleanup />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
};

export default ManagementPage;