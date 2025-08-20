import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Database query tools
const tools = [
  {
    type: "function",
    function: {
      name: "get_all_batches",
      description: "Get all batches with basic information",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Number of records to return (default 20)"
          },
          status: {
            type: "string",
            description: "Filter by batch status (planned, setting, incubating, hatching, completed)"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_batches_by_date_range",
      description: "Get batches created or set within a specific date range",
      parameters: {
        type: "object",
        properties: {
          days_back: {
            type: "number",
            description: "Number of days back from today to query (e.g., 60 for past 60 days)"
          },
          date_field: {
            type: "string",
            description: "Which date field to filter by: 'set_date' or 'created_at' (default: set_date)"
          },
          limit: {
            type: "number",
            description: "Maximum number of records to return (default 50)"
          }
        },
        required: ["days_back"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_batch_info",
      description: "Get detailed information about a specific batch including days remaining",
      parameters: {
        type: "object",
        properties: {
          batch_identifier: {
            type: "string",
            description: "Batch number or ID to query"
          }
        },
        required: ["batch_identifier"]
      }
    }
  },
  {
    type: "function", 
    function: {
      name: "get_fertility_rates",
      description: "Get fertility analysis data for batches",
      parameters: {
        type: "object",
        properties: {
          batch_id: {
            type: "string",
            description: "Optional specific batch ID"
          },
          limit: {
            type: "number",
            description: "Number of records to return"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_machine_status",
      description: "Get current status of machines and their utilization",
      parameters: {
        type: "object",
        properties: {
          machine_id: {
            type: "string",
            description: "Optional specific machine ID"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_qa_alerts",
      description: "Get QA monitoring alerts and issues",
      parameters: {
        type: "object",
        properties: {
          severity: {
            type: "string",
            description: "Filter by alert severity"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_recent_activity",
      description: "Get recent activity summary across all systems",
      parameters: {
        type: "object",
        properties: {
          days: {
            type: "number",
            description: "Number of days to look back (default 7)"
          }
        }
      }
    }
  }
];

async function executeTool(toolName: string, parameters: any) {
  console.log(`Executing tool: ${toolName}`, parameters);
  
  try {
    switch (toolName) {
      case "get_all_batches":
        const { data: allBatchData } = await supabase
          .from('batches')
          .select(`
            id, batch_number, set_date, expected_hatch_date, actual_hatch_date,
            total_eggs_set, chicks_hatched, status, created_at,
            flocks(flock_name, breed, age_weeks),
            machines(machine_number, machine_type)
          `)
          .limit(parameters.limit || 20)
          .order('created_at', { ascending: false });

        if (!allBatchData || allBatchData.length === 0) {
          return { message: "No batches found", count: 0, batches: [] };
        }

        return {
          message: `Found ${allBatchData.length} batches`,
          count: allBatchData.length,
          batches: allBatchData.map(batch => ({
            ...batch,
            days_since_set: batch.set_date ? Math.floor((new Date().getTime() - new Date(batch.set_date).getTime()) / (1000 * 60 * 60 * 24)) : null
          }))
        };

      case "get_batches_by_date_range":
        const daysBack = parameters.days_back || 60;
        const dateField = parameters.date_field || 'set_date';
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysBack);
        
        let query = supabase
          .from('batches')
          .select(`
            id, batch_number, set_date, expected_hatch_date, status, 
            total_eggs_set, chicks_hatched, created_at,
            flocks(flock_name, breed),
            machines(machine_number, machine_type)
          `)
          .gte(dateField, startDate.toISOString().split('T')[0])
          .limit(parameters.limit || 50)
          .order(dateField, { ascending: false });

        const { data: dateRangeBatches } = await query;

        if (!dateRangeBatches || dateRangeBatches.length === 0) {
          return { 
            message: `No batches found in the past ${daysBack} days`,
            count: 0,
            date_range: `${startDate.toISOString().split('T')[0]} to ${new Date().toISOString().split('T')[0]}`,
            batches: []
          };
        }

        return {
          message: `Found ${dateRangeBatches.length} batches from the past ${daysBack} days`,
          count: dateRangeBatches.length,
          date_range: `${startDate.toISOString().split('T')[0]} to ${new Date().toISOString().split('T')[0]}`,
          batches: dateRangeBatches.map(batch => ({
            ...batch,
            days_since_set: batch.set_date ? Math.floor((new Date().getTime() - new Date(batch.set_date).getTime()) / (1000 * 60 * 60 * 24)) : null
          }))
        };

      case "get_batch_info":
        const { data: batchData } = await supabase
          .from('batches')
          .select(`
            *, 
            flocks(flock_name, breed, age_weeks, total_birds),
            machines(machine_number, machine_type, capacity)
          `)
          .or(`batch_number.ilike.%${parameters.batch_identifier}%,id.eq.${parameters.batch_identifier}`)
          .limit(5);

        if (batchData && batchData.length > 0) {
          const batch = batchData[0];
          const today = new Date();
          const expectedHatch = new Date(batch.expected_hatch_date);
          const daysRemaining = Math.ceil((expectedHatch.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          return {
            batch: batch,
            days_remaining: daysRemaining,
            status: batch.status,
            total_eggs: batch.total_eggs_set,
            hatch_percentage: batch.total_eggs_set > 0 ? ((batch.chicks_hatched / batch.total_eggs_set) * 100).toFixed(1) : 0
          };
        }
        return { error: "Batch not found", search_term: parameters.batch_identifier };

      case "get_fertility_rates":
        const { data: fertilityData } = await supabase
          .from('fertility_analysis')
          .select(`
            *, 
            batches(batch_number, set_date, status)
          `)
          .limit(parameters.limit || 10)
          .order('analysis_date', { ascending: false });

        if (!fertilityData || fertilityData.length === 0) {
          return { message: "No fertility analysis data found", data: [] };
        }

        return {
          message: `Found ${fertilityData.length} fertility analysis records`,
          data: fertilityData
        };

      case "get_machine_status":
        const { data: machineData } = await supabase
          .from('machines')
          .select(`
            *,
            batches(id, batch_number, status, set_date)
          `)
          .limit(10);

        if (!machineData || machineData.length === 0) {
          return { message: "No machines found", machines: [] };
        }

        return {
          message: `Found ${machineData.length} machines`,
          machines: machineData.map(machine => ({
            ...machine,
            current_batch_count: machine.batches?.length || 0,
            utilization: machine.capacity > 0 ? ((machine.batches?.length || 0) / machine.capacity * 100).toFixed(1) : '0'
          }))
        };

      case "get_qa_alerts":
        const { data: alertData } = await supabase
          .from('alerts')
          .select(`
            *,
            batches(batch_number, set_date),
            machines(machine_number, machine_type)
          `)
          .eq('status', 'active')
          .order('triggered_at', { ascending: false })
          .limit(10);

        if (!alertData || alertData.length === 0) {
          return { message: "No active alerts found", alerts: [] };
        }

        return {
          message: `Found ${alertData.length} active alerts`,
          alerts: alertData
        };

      case "get_recent_activity":
        const lookbackDays = parameters.days || 7;
        const activityStartDate = new Date();
        activityStartDate.setDate(activityStartDate.getDate() - lookbackDays);
        
        // Get recent batches, alerts, and QA monitoring
        const [recentBatches, recentAlerts, recentQA] = await Promise.all([
          supabase
            .from('batches')
            .select('id, batch_number, status, created_at')
            .gte('created_at', activityStartDate.toISOString())
            .order('created_at', { ascending: false })
            .limit(10),
          supabase
            .from('alerts')
            .select('id, alert_type, severity, status, triggered_at')
            .gte('triggered_at', activityStartDate.toISOString())
            .order('triggered_at', { ascending: false })
            .limit(10),
          supabase
            .from('qa_monitoring')
            .select('id, batch_id, check_date, temperature, humidity')
            .gte('created_at', activityStartDate.toISOString())
            .order('created_at', { ascending: false })
            .limit(10)
        ]);

        return {
          message: `Recent activity summary for the past ${lookbackDays} days`,
          period: `${activityStartDate.toISOString().split('T')[0]} to ${new Date().toISOString().split('T')[0]}`,
          summary: {
            new_batches: recentBatches.data?.length || 0,
            alerts_triggered: recentAlerts.data?.length || 0,
            qa_checks_performed: recentQA.data?.length || 0
          },
          recent_batches: recentBatches.data || [],
          recent_alerts: recentAlerts.data || [],
          recent_qa_checks: recentQA.data || []
        };

      default:
        return { error: "Unknown tool", requested_tool: toolName };
    }
  } catch (error) {
    console.error(`Tool execution error for ${toolName}:`, error);
    return { error: error.message, tool: toolName, parameters };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Add healthcheck endpoint for debugging
  if (req.method === 'GET') {
    const url = new URL(req.url);
    if (url.pathname.includes('/health')) {
      return new Response(JSON.stringify({
        status: 'healthy',
        openai_configured: !!openaiApiKey,
        timestamp: new Date().toISOString()
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  }

  try {
    const { message, history } = await req.json();

    if (!message) {
      throw new Error('Message is required');
    }

    console.log('Processing message:', message);

    // Validate OpenAI API Key
    if (!openaiApiKey) {
      console.error('Missing OPENAI_API_KEY secret in Edge Function environment');
      return new Response(JSON.stringify({
        error: 'OPENAI_API_KEY not configured. Please add your OpenAI API key in the Supabase secrets.',
        response: "I need an OpenAI API key to function. Please configure it in your Supabase project settings."
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Validate API key format
    if (!openaiApiKey.startsWith('sk-') || openaiApiKey.length < 20) {
      console.error('Invalid OPENAI_API_KEY format');
      return new Response(JSON.stringify({
        error: 'Invalid OpenAI API key format',
        response: "The OpenAI API key appears to be invalid. Please check that it's properly configured."
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Build conversation context
    const messages = [
      {
        role: "system",
        content: `You are a specialized AI assistant for a poultry hatchery management system. You have access to real-time data about batches, flocks, machines, fertility analysis, QA monitoring, and alerts.

Key capabilities:
- Answer questions about batch status, days remaining, and progress
- Provide fertility rate analysis and trends
- Monitor machine utilization and status
- Check QA alerts and issues
- Offer insights and recommendations

When users ask about specific batches, machines, or data, use the appropriate tools to query the database. Provide clear, actionable responses with specific data when available.

Current date: ${new Date().toISOString().split('T')[0]}`
      },
      ...(history || []).map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: "user",
        content: message
      }
    ];

    // First, get AI response with tool calls (with model fallback)
    let result: any; 
    let assistantMessage: any;
    const primaryBody = {
      model: 'gpt-5-2025-08-07',
      messages,
      tools,
      tool_choice: 'auto',
      max_completion_tokens: 1500,
    };

    const tryModels = [
      { model: 'gpt-5-2025-08-07', body: primaryBody },
      { model: 'gpt-4.1-2025-04-14', body: { ...primaryBody, model: 'gpt-4.1-2025-04-14' } },
    ];

    let success = false;
    for (const cfg of tryModels) {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${openaiApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg.body),
      });
      if (r.ok) {
        result = await r.json();
        assistantMessage = result.choices[0].message;
        success = true;
        break;
      }
      const errText = await r.text();
      console.error(`OpenAI error (${cfg.model}):`, errText);
    }

    if (!success) {
      // Final fallback to legacy params
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${openaiApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages, tools, tool_choice: 'auto', max_tokens: 800 }),
      });
      if (!r.ok) {
        const errText = await r.text();
        throw new Error(`OpenAI failed on all models: ${errText}`);
      }
      result = await r.json();
      assistantMessage = result.choices[0].message;
    }

    // Execute any tool calls
    if (assistantMessage.tool_calls) {
      const toolResults = [];
      
      for (const toolCall of assistantMessage.tool_calls) {
        const toolResult = await executeTool(
          toolCall.function.name,
          JSON.parse(toolCall.function.arguments)
        );
        
        toolResults.push({
          tool_call_id: toolCall.id,
          role: "tool",
          content: JSON.stringify(toolResult)
        });
      }

      // Get final response with tool results
      const finalMessages = [
        ...messages,
        assistantMessage,
        ...toolResults
      ];

      let finalText: string | null = null;

      // Try modern models first
      const finalPrimary = { model: 'gpt-5-2025-08-07', messages: finalMessages, max_completion_tokens: 1500 };
      const finalTry = [
        { model: 'gpt-5-2025-08-07', body: finalPrimary },
        { model: 'gpt-4.1-2025-04-14', body: { ...finalPrimary, model: 'gpt-4.1-2025-04-14' } },
      ];
      let finalOk = false;
      for (const cfg of finalTry) {
        const r = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${openaiApiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(cfg.body),
        });
        if (r.ok) {
          const json = await r.json();
          finalText = json.choices?.[0]?.message?.content ?? null;
          finalOk = true;
          break;
        }
        const errText = await r.text();
        console.error(`OpenAI final error (${cfg.model}):`, errText);
      }

      if (!finalOk) {
        // Legacy fallback
        const r = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${openaiApiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'gpt-4o-mini', messages: finalMessages, max_tokens: 800 }),
        });
        if (r.ok) {
          const json = await r.json();
          finalText = json.choices?.[0]?.message?.content ?? null;
          finalOk = true;
        } else {
          const errText = await r.text();
          console.error('OpenAI final failed on all models:', errText);
        }
      }

      if (!finalOk || !finalText) {
        // Improved fallback logic to provide meaningful responses from tool data
        console.log('OpenAI unavailable, generating fallback response from tool results');
        
        let fallbackResponse = "I found some information for you:\n\n";
        
        for (const toolResult of toolResults) {
          try {
            const data = JSON.parse(toolResult.content);
            
            if (data.message) {
              fallbackResponse += `• ${data.message}\n`;
            } else if (data.count !== undefined) {
              fallbackResponse += `• Found ${data.count} records\n`;
            } else if (data.batches && Array.isArray(data.batches)) {
              fallbackResponse += `• ${data.batches.length} batches found\n`;
              if (data.batches.length > 0) {
                fallbackResponse += `  - Latest: ${data.batches[0].batch_number || data.batches[0].id}\n`;
              }
            } else if (data.error) {
              fallbackResponse += `• ${data.error}\n`;
            } else if (typeof data === 'object' && data !== null) {
              const keys = Object.keys(data);
              if (keys.length > 0) {
                fallbackResponse += `• Retrieved data with ${keys.length} properties\n`;
              }
            }
          } catch (parseError) {
            console.error('Error parsing tool result for fallback:', parseError);
            fallbackResponse += `• Retrieved some data (could not parse details)\n`;
          }
        }
        
        if (toolResults.length === 0) {
          fallbackResponse = "I'm experiencing technical difficulties connecting to OpenAI, but your request was received. Please try again in a moment.";
        } else {
          fallbackResponse += "\nNote: I'm experiencing issues with my AI processing, so this is a basic summary of your data.";
        }
        
        finalText = fallbackResponse;
      }

      return new Response(JSON.stringify({
        response: finalText,
        actions: []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // No tool calls needed
    return new Response(JSON.stringify({
      response: assistantMessage.content,
      actions: []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('AI Chat error:', error);
    return new Response(JSON.stringify({
      error: error.message,
      response: "I apologize, but I'm having trouble processing your request right now. Please try again."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});