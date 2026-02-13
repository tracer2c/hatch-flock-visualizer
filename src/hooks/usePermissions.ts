import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { FeatureKey } from '@/lib/featureKeys';

interface RolePermission {
  id: string;
  company_id: string;
  feature_key: string;
  role: 'company_admin' | 'operations_head' | 'staff';
  has_access: boolean;
}

export function usePermissions() {
  const { profile, roles, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ['role_permissions', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      const { data, error } = await supabase
        .from('role_permissions' as any)
        .select('*')
        .eq('company_id', profile.company_id);
      if (error) throw error;
      return (data || []) as unknown as RolePermission[];
    },
    enabled: !!profile?.company_id,
    staleTime: 5 * 60 * 1000,
  });

  const hasFeatureAccess = (featureKey: FeatureKey): boolean => {
    // Company admins always have full access
    if (isAdmin()) return true;

    // Check each of the user's roles against permissions
    const userRoles = roles.map(r => r.role);
    
    for (const role of userRoles) {
      const perm = permissions.find(
        p => p.feature_key === featureKey && p.role === role
      );
      // If permission found and granted, allow access
      if (perm?.has_access) return true;
    }

    // If no permissions found in DB yet (loading/empty), fall back to allowing access
    // for non-management features to avoid blocking users during initial load
    if (permissions.length === 0 && !isLoading) return true;

    return false;
  };

  const updatePermission = useMutation({
    mutationFn: async ({
      featureKey,
      role,
      hasAccess,
    }: {
      featureKey: string;
      role: 'operations_head' | 'staff';
      hasAccess: boolean;
    }) => {
      if (!profile?.company_id) throw new Error('No company');
      
      const { error } = await supabase
        .from('role_permissions' as any)
        .update({ has_access: hasAccess, updated_by: profile.id } as any)
        .eq('company_id', profile.company_id)
        .eq('feature_key', featureKey)
        .eq('role', role);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role_permissions', profile?.company_id] });
    },
  });

  return {
    permissions,
    isLoading,
    hasFeatureAccess,
    updatePermission,
  };
}
