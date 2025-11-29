import React, { createContext, useContext, ReactNode } from 'react';

// Simplified context - always returns 'original' to maintain compatibility
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
  // Always return 'original' - no longer segregating data
  const viewMode: ViewMode = 'original';
  const setViewMode = () => {}; // No-op
  const isTrainingMode = false;

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
