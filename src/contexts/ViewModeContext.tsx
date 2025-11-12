import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type ViewMode = 'original' | 'dummy';

interface ViewModeContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  isTrainingMode: boolean;
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

interface ViewModeProviderProps {
  children: ReactNode;
}

export const ViewModeProvider: React.FC<ViewModeProviderProps> = ({ children }) => {
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    // Load from localStorage or default to 'original'
    const saved = localStorage.getItem('hatchery_view_mode');
    return (saved === 'dummy' ? 'dummy' : 'original') as ViewMode;
  });

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    localStorage.setItem('hatchery_view_mode', mode);
  };

  const isTrainingMode = viewMode === 'dummy';

  return (
    <ViewModeContext.Provider value={{ viewMode, setViewMode, isTrainingMode }}>
      {children}
    </ViewModeContext.Provider>
  );
};

export const useViewMode = () => {
  const context = useContext(ViewModeContext);
  if (context === undefined) {
    throw new Error('useViewMode must be used within a ViewModeProvider');
  }
  return context;
};