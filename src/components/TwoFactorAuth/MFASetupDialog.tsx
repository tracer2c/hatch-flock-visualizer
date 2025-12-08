import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Download, Shield, Smartphone, CheckCircle, Copy, Loader2 } from 'lucide-react';

interface MFASetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  userId: string;
}

type SetupStep = 'intro' | 'recovery' | 'qrcode' | 'verify' | 'complete';

export function MFASetupDialog({ open, onOpenChange, onComplete, userId }: MFASetupDialogProps) {
  const [step, setStep] = useState<SetupStep>('intro');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [codesDownloaded, setCodesDownloaded] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [factorId, setFactorId] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const generateRecoveryCodes = () => {
    const codes = Array.from({ length: 10 }, () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 8; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
        if (i === 3) code += '-';
      }
      return code;
    });
    setRecoveryCodes(codes);
    setStep('recovery');
  };

  const downloadRecoveryCodes = () => {
    const text = `Hatchery Management - Recovery Codes
=====================================

IMPORTANT: Keep these codes in a safe place!
Each code can only be used once.

${recoveryCodes.map((code, i) => `${i + 1}. ${code}`).join('\n')}

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
    setCodesDownloaded(true);
    toast.success('Recovery codes downloaded');
  };

  const copyRecoveryCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join('\n'));
    toast.success('Recovery codes copied to clipboard');
    setCodesDownloaded(true);
  };

  const startEnrollment = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Enroll MFA with Supabase (don't save recovery codes yet - wait for verification)
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App'
      });

      if (enrollError) throw enrollError;

      if (data) {
        setQrCode(data.totp.qr_code);
        setSecret(data.totp.secret);
        setFactorId(data.id);
        setStep('qrcode');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start enrollment');
      toast.error('Failed to start 2FA enrollment');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyAndComplete = async () => {
    if (verifyCode.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Refresh session to get updated claims after enrollment
      await supabase.auth.refreshSession();

      // Challenge and verify
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId
      });

      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: verifyCode
      });

      if (verifyError) throw verifyError;

      // NOW save recovery codes to database (after successful verification)
      for (const code of recoveryCodes) {
        await supabase.from('mfa_recovery_codes').insert({
          user_id: userId,
          code_hash: btoa(code),
        });
      }

      // Update user profile to mark MFA as enabled
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          mfa_enabled: true,
          mfa_recovery_codes_generated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      setStep('complete');
      toast.success('Two-factor authentication enabled!');
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (step === 'complete') {
      onComplete();
    }
    onOpenChange(false);
    // Reset state
    setStep('intro');
    setRecoveryCodes([]);
    setCodesDownloaded(false);
    setQrCode('');
    setSecret('');
    setFactorId('');
    setVerifyCode('');
    setError('');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {step === 'intro' && 'Enable Two-Factor Authentication'}
            {step === 'recovery' && 'Save Recovery Codes'}
            {step === 'qrcode' && 'Scan QR Code'}
            {step === 'verify' && 'Verify Setup'}
            {step === 'complete' && '2FA Enabled!'}
          </DialogTitle>
          <DialogDescription>
            {step === 'intro' && 'Add an extra layer of security to your account'}
            {step === 'recovery' && 'Save these codes - you\'ll need them if you lose access'}
            {step === 'qrcode' && 'Scan with your authenticator app'}
            {step === 'verify' && 'Enter the code from your authenticator app'}
            {step === 'complete' && 'Your account is now protected with 2FA'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Step 1: Introduction */}
          {step === 'intro' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg">
                <Smartphone className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium">Authenticator App Required</p>
                  <p className="text-sm text-muted-foreground">
                    Use Google Authenticator, Authy, or similar apps
                  </p>
                </div>
              </div>
              <Button onClick={generateRecoveryCodes} className="w-full">
                Get Started
              </Button>
            </div>
          )}

          {/* Step 2: Recovery Codes */}
          {step === 'recovery' && (
            <div className="space-y-4">
              <Alert className="bg-amber-50 border-amber-200">
                <AlertDescription className="text-amber-800">
                  <strong>Important:</strong> Save these recovery codes securely. 
                  You'll need them if you lose access to your authenticator app.
                </AlertDescription>
              </Alert>
              
              <div className="grid grid-cols-2 gap-2 p-3 bg-muted rounded-lg font-mono text-sm">
                {recoveryCodes.map((code, i) => (
                  <div key={i} className="px-2 py-1 bg-background rounded">
                    {code}
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={downloadRecoveryCodes} className="flex-1">
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
                <Button variant="outline" onClick={copyRecoveryCodes} className="flex-1">
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </Button>
              </div>

              <Button 
                onClick={startEnrollment} 
                className="w-full"
                disabled={!codesDownloaded || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  'Continue to QR Code'
                )}
              </Button>

              {!codesDownloaded && (
                <p className="text-xs text-center text-muted-foreground">
                  Please download or copy your recovery codes to continue
                </p>
              )}
            </div>
          )}

          {/* Step 3: QR Code */}
          {step === 'qrcode' && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <img 
                  src={qrCode} 
                  alt="2FA QR Code" 
                  className="w-48 h-48 border rounded-lg p-2 bg-white"
                />
              </div>

              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Can't scan? Enter this code manually:
                </p>
                <code className="block p-2 bg-muted rounded font-mono text-xs break-all select-all">
                  {secret}
                </code>
              </div>

              <Button onClick={() => setStep('verify')} className="w-full">
                I've Scanned the Code
              </Button>
            </div>
          )}

          {/* Step 4: Verify */}
          {step === 'verify' && (
            <div className="space-y-4">
              <p className="text-sm text-center text-muted-foreground">
                Enter the 6-digit code from your authenticator app
              </p>

              <div className="flex justify-center">
                <InputOTP 
                  maxLength={6} 
                  value={verifyCode} 
                  onChange={setVerifyCode}
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
                onClick={verifyAndComplete} 
                className="w-full"
                disabled={isLoading || verifyCode.length !== 6}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Enable 2FA'
                )}
              </Button>

              <Button 
                variant="ghost" 
                onClick={() => setStep('qrcode')}
                className="w-full"
              >
                Back to QR Code
              </Button>
            </div>
          )}

          {/* Step 5: Complete */}
          {step === 'complete' && (
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </div>
              <p className="text-muted-foreground">
                Two-factor authentication is now active. You'll need your authenticator app each time you sign in.
              </p>
              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}