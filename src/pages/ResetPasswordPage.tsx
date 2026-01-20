import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { Egg, ArrowLeft, Check, X } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function ResetPasswordPage() {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Password strength calculation
  const getPasswordStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 8) strength += 25;
    if (pwd.length >= 12) strength += 15;
    if (/[a-z]/.test(pwd)) strength += 15;
    if (/[A-Z]/.test(pwd)) strength += 15;
    if (/[0-9]/.test(pwd)) strength += 15;
    if (/[^a-zA-Z0-9]/.test(pwd)) strength += 15;
    return Math.min(strength, 100);
  };

  const passwordStrength = getPasswordStrength(password);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const getStrengthColor = (strength: number) => {
    if (strength < 30) return 'bg-destructive';
    if (strength < 60) return 'bg-warning';
    return 'bg-success';
  };

  const getStrengthLabel = (strength: number) => {
    if (strength < 30) return 'Weak';
    if (strength < 60) return 'Medium';
    if (strength < 80) return 'Strong';
    return 'Very Strong';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passwordsMatch || passwordStrength < 30) return;
    
    setIsLoading(true);
    const result = await resetPassword(password);
    setIsLoading(false);

    if (!result.error) {
      setIsSuccess(true);
      setTimeout(() => {
        navigate('/auth');
      }, 2000);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
        <div className="absolute top-20 right-20 w-72 h-72 bg-gradient-to-br from-accent/30 to-warning/20 rounded-full blur-3xl animate-float" />
        
        <Card className="w-full max-w-md border-2 border-border/50 shadow-2xl backdrop-blur-sm bg-card/95 overflow-hidden relative z-10">
          <div className="h-1 w-full bg-gradient-to-r from-success via-primary to-accent" />
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-success" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Password Reset Complete</h2>
            <p className="text-muted-foreground">
              Redirecting you to sign in...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
      <div className="absolute top-20 right-20 w-72 h-72 bg-gradient-to-br from-accent/30 to-warning/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-gradient-to-br from-primary/25 to-success/15 rounded-full blur-3xl animate-float" style={{ animationDelay: '-3s' }} />

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-block p-1 bg-gradient-to-br from-primary via-success to-accent rounded-2xl mb-4 shadow-glow">
            <div className="p-3 bg-background rounded-xl">
              <div className="w-16 h-16 bg-gradient-to-br from-accent/20 to-warning/20 rounded-xl flex items-center justify-center shadow-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent" />
                <Egg className="w-10 h-10 text-accent relative z-10" />
              </div>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gradient-hero">
            Reset Password
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Enter your new password below
          </p>
        </div>

        <Card className="border-2 border-border/50 shadow-2xl backdrop-blur-sm bg-card/95 overflow-hidden animate-scale-in">
          <div className="h-1 w-full bg-gradient-to-r from-primary via-success to-accent" />
          
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-bold">Create New Password</CardTitle>
            <CardDescription>
              Choose a strong password for your account
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  New Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 border-2 border-border/50 focus:border-primary/50 transition-colors"
                  required
                  minLength={8}
                />
                {password && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Password strength</span>
                      <span className={`font-medium ${passwordStrength >= 60 ? 'text-success' : passwordStrength >= 30 ? 'text-warning' : 'text-destructive'}`}>
                        {getStrengthLabel(passwordStrength)}
                      </span>
                    </div>
                    <Progress value={passwordStrength} className={`h-1.5 ${getStrengthColor(passwordStrength)}`} />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`h-11 border-2 transition-colors pr-10 ${
                      confirmPassword 
                        ? passwordsMatch 
                          ? 'border-success/50 focus:border-success' 
                          : 'border-destructive/50 focus:border-destructive'
                        : 'border-border/50 focus:border-primary/50'
                    }`}
                    required
                  />
                  {confirmPassword && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {passwordsMatch ? (
                        <Check className="w-5 h-5 text-success" />
                      ) : (
                        <X className="w-5 h-5 text-destructive" />
                      )}
                    </div>
                  )}
                </div>
                {confirmPassword && !passwordsMatch && (
                  <p className="text-xs text-destructive">Passwords do not match</p>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pb-6">
              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl hover:shadow-primary/20 transition-all duration-300"
                disabled={isLoading || !passwordsMatch || passwordStrength < 30}
              >
                {isLoading ? "Resetting..." : "Reset Password"}
              </Button>
              
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => navigate('/auth')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Sign In
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
