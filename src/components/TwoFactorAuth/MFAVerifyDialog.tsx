import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Shield, Loader2, KeyRound } from 'lucide-react';

interface MFAVerifyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  factorId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function MFAVerifyDialog({ 
  open, 
  onOpenChange, 
  factorId, 
  onSuccess, 
  onCancel 
}: MFAVerifyDialogProps) {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');

  const verifyTOTP = async () => {
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setIsLoading(true);
    setError('');

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

      toast.success('Verification successful');
      onSuccess();
    } catch (err: any) {
      setError('Invalid code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyRecoveryCode = async () => {
    if (!recoveryCode.trim()) {
      setError('Please enter a recovery code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user session');

      // Check if recovery code is valid
      const normalizedCode = recoveryCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const formattedCode = normalizedCode.slice(0, 4) + '-' + normalizedCode.slice(4);
      
      const { data: codes, error: fetchError } = await supabase
        .from('mfa_recovery_codes')
        .select('*')
        .eq('user_id', user.id)
        .is('used_at', null);

      if (fetchError) throw fetchError;

      const validCode = codes?.find(c => atob(c.code_hash) === formattedCode);

      if (!validCode) {
        setError('Invalid or already used recovery code');
        return;
      }

      // Mark recovery code as used
      const { error: updateError } = await supabase
        .from('mfa_recovery_codes')
        .update({ used_at: new Date().toISOString() })
        .eq('id', validCode.id);

      if (updateError) throw updateError;

      toast.success('Recovery code accepted');
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to verify recovery code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
    setCode('');
    setRecoveryCode('');
    setError('');
    setUseRecoveryCode(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleCancel(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {useRecoveryCode ? (
              <KeyRound className="h-5 w-5 text-primary" />
            ) : (
              <Shield className="h-5 w-5 text-primary" />
            )}
            Two-Factor Authentication
          </DialogTitle>
          <DialogDescription>
            {useRecoveryCode 
              ? 'Enter one of your recovery codes'
              : 'Enter the 6-digit code from your authenticator app'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!useRecoveryCode ? (
            <>
              <div className="flex justify-center">
                <InputOTP 
                  maxLength={6} 
                  value={code} 
                  onChange={setCode}
                  autoFocus
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                onClick={verifyTOTP} 
                className="w-full"
                disabled={isLoading || code.length !== 6}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify'
                )}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setUseRecoveryCode(true);
                    setError('');
                  }}
                  className="text-sm text-primary hover:underline"
                >
                  Use a recovery code instead
                </button>
              </div>
            </>
          ) : (
            <>
              <Input
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value)}
                placeholder="XXXX-XXXX"
                className="text-center font-mono text-lg tracking-widest"
                autoFocus
              />

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                onClick={verifyRecoveryCode} 
                className="w-full"
                disabled={isLoading || !recoveryCode.trim()}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify Recovery Code'
                )}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setUseRecoveryCode(false);
                    setError('');
                  }}
                  className="text-sm text-primary hover:underline"
                >
                  Use authenticator app instead
                </button>
              </div>
            </>
          )}

          <Button 
            variant="ghost" 
            onClick={handleCancel}
            className="w-full"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}