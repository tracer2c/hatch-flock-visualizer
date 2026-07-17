const sections = [
  { id: 'introduction', num: '1', title: 'Introduction' },
  { id: 'getting-started', num: '2', title: 'Getting Started' },
  { id: 'navigation', num: '3', title: 'Navigation & Layout' },
  { id: 'dashboard', num: '4', title: 'Dashboard Overview' },
  { id: 'data-entry', num: '5', title: 'Data Entry' },
  { id: 'qa-hub', num: '6', title: 'QA Hub' },
  { id: 'data-sheet', num: '7', title: 'Data Sheet' },
  { id: 'live-tracking', num: '8', title: 'Live Tracking' },
  { id: 'machine-util', num: '9', title: 'Machine Utilization' },
  { id: 'daily-tasks', num: '10', title: 'Daily Tasks' },
  { id: 'smart-analytics', num: '11', title: 'HatchAI Assistant (AI Chat)' },
  { id: 'management', num: '12', title: 'Management Console' },
  { id: 'advanced', num: '13', title: 'Advanced Features' },
  { id: 'rbac', num: '14', title: 'Role-Based Access Control' },
  { id: 'multi-tenant', num: '15', title: 'Multi-Tenant Architecture' },
  { id: 'formulas', num: '16', title: 'Formulas & Calculations' },
  { id: 'glossary', num: '17', title: 'Glossary' },
];

const DocTableOfContents = () => (
  <div className="mb-8 break-after-page">
    <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-gray-800 pb-2 mb-6">
      Table of Contents
    </h2>
    <div className="space-y-2">
      {sections.map((s) => (
        <a
          key={s.id}
          href={`#${s.id}`}
          className="flex items-baseline gap-2 py-1 text-sm hover:text-blue-600 transition-colors group"
        >
          <span className="font-mono text-gray-500 w-8">{s.num}.</span>
          <span className="text-gray-800 group-hover:text-blue-600 font-medium">{s.title}</span>
          <span className="flex-1 border-b border-dotted border-gray-300 mx-2 mb-1" />
        </a>
      ))}
    </div>
  </div>
);

export default DocTableOfContents;
