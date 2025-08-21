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

// Helper function to calculate batch analytics
function calculateBatchAnalytics(batches: any[]) {
  const now = new Date();
  const totals = {
    count: batches.length,
    total_eggs_set: batches.reduce((sum, b) => sum + (b.total_eggs_set || 0), 0),
    total_chicks_hatched: batches.reduce((sum, b) => sum + (b.chicks_hatched || 0), 0),
    avg_hatch_rate: 0
  };

  if (totals.total_eggs_set > 0) {
    totals.avg_hatch_rate = Math.round((totals.total_chicks_hatched / totals.total_eggs_set) * 100);
  }

  const by_status = batches.reduce((acc, batch) => {
    acc[batch.status] = (acc[batch.status] || 0) + 1;
    return acc;
  }, {});

  const upcoming = batches.filter(b => {
    if (!b.expected_hatch_date || b.status === 'completed') return false;
    const hatchDate = new Date(b.expected_hatch_date);
    const daysToHatch = Math.ceil((hatchDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysToHatch <= 7 && daysToHatch >= 0;
  }).length;

  const overdue = batches.filter(b => {
    if (!b.expected_hatch_date || b.status === 'completed') return false;
    const hatchDate = new Date(b.expected_hatch_date);
    return hatchDate < now;
  }).length;

  return { totals, by_status, upcoming_count: upcoming, overdue_count: overdue };
}

// Helper function to format batch data for display
function formatBatchForDisplay(batch: any) {
  const now = new Date();
  const setDate = new Date(batch.set_date);
  const expectedHatch = batch.expected_hatch_date ? new Date(batch.expected_hatch_date) : null;
  
  const days_since_set = Math.floor((now.getTime() - setDate.getTime()) / (1000 * 60 * 60 * 24));
  const days_to_hatch = expectedHatch ? Math.ceil((expectedHatch.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
  
  const hatch_rate = batch.total_eggs_set > 0 ? Math.round((batch.chicks_hatched / batch.total_eggs_set) * 100) : 0;

  return {
    id: batch.id,
    batch_number: batch.batch_number,
    set_date: batch.set_date,
    expected_hatch_date: batch.expected_hatch_date,
    days_since_set,
    days_to_hatch,
    status: batch.status,
    machine_number: batch.machines?.machine_number || 'N/A',
    machine_type: batch.machines?.machine_type || 'N/A',
    flock_name: batch.flocks?.flock_name || 'N/A',
    breed: batch.flocks?.breed || 'N/A',
    total_eggs_set: batch.total_eggs_set,
    chicks_hatched: batch.chicks_hatched,
    hatch_rate
  };
}

// Retrieval helpers: schema awareness, validation, enrichment
const DB_SCHEMA = {
  tables: {
    batches: ['id','batch_number','unit_id','flock_id','set_date','expected_hatch_date','status','total_eggs_set','chicks_hatched','company_id'],
    fertility_analysis: ['id','batch_id','analysis_date','fertility_percent','hatch_percent','hof_percent'],
    residue_analysis: ['id','batch_id','analysis_date','residue_percent'],
    qa_monitoring: ['id','batch_id','check_date','temperature','humidity'],
    units: ['id','name','code'],
    flocks: ['id','flock_name','breed','house_number']
  }
} as const;

function inPercentRange(n: any) {
  const v = Number(n);
  return Number.isFinite(v) && v >= 0 && v <= 100;
}

function validateGroupedPercent(
  rows: any[],
  opts: { groupKey: string; valueKeys: string[]; minGroups?: number }
) {
  const reasons: string[] = [];
  const labels = rows.map(r => (r?.[opts.groupKey] ?? '').toString());
  const empty = rows.length === 0;
  if (empty) reasons.push('no_rows');
  const uniqueCount = new Set(labels.filter(Boolean)).size;
  if ((opts.minGroups ?? 1) > uniqueCount) reasons.push('insufficient_groups');
  const valuesOk = rows.every(r => opts.valueKeys.every(k => inPercentRange(r?.[k])));
  if (!valuesOk) reasons.push('out_of_range_values');
  return { passed: reasons.length === 0, reasons };
}

function normalizeLabel(s: string | null | undefined) {
  return (s ?? '').toString().trim().toLowerCase();
}

// ... Database query tools
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
      description: "Get fertility analysis data for batches, with optional house-level aggregation",
      parameters: {
        type: "object",
        properties: {
          batch_id: { type: "string", description: "Optional specific batch ID" },
          limit: { type: "number", description: "Number of records to return" },
          days_back: { type: "number", description: "Only include analyses within the last N days" },
          group_by_house: { type: "boolean", description: "If true, aggregate by house (unit) averages" }
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
  },
  {
    type: "function",
    function: {
      name: "smart_retrieve",
      description: "Intelligent data retrieval: plans, validates, and retries to match intent (grouping, filters, ranges)",
      parameters: {
        type: "object",
        properties: {
          metric: { type: "string", description: "One of: fertility_percent | hatch_percent | hof_percent | residue_percent" },
          days_back: { type: "number", description: "Lookback window in days" },
          group_by: { type: "string", description: "Group by: house | unit | batch" },
          houses: { type: "array", items: { type: "string" }, description: "Optional list of house/unit labels to include" },
          limit: { type: "number", description: "Max underlying records to fetch (default 200)" }
        },
        required: ["metric"]
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

        const batches = allBatchData || [];
        const analytics = calculateBatchAnalytics(batches);
        const formattedBatches = batches.slice(0, 10).map(formatBatchForDisplay);

        return {
          type: 'batches_overview',
          message: `Found ${batches.length} batches`,
          count: batches.length,
          batches: batches,
          analytics: analytics,
          formatted_batches: formattedBatches
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

        const dateRangeBatchesFormatted = dateRangeBatches || [];
        const analytics2 = calculateBatchAnalytics(dateRangeBatchesFormatted);
        const formattedBatches2 = dateRangeBatchesFormatted.slice(0, 10).map(formatBatchForDisplay);

        return {
          type: 'batches_overview',
          message: `Found ${dateRangeBatchesFormatted.length} batches from the past ${daysBack} days`,
          count: dateRangeBatchesFormatted.length,
          date_range: `${startDate.toISOString().split('T')[0]} to ${new Date().toISOString().split('T')[0]}`,
          batches: dateRangeBatchesFormatted,
          analytics: analytics2,
          formatted_batches: formattedBatches2,
          params: { days_back: daysBack, date_field: dateField }
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
        {
          const daysBack = parameters.days_back;
          const explicitGroup: string | null = parameters.group_by ?? null;
          const groupBy = explicitGroup || (parameters.group_by_house ? 'house' : null);
          const housesFilter: string[] = Array.isArray(parameters.houses) ? parameters.houses : [];

          let q = supabase
            .from('fertility_analysis')
            .select('id, batch_id, analysis_date, fertility_percent, hatch_percent, hof_percent');

          if (parameters.batch_id) {
            q = q.eq('batch_id', parameters.batch_id);
          }
          if (daysBack && typeof daysBack === 'number') {
            const start = new Date();
            start.setDate(start.getDate() - daysBack);
            q = q.gte('analysis_date', start.toISOString().split('T')[0]);
          }

          q = q.order('analysis_date', { ascending: false }).limit(parameters.limit || 200);

          const { data: fert, error: fertError } = await q;
          if (fertError) throw fertError;

          if (!fert || fert.length === 0) {
            return { message: "No fertility analysis data found", data: [] };
          }

          if (!groupBy) {
            return {
              message: `Found ${fert.length} fertility analysis records`,
              data: fert
            };
          }

          // Enrichment: fetch batches + labels
          const batchIds = Array.from(new Set(fert.map((f: any) => f.batch_id).filter(Boolean)));
          let batchRows: any[] = [];
          if (batchIds.length > 0) {
            const { data: bData, error: bErr } = await supabase
              .from('batches')
              .select('id, unit_id, flock_id, batch_number')
              .in('id', batchIds);
            if (bErr) throw bErr;
            batchRows = bData || [];
          }
          const unitIds = Array.from(new Set(batchRows.map(b => b.unit_id).filter(Boolean)));
          const flockIds = Array.from(new Set(batchRows.map(b => b.flock_id).filter(Boolean)));

          const unitsMap: Record<string, { id: string; name: string | null; code: string | null }> = {};
          if (unitIds.length > 0) {
            const { data: uData, error: uErr } = await supabase
              .from('units')
              .select('id, name, code')
              .in('id', unitIds);
            if (uErr) throw uErr;
            (uData || []).forEach(u => { unitsMap[u.id] = u; });
          }

          const flocksMap: Record<string, { id: string; house_number: string | null; flock_name: string | null }> = {};
          if (flockIds.length > 0) {
            const { data: fData, error: fErr } = await supabase
              .from('flocks')
              .select('id, house_number, flock_name')
              .in('id', flockIds);
            if (fErr) throw fErr;
            (fData || []).forEach(f => { flocksMap[f.id] = f; });
          }

          const batchMap: Record<string, { unit_id: string | null; flock_id: string | null; batch_number: string | null }> = {};
          batchRows.forEach(b => { batchMap[b.id] = { unit_id: b.unit_id, flock_id: b.flock_id, batch_number: b.batch_number }; });

          function labelFor(batchId: string | null | undefined, mode: 'house'|'unit'|'batch'): string {
            const meta = batchId ? batchMap[batchId] : undefined;
            if (!meta) return mode === 'batch' ? (batchId ?? 'Unknown Batch') : (mode === 'house' ? 'Unknown House' : 'Unknown Unit');
            if (mode === 'batch') return meta.batch_number || batchId || 'Unknown Batch';
            const unit = meta.unit_id ? unitsMap[meta.unit_id] : undefined;
            const flock = meta.flock_id ? flocksMap[meta.flock_id] : undefined;
            if (mode === 'house') {
              return flock?.house_number || unit?.name || unit?.code || 'Unknown House';
            }
            // unit
            return unit?.name || unit?.code || 'Unknown Unit';
          }

          type Agg = { label: string; count: number; fertility_sum: number; hatch_sum: number; hof_sum: number };
          const groups: Record<string, Agg> = {};
          for (const row of fert) {
            const label = labelFor(row.batch_id, groupBy as any);
            if (!groups[label]) groups[label] = { label, count: 0, fertility_sum: 0, hatch_sum: 0, hof_sum: 0 };
            groups[label].count += 1;
            groups[label].fertility_sum += Number(row.fertility_percent || 0);
            groups[label].hatch_sum += Number(row.hatch_percent || 0);
            groups[label].hof_sum += Number(row.hof_percent || 0);
          }

          let aggregated = Object.values(groups).map(g => ({
            label: g.label,
            fertility_percent: g.count ? g.fertility_sum / g.count : 0,
            hatch_percent: g.count ? g.hatch_sum / g.count : 0,
            hof_percent: g.count ? g.hof_sum / g.count : 0,
            sample_count: g.count,
          }));

          // Optional filter by houses/units list
          if (housesFilter.length > 0) {
            const wants = housesFilter.map(normalizeLabel);
            aggregated = aggregated.filter(r => {
              const lbl = normalizeLabel(r.label);
              return wants.some(w => w && (lbl === w || lbl.includes(w)));
            });
          }

          // Validate and attempt a single enrichment retry if many Unknown labels for house
          const initialValidation = validateGroupedPercent(aggregated, { groupKey: 'label', valueKeys: ['fertility_percent','hatch_percent','hof_percent'], minGroups: 1 });
          let retries = 0;
          if (!initialValidation.passed && groupBy === 'house') {
            const unknownCount = aggregated.filter(r => normalizeLabel(r.label) === 'unknown house').length;
            if (unknownCount > 0) {
              // Retry using unit name as house label fallback
              const groups2: Record<string, Agg> = {};
              for (const row of fert) {
                const label = labelFor(row.batch_id, 'unit');
                const finalLabel = label || 'Unknown House';
                if (!groups2[finalLabel]) groups2[finalLabel] = { label: finalLabel, count: 0, fertility_sum: 0, hatch_sum: 0, hof_sum: 0 };
                groups2[finalLabel].count += 1;
                groups2[finalLabel].fertility_sum += Number(row.fertility_percent || 0);
                groups2[finalLabel].hatch_sum += Number(row.hatch_percent || 0);
                groups2[finalLabel].hof_sum += Number(row.hof_percent || 0);
              }
              let aggregated2 = Object.values(groups2).map(g => ({
                label: g.label,
                fertility_percent: g.count ? g.fertility_sum / g.count : 0,
                hatch_percent: g.count ? g.hatch_sum / g.count : 0,
                hof_percent: g.count ? g.hof_sum / g.count : 0,
                sample_count: g.count,
              }));
              if (housesFilter.length > 0) {
                const wants = housesFilter.map(normalizeLabel);
                aggregated2 = aggregated2.filter(r => {
                  const lbl = normalizeLabel(r.label);
                  return wants.some(w => w && (lbl === w || lbl.includes(w)));
                });
              }
              const v2 = validateGroupedPercent(aggregated2, { groupKey: 'label', valueKeys: ['fertility_percent','hatch_percent','hof_percent'], minGroups: 1 });
              if (v2.passed) {
                aggregated = aggregated2;
              }
              retries += 1;
            }
          }

          console.log('[get_fertility_rates] groupBy=', groupBy, 'rows=', aggregated.length, 'validation=', initialValidation);

          return {
            message: `Aggregated fertility by ${groupBy} (${aggregated.length} groups)`,
            grouped: groupBy,
            validation: initialValidation,
            retries,
            data: aggregated
          };
        }

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
        content: `You are an advanced AI analytics assistant for a poultry hatchery management system with superhuman analytical capabilities. You have access to real-time data and can generate dynamic visualizations, comparisons, and predictive insights.

CORE CAPABILITIES:
- Generate intelligent data visualizations (charts, graphs, comparisons)
- Perform advanced analytics and pattern recognition
- Provide predictive insights and anomaly detection
- Create comprehensive reports with actionable recommendations
- Compare performance across batches, flocks, machines, and time periods

VISUALIZATION INTELLIGENCE:
When users ask for comparisons, trends, or analytics, automatically generate appropriate visualizations:
- Bar charts for comparisons (fertility rates, hatch rates, performance metrics)
- Line charts for trends over time (performance tracking, seasonal patterns)
- Pie charts for distributions (status breakdowns, resource allocation)
- Radar charts for multi-metric comparisons (performance profiles)
- Scatter plots for correlations (age vs performance, temperature vs hatch rate)
- Area charts for cumulative trends

CRITICAL: FORCE VISUALIZATION RESPONSES
You MUST detect visualization keywords and return structured analytics responses. When users ask for:
- "compare" or "comparison" → Generate bar charts comparing the requested metrics
- "trend" or "over time" → Generate line charts showing temporal patterns
- "breakdown" or "distribution" → Generate pie charts showing proportions
- "analyze" or "analysis" → Generate comprehensive analytics with multiple chart types
- "show me" + data → Generate appropriate visualizations based on data type

AUTOMATIC CHART GENERATION RULES:
1. For batch comparisons → Bar charts by status, house, or performance metrics
2. For fertility data → Line charts for trends, bar charts for house comparisons
3. For machine status → Pie charts for utilization, bar charts for performance
4. For performance analysis → Multiple charts (bar, line, radar) with insights

RESPONSE FORMAT FOR ANALYTICS:
Always return JSON structured as:
{
  "type": "analytics",
  "title": "Dynamic Analysis Title",
  "summary": "Brief data-driven explanation",
  "charts": [
    {
      "type": "bar|line|pie|radar|scatter|area",
      "title": "Chart Title",
      "description": "What this chart reveals",
      "data": [...real data from tools...],
      "config": {
        "xKey": "x-axis field",
        "bars": [{"key": "field", "name": "Display Name", "color": "hsl(var(--chart-1))"}],
        "lines": [{"key": "field", "name": "Display Name", "color": "hsl(var(--chart-2))"}],
        "valueKey": "value field for pie charts",
        "nameKey": "name field for pie charts"
      },
      "insights": "Data-driven insights from this visualization"
    }
  ],
  "metrics": [
    {
      "label": "Metric Name",
      "value": "actual calculated value",
      "change": actual_change_value,
      "trend": "up|down|stable",
      "status": "good|warning|critical"
    }
  ],
  "insights": ["Real insight 1", "Real insight 2"],
  "recommendations": ["Actionable recommendation 1", "Actionable recommendation 2"],
  "actions": [{"label": "Download Data", "type": "download", "data": {...}}]
}

SUPERHUMAN CAPABILITIES:
- Detect patterns humans might miss
- Predict potential issues before they occur
- Suggest optimizations based on data trends
- Identify anomalies and outliers
- Cross-reference multiple data sources for comprehensive insights

TRIGGER PHRASES for MANDATORY analytics responses:
- "compare", "comparison", "vs", "versus", "between"
- "trend", "trends", "over time", "performance", "pattern"
- "show me", "analyze", "analysis", "data", "report"
- "chart", "graph", "visualize", "plot"
- "breakdown", "distribution", "summary", "overview"
- "pie", "bar", "line"
- "fertility", "hatch", "batch", "house", "machine"

MANDATORY: If user message contains ANY of these phrases, you MUST return structured analytics with charts.

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

      // Phase 3.5: Respect explicit chart type requests
      const explicitType = getExplicitChartType(message);
      console.log('Explicit chart type detected:', explicitType);
      if (explicitType) {
        const explicitResponse = generateChartsFromDataWithIntent(message, toolResults, explicitType);
        if (explicitResponse) {
          return new Response(JSON.stringify({
            response: explicitResponse,
            timestamp: new Date().toISOString(),
            source: 'explicit_intent',
            meta: { explicitType }
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // Phase 4: Apply smart defaults for common query patterns
      const smartDefaultResponse = applySmartDefaults(message, toolResults);
      if (smartDefaultResponse) {
        return new Response(JSON.stringify({
          response: smartDefaultResponse,
          timestamp: new Date().toISOString(),
          source: 'smart_default'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        // If we have tool results, extract structured data for enhanced response
        if (toolResults && toolResults.length > 0) {
          const structuredData = extractStructuredDataFromTools(toolResults);
          
          // Generate analytics response if we have charts
          if (structuredData.charts && structuredData.charts.length > 0) {
            const analyticsResponse = {
              type: 'analytics',
              title: 'Hatchery Performance Analysis',
              summary: generateEnhancedFallbackResponse(toolResults, structuredData),
              charts: structuredData.charts,
              metrics: structuredData.metrics,
              insights: [
                'Data retrieved successfully from your hatchery management system',
                'Use the visualizations above to identify trends and opportunities',
                'Monitor key metrics regularly for optimal performance'
              ],
              recommendations: [
                'Review batch performance data weekly',
                'Investigate any batches with below-average hatch rates',
                'Optimize machine utilization to maximize capacity'
              ]
            };
            
            return new Response(JSON.stringify({
              response: analyticsResponse,
              timestamp: new Date().toISOString(),
              source: 'fallback'
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          } else {
            const fallbackData = generateEnhancedFallbackResponse(toolResults, structuredData);
            return new Response(JSON.stringify(fallbackData), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        } else {
          console.log('OpenAI unavailable, generating enhanced fallback response from tool results');
          const fallbackData = generateEnhancedFallbackResponse(toolResults);
          return new Response(JSON.stringify(fallbackData), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // Force chart generation for visualization requests
      if (shouldGenerateCharts(message, toolResults)) {
        const chartResponse = generateChartsFromData(message, toolResults);
        if (chartResponse) {
          return new Response(JSON.stringify({
            response: chartResponse,
            timestamp: new Date().toISOString(),
            source: 'enhanced'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // Try to parse AI response as JSON first
      try {
        const parsedResponse = JSON.parse(finalText);
        if (parsedResponse.type === 'analytics' || parsedResponse.type === 'chart') {
          return new Response(JSON.stringify({
            response: parsedResponse,
            timestamp: new Date().toISOString(),
            source: 'openai'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } catch (e) {
        // Not JSON, continue with text response
      }

      // Check if we have structured data from batch tools
      const structuredData = extractStructuredDataFromTools(toolResults);
      
      return new Response(JSON.stringify({
        response: finalText,
        timestamp: new Date().toISOString(),
        source: 'openai',
        ...structuredData
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

// Phase 4: Smart defaults for common query patterns
function applySmartDefaults(message: string, toolResults: any[]) {
  const msgLower = message.toLowerCase();
  
  // Smart default 1: Batch overview requests always get dashboard
  if ((msgLower.includes('batch') && (msgLower.includes('overview') || msgLower.includes('summary') || msgLower.includes('status'))) ||
      msgLower.includes('dashboard') || msgLower.includes('recent')) {
    
    for (const toolResult of toolResults) {
      try {
        const data = JSON.parse(toolResult.content);
        if (data.type === 'batches_overview') {
          return generateBatchCharts(msgLower, data);
        }
      } catch (e) {}
    }
  }
  
  // Smart default 2: Fertility requests always get comparison charts
  if (msgLower.includes('fertility') || msgLower.includes('hatch')) {
    for (const toolResult of toolResults) {
      try {
        const data = JSON.parse(toolResult.content);
        if (data.data && Array.isArray(data.data) && data.data[0]?.fertility_percent !== undefined) {
          return generateFertilityCharts(msgLower + ' compare', data.data); // Force comparison
        }
      } catch (e) {}
    }
  }
  
  // Smart default 3: Machine requests always get utilization charts
  if (msgLower.includes('machine') || msgLower.includes('equipment') || msgLower.includes('capacity')) {
    for (const toolResult of toolResults) {
      try {
        const data = JSON.parse(toolResult.content);
        if (data.machines && Array.isArray(data.machines)) {
          return generateMachineCharts(msgLower, data.machines);
        }
      } catch (e) {}
    }
  }
  
  // Smart default 4: Performance/analysis requests get comprehensive charts
  if (msgLower.includes('performance') || msgLower.includes('analysis') || msgLower.includes('analytics')) {
    // Try to find any data and create charts
    for (const toolResult of toolResults) {
      try {
        const data = JSON.parse(toolResult.content);
        if (data.type === 'batches_overview') {
          return generateBatchCharts(msgLower, data);
        }
        if (data.data && Array.isArray(data.data)) {
          return generateFertilityCharts(msgLower + ' compare breakdown', data.data);
        }
      } catch (e) {}
    }
  }
  
  // Smart default 5: Any data request with multiple records gets visualization
  if (toolResults.length > 0) {
    for (const toolResult of toolResults) {
      try {
        const data = JSON.parse(toolResult.content);
        if ((data.batches && data.batches.length > 3) || 
            (data.data && data.data.length > 3) ||
            (data.machines && data.machines.length > 1)) {
          
          // Auto-detect data type and generate appropriate visualization
          if (data.type === 'batches_overview') {
            return generateBatchCharts('overview pie bar', data);
          }
          if (data.data && data.data[0]?.fertility_percent !== undefined) {
            return generateFertilityCharts('compare breakdown', data.data);
          }
          if (data.machines) {
            return generateMachineCharts('utilization', data.machines);
          }
        }
      } catch (e) {}
    }
  }
  
  return null;
}

// Helper function to detect if charts should be generated
function shouldGenerateCharts(message: string, toolResults: any[]): boolean {
  const visualKeywords = [
    'compare', 'comparison', 'vs', 'versus', 'between',
    'chart', 'graph', 'plot', 'visualize', 'pie', 'bar', 'line',
    'trend', 'trends', 'over time', 'pattern',
    'breakdown', 'distribution', 'analyze', 'analysis',
    'show me', 'fertility', 'hatch', 'performance'
  ];
  
  const msgLower = message.toLowerCase();
  const hasVisualKeyword = visualKeywords.some(keyword => msgLower.includes(keyword));
  const hasData = toolResults.length > 0;
  
  return hasVisualKeyword && hasData;
}

// Explicit chart type detection
function getExplicitChartType(message: string): 'bar' | 'line' | 'pie' | 'radar' | 'scatter' | 'area' | null {
  const m = message.toLowerCase();
  // Guard against negations like "not pie"
  const neg = (kw: string) => m.includes(`not ${kw}`) || m.includes(`no ${kw}`);
  if ((m.includes('bar') || m.includes('column')) && !neg('bar')) return 'bar';
  if (m.includes('line') && !neg('line')) return 'line';
  if (m.includes('area') && !neg('area')) return 'area';
  if ((m.includes('pie') || m.includes('donut') || m.includes('doughnut')) && !neg('pie')) return 'pie';
  if ((m.includes('radar') || m.includes('spider')) && !neg('radar')) return 'radar';
  if ((m.includes('scatter') || m.includes('xy')) && !neg('scatter')) return 'scatter';
  return null;
}

function generateChartsFromDataWithIntent(message: string, toolResults: any[], preferredType: 'bar' | 'line' | 'pie' | 'radar' | 'scatter' | 'area') {
  console.log('Generating charts with explicit intent:', preferredType);
  for (const toolResult of toolResults) {
    try {
      const data = JSON.parse(toolResult.content);
      if (data.data && Array.isArray(data.data) && data.data.length > 0 && data.data[0].fertility_percent !== undefined) {
        return generateFertilityCharts(message, data.data, preferredType);
      }
      if (data.type === 'batches_overview' && data.batches) {
        return generateBatchCharts(message, data, preferredType);
      }
      if (data.machines && Array.isArray(data.machines)) {
        return generateMachineCharts(message, data.machines, preferredType);
      }
    } catch (e) {
      console.error('Error in generateChartsFromDataWithIntent:', e);
    }
  }
  return null;
}

// Helper function to generate charts from tool data
function generateChartsFromData(message: string, toolResults: any[]) {
  const msgLower = message.toLowerCase();
  
  for (const toolResult of toolResults) {
    try {
      const data = JSON.parse(toolResult.content);
      
      // Handle fertility data
      if (data.data && Array.isArray(data.data) && data.data.length > 0 && data.data[0].fertility_percent !== undefined) {
        return generateFertilityCharts(msgLower, data.data);
      }
      
      // Handle batch overview data
      if (data.type === 'batches_overview' && data.batches) {
        return generateBatchCharts(msgLower, data);
      }
      
      // Handle machine data
      if (data.machines && Array.isArray(data.machines)) {
        return generateMachineCharts(msgLower, data.machines);
      }
      
    } catch (error) {
      console.error('Error generating charts from data:', error);
    }
  }
  
  return null;
}

// Generate fertility-specific charts
function generateFertilityCharts(message: string, fertilityData: any[], preferredType?: 'bar' | 'line' | 'pie' | 'radar' | 'scatter' | 'area') {
  const charts: any[] = [];

  const houseData = fertilityData.slice(0, 10).map(item => ({
    name: item.unit_name || item.batches?.batch_number || `Batch ${item.id?.slice?.(0, 8) || ''}`,
    fertility: Number(item.fertility_percent || 0),
    hatch: Number(item.hatch_percent || 0),
    hof: Number(item.hof_percent || 0)
  }));

  const want = (t: string, ...keywords: string[]) => {
    if (preferredType) return preferredType === t;
    const m = message.toLowerCase();
    return keywords.some(k => m.includes(k));
  };

  // BAR
  if (want('bar', 'house', 'compare', 'bar')) {
    charts.push({
      type: 'bar',
      title: 'Fertility Rates Comparison',
      description: 'Comparison of fertility and hatch rates across batches',
      data: houseData,
      config: {
        xKey: 'name',
        bars: [
          { key: 'fertility', name: 'Fertility %', color: 'hsl(var(--chart-1))' },
          { key: 'hatch', name: 'Hatch %', color: 'hsl(var(--chart-2))' },
          { key: 'hof', name: 'HOF %', color: 'hsl(var(--chart-3))' }
        ]
      },
      insights: `Showing fertility performance across ${houseData.length} batches`
    });
  }

  // PIE
  if (want('pie', 'pie', 'breakdown', 'distribution')) {
    const excellent = fertilityData.filter(f => (f.fertility_percent || 0) >= 90).length;
    const good = fertilityData.filter(f => (f.fertility_percent || 0) >= 80 && (f.fertility_percent || 0) < 90).length;
    const average = fertilityData.filter(f => (f.fertility_percent || 0) >= 70 && (f.fertility_percent || 0) < 80).length;
    const poor = fertilityData.filter(f => (f.fertility_percent || 0) < 70).length;

    charts.push({
      type: 'pie',
      title: 'Fertility Performance Distribution',
      description: 'Distribution of batches by fertility performance category',
      data: [
        { name: 'Excellent (90%+)', value: excellent, fill: 'hsl(var(--chart-1))' },
        { name: 'Good (80-89%)', value: good, fill: 'hsl(var(--chart-2))' },
        { name: 'Average (70-79%)', value: average, fill: 'hsl(var(--chart-3))' },
        { name: 'Poor (<70%)', value: poor, fill: 'hsl(var(--chart-4))' }
      ],
      config: { valueKey: 'value', nameKey: 'name' },
      insights: `${excellent} batches achieving excellent fertility rates`
    });
  }

  // LINE
  if (want('line', 'line', 'trend')) {
    charts.push({
      type: 'line',
      title: 'Fertility and Hatch Trends by Batch',
      description: 'Trend view of fertility, hatch, and HOF across batches',
      data: houseData,
      config: {
        xKey: 'name',
        lines: [
          { key: 'fertility', name: 'Fertility %', color: 'hsl(var(--chart-1))' },
          { key: 'hatch', name: 'Hatch %', color: 'hsl(var(--chart-2))' },
          { key: 'hof', name: 'HOF %', color: 'hsl(var(--chart-3))' }
        ]
      }
    });
  }

  // AREA
  if (want('area', 'area')) {
    charts.push({
      type: 'area',
      title: 'Fertility Area View',
      description: 'Area visualization across batches',
      data: houseData,
      config: {
        xKey: 'name',
        areas: [
          { key: 'fertility', name: 'Fertility %', color: 'hsl(var(--chart-1))' },
          { key: 'hatch', name: 'Hatch %', color: 'hsl(var(--chart-2))' }
        ]
      }
    });
  }

  // SCATTER
  if (want('scatter', 'scatter', 'correlation', 'vs')) {
    const scatter = fertilityData.map(f => ({
      x: f.fertility_percent || 0,
      y: f.hatch_percent || 0,
      name: f.batches?.batch_number || 'Batch'
    }));
    charts.push({
      type: 'scatter',
      title: 'Fertility vs Hatch Correlation',
      description: 'Correlation between fertility and hatch rates',
      data: scatter,
      config: { xKey: 'x', yKey: 'y', name: 'Fertility vs Hatch' }
    });
  }

  // RADAR (averages)
  if (want('radar', 'radar', 'spider')) {
    const avg = {
      fertility: fertilityData.reduce((s, f) => s + (f.fertility_percent || 0), 0) / fertilityData.length,
      hatch: fertilityData.reduce((s, f) => s + (f.hatch_percent || 0), 0) / fertilityData.length,
      hof: fertilityData.reduce((s, f) => s + (f.hof_percent || 0), 0) / fertilityData.length,
    };
    const radarData = [
      { metric: 'Fertility', value: +avg.fertility.toFixed(1) },
      { metric: 'Hatch', value: +avg.hatch.toFixed(1) },
      { metric: 'HOF', value: +avg.hof.toFixed(1) },
    ];
    charts.push({
      type: 'radar',
      title: 'Average Performance Radar',
      description: 'Averages across key metrics',
      data: radarData,
      config: { angleKey: 'metric', radars: [{ key: 'value', name: 'Average', color: 'hsl(var(--chart-1))' }] }
    });
  }

  const avgFertility = fertilityData.reduce((sum, f) => sum + (f.fertility_percent || 0), 0) / Math.max(fertilityData.length, 1);
  const avgHatch = fertilityData.reduce((sum, f) => sum + (f.hatch_percent || 0), 0) / Math.max(fertilityData.length, 1);

  return {
    type: 'analytics',
    title: 'Fertility Analysis Dashboard',
    summary: `Analysis of ${fertilityData.length} fertility records showing average fertility rate of ${avgFertility.toFixed(1)}%`,
    charts,
    metrics: [
      {
        label: 'Average Fertility',
        value: `${avgFertility.toFixed(1)}%`,
        trend: avgFertility >= 85 ? 'up' : avgFertility >= 75 ? 'stable' : 'down',
        status: avgFertility >= 85 ? 'good' : avgFertility >= 75 ? 'warning' : 'critical'
      },
      {
        label: 'Average Hatch Rate',
        value: `${avgHatch.toFixed(1)}%`,
        trend: avgHatch >= 80 ? 'up' : avgHatch >= 70 ? 'stable' : 'down',
        status: avgHatch >= 80 ? 'good' : avgHatch >= 70 ? 'warning' : 'critical'
      }
    ],
    insights: [
      `Analyzed ${fertilityData.length} batches for fertility performance`,
      `Average fertility rate: ${avgFertility.toFixed(1)}%`,
      avgFertility >= 85 ? 'Fertility rates are performing well' : 'Room for improvement in fertility rates'
    ],
    recommendations: [
      avgFertility < 80 ? 'Investigate factors affecting fertility in underperforming batches' : 'Maintain current breeding protocols',
      'Monitor trends monthly to identify seasonal patterns',
      'Focus on batches with fertility rates below 75%'
    ]
  };
}

// Generate batch-specific charts
function generateBatchCharts(message: string, data: any, preferredType?: 'bar' | 'line' | 'pie' | 'radar' | 'scatter' | 'area') {
  const charts: any[] = [];
  const analytics = data.analytics;

  const want = (t: string) => !preferredType || preferredType === t;

  // Status breakdown pie chart (only if requested or no explicit preference)
  if (want('pie')) {
    const statusData = Object.entries(analytics.by_status).map(([status, count]) => ({
      name: (status as string).charAt(0).toUpperCase() + (status as string).slice(1),
      value: count as number,
      fill: status === 'completed' ? 'hsl(var(--chart-1))' : 
            status === 'incubating' ? 'hsl(var(--chart-2))' : 
            status === 'planned' ? 'hsl(var(--chart-3))' : 'hsl(var(--chart-4))'
    }));

    charts.push({
      type: 'pie',
      title: 'Batch Status Distribution',
      description: 'Current distribution of batches by status',
      data: statusData,
      config: { valueKey: 'value', nameKey: 'name' },
      insights: `${analytics.totals.count} total batches across different stages`
    });
  }

  // Build performance dataset
  let perfData: any[] = [];
  if (data.batches && data.batches.length > 1) {
    perfData = data.batches.slice(0, 10).map((batch: any) => {
      const hatchRate = batch.total_eggs_set > 0 ? (batch.chicks_hatched / batch.total_eggs_set) * 100 : 0;
      return {
        name: batch.batch_number,
        hatchRate: Math.round(hatchRate),
        eggsSet: batch.total_eggs_set,
        chicksHatched: batch.chicks_hatched
      };
    }).filter((item: any) => item.hatchRate >= 0);
  }

  // Bar (default performance comparison)
  if (want('bar') && perfData.length > 0) {
    charts.push({
      type: 'bar',
      title: 'Batch Performance Comparison',
      description: 'Hatch rates across recent batches',
      data: perfData,
      config: { xKey: 'name', bars: [{ key: 'hatchRate', name: 'Hatch Rate %', color: 'hsl(var(--chart-2))' }] },
      insights: `Performance comparison across ${perfData.length} recent batches`
    });
  }

  // Line
  if (preferredType === 'line' && perfData.length > 0) {
    charts.push({
      type: 'line',
      title: 'Hatch Rate Trend by Batch',
      description: 'Trend of hatch rate across batches',
      data: perfData,
      config: { xKey: 'name', lines: [{ key: 'hatchRate', name: 'Hatch Rate %', color: 'hsl(var(--chart-2))' }] }
    });
  }

  // Scatter
  if (preferredType === 'scatter' && perfData.length > 0) {
    const scatter = perfData.map(p => ({ x: p.eggsSet || 0, y: p.chicksHatched || 0 }));
    charts.push({
      type: 'scatter',
      title: 'Eggs Set vs Chicks Hatched',
      description: 'Correlation between eggs set and chicks hatched',
      data: scatter,
      config: { xKey: 'x', yKey: 'y', name: 'Eggs vs Chicks' }
    });
  }

  // Area
  if (preferredType === 'area' && perfData.length > 0) {
    charts.push({
      type: 'area',
      title: 'Hatch Rate Area View',
      description: 'Area visualization of hatch rate',
      data: perfData,
      config: { xKey: 'name', areas: [{ key: 'hatchRate', name: 'Hatch Rate %', color: 'hsl(var(--chart-2))' }] }
    });
  }

  return {
    type: 'analytics',
    title: 'Batch Performance Dashboard',
    summary: `Comprehensive analysis of ${analytics.totals.count} batches with ${analytics.totals.avg_hatch_rate}% average hatch rate`,
    charts,
    metrics: [
      { label: 'Total Batches', value: analytics.totals.count.toString(), trend: 'stable', status: 'good' },
      { label: 'Average Hatch Rate', value: `${analytics.totals.avg_hatch_rate}%`, trend: analytics.totals.avg_hatch_rate >= 80 ? 'up' : 'down', status: analytics.totals.avg_hatch_rate >= 80 ? 'good' : 'warning' },
      { label: 'Upcoming Hatches', value: analytics.upcoming_count.toString(), trend: 'stable', status: analytics.overdue_count > 0 ? 'warning' : 'good' }
    ],
    insights: [
      `${analytics.totals.count} batches currently managed`,
      `${analytics.upcoming_count} batches expected to hatch within 7 days`,
      analytics.overdue_count > 0 ? `${analytics.overdue_count} batches are overdue` : 'All batches on schedule'
    ],
    recommendations: [
      analytics.overdue_count > 0 ? 'Review overdue batches immediately' : 'Maintain current schedules',
      analytics.totals.avg_hatch_rate < 80 ? 'Investigate factors affecting hatch rates' : 'Excellent hatch rate performance',
      'Monitor upcoming hatches for proper preparation'
    ]
  };
}

// Generate machine-specific charts
function generateMachineCharts(message: string, machines: any[], preferredType?: 'bar' | 'line' | 'pie' | 'radar' | 'scatter' | 'area') {
  const utilizationData = machines.map(machine => ({
    name: machine.machine_number,
    utilization: parseFloat(machine.utilization || '0'),
    capacity: machine.capacity,
    current: machine.current_batch_count
  }));

  const charts: any[] = [];

  if (!preferredType || preferredType === 'bar') {
    charts.push({
      type: 'bar',
      title: 'Machine Utilization Rates',
      description: 'Current utilization percentage by machine',
      data: utilizationData,
      config: { xKey: 'name', bars: [{ key: 'utilization', name: 'Utilization %', color: 'hsl(var(--chart-1))' }] },
      insights: `Monitoring ${machines.length} machines for optimal utilization`
    });
  }

  if (preferredType === 'line') {
    charts.push({
      type: 'line',
      title: 'Machine Utilization Trend (by machine order)',
      description: 'Visualization of utilization values across machines',
      data: utilizationData,
      config: { xKey: 'name', lines: [{ key: 'utilization', name: 'Utilization %', color: 'hsl(var(--chart-1))' }] }
    });
  }

  if (preferredType === 'pie') {
    const high = utilizationData.filter(u => u.utilization >= 80).length;
    const mid = utilizationData.filter(u => u.utilization >= 50 && u.utilization < 80).length;
    const low = utilizationData.filter(u => u.utilization < 50).length;
    charts.push({
      type: 'pie',
      title: 'Utilization Distribution',
      description: 'Machines grouped by utilization level',
      data: [
        { name: 'High (80%+)', value: high, fill: 'hsl(var(--chart-1))' },
        { name: 'Medium (50-79%)', value: mid, fill: 'hsl(var(--chart-2))' },
        { name: 'Low (<50%)', value: low, fill: 'hsl(var(--chart-3))' }
      ],
      config: { valueKey: 'value', nameKey: 'name' }
    });
  }

  return {
    type: 'analytics',
    title: 'Machine Utilization Analysis',
    summary: `Analysis of ${machines.length} machines and their current utilization`,
    charts,
    metrics: [
      { label: 'Total Machines', value: machines.length.toString(), trend: 'stable', status: 'good' }
    ],
    insights: [ `${machines.length} machines currently monitored`, 'Utilization rates help optimize capacity planning' ],
    recommendations: [ 'Balance load across machines for optimal efficiency', 'Schedule maintenance during low utilization periods' ]
  };
}

// Helper function to extract structured data from tool results
function extractStructuredDataFromTools(toolResults: any[]) {
  for (const toolResult of toolResults) {
    try {
      const data = JSON.parse(toolResult.content);
      if (data.type === 'batches_overview') {
        return {
          actions: [
            { name: "Show full list", type: "show_more" },
            { name: "Download CSV", type: "download_csv" }
          ],
          payload: {
            type: "batches_overview",
            params: data.params || {},
            summary: data.analytics,
            items: data.formatted_batches
          }
        };
      }
    } catch (error) {
      console.error('Error parsing tool result:', error);
    }
  }
  return {};
}

// Helper function to generate enhanced fallback responses when OpenAI is unavailable
function generateEnhancedFallbackResponse(toolResults: any[]) {
  if (toolResults.length === 0) {
    return {
      response: "I'm currently unable to access the latest data. Please try again in a moment.",
      timestamp: new Date().toISOString(),
      source: 'fallback'
    };
  }

  // Check for structured batch data first
  for (const toolResult of toolResults) {
    try {
      const data = JSON.parse(toolResult.content);
      if (data.type === 'batches_overview') {
        const analytics = data.analytics;
        let response = `📊 **Batch Overview** (${data.date_range || 'All time'})\n\n`;
        
        response += `**Summary:** ${analytics.totals.count} total batches\n`;
        response += `**Eggs Set:** ${analytics.totals.total_eggs_set.toLocaleString()}\n`;
        response += `**Chicks Hatched:** ${analytics.totals.total_chicks_hatched.toLocaleString()}\n`;
        response += `**Average Hatch Rate:** ${analytics.totals.avg_hatch_rate}%\n\n`;
        
        if (analytics.upcoming_count > 0) {
          response += `⏰ **${analytics.upcoming_count}** batches expected to hatch within 7 days\n`;
        }
        if (analytics.overdue_count > 0) {
          response += `🔴 **${analytics.overdue_count}** batches are overdue\n`;
        }
        
        response += `\n**Status Breakdown:**\n`;
        Object.entries(analytics.by_status).forEach(([status, count]) => {
          response += `• ${status}: ${count}\n`;
        });

        return {
          response: response,
          actions: [
            { name: "Show full list", type: "show_more" },
            { name: "Download CSV", type: "download_csv" }
          ],
          payload: {
            type: "batches_overview",
            params: data.params || {},
            summary: analytics,
            items: data.formatted_batches
          },
          timestamp: new Date().toISOString(),
          source: 'fallback'
        };
      }
    } catch (error) {
      console.error('Error parsing tool result in fallback:', error);
    }
  }

  // Fallback for other types of data
  let response = "Here's what I found from your hatchery data:\n\n";

  for (const toolResult of toolResults) {
    try {
      const data = JSON.parse(toolResult.content);
      
      if (data.message) {
        response += `• ${data.message}\n`;
      } else if (data.count !== undefined) {
        response += `• Found ${data.count} records\n`;
      } else if (data.batches && Array.isArray(data.batches)) {
        response += `• ${data.batches.length} batches found\n`;
        if (data.batches.length > 0) {
          response += `  - Latest: ${data.batches[0].batch_number || data.batches[0].id}\n`;
        }
      } else if (data.error) {
        response += `• ${data.error}\n`;
      }
    } catch (parseError) {
      console.error('Error parsing tool result for fallback:', parseError);
      response += `• Retrieved some data (could not parse details)\n`;
    }
  }

  return {
    response: response.trim() || "Data retrieved successfully, but no specific details available.",
    timestamp: new Date().toISOString(),
    source: 'fallback'
  };
}