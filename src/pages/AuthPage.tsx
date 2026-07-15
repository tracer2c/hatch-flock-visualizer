import { useState } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { MFAVerifyDialog } from '@/components/TwoFactorAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  Egg, Mail, ArrowLeft, RefreshCw, Loader2, Eye, EyeOff, Headset,
  ShieldCheck, TrendingUp, Activity,
} from 'lucide-react';

export default function AuthPage() {
  const { user, signIn, resetPasswordForEmail, loading } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showMFADialog, setShowMFADialog] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState('');
  const [pendingMFAVerification, setPendingMFAVerification] = useState(false);

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  const [signInEmail, setSignInEmail] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  if (user && !loading && !pendingMFAVerification && !showMFADialog) {
    return <Navigate to="/" replace />;
  }

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const fd = new FormData(e.currentTarget);
    const result = await signIn(fd.get('email') as string, fd.get('password') as string);
    if (result.requiresMFA && result.factorId) {
      setPendingMFAVerification(true);
      setMfaFactorId(result.factorId);
      setShowMFADialog(true);
    }
    setIsLoading(false);
  };

  const handleMFASuccess = () => {
    setPendingMFAVerification(false);
    setShowMFADialog(false);
    navigate('/');
  };

  const handleMFACancel = async () => {
    setPendingMFAVerification(false);
    setShowMFADialog(false);
    await supabase.auth.signOut();
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotPasswordEmail.trim()) return;
    setForgotPasswordLoading(true);
    const result = await resetPasswordForEmail(forgotPasswordEmail);
    setForgotPasswordLoading(false);
    if (!result.error) {
      setEmailSent(true);
      startResendCountdown();
    }
  };

  const startResendCountdown = () => {
    setResendCountdown(30);
    const iv = setInterval(() => {
      setResendCountdown((p) => {
        if (p <= 1) { clearInterval(iv); return 0; }
        return p - 1;
      });
    }, 1000);
  };

  const handleResendEmail = async () => {
    if (resendCountdown > 0) return;
    setForgotPasswordLoading(true);
    await resetPasswordForEmail(forgotPasswordEmail);
    setForgotPasswordLoading(false);
    startResendCountdown();
  };

  const closeForgotPasswordDialog = () => {
    setShowForgotPassword(false);
    setEmailSent(false);
    setForgotPasswordEmail('');
    setResendCountdown(0);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left: Form column */}
      <div className="flex-1 flex flex-col px-6 py-8 sm:px-10 lg:px-16 xl:px-24 overflow-y-auto">
        {/* Logo header */}
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md">
            <Egg className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-foreground">Hatchery Pro</span>
            <span className="text-[11px] text-muted-foreground">Operations Platform</span>
          </div>
        </div>

        {/* Form card */}
        <div className="flex-1 flex items-center justify-center py-10">
          <div className="w-full max-w-sm space-y-6">
            <div className="space-y-1.5">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome back</h1>
              <p className="text-sm text-muted-foreground">
                Enter your credentials to access your hatchery dashboard.
              </p>
            </div>

            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  name="email"
                  type="email"
                  placeholder="you@company.com"
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                  className="h-11"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="signin-password">Password</Label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="signin-password"
                    name="password"
                    type={showSignInPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="h-11 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignInPassword(!showSignInPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showSignInPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full h-11 font-medium" disabled={isLoading}>
                {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Signing in…</> : 'Sign in'}
              </Button>
            </form>

            <p className="text-xs text-center text-muted-foreground">
              Need help?{' '}
              <Link to="/support" className="text-primary hover:underline font-medium">
                Contact support
              </Link>
            </p>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Hatchery Pro
        </div>
      </div>

      {/* Right: Brand panel */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/70">
        {/* Decorative orbs */}
        <div className="absolute top-16 right-16 w-72 h-72 bg-accent/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-16 w-96 h-96 bg-primary-foreground/10 rounded-full blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E\")",
          }}
        />
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 text-primary-foreground w-full">
          <div />
          <div className="space-y-8 max-w-lg">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-foreground/10 backdrop-blur border border-primary-foreground/20 text-xs font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              Live monitoring across every hatchery
            </div>
            <h2 className="text-4xl xl:text-5xl font-bold leading-tight">
              Every egg tracked. Every insight surfaced.
            </h2>
            <p className="text-primary-foreground/80 text-base leading-relaxed">
              A unified command center for flock rollups, QA checks, and hatch
              analytics — built for operations teams that move fast.
            </p>
            <div className="grid grid-cols-1 gap-3">
              {[
                { icon: TrendingUp, label: 'Real-time HOF & HOI performance' },
                { icon: Activity, label: 'Weekly flock rollups across houses' },
                { icon: ShieldCheck, label: 'Enterprise-grade access & 2FA' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-3 text-sm">
                  <div className="h-8 w-8 rounded-lg bg-primary-foreground/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-primary-foreground/90">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MFA Dialog */}
      <MFAVerifyDialog
        open={showMFADialog}
        onOpenChange={setShowMFADialog}
        factorId={mfaFactorId}
        onSuccess={handleMFASuccess}
        onCancel={handleMFACancel}
      />

      {/* Forgot Password */}
      <Dialog open={showForgotPassword} onOpenChange={closeForgotPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          {!emailSent ? (
            <>
              <DialogHeader>
                <DialogTitle>Reset your password</DialogTitle>
                <DialogDescription>
                  Enter your email and we'll send you a link to reset it.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleForgotPassword} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="forgot-email">Email</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="you@company.com"
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    className="h-11"
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Button type="submit" className="w-full h-11" disabled={forgotPasswordLoading || !forgotPasswordEmail.trim()}>
                    {forgotPasswordLoading ? 'Sending…' : 'Send reset link'}
                  </Button>
                  <Button type="button" variant="ghost" onClick={closeForgotPasswordDialog}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to sign in
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-success/15 rounded-full flex items-center justify-center">
                    <Mail className="w-6 h-6 text-success" />
                  </div>
                  <DialogTitle>Check your email</DialogTitle>
                </div>
                <DialogDescription className="pt-2">
                  We've sent a password reset link to:
                  <span className="block font-medium text-foreground mt-1">{forgotPasswordEmail}</span>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <p className="text-sm text-muted-foreground">
                  Didn't receive it? Check spam or try resending.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResendEmail}
                  disabled={resendCountdown > 0 || forgotPasswordLoading}
                  className="w-full h-11"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${forgotPasswordLoading ? 'animate-spin' : ''}`} />
                  {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : forgotPasswordLoading ? 'Sending…' : 'Resend email'}
                </Button>
                <Button type="button" variant="ghost" onClick={closeForgotPasswordDialog} className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back to sign in
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Floating help */}
      <Link
        to="/support"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-foreground text-background rounded-full shadow-lg hover:shadow-xl transition-shadow"
      >
        <Headset className="h-4 w-4" />
        <span className="text-sm font-medium">Need help?</span>
      </Link>
    </div>
  );
}
