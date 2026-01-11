import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  userId?: string;
  alertType?: string;
  tag?: string;
  severity?: 'info' | 'warning' | 'critical';
}

// Web Push requires signing with VAPID keys
async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload,
  vapidPrivateKey: string,
  vapidPublicKey: string,
  vapidSubject: string
): Promise<boolean> {
  try {
    // For Deno, we'll use the web-push compatible approach
    // The actual push is done via fetch to the push endpoint
    const pushData = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || '/',
      tag: payload.tag || 'hatchery-notification',
      severity: payload.severity || 'info',
    });

    // Note: In production, you would use a proper web-push library
    // For now, we'll use the native fetch API with the push endpoint
    // This is a simplified version - production would need proper VAPID signing
    
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400',
      },
      body: pushData,
    });

    if (!response.ok && response.status !== 201) {
      console.error(`Push failed with status ${response.status}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
    const vapidSubject = Deno.env.get('VAPID_SUBJECT')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: PushPayload = await req.json();
    const { title, body, url, userId, alertType, tag, severity } = payload;

    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: 'Title and body are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Build query for subscriptions
    let subscriptionsQuery = supabase
      .from('push_subscriptions')
      .select('user_id, endpoint, p256dh, auth');

    // If userId specified, only send to that user
    if (userId) {
      subscriptionsQuery = subscriptionsQuery.eq('user_id', userId);
    }

    const { data: subscriptions, error: subError } = await subscriptionsQuery;

    if (subError) {
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No subscriptions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // If alertType is specified, check user preferences
    let filteredSubscriptions = subscriptions;
    if (alertType) {
      const userIds = [...new Set(subscriptions.map(s => s.user_id))];
      
      // Get notification preferences for these users
      const { data: preferences } = await supabase
        .from('notification_preferences')
        .select('user_email, temperature_alerts, humidity_alerts, critical_day_alerts, maintenance_alerts, schedule_reminders, browser_enabled')
        .in('user_email', userIds);

      // Get user emails
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, email')
        .in('id', userIds);

      const emailToPreferences = new Map();
      preferences?.forEach(pref => {
        emailToPreferences.set(pref.user_email, pref);
      });

      const userIdToEmail = new Map();
      profiles?.forEach(profile => {
        userIdToEmail.set(profile.id, profile.email);
      });

      // Filter subscriptions based on preferences
      filteredSubscriptions = subscriptions.filter(sub => {
        const email = userIdToEmail.get(sub.user_id);
        const prefs = emailToPreferences.get(email);
        
        // If no preferences found, send notification
        if (!prefs) return true;
        
        // Check if browser notifications are enabled
        if (!prefs.browser_enabled) return false;

        // Check specific alert type
        switch (alertType) {
          case 'temperature':
            return prefs.temperature_alerts;
          case 'humidity':
            return prefs.humidity_alerts;
          case 'critical_day':
            return prefs.critical_day_alerts;
          case 'maintenance':
            return prefs.maintenance_alerts;
          case 'schedule':
            return prefs.schedule_reminders;
          default:
            return true;
        }
      });
    }

    // Send push notifications
    let successCount = 0;
    const failedEndpoints: string[] = [];

    for (const subscription of filteredSubscriptions) {
      const success = await sendWebPush(
        {
          endpoint: subscription.endpoint,
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
        { title, body, url, tag, severity },
        vapidPrivateKey,
        vapidPublicKey,
        vapidSubject
      );

      if (success) {
        successCount++;
      } else {
        failedEndpoints.push(subscription.endpoint);
      }
    }

    // Clean up failed/expired subscriptions
    if (failedEndpoints.length > 0) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('endpoint', failedEndpoints);
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: failedEndpoints.length,
        total: filteredSubscriptions.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error sending push notifications:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
