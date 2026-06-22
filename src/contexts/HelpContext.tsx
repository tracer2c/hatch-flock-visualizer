import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';

interface HelpContextData {
  activePage: string;
  activeTab?: string;
  visibleCharts?: string[];
  selectedFilters?: Record<string, any>;
  currentMetrics?: Record<string, any>;
  visibleElements?: string[];
}

interface HelpContextType {
  contextData: HelpContextData;
  updateContext: (data: Partial<HelpContextData>) => void;
  clearContext: () => void;
}

const HelpContext = createContext<HelpContextType | undefined>(undefined);

export const HelpProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [contextData, setContextData] = useState<HelpContextData>({
    activePage: 'Dashboard Overview'
  });

  // Stable identities are critical here: HelpProvider wraps the entire app,
  // and several pages call updateContext inside a useEffect with
  // updateContext itself in the dependency array. A function recreated on
  // every render would make that effect's deps "change" on every call,
  // re-running it forever — an app-wide render loop that eats clicks
  // (the element under the cursor keeps getting torn down and rebuilt).
  const updateContext = useCallback((data: Partial<HelpContextData>) => {
    setContextData(prev => ({ ...prev, ...data }));
  }, []);

  const clearContext = useCallback(() => {
    setContextData({ activePage: 'Dashboard Overview' });
  }, []);

  const value = useMemo(
    () => ({ contextData, updateContext, clearContext }),
    [contextData, updateContext, clearContext]
  );

  return (
    <HelpContext.Provider value={value}>
      {children}
    </HelpContext.Provider>
  );
};

export const useHelpContext = () => {
  const context = useContext(HelpContext);
  if (context === undefined) {
    // Fallback to a no-op context to avoid crashes if provider isn't mounted yet
    const defaultValue: HelpContextType = {
      contextData: { activePage: 'Application' },
      updateContext: () => {},
      clearContext: () => {},
    };
    return defaultValue;
  }
  return context;
};