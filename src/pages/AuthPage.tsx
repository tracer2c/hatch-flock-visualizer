import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { MFAVerifyDialog } from '@/components/TwoFactorAuth';
import { supabase } from '@/integrations/supabase/client';
import { Egg } from 'lucide-react';

export default function AuthPage() {
  const { user, signIn, signUp, loading } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showMFADialog, setShowMFADialog] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState('');
  const [pendingMFAVerification, setPendingMFAVerification] = useState(false);

  // Redirect if already authenticated (but not if MFA verification is pending)
  if (user && !loading && !pendingMFAVerification && !showMFADialog) {
    return <Navigate to="/" replace />;
  }

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const result = await signIn(email, password);
    
    if (result.requiresMFA && result.factorId) {
      setPendingMFAVerification(true);
      setMfaFactorId(result.factorId);
      setShowMFADialog(true);
    }
    
    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;

    await signUp(email, password, firstName, lastName);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4">
      {/* Vibrant Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
      
      {/* Animated Decorative Orbs */}
      <div className="absolute top-20 right-20 w-72 h-72 bg-gradient-to-br from-accent/30 to-warning/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-gradient-to-br from-primary/25 to-success/15 rounded-full blur-3xl animate-float" style={{ animationDelay: '-3s' }} />
      <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-gradient-to-br from-success/20 to-primary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '-1.5s' }} />
      
      {/* Subtle Pattern Overlay */}
      <div className="absolute inset-0 opacity-[0.015]" style={{ 
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` 
      }} />
      
      <div className="w-full max-w-md relative z-10">
        {/* Header with Enhanced Logo */}
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
            Hatchery Management
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Enterprise-grade hatchery operations platform
          </p>
        </div>

        {/* Auth Tabs with Glass Effect */}
        <Tabs defaultValue="signin" className="w-full animate-scale-in">
          <TabsList className="grid w-full grid-cols-2 bg-background/60 backdrop-blur-md p-1.5 border border-border/50 shadow-lg">
            <TabsTrigger 
              value="signin"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/90 data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-300"
            >
              Sign In
            </TabsTrigger>
            <TabsTrigger 
              value="signup"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/90 data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-300"
            >
              Sign Up
            </TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="mt-4">
            <Card className="border-2 border-border/50 shadow-2xl backdrop-blur-sm bg-card/95 overflow-hidden">
              {/* Accent Bar */}
              <div className="h-1 w-full bg-gradient-to-r from-primary via-success to-accent" />
              
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
                <CardDescription>
                  Enter your credentials to access your dashboard
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSignIn}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-sm font-medium">
                      Email
                    </Label>
                    <Input
                      id="signin-email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      className="h-11 border-2 border-border/50 focus:border-primary/50 transition-colors"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="text-sm font-medium">
                      Password
                    </Label>
                    <Input
                      id="signin-password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      className="h-11 border-2 border-border/50 focus:border-primary/50 transition-colors"
                      required
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3 pb-6">
                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl hover:shadow-primary/20 transition-all duration-300"
                    disabled={isLoading}
                  >
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="signup" className="mt-4">
            <Card className="border-2 border-border/50 shadow-2xl backdrop-blur-sm bg-card/95 overflow-hidden">
              {/* Accent Bar */}
              <div className="h-1 w-full bg-gradient-to-r from-accent via-warning to-primary" />
              
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-2xl font-bold">Get Started</CardTitle>
                <CardDescription>
                  Create your account to begin managing operations
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSignUp}>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-sm font-medium">
                        First Name
                      </Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        placeholder="John"
                        className="h-11 border-2 border-border/50 focus:border-primary/50 transition-colors"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-sm font-medium">
                        Last Name
                      </Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        placeholder="Doe"
                        className="h-11 border-2 border-border/50 focus:border-primary/50 transition-colors"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-sm font-medium">
                      Email
                    </Label>
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      className="h-11 border-2 border-border/50 focus:border-primary/50 transition-colors"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-sm font-medium">
                      Password
                    </Label>
                    <Input
                      id="signup-password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      className="h-11 border-2 border-border/50 focus:border-primary/50 transition-colors"
                      required
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3 pb-6">
                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-semibold bg-gradient-to-r from-accent to-warning hover:from-accent/90 hover:to-warning/90 shadow-lg hover:shadow-xl hover:shadow-accent/20 transition-all duration-300"
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating account..." : "Create Account"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* MFA Verification Dialog */}
      <MFAVerifyDialog
        open={showMFADialog}
        onOpenChange={setShowMFADialog}
        factorId={mfaFactorId}
        onSuccess={handleMFASuccess}
        onCancel={handleMFACancel}
      />
    </div>
  );
}
