import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { Loader2 } from 'lucide-react';
import type { FeatureKey } from '@/lib/featureKeys';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  featureKey?: FeatureKey;
  allowedRoles?: Array<'company_admin' | 'operations_head' | 'staff'>;
  fallbackPath?: string;
}

export const RoleProtectedRoute = ({ 
  children, 
  featureKey,
  allowedRoles,
  fallbackPath = '/'
}: RoleProtectedRouteProps) => {
  const { roles, loading } = useAuth();
  const { hasFeatureAccess, isLoading: permissionsLoading } = usePermissions();
  
  if (loading || permissionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Check dynamic permissions if featureKey is provided
  if (featureKey) {
    if (!hasFeatureAccess(featureKey)) {
      return <Navigate to={fallbackPath} replace />;
    }
    return <>{children}</>;
  }
  
  // Fallback to legacy allowedRoles check
  if (allowedRoles) {
    const hasAccess = roles.some(r => allowedRoles.includes(r.role as 'company_admin' | 'operations_head' | 'staff'));
    if (!hasAccess) {
      return <Navigate to={fallbackPath} replace />;
    }
  }
  
  return <>{children}</>;
};
