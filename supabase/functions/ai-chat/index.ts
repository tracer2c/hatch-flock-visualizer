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
      name: "get_batch_info",
      description: "Get information about a specific batch including days remaining",
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
  }
];

async function executeTool(toolName: string, parameters: any) {
  console.log(`Executing tool: ${toolName}`, parameters);
  
  try {
    switch (toolName) {
      case "get_batch_info":
        const { data: batchData } = await supabase
          .from('batches')
          .select('*')
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
            flock_info: batch.flocks
          };
        }
        return { error: "Batch not found" };

      case "get_fertility_rates":
        const { data: fertilityData } = await supabase
          .from('fertility_analysis')
          .select('*')
          .limit(parameters.limit || 10)
          .order('analysis_date', { ascending: false });

        return fertilityData;

      case "get_machine_status":
        const { data: machineData } = await supabase
          .from('machines')
          .select('*')
          .limit(10);

        return machineData;

      case "get_qa_alerts":
        const { data: alertData } = await supabase
          .from('alerts')
          .select('*')
          .eq('status', 'active')
          .order('triggered_at', { ascending: false })
          .limit(10);

        return alertData;

      default:
        return { error: "Unknown tool" };
    }
  } catch (error) {
    console.error(`Tool execution error for ${toolName}:`, error);
    return { error: error.message };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, history } = await req.json();

    if (!message) {
      throw new Error('Message is required');
    }

    console.log('Processing message:', message);

    if (!openaiApiKey) {
      console.error('Missing OPENAI_API_KEY secret in Edge Function environment');
      return new Response(JSON.stringify({
        error: 'OPENAI_API_KEY not configured',
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
        // Compose a minimal deterministic summary from tool outputs
        const summaries = toolResults.map((tr) => {
          try { const obj = JSON.parse(tr.content); return typeof obj === 'object' ? Object.keys(obj).slice(0,3).join(', ') : 'result'; } catch { return 'result'; }
        });
        finalText = summaries.length
          ? `Here is what I found from your data sources: ${summaries.join(' • ')}.`
          : 'I could not generate a response right now, please try again shortly.';
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