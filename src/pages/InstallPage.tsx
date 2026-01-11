import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, Smartphone, Monitor, Apple, CheckCircle, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallPage = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(standalone);
    
    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // Listen for app installed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isStandalone || isInstalled) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        <Card className="border-success/20 bg-success/5">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <CardTitle className="text-2xl">App Installed!</CardTitle>
            <CardDescription>
              Hatchery Pro is now installed on your device. You can access it from your home screen or app launcher.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <div className="text-center mb-8">
        <div className="mx-auto w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Download className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Install Hatchery Pro</h1>
        <p className="text-muted-foreground">
          Get the full app experience with offline access and instant loading
        </p>
      </div>

      {/* Benefits */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Why Install?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Smartphone className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium">Works Offline</p>
              <p className="text-sm text-muted-foreground">Access your data even without internet</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Monitor className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium">Full Screen Experience</p>
              <p className="text-sm text-muted-foreground">No browser chrome, feels like a native app</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Download className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium">Instant Loading</p>
              <p className="text-sm text-muted-foreground">Cached assets load instantly</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Install Options */}
      {deferredPrompt && (
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <Button onClick={handleInstallClick} className="w-full" size="lg">
              <Download className="h-5 w-5 mr-2" />
              Install Hatchery Pro
            </Button>
          </CardContent>
        </Card>
      )}

      {isIOS && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Apple className="h-5 w-5" />
              Install on iOS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-sm font-medium">1</div>
              <p className="text-sm">Tap the <Share className="h-4 w-4 inline mx-1" /> Share button in Safari</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-sm font-medium">2</div>
              <p className="text-sm">Scroll down and tap "Add to Home Screen"</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-sm font-medium">3</div>
              <p className="text-sm">Tap "Add" to install the app</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!deferredPrompt && !isIOS && (
        <Alert>
          <AlertDescription>
            To install this app, use Chrome, Edge, or another supported browser, then look for the install option in your browser's menu or address bar.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default InstallPage;
