import { useState, useEffect } from 'react';
import { User, Session, Factor } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface UserProfile {
  id: string;
  company_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  avatar_url?: string;
  status: string;
  mfa_enabled?: boolean;
  mfa_grace_period_start?: string;
  mfa_grace_period_days?: number;
}

export interface UserRole {
  role: 'company_admin' | 'operations_head' | 'staff';
}

export interface MFAStatus {
  hasMFA: boolean;
  factors: Factor[];
  isVerified: boolean;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [mfaStatus, setMfaStatus] = useState<MFAStatus>({ hasMFA: false, factors: [], isVerified: false });
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch user profile and roles
          setTimeout(async () => {
            await fetchUserProfile(session.user.id);
            await fetchUserRoles(session.user.id);
            await checkMFAStatus();
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
          setMfaStatus({ hasMFA: false, factors: [], isVerified: false });
        }
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserProfile(session.user.id);
        fetchUserRoles(session.user.id);
        checkMFAStatus();
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchUserRoles = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) throw error;
      setRoles(data || []);
    } catch (error) {
      console.error('Error fetching user roles:', error);
    }
  };

  const checkMFAStatus = async () => {
    try {
      const { data: factors, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;

      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      setMfaStatus({
        hasMFA: (factors?.totp?.length || 0) > 0,
        factors: factors?.totp || [],
        isVerified: aal?.currentLevel === 'aal2'
      });
    } catch (error) {
      console.error('Error checking MFA status:', error);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: firstName,
            last_name: lastName,
          }
        }
      });

      if (error) throw error;

      // Start grace period for new users
      // This will be set after the user confirms their email and profile is created
      toast({
        title: "Account created successfully",
        description: "Please check your email to verify your account.",
      });

      return { error: null };
    } catch (error: any) {
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check MFA factors after sign in - only verified factors require MFA
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const verifiedFactors = factors?.totp?.filter(f => f.status === 'verified') || [];
      const hasMFA = verifiedFactors.length > 0;

      if (hasMFA) {
        // Return info that MFA verification is needed
        return { 
          error: null, 
          requiresMFA: true, 
          factorId: verifiedFactors[0]?.id 
        };
      }

      // Start grace period if not already started
      if (data.user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('mfa_grace_period_start, mfa_enabled')
          .eq('id', data.user.id)
          .single();

        if (!profile?.mfa_grace_period_start && !profile?.mfa_enabled) {
          await supabase
            .from('user_profiles')
            .update({ mfa_grace_period_start: new Date().toISOString() })
            .eq('id', data.user.id);
        }
      }

      toast({
        title: "Welcome back!",
        description: "You have been signed in successfully.",
      });

      return { error: null, requiresMFA: false };
    } catch (error: any) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive",
      });
      return { error, requiresMFA: false };
    }
  };

  const verifyMFA = async (factorId: string, code: string) => {
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId
      });

      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code
      });

      if (verifyError) throw verifyError;

      await checkMFAStatus();
      
      toast({
        title: "Welcome back!",
        description: "You have been signed in successfully.",
      });

      return { error: null };
    } catch (error: any) {
      toast({
        title: "Verification failed",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Sign out failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateProfile = async (updates: {
    first_name?: string;
    last_name?: string;
    phone?: string;
  }) => {
    try {
      if (!user) throw new Error('No user logged in');
      
      const { error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', user.id);
      
      if (error) throw error;
      
      // Refresh profile data
      await fetchUserProfile(user.id);
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      
      return { error: null };
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }
  };

  const updateEmail = async (newEmail: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail
      });
      
      if (error) throw error;
      
      toast({
        title: "Email update initiated",
        description: "Please check both your old and new email to confirm the change.",
      });
      
      return { error: null };
    } catch (error: any) {
      toast({
        title: "Email update failed",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }
  };

  const updatePassword = async (currentPassword: string, newPassword: string) => {
    try {
      if (!user?.email) throw new Error('No user logged in');
      
      // First verify current password by signing in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      
      if (signInError) throw new Error('Current password is incorrect');
      
      // Update to new password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      });
      
      return { error: null };
    } catch (error: any) {
      toast({
        title: "Password update failed",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }
  };

  const createDefaultAdmin = async () => {
    // Check localStorage flag FIRST (sync check) to avoid any async operations
    try {
      const hasTriedCreation = localStorage.getItem('admin_creation_attempted');
      if (hasTriedCreation === 'true') {
        return { error: null };
      }
    } catch {
      // localStorage might not be available, continue anyway
    }

    // Mark attempt immediately to prevent race conditions
    try {
      localStorage.setItem('admin_creation_attempted', 'true');
    } catch {
      // Ignore localStorage errors
    }

    try {
      // Check if any users exist
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id')
        .limit(1);
        
      if (profiles && profiles.length > 0) {
        // Users already exist, skip creation
        return { error: null };
      }
      
      // Skip admin creation entirely - let users create accounts manually
      // This prevents email validation errors with invalid domains
      console.log('No users found, but skipping auto-admin creation');
      return { error: null };
    } catch (error: any) {
      // Non-blocking error - just log and continue
      console.log('createDefaultAdmin check completed with note:', error?.message || 'unknown');
      return { error: null };
    }
  };

  const hasRole = (role: 'company_admin' | 'operations_head' | 'staff') => {
    return roles.some(r => r.role === role);
  };

  const isAdmin = () => hasRole('company_admin');
  const isOperationsHead = () => hasRole('operations_head');
  const isStaff = () => hasRole('staff');

  const checkGracePeriodExpired = () => {
    if (!profile?.mfa_grace_period_start || profile?.mfa_enabled) return false;
    
    const graceStart = new Date(profile.mfa_grace_period_start);
    const graceDays = profile.mfa_grace_period_days || 7;
    const graceEnd = new Date(graceStart);
    graceEnd.setDate(graceEnd.getDate() + graceDays);
    
    return new Date() > graceEnd;
  };

  return {
    user,
    session,
    profile,
    roles,
    loading,
    mfaStatus,
    signUp,
    signIn,
    signOut,
    verifyMFA,
    updateProfile,
    updateEmail,
    updatePassword,
    createDefaultAdmin,
    hasRole,
    isAdmin,
    isOperationsHead,
    isStaff,
    checkMFAStatus,
    checkGracePeriodExpired,
  };
};