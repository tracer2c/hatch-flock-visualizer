import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Shield, CheckCircle, AlertCircle, Clock, Download, Loader2, Trash2 } from 'lucide-react';
import { MFASetupDialog } from './MFASetupDialog';

interface TwoFactorSectionProps {
  userId: string;
}

export function TwoFactorSection({ userId }: TwoFactorSectionProps) {
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [gracePeriodStart, setGracePeriodStart] = useState<string | null>(null);
  const [gracePeriodDays, setGracePeriodDays] = useState(7);
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDisabling, setIsDisabling] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [remainingDays, setRemainingDays] = useState<number | null>(null);

  useEffect(() => {
    fetchMFAStatus();
  }, [userId]);

  const fetchMFAStatus = async () => {
    try {
      // Get profile MFA settings
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('mfa_enabled, mfa_grace_period_start, mfa_grace_period_days')
        .eq('id', userId)
        .single();

      if (error) throw error;

      setMfaEnabled(profile?.mfa_enabled || false);
      setGracePeriodStart(profile?.mfa_grace_period_start);
      setGracePeriodDays(profile?.mfa_grace_period_days || 7);

      // Calculate remaining grace period days
      if (profile?.mfa_grace_period_start && !profile?.mfa_enabled) {
        const start = new Date(profile.mfa_grace_period_start);
        const now = new Date();
        const daysPassed = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const remaining = (profile.mfa_grace_period_days || 7) - daysPassed;
        setRemainingDays(Math.max(0, remaining));
      } else {
        setRemainingDays(null);
      }

      // Also check Supabase MFA factors
      const { data: factors } = await supabase.auth.mfa.listFactors();
      if (factors?.totp && factors.totp.length > 0 && !profile?.mfa_enabled) {
        // Sync status if out of sync
        await supabase
          .from('user_profiles')
          .update({ mfa_enabled: true })
          .eq('id', userId);
        setMfaEnabled(true);
      }
    } catch (err) {
      console.error('Error fetching MFA status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const disableMFA = async () => {
    if (!confirm('Are you sure you want to disable two-factor authentication? This will make your account less secure.')) {
      return;
    }

    setIsDisabling(true);
    try {
      // Unenroll all TOTP factors
      const { data: factors } = await supabase.auth.mfa.listFactors();
      for (const factor of factors?.totp || []) {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }

      // Update profile
      await supabase
        .from('user_profiles')
        .update({ mfa_enabled: false })
        .eq('id', userId);

      // Delete recovery codes
      await supabase
        .from('mfa_recovery_codes')
        .delete()
        .eq('user_id', userId);

      setMfaEnabled(false);
      toast.success('Two-factor authentication disabled');
    } catch (err: any) {
      toast.error(err.message || 'Failed to disable 2FA');
    } finally {
      setIsDisabling(false);
    }
  };

  const regenerateRecoveryCodes = async () => {
    setIsRegenerating(true);
    try {
      // Delete old codes
      await supabase
        .from('mfa_recovery_codes')
        .delete()
        .eq('user_id', userId);

      // Generate new codes
      const codes = Array.from({ length: 10 }, () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
          code += chars[Math.floor(Math.random() * chars.length)];
          if (i === 3) code += '-';
        }
        return code;
      });

      // Save new codes
      for (const code of codes) {
        await supabase
          .from('mfa_recovery_codes')
          .insert({
            user_id: userId,
            code_hash: btoa(code),
          });
      }

      // Update timestamp
      await supabase
        .from('user_profiles')
        .update({ mfa_recovery_codes_generated_at: new Date().toISOString() })
        .eq('id', userId);

      // Download the codes
      const text = `Hatchery Management - Recovery Codes
=====================================

IMPORTANT: Keep these codes in a safe place!
Each code can only be used once.
Your previous codes are now invalid.

${codes.map((code, i) => `${i + 1}. ${code}`).join('\n')}

Generated: ${new Date().toLocaleString()}
`;
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'hatchery-recovery-codes.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('New recovery codes generated and downloaded');
    } catch (err: any) {
      toast.error(err.message || 'Failed to regenerate codes');
    } finally {
      setIsRegenerating(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Two-Factor Authentication</CardTitle>
          </div>
          <CardDescription>
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {mfaEnabled ? (
            <>
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  Two-factor authentication is enabled. Your account is protected.
                </AlertDescription>
              </Alert>

              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  onClick={regenerateRecoveryCodes}
                  disabled={isRegenerating}
                >
                  {isRegenerating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Regenerate Recovery Codes
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={disableMFA}
                  disabled={isDisabling}
                >
                  {isDisabling ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Disable 2FA
                </Button>
              </div>
            </>
          ) : (
            <>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Protect your account with two-factor authentication using an authenticator app like Google Authenticator or Authy.
                </AlertDescription>
              </Alert>

              {remainingDays !== null && remainingDays > 0 && (
                <Alert className="bg-amber-50 border-amber-200">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-700">
                    You have <strong>{remainingDays} day{remainingDays !== 1 ? 's' : ''}</strong> remaining to enable 2FA before it becomes required.
                  </AlertDescription>
                </Alert>
              )}

              {remainingDays === 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Your grace period has expired. Please enable 2FA to continue using the application securely.
                  </AlertDescription>
                </Alert>
              )}

              <Button onClick={() => setShowSetupDialog(true)}>
                <Shield className="mr-2 h-4 w-4" />
                Enable Two-Factor Authentication
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <MFASetupDialog
        open={showSetupDialog}
        onOpenChange={setShowSetupDialog}
        onComplete={() => {
          setMfaEnabled(true);
          fetchMFAStatus();
        }}
        userId={userId}
      />
    </>
  );
}