import { Egg } from 'lucide-react';

const DocCoverPage = () => (
  <div className="flex flex-col items-center justify-center min-h-[700px] text-center py-16 break-after-page">
    <div className="w-24 h-24 bg-blue-600 rounded-2xl flex items-center justify-center mb-8 shadow-lg">
      <Egg className="w-14 h-14 text-white" />
    </div>
    <h1 className="text-5xl font-bold text-gray-900 mb-4 tracking-tight">
      Hatchery Management System
    </h1>
    <p className="text-xl text-gray-500 mb-2 font-light">
      Complete Product Documentation & User Guide
    </p>
    <div className="w-24 h-1 bg-blue-600 rounded my-8" />
    <div className="space-y-1 text-sm text-gray-500">
      <p className="font-semibold text-gray-700">Version 1.2</p>
      <p>{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
    </div>
    <div className="mt-12 max-w-lg text-sm text-gray-500 leading-relaxed">
      <p>
        A comprehensive platform for hatchery operations management — covering incubation tracking,
        quality assurance, machine utilization, smart analytics, and multi-tenant enterprise deployment.
      </p>
    </div>
    <div className="mt-16 text-xs text-gray-400">
      CONFIDENTIAL — For Internal Use Only
    </div>
  </div>
);

export default DocCoverPage;
