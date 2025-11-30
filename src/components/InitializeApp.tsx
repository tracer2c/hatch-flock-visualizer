import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface InitializeAppProps {
  children: React.ReactNode;
}

export default function InitializeApp({ children }: InitializeAppProps) {
  const { createDefaultAdmin, loading } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Set a maximum timeout to ensure app always initializes
    const maxTimeout = setTimeout(() => {
      console.log('InitializeApp: Max timeout reached, forcing initialization');
      setIsInitialized(true);
    }, 3000);

    const initializeApp = async () => {
      try {
        // Create default admin user if it doesn't exist
        await createDefaultAdmin();
      } catch (error) {
        console.error('InitializeApp: Admin creation error (non-blocking):', error);
      } finally {
        clearTimeout(maxTimeout);
        setIsInitialized(true);
      }
    };

    if (!loading) {
      initializeApp();
    }

    return () => clearTimeout(maxTimeout);
  }, [loading, createDefaultAdmin]);

  if (loading || !isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Initializing application...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
