import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ActivityLogRequest {
  action_type: string;
  action_category: string;
  resource_type?: string;
  resource_id?: string;
  resource_name?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  notes?: string;
  session_id?: string;
  page_path?: string;
  user_id?: string;
  user_email?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Extract IP address from various headers (handles proxies)
    const forwardedFor = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const cfConnectingIp = req.headers.get('cf-connecting-ip');
    
    let ipAddress: string | null = null;
    if (forwardedFor) {
      ipAddress = forwardedFor.split(',')[0].trim();
    } else if (realIp) {
      ipAddress = realIp;
    } else if (cfConnectingIp) {
      ipAddress = cfConnectingIp;
    }

    const userAgent = req.headers.get('user-agent');
    const authHeader = req.headers.get('authorization');

    // Parse body first to get user_id/user_email if provided
    const body: ActivityLogRequest = await req.json();

    // Validate required fields
    if (!body.action_type || !body.action_category) {
      return new Response(
        JSON.stringify({ error: 'action_type and action_category are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Try to get user from JWT first
    let userId: string | null = null;
    let userEmail: string | null = null;

    if (authHeader) {
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: { Authorization: authHeader },
        },
      });

      const { data: { user } } = await userClient.auth.getUser();
      if (user) {
        userId = user.id;
        userEmail = user.email || null;
      }
    }

    // If no user from JWT, use user_id/user_email from request body (for logout scenarios)
    if (!userId && body.user_id) {
      userId = body.user_id;
      userEmail = body.user_email || null;
    }

    // If still no user, reject the request
    if (!userId) {
      console.error('No user identified from JWT or request body');
      return new Response(
        JSON.stringify({ error: 'User identification required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create admin client with service role for inserting logs (bypasses RLS)
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Get user profile to fetch company_id and email
    const { data: profile } = await adminClient
      .from('user_profiles')
      .select('company_id, email')
      .eq('id', userId)
      .single();

    // Insert activity log using admin client
    const { data, error } = await adminClient
      .from('user_activity_log')
      .insert({
        user_id: userId,
        user_email: profile?.email || userEmail,
        session_id: body.session_id,
        ip_address: ipAddress,
        user_agent: userAgent,
        action_type: body.action_type,
        action_category: body.action_category,
        resource_type: body.resource_type,
        resource_id: body.resource_id,
        resource_name: body.resource_name,
        old_values: body.old_values,
        new_values: body.new_values,
        page_path: body.page_path,
        notes: body.notes,
        company_id: profile?.company_id,
      })
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to log activity', details: error.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Activity logged: ${body.action_type} by ${userEmail || userId} from ${ipAddress}`);

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
