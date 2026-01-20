import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: Array<'company_admin' | 'operations_head' | 'staff'>;
  fallbackPath?: string;
}

export const RoleProtectedRoute = ({ 
  children, 
  allowedRoles,
  fallbackPath = '/'
}: RoleProtectedRouteProps) => {
  const { roles, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  const hasAccess = roles.some(r => allowedRoles.includes(r.role as 'company_admin' | 'operations_head' | 'staff'));
  
  if (!hasAccess) {
    return <Navigate to={fallbackPath} replace />;
  }
  
  return <>{children}</>;
};
