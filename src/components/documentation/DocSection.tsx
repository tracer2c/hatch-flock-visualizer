import React from 'react';

interface DocSectionProps {
  id: string;
  number: string;
  title: string;
  children: React.ReactNode;
}

const DocSection = ({ id, number, title, children }: DocSectionProps) => (
  <section id={id} className="mb-8 break-inside-avoid-page">
    <div className="border-b-2 border-gray-800 pb-2 mb-4">
      <h2 className="text-2xl font-bold text-gray-900">
        {number}. {title}
      </h2>
    </div>
    <div className="space-y-4 text-gray-700 text-sm leading-relaxed">
      {children}
    </div>
  </section>
);

export const DocSubSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-4">
    <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
    <div className="space-y-2">{children}</div>
  </div>
);

export const DocTable = ({ headers, rows }: { headers: string[]; rows: string[][] }) => (
  <div className="overflow-x-auto my-3">
    <table className="w-full border-collapse border border-gray-400 text-xs">
      <thead>
        <tr className="bg-gray-100">
          {headers.map((h, i) => (
            <th key={i} className="border border-gray-400 px-3 py-2 text-left font-semibold text-gray-900">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
            {row.map((cell, j) => (
              <td key={j} className="border border-gray-400 px-3 py-1.5 text-gray-700">{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const DocNote = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-blue-50 border-l-4 border-blue-500 p-3 my-3 text-xs text-blue-900">
    <strong>Note:</strong> {children}
  </div>
);

export const DocIconCard = ({ icon: Icon, title, description }: { icon: React.ComponentType<any>; title: string; description: string }) => (
  <div className="flex items-start gap-3 p-3 border border-gray-300 rounded-lg bg-gray-50">
    <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
      <Icon className="w-5 h-5 text-blue-700" />
    </div>
    <div>
      <p className="font-semibold text-gray-900 text-sm">{title}</p>
      <p className="text-xs text-gray-600">{description}</p>
    </div>
  </div>
);

export default DocSection;
