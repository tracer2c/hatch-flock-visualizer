import React from "react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, BellOff, Loader2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const PushNotificationSettings: React.FC = () => {
  const {
    permission,
    isSubscribed,
    isLoading,
    isSupported,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  const handleToggle = async (checked: boolean) => {
    if (checked) {
      await subscribe();
    } else {
      await unsubscribe();
    }
  };

  if (!isSupported) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <BellOff className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Push Notifications</CardTitle>
          </div>
          <CardDescription>
            Push notifications are not supported on this device/browser.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <CardTitle>Push Notifications</CardTitle>
        </div>
        <CardDescription>
          Receive real-time alerts for temperature changes, critical days, and important batch updates.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {permission === 'denied' && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Notifications are blocked. Please enable them in your browser settings to receive alerts.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="push-notifications" className="text-base">
              Enable Push Notifications
            </Label>
            <p className="text-sm text-muted-foreground">
              Get notified even when the app is closed
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            <Switch
              id="push-notifications"
              checked={isSubscribed}
              onCheckedChange={handleToggle}
              disabled={isLoading || permission === 'denied'}
            />
          </div>
        </div>

        {isSubscribed && (
          <div className="border-t pt-4 mt-4 space-y-3">
            <p className="text-sm font-medium text-muted-foreground">
              You'll receive notifications for:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
              <li>Temperature alerts when readings are out of range</li>
              <li>Humidity alerts for abnormal levels</li>
              <li>Critical incubation days (Day 7, 14, 18, 21)</li>
              <li>Overdue transfer reminders</li>
              <li>Machine maintenance due dates</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
