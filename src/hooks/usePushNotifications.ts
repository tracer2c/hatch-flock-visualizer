import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

// VAPID public key - this will be fetched from the edge function
const VAPID_PUBLIC_KEY_ENDPOINT = "https://xgpizkqbhybbqytgmtum.supabase.co/functions/v1/get-vapid-public-key";

interface PushNotificationsState {
  permission: NotificationPermission;
  isSubscribed: boolean;
  isLoading: boolean;
  isSupported: boolean;
}

interface UsePushNotificationsReturn extends PushNotificationsState {
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
  checkSubscription: () => Promise<void>;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const { user } = useAuth();
  const [state, setState] = useState<PushNotificationsState>({
    permission: 'default',
    isSubscribed: false,
    isLoading: false,
    isSupported: false,
  });

  // Check if push notifications are supported
  useEffect(() => {
    const isSupported = 
      'serviceWorker' in navigator && 
      'PushManager' in window && 
      'Notification' in window;
    
    setState(prev => ({
      ...prev,
      isSupported,
      permission: isSupported ? Notification.permission : 'denied',
    }));
  }, []);

  // Check current subscription status
  const checkSubscription = useCallback(async () => {
    if (!state.isSupported || !user) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        // Verify subscription exists in database
        const { data } = await supabase
          .from('push_subscriptions')
          .select('id')
          .eq('user_id', user.id)
          .eq('endpoint', subscription.endpoint)
          .single();

        setState(prev => ({
          ...prev,
          isSubscribed: !!data,
          permission: Notification.permission,
        }));
      } else {
        setState(prev => ({
          ...prev,
          isSubscribed: false,
          permission: Notification.permission,
        }));
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  }, [state.isSupported, user]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  const subscribe = useCallback(async () => {
    if (!state.isSupported || !user) {
      toast.error("Push notifications are not supported on this device");
      return;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      setState(prev => ({ ...prev, permission }));

      if (permission !== 'granted') {
        toast.error("Notification permission denied");
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      // Get VAPID public key from edge function
      const vapidResponse = await fetch(VAPID_PUBLIC_KEY_ENDPOINT);
      if (!vapidResponse.ok) {
        throw new Error('Failed to fetch VAPID key');
      }
      const { publicKey } = await vapidResponse.json();

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push notifications
      const applicationServerKey = urlBase64ToUint8Array(publicKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });

      // Extract subscription details
      const subscriptionJson = subscription.toJSON();
      const keys = subscriptionJson.keys as { p256dh: string; auth: string };

      // Save subscription to Supabase
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        }, {
          onConflict: 'user_id,endpoint',
        });

      if (error) throw error;

      setState(prev => ({ ...prev, isSubscribed: true, isLoading: false }));
      toast.success("Push notifications enabled!");
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      toast.error("Failed to enable push notifications");
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.isSupported, user]);

  const unsubscribe = useCallback(async () => {
    if (!state.isSupported || !user) return;

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from push manager
        await subscription.unsubscribe();

        // Remove from database
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', subscription.endpoint);
      }

      setState(prev => ({ ...prev, isSubscribed: false, isLoading: false }));
      toast.success("Push notifications disabled");
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      toast.error("Failed to disable push notifications");
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.isSupported, user]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    checkSubscription,
  };
}
