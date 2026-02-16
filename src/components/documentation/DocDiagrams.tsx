export const TempGridDiagram = () => (
  <div className="my-4 overflow-x-auto">
    <p className="text-xs font-semibold text-gray-700 mb-2">18-Point Temperature Grid Layout</p>
    <table className="border-collapse border border-gray-500 text-xs w-full max-w-2xl">
      <thead>
        <tr>
          <th className="border border-gray-500 p-1.5 bg-gray-200" />
          <th colSpan={2} className="border border-gray-500 p-1.5 bg-blue-100 text-blue-800 text-center">Front (Zone A)</th>
          <th colSpan={2} className="border border-gray-500 p-1.5 bg-green-100 text-green-800 text-center">Middle (Zone B)</th>
          <th colSpan={2} className="border border-gray-500 p-1.5 bg-purple-100 text-purple-800 text-center">Back (Zone C)</th>
        </tr>
        <tr>
          <th className="border border-gray-500 p-1.5 bg-gray-200" />
          {['Left', 'Right', 'Left', 'Right', 'Left', 'Right'].map((s, i) => (
            <th key={i} className="border border-gray-500 p-1.5 bg-gray-100 text-center font-normal">{s}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {['Top', 'Mid', 'Bottom'].map((row) => (
          <tr key={row}>
            <td className="border border-gray-500 p-1.5 bg-gray-200 font-semibold text-center">{row}</td>
            {Array(6).fill(0).map((_, i) => (
              <td key={i} className="border border-gray-500 p-1.5 text-center text-gray-400">°C</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const ProcessFlowDiagram = () => (
  <div className="my-4 flex items-center justify-center gap-2 flex-wrap">
    {[
      { label: 'Eggs Set', color: 'bg-blue-100 text-blue-800 border-blue-300' },
      { label: '→', color: '' },
      { label: 'In Setter (Day 0-17)', color: 'bg-blue-100 text-blue-800 border-blue-300' },
      { label: '→', color: '' },
      { label: 'Transfer (Day 18)', color: 'bg-orange-100 text-orange-800 border-orange-300' },
      { label: '→', color: '' },
      { label: 'In Hatcher (Day 18-21)', color: 'bg-orange-100 text-orange-800 border-orange-300' },
      { label: '→', color: '' },
      { label: 'Hatch Complete', color: 'bg-green-100 text-green-800 border-green-300' },
    ].map((item, i) =>
      item.color ? (
        <div key={i} className={`px-3 py-2 rounded-lg border text-xs font-semibold ${item.color}`}>{item.label}</div>
      ) : (
        <span key={i} className="text-gray-400 font-bold">→</span>
      )
    )}
  </div>
);

export const StatusLifecycleDiagram = () => (
  <div className="my-4">
    <div className="flex items-center gap-3 flex-wrap">
      {[
        { status: 'Scheduled', color: 'bg-gray-200 text-gray-700', days: 'Before Day 0' },
        { status: 'In Setter', color: 'bg-blue-200 text-blue-800', days: 'Day 0–17' },
        { status: 'In Hatcher', color: 'bg-orange-200 text-orange-800', days: 'Day 18–21' },
        { status: 'Completed', color: 'bg-green-200 text-green-800', days: 'After Day 21' },
      ].map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          {i > 0 && <span className="text-gray-400 font-bold">→</span>}
          <div className={`px-3 py-2 rounded-lg text-xs font-semibold ${item.color}`}>
            <div>{item.status}</div>
            <div className="font-normal text-[10px] opacity-75">{item.days}</div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const SidebarLayoutDiagram = () => (
  <div className="my-4 border border-gray-400 rounded-lg overflow-hidden max-w-lg">
    <div className="bg-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 border-b border-gray-400 flex justify-between">
      <span>Top Bar</span>
      <span className="text-gray-400">🔍 🔔 👤</span>
    </div>
    <div className="flex">
      <div className="w-32 bg-gray-100 border-r border-gray-400 p-2 space-y-1">
        {['🏠 Dashboard', '📝 Data Entry', '📋 QA Hub', '📊 Data Sheet', '📈 Timeline', '☑️ Daily Tasks', '💬 Analytics', '⚙️ Management'].map((item) => (
          <div key={item} className="text-[10px] text-gray-600 py-0.5">{item}</div>
        ))}
      </div>
      <div className="flex-1 p-3 text-xs text-gray-400 text-center">
        Main Content Area
      </div>
    </div>
  </div>
);
