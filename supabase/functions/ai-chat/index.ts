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
    batches: ['id','batch_number','unit_id','flock_id','machine_id','set_date','expected_hatch_date','status','total_eggs_set','eggs_injected','eggs_cleared','chicks_hatched','company_id'],
    fertility_analysis: ['id','batch_id','analysis_date','sample_size','fertile_eggs','infertile_eggs','fertility_percent'],
    residue_analysis: ['id','batch_id','analysis_date','sample_size','infertile_eggs','early_dead','mid_dead','late_dead','cull_chicks','live_pip_number','dead_pip_number','hatch_percent','hof_percent','hoi_percent','if_dev_percent','residue_percent'],
    qa_monitoring: ['id','batch_id','machine_id','check_date','check_time','day_of_incubation','temperature','humidity','co2_level','turning_frequency','ventilation_rate','inspector_name','entry_mode','temp_avg_overall','temp_avg_front','temp_avg_middle','temp_avg_back','angle_top_left','angle_mid_left','angle_bottom_left','angle_top_right','angle_mid_right','angle_bottom_right','temp_front_top_left','temp_front_top_right','temp_front_mid_left','temp_front_mid_right','temp_front_bottom_left','temp_front_bottom_right','temp_middle_top_left','temp_middle_top_right','temp_middle_mid_left','temp_middle_mid_right','temp_middle_bottom_left','temp_middle_bottom_right','temp_back_top_left','temp_back_top_right','temp_back_mid_left','temp_back_mid_right','temp_back_bottom_left','temp_back_bottom_right'],
    weight_tracking: ['id','batch_id','flock_id','machine_id','check_date','day_of_incubation','top_weight','middle_weight','bottom_weight','total_weight','percent_loss','target_loss_min','target_loss_max'],
    specific_gravity_tests: ['id','flock_id','batch_id','test_date','age_weeks','float_count','sink_count','sample_size','float_percentage','meets_standard','concentration'],
    units: ['id','name','code','status'],
    flocks: ['id','flock_name','breed','house_number','age_weeks','unit_id'],
    machines: ['id','machine_number','machine_type','setter_mode','unit_id','capacity','status']
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

// Helper to calculate standard deviation
function calculateStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map(v => Math.pow(v - mean, 2));
  return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / values.length);
}

// Helper to get date range
function getDateRange(daysBack: number): string {
  const start = new Date();
  start.setDate(start.getDate() - daysBack);
  return start.toISOString().split('T')[0];
}

// ... Database query tools
const tools = [
  // ============ EXISTING TOOLS (1-16) ============
  {
    type: "function",
    function: {
      name: "get_all_batches",
      description: "Get all batches with basic information",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Number of records to return (default 20)" },
          status: { type: "string", description: "Filter by batch status (planned, setting, incubating, hatching, completed)" }
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
          days_back: { type: "number", description: "Number of days back from today to query (e.g., 60 for past 60 days)" },
          date_field: { type: "string", description: "Which date field to filter by: 'set_date' or 'created_at' (default: set_date)" },
          limit: { type: "number", description: "Maximum number of records to return (default 50)" }
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
          batch_identifier: { type: "string", description: "Batch number or ID to query" }
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
          machine_id: { type: "string", description: "Optional specific machine ID" }
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
          severity: { type: "string", description: "Filter by alert severity" }
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
          days: { type: "number", description: "Number of days to look back (default 7)" }
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
  },
  {
    type: "function",
    function: {
      name: "get_egg_status_breakdown",
      description: "Return per-batch egg counts by status (fertile, infertile, contaminated). Use for 'eggs by status' or 'stacked bar by status' requests.",
      parameters: {
        type: "object",
        properties: {
          limit_batches: { type: "number", description: "How many most recent batches to include (default 10)" },
          days_back: { type: "number", description: "Optional: Only include batches set in the last N days" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_house_temperatures",
      description: "Get temperature data grouped by house/unit with latest readings or averages. Use for temperature by house queries, temperature charts, or temperature trends.",
      parameters: {
        type: "object",
        properties: {
          days_back: { type: "number", description: "Days to look back for temperature data (default 7)" },
          aggregation: { type: "string", description: "Type of aggregation: 'latest' for most recent reading per house, 'average' for period average (default: latest)" },
          limit: { type: "number", description: "Maximum number of houses to return (default 20)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_qa_performance",
      description: "Get comprehensive QA monitoring data including 18-point temperatures, humidity, angles, and zone averages. Use for QA analysis, temperature trends, setter performance.",
      parameters: {
        type: "object",
        properties: {
          days_back: { type: "number", description: "Days to look back (default 30)" },
          machine_id: { type: "string", description: "Optional: Filter by specific machine ID" },
          flock_id: { type: "string", description: "Optional: Filter by specific flock ID" },
          group_by: { type: "string", description: "Group results by: machine, flock, day, or none (default: none)" },
          limit: { type: "number", description: "Max records to return (default 100)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_moisture_loss_trends",
      description: "Get weight tracking and moisture loss data for batches. Shows weight progression and percent loss over incubation days.",
      parameters: {
        type: "object",
        properties: {
          days_back: { type: "number", description: "Days to look back (default 30)" },
          flock_id: { type: "string", description: "Optional: Filter by specific flock ID" },
          batch_id: { type: "string", description: "Optional: Filter by specific batch ID" },
          group_by: { type: "string", description: "Group by: flock, batch, day (default: batch)" },
          limit: { type: "number", description: "Max records (default 100)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_specific_gravity_data",
      description: "Get specific gravity test results for flocks. Shows float/sink counts, percentages, and age-based trends.",
      parameters: {
        type: "object",
        properties: {
          days_back: { type: "number", description: "Days to look back (default 60)" },
          flock_id: { type: "string", description: "Optional: Filter by specific flock ID" },
          group_by: { type: "string", description: "Group by: flock, age_weeks (default: flock)" },
          limit: { type: "number", description: "Max records (default 100)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_flock_performance",
      description: "Get comprehensive flock performance metrics including hatch%, temps, moisture loss, specific gravity, cull%, and mortality. Aggregates all QA data for each flock.",
      parameters: {
        type: "object",
        properties: {
          flock_id: { type: "string", description: "Optional: Filter by specific flock ID" },
          hatchery_id: { type: "string", description: "Optional: Filter by hatchery (unit) ID" },
          days_back: { type: "number", description: "Days to look back (default 90)" },
          limit: { type: "number", description: "Max flocks to return (default 50)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_machine_performance",
      description: "Get machine-level performance analytics including temperature variance by zone, angle deviations, humidity patterns, and batch outcomes.",
      parameters: {
        type: "object",
        properties: {
          machine_id: { type: "string", description: "Optional: Filter by specific machine ID" },
          hatchery_id: { type: "string", description: "Optional: Filter by hatchery (unit) ID" },
          machine_type: { type: "string", description: "Optional: Filter by machine type (setter, hatcher, combo)" },
          days_back: { type: "number", description: "Days to look back (default 60)" },
          limit: { type: "number", description: "Max machines to return (default 20)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_hatchery_summary",
      description: "Get hatchery-level summary with total eggs, hatch rates, mortality, average SG, moisture loss, temperatures, and machine rankings.",
      parameters: {
        type: "object",
        properties: {
          hatchery_id: { type: "string", description: "Optional: Filter by specific hatchery (unit) ID" },
          days_back: { type: "number", description: "Days to look back (default 30)" }
        }
      }
    }
  },

  // ============ NEW TOOLS (17-47) - Phase 1: Missing Table Coverage ============
  {
    type: "function",
    function: {
      name: "get_egg_pack_quality",
      description: "Get egg quality grading data including grades A/B/C, cracked, dirty eggs, shell thickness, and weight metrics.",
      parameters: {
        type: "object",
        properties: {
          days_back: { type: "number", description: "Days to look back (default 30)" },
          batch_id: { type: "string", description: "Optional: Filter by specific batch ID" },
          flock_id: { type: "string", description: "Optional: Filter by specific flock ID" },
          group_by: { type: "string", description: "Group by: batch, flock, hatchery, inspector (default: batch)" },
          limit: { type: "number", description: "Max records (default 100)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_machine_transfers",
      description: "Get machine transfer history showing eggs moved between setters and hatchers, transfer dates, and delays.",
      parameters: {
        type: "object",
        properties: {
          days_back: { type: "number", description: "Days to look back (default 30)" },
          batch_id: { type: "string", description: "Optional: Filter by specific batch ID" },
          machine_id: { type: "string", description: "Optional: Filter by specific machine ID" },
          limit: { type: "number", description: "Max records (default 100)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_multi_setter_positions",
      description: "Get multi-setter machine position data showing zone (A/B/C), side (Left/Right), level (Top/Middle/Bottom) placements and flock distribution.",
      parameters: {
        type: "object",
        properties: {
          machine_id: { type: "string", description: "Optional: Filter by specific machine ID" },
          days_back: { type: "number", description: "Days to look back (default 30)" },
          include_empty: { type: "boolean", description: "Include empty positions (default: false)" },
          limit: { type: "number", description: "Max records (default 100)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_checklist_status",
      description: "Get daily checklist completion status showing completed tasks, overdue items, and completion rates by day, machine, or batch.",
      parameters: {
        type: "object",
        properties: {
          days_back: { type: "number", description: "Days to look back (default 7)" },
          machine_id: { type: "string", description: "Optional: Filter by specific machine ID" },
          batch_id: { type: "string", description: "Optional: Filter by specific batch ID" },
          status: { type: "string", description: "Optional: Filter by status (completed, pending, overdue)" },
          limit: { type: "number", description: "Max records (default 100)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_batch_history",
      description: "Get batch status change history showing status transitions, timestamps, who changed it, and automation triggers.",
      parameters: {
        type: "object",
        properties: {
          batch_id: { type: "string", description: "Optional: Filter by specific batch ID" },
          days_back: { type: "number", description: "Days to look back (default 30)" },
          limit: { type: "number", description: "Max records (default 100)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_flock_changes",
      description: "Get flock update history showing changes to age, bird counts, house assignments, and other flock modifications.",
      parameters: {
        type: "object",
        properties: {
          flock_id: { type: "string", description: "Optional: Filter by specific flock ID" },
          days_back: { type: "number", description: "Days to look back (default 30)" },
          change_type: { type: "string", description: "Optional: Filter by change type" },
          limit: { type: "number", description: "Max records (default 100)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_residue_schedule",
      description: "Get residue analysis schedule showing upcoming, overdue, and completed analyses with due dates and assignments.",
      parameters: {
        type: "object",
        properties: {
          days_back: { type: "number", description: "Days to look back (default 30)" },
          status: { type: "string", description: "Optional: Filter by status (pending, completed, overdue)" },
          batch_id: { type: "string", description: "Optional: Filter by specific batch ID" },
          limit: { type: "number", description: "Max records (default 100)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_house_allocations",
      description: "Get house-to-machine allocation data showing how eggs are distributed across machines, split allocations, and capacity usage.",
      parameters: {
        type: "object",
        properties: {
          batch_id: { type: "string", description: "Optional: Filter by specific batch ID" },
          machine_id: { type: "string", description: "Optional: Filter by specific machine ID" },
          days_back: { type: "number", description: "Days to look back (default 30)" },
          limit: { type: "number", description: "Max records (default 100)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_custom_targets",
      description: "Get custom performance targets for metrics like fertility, hatch rate, mortality. Compare actual values against targets.",
      parameters: {
        type: "object",
        properties: {
          metric_name: { type: "string", description: "Optional: Filter by metric name" },
          target_type: { type: "string", description: "Optional: Filter by target type (global, hatchery, flock, batch)" },
          entity_id: { type: "string", description: "Optional: Filter by entity ID (hatchery, flock, or batch ID)" },
          limit: { type: "number", description: "Max records (default 50)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_sop_procedures",
      description: "Get Standard Operating Procedure templates showing daily tasks, procedures by incubation day, and categories.",
      parameters: {
        type: "object",
        properties: {
          day_of_incubation: { type: "number", description: "Optional: Filter by specific incubation day (1-21)" },
          category: { type: "string", description: "Optional: Filter by category (daily_checklist, emergency, maintenance)" },
          limit: { type: "number", description: "Max records (default 50)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_alert_configs",
      description: "Get alert configuration settings showing temperature/humidity thresholds, maintenance intervals, and alert types.",
      parameters: {
        type: "object",
        properties: {
          alert_type: { type: "string", description: "Optional: Filter by alert type" },
          is_enabled: { type: "boolean", description: "Optional: Filter by enabled status" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_position_linkage",
      description: "Get QA position-to-flock linkage data showing which temperature readings correspond to which flocks at specific machine positions.",
      parameters: {
        type: "object",
        properties: {
          qa_monitoring_id: { type: "string", description: "Optional: Filter by QA monitoring record ID" },
          position: { type: "string", description: "Optional: Filter by position (e.g., 'front_top_left')" },
          days_back: { type: "number", description: "Days to look back (default 30)" },
          limit: { type: "number", description: "Max records (default 100)" }
        }
      }
    }
  },

  // ============ NEW TOOLS - Phase 2: Advanced Analytics Functions ============
  {
    type: "function",
    function: {
      name: "get_mortality_breakdown",
      description: "Get detailed mortality breakdown showing early dead, mid dead, late dead counts and percentages. Analyze embryonic mortality patterns.",
      parameters: {
        type: "object",
        properties: {
          days_back: { type: "number", description: "Days to look back (default 60)" },
          hatchery_id: { type: "string", description: "Optional: Filter by hatchery ID" },
          flock_id: { type: "string", description: "Optional: Filter by flock ID" },
          group_by: { type: "string", description: "Group by: hatchery, flock, batch, age_weeks (default: batch)" },
          limit: { type: "number", description: "Max records (default 100)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_pip_analysis",
      description: "Get pip (pipping) analysis data showing live pips, dead pips, pip rates, and correlation with hatch outcomes.",
      parameters: {
        type: "object",
        properties: {
          days_back: { type: "number", description: "Days to look back (default 60)" },
          hatchery_id: { type: "string", description: "Optional: Filter by hatchery ID" },
          group_by: { type: "string", description: "Group by: hatchery, flock, batch (default: batch)" },
          limit: { type: "number", description: "Max records (default 100)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_cull_analysis",
      description: "Get cull chick analysis showing cull counts, percentages, trends by flock age, breed, and hatchery.",
      parameters: {
        type: "object",
        properties: {
          days_back: { type: "number", description: "Days to look back (default 60)" },
          hatchery_id: { type: "string", description: "Optional: Filter by hatchery ID" },
          breed: { type: "string", description: "Optional: Filter by breed type" },
          group_by: { type: "string", description: "Group by: hatchery, flock, breed (default: flock)" },
          limit: { type: "number", description: "Max records (default 100)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_incubation_day_metrics",
      description: "Get metrics aggregated by day of incubation (Day 0-21) showing temperature, humidity, and weight loss curves over the incubation cycle.",
      parameters: {
        type: "object",
        properties: {
          days_back: { type: "number", description: "Days to look back for data (default 30)" },
          machine_id: { type: "string", description: "Optional: Filter by machine ID" },
          metric_type: { type: "string", description: "Optional: Filter by metric type (temperature, humidity, weight_loss)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_breed_comparison",
      description: "Compare performance metrics (fertility, hatch rate, mortality) across different chicken breeds.",
      parameters: {
        type: "object",
        properties: {
          days_back: { type: "number", description: "Days to look back (default 90)" },
          breeds: { type: "array", items: { type: "string" }, description: "Optional: Specific breeds to compare" },
          metrics: { type: "array", items: { type: "string" }, description: "Optional: Metrics to compare (fertility, hatch, mortality)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_age_based_analysis",
      description: "Analyze performance metrics by flock age in weeks, showing optimal age ranges for hatch performance and quality.",
      parameters: {
        type: "object",
        properties: {
          days_back: { type: "number", description: "Days to look back (default 90)" },
          min_age_weeks: { type: "number", description: "Optional: Minimum flock age in weeks" },
          max_age_weeks: { type: "number", description: "Optional: Maximum flock age in weeks" },
          group_by: { type: "string", description: "Group by: age_weeks, age_range (default: age_weeks)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_critical_windows_status",
      description: "Get status of batches at critical incubation windows: candling (Day 10-13), transfer (Day 18), hatch (Day 21). Shows action required and overdue items.",
      parameters: {
        type: "object",
        properties: {
          window_type: { type: "string", description: "Optional: Filter by window type (candling, transfer, hatch)" },
          include_completed: { type: "boolean", description: "Include completed actions (default: false)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_residue_characteristics",
      description: "Get detailed residue analysis characteristics: brain defects, dry egg, malpositioned, upside down, transfer cracks, mold, abnormalities.",
      parameters: {
        type: "object",
        properties: {
          days_back: { type: "number", description: "Days to look back (default 60)" },
          hatchery_id: { type: "string", description: "Optional: Filter by hatchery ID" },
          characteristic: { type: "string", description: "Optional: Filter by specific characteristic" },
          limit: { type: "number", description: "Max records (default 100)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_temperature_zone_variance",
      description: "Analyze temperature variance across machine zones (front, middle, back). Identify hot spots, cold spots, and uniformity issues.",
      parameters: {
        type: "object",
        properties: {
          days_back: { type: "number", description: "Days to look back (default 30)" },
          machine_id: { type: "string", description: "Optional: Filter by machine ID" },
          hatchery_id: { type: "string", description: "Optional: Filter by hatchery ID" },
          threshold: { type: "number", description: "Temperature variance threshold for flagging (default: 0.5°F)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_angle_performance",
      description: "Analyze setter turning angles across all 6 positions (top/mid/bottom left/right). Identify deviations from optimal 45° angle.",
      parameters: {
        type: "object",
        properties: {
          days_back: { type: "number", description: "Days to look back (default 30)" },
          machine_id: { type: "string", description: "Optional: Filter by machine ID" },
          optimal_angle: { type: "number", description: "Optimal angle for comparison (default: 45)" },
          tolerance: { type: "number", description: "Acceptable deviation from optimal (default: 5 degrees)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_humidity_analysis",
      description: "Analyze humidity patterns across machines and incubation days. Shows trends, deviations from target, and correlation with outcomes.",
      parameters: {
        type: "object",
        properties: {
          days_back: { type: "number", description: "Days to look back (default 30)" },
          machine_id: { type: "string", description: "Optional: Filter by machine ID" },
          target_humidity: { type: "number", description: "Target humidity for comparison (default: 55%)" },
          group_by: { type: "string", description: "Group by: machine, day_of_incubation, date (default: machine)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_overall_kpis",
      description: "Get overall Key Performance Indicators in one call: total eggs, hatch rate, HOF, HOI, fertility, utilization, active batches, alerts.",
      parameters: {
        type: "object",
        properties: {
          days_back: { type: "number", description: "Days to look back (default 30)" },
          hatchery_id: { type: "string", description: "Optional: Filter by hatchery ID" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_trend_analysis",
      description: "Calculate trends for any metric: week-over-week, month-over-month changes. Shows improvement or decline indicators.",
      parameters: {
        type: "object",
        properties: {
          metric: { type: "string", description: "Metric to analyze (hatch_percent, fertility_percent, mortality, etc.)" },
          period: { type: "string", description: "Comparison period: week, month, quarter (default: week)" },
          hatchery_id: { type: "string", description: "Optional: Filter by hatchery ID" }
        },
        required: ["metric"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_top_bottom_performers",
      description: "Rank entities by performance metrics. Shows top 5 and bottom 5 performers for flocks, machines, or hatcheries.",
      parameters: {
        type: "object",
        properties: {
          entity_type: { type: "string", description: "Entity to rank: flock, machine, hatchery (default: flock)" },
          metric: { type: "string", description: "Metric for ranking (hatch_percent, fertility_percent, etc.)" },
          days_back: { type: "number", description: "Days to look back (default 30)" },
          top_count: { type: "number", description: "Number of top performers to return (default: 5)" },
          bottom_count: { type: "number", description: "Number of bottom performers to return (default: 5)" }
        },
        required: ["metric"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_anomaly_detection",
      description: "Detect anomalies in metrics - values outside normal range (>2 standard deviations). Identify temperature spikes, sudden drops.",
      parameters: {
        type: "object",
        properties: {
          metric: { type: "string", description: "Metric to analyze (temperature, humidity, hatch_percent, etc.)" },
          days_back: { type: "number", description: "Days to look back (default 30)" },
          sensitivity: { type: "number", description: "Standard deviations threshold (default: 2)" },
          limit: { type: "number", description: "Max anomalies to return (default: 20)" }
        },
        required: ["metric"]
      }
    }
  },

  // ============ NEW TOOLS - Phase 3: Enhanced Question Handling ============
  {
    type: "function",
    function: {
      name: "get_comparison_report",
      description: "Compare two entities (hatcheries, flocks, machines) or two time periods side-by-side with percentage differences.",
      parameters: {
        type: "object",
        properties: {
          entity_type: { type: "string", description: "Type to compare: hatchery, flock, machine, period (required)" },
          entity1_id: { type: "string", description: "First entity ID or date range start (YYYY-MM-DD)" },
          entity2_id: { type: "string", description: "Second entity ID or date range end (YYYY-MM-DD)" },
          metrics: { type: "array", items: { type: "string" }, description: "Metrics to compare (default: all key metrics)" }
        },
        required: ["entity_type"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_today_summary",
      description: "Get today's operations snapshot: houses set today, transfers today, hatches expected, active alerts, overdue tasks.",
      parameters: {
        type: "object",
        properties: {
          hatchery_id: { type: "string", description: "Optional: Filter by hatchery ID" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_weekly_report",
      description: "Get weekly operations report with all metrics aggregated for the week, week-over-week changes, and highlights.",
      parameters: {
        type: "object",
        properties: {
          week_offset: { type: "number", description: "Weeks back from current (0 = this week, 1 = last week, default: 0)" },
          hatchery_id: { type: "string", description: "Optional: Filter by hatchery ID" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_monthly_report",
      description: "Get monthly operations report with comprehensive summary, key achievements, issues, and month-over-month trends.",
      parameters: {
        type: "object",
        properties: {
          month_offset: { type: "number", description: "Months back from current (0 = this month, 1 = last month, default: 0)" },
          hatchery_id: { type: "string", description: "Optional: Filter by hatchery ID" }
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
            .from('batches')
            .select(`
              id,
              batch_number,
              unit_id,
              flock_id,
              set_date,
              fertility_analysis!left(fertility_percent, analysis_date),
              residue_analysis!left(hatch_percent, hof_percent, hoi_percent)
            `);

          if (parameters.batch_id) {
            q = q.eq('id', parameters.batch_id);
          }
          if (daysBack && typeof daysBack === 'number') {
            const start = new Date();
            start.setDate(start.getDate() - daysBack);
            q = q.gte('set_date', start.toISOString().split('T')[0]);
          }

          q = q.order('set_date', { ascending: false }).limit(parameters.limit || 200);

          const { data: batchData, error: batchError } = await q;
          if (batchError) throw batchError;

          if (!batchData || batchData.length === 0) {
            return { message: "No batch data found", data: [] };
          }

          const fert = batchData.map((b: any) => ({
            id: b.id,
            batch_id: b.id,
            batch_number: b.batch_number,
            unit_id: b.unit_id,
            flock_id: b.flock_id,
            analysis_date: b.fertility_analysis?.analysis_date || b.set_date,
            fertility_percent: Number(b.fertility_analysis?.fertility_percent || 0),
            hatch_percent: Number(b.residue_analysis?.hatch_percent || 0),
            hof_percent: Number(b.residue_analysis?.hof_percent || 0),
            hoi_percent: Number(b.residue_analysis?.hoi_percent || 0),
            label: b.batch_number || `House ${b.id?.slice?.(0, 8) || ''}`
          }));

          console.log('[get_fertility_rates] Enriched data sample:', fert.slice(0, 3));

          if (!groupBy) {
            return {
              message: `Found ${fert.length} house records with fertility data`,
              data: fert
            };
          }

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

          if (housesFilter.length > 0) {
            const wants = housesFilter.map(normalizeLabel);
            aggregated = aggregated.filter(r => {
              const lbl = normalizeLabel(r.label);
              return wants.some(w => w && (lbl === w || lbl.includes(w)));
            });
          }

          const initialValidation = validateGroupedPercent(aggregated, { groupKey: 'label', valueKeys: ['fertility_percent','hatch_percent','hof_percent'], minGroups: 1 });
          let retries = 0;
          if (!initialValidation.passed && groupBy === 'house') {
            const unknownCount = aggregated.filter(r => normalizeLabel(r.label) === 'unknown house').length;
            if (unknownCount > 0) {
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
            batches(
              id,
              batch_number,
              status,
              set_date,
              total_eggs_set
            )
          `)
          .limit(10);

        if (!machineData || machineData.length === 0) {
          return { message: "No machines found", machines: [] };
        }

        {
          const activeStatuses = ['setting', 'incubating'];
          const machines = machineData.map((machine: any) => {
            const batches = Array.isArray(machine.batches) ? machine.batches : [];
            const activeBatches = batches.filter((b: any) => activeStatuses.includes(b.status));
            const currentLoad = activeBatches.reduce((sum: number, b: any) => sum + (Number(b.total_eggs_set) || 0), 0);
            const capacity = Number(machine.capacity) || 0;
            const utilization = capacity > 0 ? Math.round(((currentLoad / capacity) * 100) * 10) / 10 : 0;
            const currentStatus = activeBatches.length > 0 ? 'active' : (machine.status || 'available');
            return {
              ...machine,
              current_batch_count: activeBatches.length,
              current_load: currentLoad,
              current_status: currentStatus,
              utilization
            };
          });

          console.log('[get_machine_status]', { message: `Found ${machines.length} machines`, machines });
          return {
            message: `Found ${machines.length} machines`,
            machines
          };
        }

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

      case "smart_retrieve": {
        const metric: string = parameters.metric;
        const daysBack: number | undefined = parameters.days_back;
        const groupBy: 'house' | 'unit' | 'batch' | null = parameters.group_by || null;
        const housesFilter: string[] = Array.isArray(parameters.houses) ? parameters.houses : [];
        const limit: number = parameters.limit || 200;

        const allowed = new Set(["fertility_percent","hatch_percent","hof_percent","hoi_percent","if_dev_percent","residue_percent"]);
        if (!allowed.has(metric)) {
          return { error: `Unsupported metric: ${metric}`, allowed: Array.from(allowed) };
        }

        const residueMetrics = new Set(['residue_percent', 'hatch_percent', 'hof_percent', 'hoi_percent', 'if_dev_percent']);
        const useResidueTable = residueMetrics.has(metric);
        const table = useResidueTable ? 'residue_analysis' : 'fertility_analysis';
        const cols = useResidueTable
          ? 'id, batch_id, analysis_date, sample_size, residue_percent, hatch_percent, hof_percent, hoi_percent, if_dev_percent'
          : 'id, batch_id, analysis_date, sample_size, fertility_percent';

        let q = supabase.from(table).select(cols);
        if (typeof daysBack === 'number' && daysBack > 0) {
          const start = new Date();
          start.setDate(start.getDate() - daysBack);
          q = q.gte('analysis_date', start.toISOString().split('T')[0]);
        }
        q = q.order('analysis_date', { ascending: false }).limit(limit);

        const { data: rows, error: qErr } = await q as any;
        if (qErr) throw qErr;
        if (!rows || rows.length === 0) {
          return { message: `No ${table} rows found in lookback`, metric, data: [] };
        }

        const batchIds = Array.from(new Set(rows.map((r: any) => r.batch_id).filter(Boolean)));
        const { data: bData, error: bErr } = await supabase
          .from('batches')
          .select('id, unit_id, flock_id, batch_number')
          .in('id', batchIds);
        if (bErr) throw bErr;

        const unitIds = Array.from(new Set((bData || []).map((b: any) => b.unit_id).filter(Boolean)));
        const unitsMap: Record<string, { name: string | null; code: string | null }> = {};
        if (unitIds.length > 0) {
          const { data: uData } = await supabase.from('units').select('id, name, code').in('id', unitIds);
          (uData || []).forEach((u: any) => { unitsMap[u.id] = { name: u.name, code: u.code }; });
        }

        const batchMap: Record<string, { unit_id: string; batch_number: string }> = {};
        (bData || []).forEach((b: any) => { batchMap[b.id] = { unit_id: b.unit_id, batch_number: b.batch_number }; });

        function labelForSmart(batchId: string, mode: 'house' | 'unit' | 'batch' | null): string {
          const meta = batchMap[batchId];
          if (!meta) return batchId;
          if (mode === 'batch') return meta.batch_number || batchId;
          const unit = unitsMap[meta.unit_id];
          return unit?.name || unit?.code || meta.batch_number || batchId;
        }

        const enriched = rows.map((r: any) => ({
          ...r,
          label: labelForSmart(r.batch_id, groupBy),
          [metric]: Number(r[metric] ?? 0),
        }));

        if (!groupBy) {
          return { message: `Retrieved ${enriched.length} ${metric} records`, metric, data: enriched };
        }

        type Agg = { label: string; count: number; sum: number };
        const groups: Record<string, Agg> = {};
        for (const row of enriched) {
          const label = row.label;
          if (!groups[label]) groups[label] = { label, count: 0, sum: 0 };
          groups[label].count += 1;
          groups[label].sum += Number(row[metric] || 0);
        }

        let aggregated = Object.values(groups).map(g => ({
          label: g.label,
          [metric]: g.count ? g.sum / g.count : 0,
          sample_count: g.count,
        }));

        if (housesFilter.length > 0) {
          const wants = housesFilter.map(normalizeLabel);
          aggregated = aggregated.filter(r => {
            const lbl = normalizeLabel(r.label);
            return wants.some(w => w && (lbl === w || lbl.includes(w)));
          });
        }

        console.log('[smart_retrieve]', { metric, groupBy, rows: aggregated.length });
        return { message: `Aggregated ${metric} by ${groupBy} (${aggregated.length} groups)`, metric, grouped: groupBy, data: aggregated };
      }

      case "get_egg_status_breakdown": {
        const limitBatches = parameters.limit_batches || 10;
        const daysBack = parameters.days_back;
        
        let q = supabase
          .from('batches')
          .select(`
            id, batch_number, total_eggs_set, eggs_injected, chicks_hatched,
            fertility_analysis!left(fertile_eggs, infertile_eggs, sample_size),
            residue_analysis!left(infertile_eggs, contaminated_eggs)
          `)
          .order('set_date', { ascending: false })
          .limit(limitBatches);

        if (typeof daysBack === 'number' && daysBack > 0) {
          const start = new Date();
          start.setDate(start.getDate() - daysBack);
          q = q.gte('set_date', start.toISOString().split('T')[0]);
        }

        const { data: batchData, error } = await q;
        if (error) throw error;
        if (!batchData || batchData.length === 0) {
          return { type: 'egg_status_breakdown', message: 'No batch data found', data: [] };
        }

        const statusData = batchData.map((b: any) => {
          const fa = b.fertility_analysis || {};
          const ra = b.residue_analysis || {};
          const fertile = Number(fa.fertile_eggs || 0);
          const infertile = Number(fa.infertile_eggs || ra.infertile_eggs || 0);
          const contaminated = Number(ra.contaminated_eggs || 0);
          const total = fertile + infertile + contaminated || b.total_eggs_set || 1;
          return {
            name: b.batch_number || `Batch ${b.id?.slice(0, 6)}`,
            batch_number: b.batch_number,
            fertile,
            infertile,
            contaminated,
            total,
            fertile_pct: total > 0 ? ((fertile / total) * 100).toFixed(1) : '0',
            infertile_pct: total > 0 ? ((infertile / total) * 100).toFixed(1) : '0',
            contaminated_pct: total > 0 ? ((contaminated / total) * 100).toFixed(1) : '0',
          };
        });

        console.log('[get_egg_status_breakdown]', { count: statusData.length, sample: statusData.slice(0, 2) });
        return { type: 'egg_status_breakdown', message: `Egg status for ${statusData.length} batches`, data: statusData };
      }

      case "get_house_temperatures": {
        const daysBack = parameters.days_back || 7;
        const aggregation = parameters.aggregation || 'latest';
        const limit = parameters.limit || 20;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysBack);

        const { data: qaData, error } = await supabase
          .from('qa_monitoring')
          .select(`
            id, batch_id, check_date, check_time, temperature, temp_avg_overall,
            batches!left(batch_number, unit_id, flocks(flock_name, house_number))
          `)
          .gte('check_date', startDate.toISOString().split('T')[0])
          .order('check_date', { ascending: false })
          .limit(200);

        if (error) throw error;
        if (!qaData || qaData.length === 0) {
          return { type: 'house_temperatures', message: 'No temperature data found', data: [] };
        }

        const houseGroups: Record<string, { temps: number[]; latest: any }> = {};
        for (const qa of qaData) {
          const houseName = (qa as any).batches?.flocks?.house_number || (qa as any).batches?.batch_number || 'Unknown';
          const temp = Number(qa.temp_avg_overall || qa.temperature || 0);
          if (!houseGroups[houseName]) {
            houseGroups[houseName] = { temps: [], latest: qa };
          }
          houseGroups[houseName].temps.push(temp);
          if (new Date(qa.check_date) > new Date(houseGroups[houseName].latest.check_date)) {
            houseGroups[houseName].latest = qa;
          }
        }

        let result = Object.entries(houseGroups).map(([name, data]) => ({
          house: name,
          temperature: aggregation === 'average'
            ? (data.temps.reduce((a, b) => a + b, 0) / data.temps.length).toFixed(1)
            : Number(data.latest.temp_avg_overall || data.latest.temperature || 0).toFixed(1),
          reading_count: data.temps.length,
          latest_check: data.latest.check_date
        })).slice(0, limit);

        console.log('[get_house_temperatures]', { aggregation, count: result.length });
        return { type: 'house_temperatures', message: `Temperature data for ${result.length} houses (${aggregation})`, aggregation, data: result };
      }

      case "get_qa_performance": {
        const daysBack = parameters.days_back || 30;
        const groupBy = parameters.group_by || null;
        const limit = parameters.limit || 100;
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysBack);
        
        let query = supabase
          .from('qa_monitoring')
          .select(`
            id, batch_id, machine_id, check_date, check_time, day_of_incubation,
            temperature, humidity, co2_level, turning_frequency, ventilation_rate,
            temp_avg_overall, temp_avg_front, temp_avg_middle, temp_avg_back,
            angle_top_left, angle_mid_left, angle_bottom_left,
            angle_top_right, angle_mid_right, angle_bottom_right,
            temp_front_top_left, temp_front_top_right, temp_front_mid_left, temp_front_mid_right,
            temp_front_bottom_left, temp_front_bottom_right,
            temp_middle_top_left, temp_middle_top_right, temp_middle_mid_left, temp_middle_mid_right,
            temp_middle_bottom_left, temp_middle_bottom_right,
            temp_back_top_left, temp_back_top_right, temp_back_mid_left, temp_back_mid_right,
            temp_back_bottom_left, temp_back_bottom_right,
            inspector_name, entry_mode, notes,
            batches!left(batch_number, flocks(flock_name, house_number)),
            machines!left(machine_number, machine_type)
          `)
          .gte('check_date', startDate.toISOString().split('T')[0])
          .order('check_date', { ascending: false })
          .limit(limit);
        
        if (parameters.machine_id) query = query.eq('machine_id', parameters.machine_id);
        
        const { data: qaData, error: qaError } = await query;
        if (qaError) throw qaError;
        
        if (!qaData || qaData.length === 0) {
          return { type: 'qa_performance', message: 'No QA monitoring data found', data: [] };
        }
        
        const enrichedData = qaData.map((qa: any) => ({
          ...qa,
          batch_number: qa.batches?.batch_number || 'Unknown',
          flock_name: qa.batches?.flocks?.flock_name || 'Unknown',
          house_number: qa.batches?.flocks?.house_number || 'Unknown',
          machine_number: qa.machines?.machine_number || 'Unknown',
          machine_type: qa.machines?.machine_type || 'Unknown'
        }));
        
        if (groupBy === 'day') {
          const groups: Record<number, any> = {};
          for (const row of enrichedData) {
            const key = row.day_of_incubation || 0;
            if (!groups[key]) groups[key] = { day: key, records: 0, temp_sum: 0, humidity_sum: 0 };
            groups[key].records++;
            groups[key].temp_sum += Number(row.temp_avg_overall || row.temperature || 0);
            groups[key].humidity_sum += Number(row.humidity || 0);
          }
          const aggregated = Object.values(groups).map((g: any) => ({
            day_of_incubation: g.day,
            record_count: g.records,
            avg_temperature: g.records > 0 ? (g.temp_sum / g.records).toFixed(1) : null,
            avg_humidity: g.records > 0 ? (g.humidity_sum / g.records).toFixed(1) : null
          })).sort((a: any, b: any) => a.day_of_incubation - b.day_of_incubation);
          return { type: 'qa_performance', message: `QA data grouped by incubation day (${aggregated.length} days)`, grouped: 'day', data: aggregated };
        }
        
        if (groupBy === 'machine') {
          const groups: Record<string, any> = {};
          for (const row of enrichedData) {
            const key = row.machine_number;
            if (!groups[key]) groups[key] = { machine: key, type: row.machine_type, records: 0, temp_sum: 0, humidity_sum: 0 };
            groups[key].records++;
            groups[key].temp_sum += Number(row.temp_avg_overall || row.temperature || 0);
            groups[key].humidity_sum += Number(row.humidity || 0);
          }
          const aggregated = Object.values(groups).map((g: any) => ({
            machine: g.machine,
            machine_type: g.type,
            record_count: g.records,
            avg_temperature: g.records > 0 ? (g.temp_sum / g.records).toFixed(1) : null,
            avg_humidity: g.records > 0 ? (g.humidity_sum / g.records).toFixed(1) : null
          }));
          return { type: 'qa_performance', message: `QA data grouped by machine (${aggregated.length} machines)`, grouped: 'machine', data: aggregated };
        }
        
        if (groupBy === 'flock') {
          const groups: Record<string, any> = {};
          for (const row of enrichedData) {
            const key = row.flock_name;
            if (!groups[key]) groups[key] = { flock: key, house: row.house_number, records: 0, temp_sum: 0, humidity_sum: 0 };
            groups[key].records++;
            groups[key].temp_sum += Number(row.temp_avg_overall || row.temperature || 0);
            groups[key].humidity_sum += Number(row.humidity || 0);
          }
          const aggregated = Object.values(groups).map((g: any) => ({
            flock: g.flock,
            house: g.house,
            record_count: g.records,
            avg_temperature: g.records > 0 ? (g.temp_sum / g.records).toFixed(1) : null,
            avg_humidity: g.records > 0 ? (g.humidity_sum / g.records).toFixed(1) : null
          }));
          return { type: 'qa_performance', message: `QA data grouped by flock (${aggregated.length} flocks)`, grouped: 'flock', data: aggregated };
        }
        
        console.log('[get_qa_performance]', { records: enrichedData.length, groupBy });
        return { type: 'qa_performance', message: `Found ${enrichedData.length} QA monitoring records`, data: enrichedData.slice(0, 50) };
      }

      case "get_moisture_loss_trends": {
        const daysBack = parameters.days_back || 30;
        const groupBy = parameters.group_by || 'batch';
        const limit = parameters.limit || 100;
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysBack);
        
        let query = supabase
          .from('weight_tracking')
          .select(`
            id, batch_id, flock_id, machine_id, check_date, day_of_incubation,
            top_weight, middle_weight, bottom_weight, total_weight,
            percent_loss, target_loss_min, target_loss_max,
            batches!left(batch_number, flocks(flock_name)),
            flocks!left(flock_name, house_number)
          `)
          .gte('check_date', startDate.toISOString().split('T')[0])
          .order('check_date', { ascending: false })
          .limit(limit);
        
        if (parameters.batch_id) query = query.eq('batch_id', parameters.batch_id);
        if (parameters.flock_id) query = query.eq('flock_id', parameters.flock_id);
        
        const { data: weightData, error: weightError } = await query;
        if (weightError) throw weightError;
        
        if (!weightData || weightData.length === 0) {
          return { type: 'moisture_loss', message: 'No weight tracking data found', data: [] };
        }
        
        const enriched = weightData.map((w: any) => ({
          ...w,
          flock_name: w.flocks?.flock_name || w.batches?.flocks?.flock_name || 'Unknown',
          batch_number: w.batches?.batch_number || 'Unknown',
          within_target: w.percent_loss !== null && w.target_loss_min !== null && w.target_loss_max !== null
            ? (w.percent_loss >= w.target_loss_min && w.percent_loss <= w.target_loss_max)
            : null
        }));
        
        if (groupBy === 'flock') {
          const groups: Record<string, any> = {};
          for (const row of enriched) {
            const key = row.flock_name;
            if (!groups[key]) groups[key] = { flock: key, records: 0, loss_sum: 0, loss_count: 0, within_target_count: 0 };
            groups[key].records++;
            if (row.percent_loss !== null) { groups[key].loss_sum += Number(row.percent_loss); groups[key].loss_count++; }
            if (row.within_target === true) groups[key].within_target_count++;
          }
          const aggregated = Object.values(groups).map((g: any) => ({
            flock: g.flock,
            record_count: g.records,
            avg_percent_loss: g.loss_count > 0 ? (g.loss_sum / g.loss_count).toFixed(2) : null,
            within_target_pct: g.records > 0 ? ((g.within_target_count / g.records) * 100).toFixed(1) : null
          }));
          return { type: 'moisture_loss', message: `Moisture loss by flock (${aggregated.length} flocks)`, grouped: 'flock', data: aggregated };
        }
        
        console.log('[get_moisture_loss_trends]', { records: enriched.length });
        return { type: 'moisture_loss', message: `Found ${enriched.length} weight tracking records`, data: enriched.slice(0, 50) };
      }

      case "get_specific_gravity_data": {
        const daysBack = parameters.days_back || 60;
        const groupBy = parameters.group_by || 'flock';
        const limit = parameters.limit || 100;
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysBack);
        
        let query = supabase
          .from('specific_gravity_tests')
          .select(`
            id, flock_id, batch_id, test_date, age_weeks,
            float_count, sink_count, sample_size, float_percentage,
            meets_standard, concentration,
            flocks!left(flock_name, house_number, breed)
          `)
          .gte('test_date', startDate.toISOString().split('T')[0])
          .order('test_date', { ascending: false })
          .limit(limit);
        
        if (parameters.flock_id) query = query.eq('flock_id', parameters.flock_id);
        
        const { data: sgData, error: sgError } = await query;
        if (sgError) throw sgError;
        
        if (!sgData || sgData.length === 0) {
          return { type: 'specific_gravity', message: 'No specific gravity test data found', data: [] };
        }
        
        const enriched = sgData.map((sg: any) => ({
          ...sg,
          flock_name: sg.flocks?.flock_name || 'Unknown',
          house_number: sg.flocks?.house_number || 'Unknown',
          breed: sg.flocks?.breed || 'Unknown'
        }));
        
        if (groupBy === 'flock') {
          const groups: Record<string, any> = {};
          for (const row of enriched) {
            const key = row.flock_name;
            if (!groups[key]) groups[key] = { flock: key, house: row.house_number, tests: 0, float_sum: 0, meets_std_count: 0 };
            groups[key].tests++;
            groups[key].float_sum += Number(row.float_percentage || 0);
            if (row.meets_standard) groups[key].meets_std_count++;
          }
          const aggregated = Object.values(groups).map((g: any) => ({
            flock: g.flock,
            house: g.house,
            test_count: g.tests,
            avg_float_percentage: g.tests > 0 ? (g.float_sum / g.tests).toFixed(2) : null,
            meets_standard_pct: g.tests > 0 ? ((g.meets_std_count / g.tests) * 100).toFixed(1) : null
          }));
          return { type: 'specific_gravity', message: `SG data by flock (${aggregated.length} flocks)`, grouped: 'flock', data: aggregated };
        }
        
        if (groupBy === 'age_weeks') {
          const groups: Record<number, any> = {};
          for (const row of enriched) {
            const key = row.age_weeks || 0;
            if (!groups[key]) groups[key] = { age_weeks: key, tests: 0, float_sum: 0, meets_std_count: 0 };
            groups[key].tests++;
            groups[key].float_sum += Number(row.float_percentage || 0);
            if (row.meets_standard) groups[key].meets_std_count++;
          }
          const aggregated = Object.values(groups).map((g: any) => ({
            age_weeks: g.age_weeks,
            test_count: g.tests,
            avg_float_percentage: g.tests > 0 ? (g.float_sum / g.tests).toFixed(2) : null,
            meets_standard_pct: g.tests > 0 ? ((g.meets_std_count / g.tests) * 100).toFixed(1) : null
          })).sort((a: any, b: any) => a.age_weeks - b.age_weeks);
          return { type: 'specific_gravity', message: `SG data by age (${aggregated.length} age groups)`, grouped: 'age_weeks', data: aggregated };
        }
        
        console.log('[get_specific_gravity_data]', { records: enriched.length });
        return { type: 'specific_gravity', message: `Found ${enriched.length} SG test records`, data: enriched.slice(0, 50) };
      }

      case "get_flock_performance": {
        const daysBack = parameters.days_back || 90;
        const limit = parameters.limit || 50;
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysBack);
        
        let flockQuery = supabase
          .from('flocks')
          .select(`
            id, flock_name, house_number, breed, age_weeks, unit_id,
            units!left(name, code)
          `)
          .limit(limit);
        
        if (parameters.flock_id) flockQuery = flockQuery.eq('id', parameters.flock_id);
        if (parameters.hatchery_id) flockQuery = flockQuery.eq('unit_id', parameters.hatchery_id);
        
        const { data: flocks, error: flockError } = await flockQuery;
        if (flockError) throw flockError;
        
        if (!flocks || flocks.length === 0) {
          return { type: 'flock_performance', message: 'No flocks found', data: [] };
        }
        
        const flockIds = flocks.map(f => f.id);
        
        const [batchesRes, qaRes, weightRes, sgRes] = await Promise.all([
          supabase.from('batches').select('id, flock_id, total_eggs_set, chicks_hatched, eggs_injected, set_date, status').in('flock_id', flockIds),
          supabase.from('qa_monitoring').select('batch_id, temperature, humidity, temp_avg_overall').gte('check_date', startDate.toISOString().split('T')[0]),
          supabase.from('weight_tracking').select('flock_id, percent_loss').in('flock_id', flockIds),
          supabase.from('specific_gravity_tests').select('flock_id, float_percentage, meets_standard').in('flock_id', flockIds)
        ]);
        
        const batchesByFlock: Record<string, any[]> = {};
        for (const b of batchesRes.data || []) {
          if (!batchesByFlock[b.flock_id]) batchesByFlock[b.flock_id] = [];
          batchesByFlock[b.flock_id].push(b);
        }
        
        const qaByBatch: Record<string, any[]> = {};
        for (const qa of qaRes.data || []) {
          if (qa.batch_id) {
            if (!qaByBatch[qa.batch_id]) qaByBatch[qa.batch_id] = [];
            qaByBatch[qa.batch_id].push(qa);
          }
        }
        
        const weightByFlock: Record<string, any[]> = {};
        for (const w of weightRes.data || []) {
          if (!weightByFlock[w.flock_id]) weightByFlock[w.flock_id] = [];
          weightByFlock[w.flock_id].push(w);
        }
        
        const sgByFlock: Record<string, any[]> = {};
        for (const sg of sgRes.data || []) {
          if (!sgByFlock[sg.flock_id]) sgByFlock[sg.flock_id] = [];
          sgByFlock[sg.flock_id].push(sg);
        }
        
        const flockPerformance = flocks.map((flock: any) => {
          const batches = batchesByFlock[flock.id] || [];
          const totalEggs = batches.reduce((sum, b) => sum + (b.total_eggs_set || 0), 0);
          const totalChicks = batches.reduce((sum, b) => sum + (b.chicks_hatched || 0), 0);
          const totalInjected = batches.reduce((sum, b) => sum + (b.eggs_injected || 0), 0);
          
          const flockQA: any[] = [];
          for (const b of batches) {
            flockQA.push(...(qaByBatch[b.id] || []));
          }
          
          const weights = weightByFlock[flock.id] || [];
          const sgTests = sgByFlock[flock.id] || [];
          
          const avgTemp = flockQA.length > 0
            ? (flockQA.reduce((sum, qa) => sum + Number(qa.temp_avg_overall || qa.temperature || 0), 0) / flockQA.length).toFixed(1)
            : null;
          
          const avgMoistureLoss = weights.length > 0
            ? (weights.reduce((sum, w) => sum + Number(w.percent_loss || 0), 0) / weights.length).toFixed(2)
            : null;
          
          const avgSG = sgTests.length > 0
            ? (sgTests.reduce((sum, sg) => sum + Number(sg.float_percentage || 0), 0) / sgTests.length).toFixed(2)
            : null;
          
          return {
            flock_id: flock.id,
            flock_name: flock.flock_name,
            house_number: flock.house_number,
            breed: flock.breed,
            age_weeks: flock.age_weeks,
            hatchery: flock.units?.name || 'Unknown',
            batch_count: batches.length,
            total_eggs_set: totalEggs,
            total_chicks_hatched: totalChicks,
            hatch_percent: totalEggs > 0 ? ((totalChicks / totalEggs) * 100).toFixed(1) : null,
            hoi_percent: totalInjected > 0 ? ((totalChicks / totalInjected) * 100).toFixed(1) : null,
            qa_checks: flockQA.length,
            avg_temperature: avgTemp,
            moisture_checks: weights.length,
            avg_moisture_loss: avgMoistureLoss,
            sg_tests: sgTests.length,
            avg_sg_float_pct: avgSG
          };
        });
        
        console.log('[get_flock_performance]', { flocks: flockPerformance.length });
        return { type: 'flock_performance', message: `Comprehensive performance for ${flockPerformance.length} flocks`, data: flockPerformance };
      }

      case "get_machine_performance": {
        const daysBack = parameters.days_back || 60;
        const limit = parameters.limit || 20;
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysBack);
        
        let machineQuery = supabase
          .from('machines')
          .select(`
            id, machine_number, machine_type, setter_mode, capacity, status, unit_id,
            units!left(name, code)
          `)
          .limit(limit);
        
        if (parameters.machine_id) machineQuery = machineQuery.eq('id', parameters.machine_id);
        if (parameters.hatchery_id) machineQuery = machineQuery.eq('unit_id', parameters.hatchery_id);
        if (parameters.machine_type) machineQuery = machineQuery.eq('machine_type', parameters.machine_type);
        
        const { data: machines, error: machineError } = await machineQuery;
        if (machineError) throw machineError;
        
        if (!machines || machines.length === 0) {
          return { type: 'machine_performance', message: 'No machines found', data: [] };
        }
        
        const machineIds = machines.map(m => m.id);
        
        const [batchesRes, qaRes] = await Promise.all([
          supabase.from('batches').select('id, machine_id, total_eggs_set, chicks_hatched, status').in('machine_id', machineIds),
          supabase.from('qa_monitoring').select('machine_id, temperature, humidity, temp_avg_overall, temp_avg_front, temp_avg_middle, temp_avg_back, angle_top_left, angle_top_right').in('machine_id', machineIds).gte('check_date', startDate.toISOString().split('T')[0])
        ]);
        
        const batchesByMachine: Record<string, any[]> = {};
        for (const b of batchesRes.data || []) {
          if (!batchesByMachine[b.machine_id]) batchesByMachine[b.machine_id] = [];
          batchesByMachine[b.machine_id].push(b);
        }
        
        const qaByMachine: Record<string, any[]> = {};
        for (const qa of qaRes.data || []) {
          if (qa.machine_id) {
            if (!qaByMachine[qa.machine_id]) qaByMachine[qa.machine_id] = [];
            qaByMachine[qa.machine_id].push(qa);
          }
        }
        
        const machinePerformance = machines.map((machine: any) => {
          const batches = batchesByMachine[machine.id] || [];
          const qaRecords = qaByMachine[machine.id] || [];
          
          const totalEggs = batches.reduce((sum, b) => sum + (b.total_eggs_set || 0), 0);
          const totalChicks = batches.reduce((sum, b) => sum + (b.chicks_hatched || 0), 0);
          const completedBatches = batches.filter(b => b.status === 'completed');
          
          const avgTemp = qaRecords.length > 0
            ? (qaRecords.reduce((sum, qa) => sum + Number(qa.temp_avg_overall || qa.temperature || 0), 0) / qaRecords.length).toFixed(1)
            : null;
          
          const avgHumidity = qaRecords.length > 0
            ? (qaRecords.reduce((sum, qa) => sum + Number(qa.humidity || 0), 0) / qaRecords.length).toFixed(1)
            : null;
          
          const zoneTemps = { front: [] as number[], middle: [] as number[], back: [] as number[] };
          for (const qa of qaRecords) {
            if (qa.temp_avg_front) zoneTemps.front.push(Number(qa.temp_avg_front));
            if (qa.temp_avg_middle) zoneTemps.middle.push(Number(qa.temp_avg_middle));
            if (qa.temp_avg_back) zoneTemps.back.push(Number(qa.temp_avg_back));
          }
          
          const calcAvg = (arr: number[]) => arr.length > 0 ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : null;
          
          return {
            machine_id: machine.id,
            machine_number: machine.machine_number,
            machine_type: machine.machine_type,
            setter_mode: machine.setter_mode,
            hatchery: machine.units?.name || 'Unknown',
            capacity: machine.capacity,
            batch_count: batches.length,
            completed_batches: completedBatches.length,
            total_eggs_processed: totalEggs,
            total_chicks_hatched: totalChicks,
            hatch_percent: totalEggs > 0 ? ((totalChicks / totalEggs) * 100).toFixed(1) : null,
            qa_checks: qaRecords.length,
            avg_temperature: avgTemp,
            avg_humidity: avgHumidity,
            zone_temps: {
              front: calcAvg(zoneTemps.front),
              middle: calcAvg(zoneTemps.middle),
              back: calcAvg(zoneTemps.back)
            }
          };
        });
        
        console.log('[get_machine_performance]', { machines: machinePerformance.length });
        return { type: 'machine_performance', message: `Performance analytics for ${machinePerformance.length} machines`, data: machinePerformance };
      }

      case "get_hatchery_summary": {
        const daysBack = parameters.days_back || 30;
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysBack);
        
        let unitQuery = supabase.from('units').select('id, name, code, status');
        if (parameters.hatchery_id) unitQuery = unitQuery.eq('id', parameters.hatchery_id);
        
        const { data: units, error: unitError } = await unitQuery;
        if (unitError) throw unitError;
        
        if (!units || units.length === 0) {
          return { type: 'hatchery_summary', message: 'No hatcheries found', data: [] };
        }
        
        const unitIds = units.map(u => u.id);
        
        const [batchesRes, machinesRes] = await Promise.all([
          supabase.from('batches').select('id, unit_id, total_eggs_set, chicks_hatched, status, set_date').in('unit_id', unitIds).gte('set_date', startDate.toISOString().split('T')[0]),
          supabase.from('machines').select('id, unit_id, capacity, status').in('unit_id', unitIds)
        ]);
        
        const batchesByUnit: Record<string, any[]> = {};
        for (const b of batchesRes.data || []) {
          if (!batchesByUnit[b.unit_id]) batchesByUnit[b.unit_id] = [];
          batchesByUnit[b.unit_id].push(b);
        }
        
        const machinesByUnit: Record<string, any[]> = {};
        for (const m of machinesRes.data || []) {
          if (!machinesByUnit[m.unit_id]) machinesByUnit[m.unit_id] = [];
          machinesByUnit[m.unit_id].push(m);
        }
        
        const hatcherySummary = units.map((unit: any) => {
          const batches = batchesByUnit[unit.id] || [];
          const machines = machinesByUnit[unit.id] || [];
          
          const totalEggs = batches.reduce((sum, b) => sum + (b.total_eggs_set || 0), 0);
          const totalChicks = batches.reduce((sum, b) => sum + (b.chicks_hatched || 0), 0);
          const completedBatches = batches.filter(b => b.status === 'completed');
          const activeBatches = batches.filter(b => ['in_setter', 'in_hatcher'].includes(b.status));
          
          const totalCapacity = machines.reduce((sum, m) => sum + (m.capacity || 0), 0);
          const activeLoad = activeBatches.reduce((sum, b) => sum + (b.total_eggs_set || 0), 0);
          
          return {
            hatchery_id: unit.id,
            hatchery_name: unit.name,
            hatchery_code: unit.code,
            status: unit.status,
            machine_count: machines.length,
            total_capacity: totalCapacity,
            current_load: activeLoad,
            utilization_percent: totalCapacity > 0 ? ((activeLoad / totalCapacity) * 100).toFixed(1) : '0',
            batch_count: batches.length,
            active_batches: activeBatches.length,
            completed_batches: completedBatches.length,
            total_eggs_set: totalEggs,
            total_chicks_hatched: totalChicks,
            hatch_percent: totalEggs > 0 ? ((totalChicks / totalEggs) * 100).toFixed(1) : null
          };
        });
        
        console.log('[get_hatchery_summary]', { hatcheries: hatcherySummary.length });
        return { type: 'hatchery_summary', message: `Summary for ${hatcherySummary.length} hatcheries`, data: hatcherySummary };
      }

      // ============ NEW TOOL IMPLEMENTATIONS - Phase 1 ============
      
      case "get_egg_pack_quality": {
        const daysBack = parameters.days_back || 30;
        const groupBy = parameters.group_by || 'batch';
        const limit = parameters.limit || 100;
        
        const startDate = getDateRange(daysBack);
        
        let query = supabase
          .from('egg_pack_quality')
          .select(`
            id, batch_id, inspection_date, sample_size,
            grade_a, grade_b, grade_c, cracked, dirty, small, large,
            weight_avg, shell_thickness_avg, inspector_name, notes,
            batches!left(batch_number, flock_id, unit_id, flocks(flock_name), units:unit_id(name))
          `)
          .gte('inspection_date', startDate)
          .order('inspection_date', { ascending: false })
          .limit(limit);
        
        if (parameters.batch_id) query = query.eq('batch_id', parameters.batch_id);
        
        const { data, error } = await query;
        if (error) throw error;
        
        if (!data || data.length === 0) {
          return { type: 'egg_pack_quality', message: 'No egg pack quality data found', data: [] };
        }
        
        const enriched = data.map((d: any) => {
          const total = d.sample_size || 100;
          return {
            ...d,
            batch_number: d.batches?.batch_number || 'Unknown',
            flock_name: d.batches?.flocks?.flock_name || 'Unknown',
            hatchery: d.batches?.units?.name || 'Unknown',
            grade_a_pct: ((d.grade_a / total) * 100).toFixed(1),
            grade_b_pct: ((d.grade_b / total) * 100).toFixed(1),
            grade_c_pct: ((d.grade_c / total) * 100).toFixed(1),
            defect_rate: (((d.cracked + d.dirty) / total) * 100).toFixed(1)
          };
        });
        
        if (groupBy === 'hatchery') {
          const groups: Record<string, any> = {};
          for (const row of enriched) {
            const key = row.hatchery;
            if (!groups[key]) groups[key] = { hatchery: key, count: 0, grade_a_sum: 0, defect_sum: 0, total_eggs: 0 };
            groups[key].count++;
            groups[key].grade_a_sum += row.grade_a;
            groups[key].defect_sum += row.cracked + row.dirty;
            groups[key].total_eggs += row.sample_size || 100;
          }
          const aggregated = Object.values(groups).map((g: any) => ({
            hatchery: g.hatchery,
            inspection_count: g.count,
            avg_grade_a_pct: g.total_eggs > 0 ? ((g.grade_a_sum / g.total_eggs) * 100).toFixed(1) : null,
            avg_defect_rate: g.total_eggs > 0 ? ((g.defect_sum / g.total_eggs) * 100).toFixed(1) : null
          }));
          return { type: 'egg_pack_quality', message: `Egg quality by hatchery (${aggregated.length})`, grouped: 'hatchery', data: aggregated };
        }
        
        console.log('[get_egg_pack_quality]', { records: enriched.length });
        return { type: 'egg_pack_quality', message: `Found ${enriched.length} egg pack quality records`, data: enriched };
      }

      case "get_machine_transfers": {
        const daysBack = parameters.days_back || 30;
        const limit = parameters.limit || 100;
        
        const startDate = getDateRange(daysBack);
        
        let query = supabase
          .from('machine_transfers')
          .select(`
            id, batch_id, from_machine_id, to_machine_id, transfer_date, transfer_time,
            days_in_previous_machine, notes, transferred_by,
            batches!left(batch_number, set_date, flocks(flock_name)),
            from_machine:machines!machine_transfers_from_machine_id_fkey(machine_number, machine_type),
            to_machine:machines!machine_transfers_to_machine_id_fkey(machine_number, machine_type)
          `)
          .gte('transfer_date', startDate)
          .order('transfer_date', { ascending: false })
          .limit(limit);
        
        if (parameters.batch_id) query = query.eq('batch_id', parameters.batch_id);
        if (parameters.machine_id) query = query.or(`from_machine_id.eq.${parameters.machine_id},to_machine_id.eq.${parameters.machine_id}`);
        
        const { data, error } = await query;
        if (error) throw error;
        
        if (!data || data.length === 0) {
          return { type: 'machine_transfers', message: 'No transfer records found', data: [] };
        }
        
        const enriched = data.map((d: any) => {
          const setDate = d.batches?.set_date ? new Date(d.batches.set_date) : null;
          const transferDate = new Date(d.transfer_date);
          const daysInSetter = setDate ? Math.floor((transferDate.getTime() - setDate.getTime()) / (1000 * 60 * 60 * 24)) : null;
          const isDelayed = daysInSetter !== null && daysInSetter > 18;
          
          return {
            ...d,
            batch_number: d.batches?.batch_number || 'Unknown',
            flock_name: d.batches?.flocks?.flock_name || 'Unknown',
            from_machine: d.from_machine?.machine_number || 'Unknown',
            from_type: d.from_machine?.machine_type || 'Unknown',
            to_machine: d.to_machine?.machine_number || 'Unknown',
            to_type: d.to_machine?.machine_type || 'Unknown',
            days_in_setter: daysInSetter,
            is_delayed: isDelayed,
            delay_days: isDelayed && daysInSetter ? daysInSetter - 18 : 0
          };
        });
        
        const delayedCount = enriched.filter(e => e.is_delayed).length;
        
        console.log('[get_machine_transfers]', { records: enriched.length, delayed: delayedCount });
        return { 
          type: 'machine_transfers', 
          message: `Found ${enriched.length} transfers (${delayedCount} delayed)`,
          summary: { total: enriched.length, delayed: delayedCount },
          data: enriched 
        };
      }

      case "get_multi_setter_positions": {
        const daysBack = parameters.days_back || 30;
        const limit = parameters.limit || 100;
        
        const startDate = getDateRange(daysBack);
        
        let query = supabase
          .from('multi_setter_sets')
          .select(`
            id, machine_id, flock_id, batch_id, zone, side, level, capacity, set_date, notes,
            machines!left(machine_number, machine_type, units:unit_id(name)),
            flocks!left(flock_name, house_number, breed),
            batches!left(batch_number, status)
          `)
          .gte('set_date', startDate)
          .order('set_date', { ascending: false })
          .limit(limit);
        
        if (parameters.machine_id) query = query.eq('machine_id', parameters.machine_id);
        
        const { data, error } = await query;
        if (error) throw error;
        
        if (!data || data.length === 0) {
          return { type: 'multi_setter_positions', message: 'No multi-setter position data found', data: [] };
        }
        
        const enriched = data.map((d: any) => ({
          ...d,
          machine_number: d.machines?.machine_number || 'Unknown',
          hatchery: d.machines?.units?.name || 'Unknown',
          flock_name: d.flocks?.flock_name || 'Unknown',
          house_number: d.flocks?.house_number || 'Unknown',
          batch_number: d.batches?.batch_number || 'N/A',
          batch_status: d.batches?.status || 'N/A',
          position_key: `${d.zone}-${d.side}-${d.level}`
        }));
        
        // Group by machine for occupancy summary
        const machineOccupancy: Record<string, any> = {};
        for (const row of enriched) {
          const key = row.machine_number;
          if (!machineOccupancy[key]) {
            machineOccupancy[key] = { machine: key, hatchery: row.hatchery, positions_filled: 0, total_capacity: 0, flocks: new Set() };
          }
          machineOccupancy[key].positions_filled++;
          machineOccupancy[key].total_capacity += row.capacity || 0;
          machineOccupancy[key].flocks.add(row.flock_name);
        }
        
        const summary = Object.values(machineOccupancy).map((m: any) => ({
          machine: m.machine,
          hatchery: m.hatchery,
          positions_filled: m.positions_filled,
          total_eggs: m.total_capacity,
          unique_flocks: m.flocks.size
        }));
        
        console.log('[get_multi_setter_positions]', { records: enriched.length });
        return { type: 'multi_setter_positions', message: `Found ${enriched.length} position records`, summary, data: enriched };
      }

      case "get_checklist_status": {
        const daysBack = parameters.days_back || 7;
        const limit = parameters.limit || 100;
        
        const startDate = getDateRange(daysBack);
        
        // Get completions
        let completionsQuery = supabase
          .from('checklist_completions')
          .select(`
            id, checklist_item_id, batch_id, machine_id, day_of_incubation,
            completed_at, completed_by, notes,
            daily_checklist_items!left(title, description, is_required, applicable_days),
            batches!left(batch_number),
            machines!left(machine_number)
          `)
          .gte('completed_at', startDate)
          .order('completed_at', { ascending: false })
          .limit(limit);
        
        if (parameters.batch_id) completionsQuery = completionsQuery.eq('batch_id', parameters.batch_id);
        if (parameters.machine_id) completionsQuery = completionsQuery.eq('machine_id', parameters.machine_id);
        
        const { data: completions, error: compError } = await completionsQuery;
        if (compError) throw compError;
        
        // Get checklist items
        const { data: items, error: itemsError } = await supabase
          .from('daily_checklist_items')
          .select('id, title, description, is_required, applicable_days, order_index')
          .order('order_index');
        if (itemsError) throw itemsError;
        
        const completedIds = new Set((completions || []).map((c: any) => c.checklist_item_id));
        const requiredItems = (items || []).filter((i: any) => i.is_required);
        const completedRequired = requiredItems.filter(i => completedIds.has(i.id)).length;
        
        const enrichedCompletions = (completions || []).map((c: any) => ({
          ...c,
          item_title: c.daily_checklist_items?.title || 'Unknown',
          is_required: c.daily_checklist_items?.is_required || false,
          batch_number: c.batches?.batch_number || 'N/A',
          machine_number: c.machines?.machine_number || 'N/A'
        }));
        
        console.log('[get_checklist_status]', { completions: enrichedCompletions.length });
        return { 
          type: 'checklist_status', 
          message: `Found ${enrichedCompletions.length} checklist completions`,
          summary: {
            total_items: items?.length || 0,
            required_items: requiredItems.length,
            completed_required: completedRequired,
            completion_rate: requiredItems.length > 0 ? ((completedRequired / requiredItems.length) * 100).toFixed(1) : '100'
          },
          items: items || [],
          completions: enrichedCompletions 
        };
      }

      case "get_batch_history": {
        const daysBack = parameters.days_back || 30;
        const limit = parameters.limit || 100;
        
        const startDate = getDateRange(daysBack);
        
        let query = supabase
          .from('batch_status_history')
          .select(`
            id, batch_id, from_status, to_status, change_type, changed_by,
            rule_applied, days_since_set, data_validation_passed, notes, created_at,
            batches!left(batch_number, flocks(flock_name))
          `)
          .gte('created_at', startDate)
          .order('created_at', { ascending: false })
          .limit(limit);
        
        if (parameters.batch_id) query = query.eq('batch_id', parameters.batch_id);
        
        const { data, error } = await query;
        if (error) throw error;
        
        if (!data || data.length === 0) {
          return { type: 'batch_history', message: 'No batch status history found', data: [] };
        }
        
        const enriched = data.map((d: any) => ({
          ...d,
          batch_number: d.batches?.batch_number || 'Unknown',
          flock_name: d.batches?.flocks?.flock_name || 'Unknown',
          is_automated: d.change_type === 'automated' || d.rule_applied !== null
        }));
        
        // Count transitions by type
        const transitions: Record<string, number> = {};
        for (const row of enriched) {
          const key = `${row.from_status} → ${row.to_status}`;
          transitions[key] = (transitions[key] || 0) + 1;
        }
        
        console.log('[get_batch_history]', { records: enriched.length });
        return { type: 'batch_history', message: `Found ${enriched.length} status changes`, transition_summary: transitions, data: enriched };
      }

      case "get_flock_changes": {
        const daysBack = parameters.days_back || 30;
        const limit = parameters.limit || 100;
        
        const startDate = getDateRange(daysBack);
        
        let query = supabase
          .from('flock_history')
          .select(`
            id, flock_id, change_type, field_changed, old_value, new_value,
            changed_by, notes, changed_at,
            flocks!left(flock_name, house_number, breed)
          `)
          .gte('changed_at', startDate)
          .order('changed_at', { ascending: false })
          .limit(limit);
        
        if (parameters.flock_id) query = query.eq('flock_id', parameters.flock_id);
        if (parameters.change_type) query = query.eq('change_type', parameters.change_type);
        
        const { data, error } = await query;
        if (error) throw error;
        
        if (!data || data.length === 0) {
          return { type: 'flock_changes', message: 'No flock change history found', data: [] };
        }
        
        const enriched = data.map((d: any) => ({
          ...d,
          flock_name: d.flocks?.flock_name || 'Unknown',
          house_number: d.flocks?.house_number || 'Unknown'
        }));
        
        console.log('[get_flock_changes]', { records: enriched.length });
        return { type: 'flock_changes', message: `Found ${enriched.length} flock changes`, data: enriched };
      }

      case "get_residue_schedule": {
        const daysBack = parameters.days_back || 30;
        const limit = parameters.limit || 100;
        
        const startDate = getDateRange(daysBack);
        const today = new Date().toISOString().split('T')[0];
        
        let query = supabase
          .from('residue_analysis_schedule')
          .select(`
            id, batch_id, flock_id, scheduled_date, due_date, status,
            technician_name, completed_at, completed_by, notes,
            batches!left(batch_number, set_date, flocks(flock_name))
          `)
          .gte('scheduled_date', startDate)
          .order('due_date', { ascending: true })
          .limit(limit);
        
        if (parameters.status) query = query.eq('status', parameters.status);
        if (parameters.batch_id) query = query.eq('batch_id', parameters.batch_id);
        
        const { data, error } = await query;
        if (error) throw error;
        
        if (!data || data.length === 0) {
          return { type: 'residue_schedule', message: 'No residue schedules found', data: [] };
        }
        
        const enriched = data.map((d: any) => {
          const isOverdue = d.status === 'pending' && d.due_date < today;
          return {
            ...d,
            batch_number: d.batches?.batch_number || 'Unknown',
            flock_name: d.batches?.flocks?.flock_name || 'Unknown',
            is_overdue: isOverdue,
            days_until_due: Math.ceil((new Date(d.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
          };
        });
        
        const summary = {
          total: enriched.length,
          pending: enriched.filter(e => e.status === 'pending').length,
          completed: enriched.filter(e => e.status === 'completed').length,
          overdue: enriched.filter(e => e.is_overdue).length
        };
        
        console.log('[get_residue_schedule]', { records: enriched.length, summary });
        return { type: 'residue_schedule', message: `Found ${enriched.length} scheduled analyses`, summary, data: enriched };
      }

      case "get_house_allocations": {
        const daysBack = parameters.days_back || 30;
        const limit = parameters.limit || 100;
        
        const startDate = getDateRange(daysBack);
        
        let query = supabase
          .from('house_machine_allocations')
          .select(`
            id, batch_id, machine_id, eggs_allocated, allocation_date, allocation_time,
            status, notes, created_by,
            batches!left(batch_number, total_eggs_set, flocks(flock_name)),
            machines!left(machine_number, capacity, machine_type)
          `)
          .gte('allocation_date', startDate)
          .order('allocation_date', { ascending: false })
          .limit(limit);
        
        if (parameters.batch_id) query = query.eq('batch_id', parameters.batch_id);
        if (parameters.machine_id) query = query.eq('machine_id', parameters.machine_id);
        
        const { data, error } = await query;
        if (error) throw error;
        
        if (!data || data.length === 0) {
          return { type: 'house_allocations', message: 'No allocation data found', data: [] };
        }
        
        const enriched = data.map((d: any) => ({
          ...d,
          batch_number: d.batches?.batch_number || 'Unknown',
          flock_name: d.batches?.flocks?.flock_name || 'Unknown',
          total_eggs: d.batches?.total_eggs_set || 0,
          machine_number: d.machines?.machine_number || 'Unknown',
          machine_capacity: d.machines?.capacity || 0,
          allocation_pct: d.batches?.total_eggs_set > 0 
            ? ((d.eggs_allocated / d.batches.total_eggs_set) * 100).toFixed(1) 
            : '100',
          capacity_usage_pct: d.machines?.capacity > 0
            ? ((d.eggs_allocated / d.machines.capacity) * 100).toFixed(1)
            : '0'
        }));
        
        console.log('[get_house_allocations]', { records: enriched.length });
        return { type: 'house_allocations', message: `Found ${enriched.length} allocations`, data: enriched };
      }

      case "get_custom_targets": {
        const limit = parameters.limit || 50;
        
        let query = supabase
          .from('custom_targets')
          .select('*')
          .eq('is_active', true)
          .order('metric_name');
        
        if (parameters.metric_name) query = query.eq('metric_name', parameters.metric_name);
        if (parameters.target_type) query = query.eq('target_type', parameters.target_type);
        if (parameters.entity_id) query = query.eq('entity_id', parameters.entity_id);
        
        const { data, error } = await query.limit(limit);
        if (error) throw error;
        
        if (!data || data.length === 0) {
          return { type: 'custom_targets', message: 'No custom targets found', data: [] };
        }
        
        console.log('[get_custom_targets]', { records: data.length });
        return { type: 'custom_targets', message: `Found ${data.length} custom targets`, data };
      }

      case "get_sop_procedures": {
        const limit = parameters.limit || 50;
        
        let query = supabase
          .from('sop_templates')
          .select('*')
          .eq('is_active', true)
          .order('category')
          .order('day_of_incubation');
        
        if (parameters.day_of_incubation !== undefined) query = query.eq('day_of_incubation', parameters.day_of_incubation);
        if (parameters.category) query = query.eq('category', parameters.category);
        
        const { data, error } = await query.limit(limit);
        if (error) throw error;
        
        if (!data || data.length === 0) {
          return { type: 'sop_procedures', message: 'No SOP templates found', data: [] };
        }
        
        console.log('[get_sop_procedures]', { records: data.length });
        return { type: 'sop_procedures', message: `Found ${data.length} SOP templates`, data };
      }

      case "get_alert_configs": {
        let query = supabase
          .from('alert_configs')
          .select('*')
          .order('alert_type');
        
        if (parameters.alert_type) query = query.eq('alert_type', parameters.alert_type);
        if (parameters.is_enabled !== undefined) query = query.eq('is_enabled', parameters.is_enabled);
        
        const { data, error } = await query;
        if (error) throw error;
        
        if (!data || data.length === 0) {
          return { type: 'alert_configs', message: 'No alert configurations found', data: [] };
        }
        
        console.log('[get_alert_configs]', { records: data.length });
        return { type: 'alert_configs', message: `Found ${data.length} alert configurations`, data };
      }

      case "get_position_linkage": {
        const daysBack = parameters.days_back || 30;
        const limit = parameters.limit || 100;
        
        const startDate = getDateRange(daysBack);
        
        let query = supabase
          .from('qa_position_linkage')
          .select(`
            id, qa_monitoring_id, position, temperature, linkage_type,
            multi_setter_set_id, resolved_flock_id, resolved_batch_id, created_at,
            qa_monitoring!left(check_date, machine_id, day_of_incubation),
            flocks:resolved_flock_id(flock_name),
            batches:resolved_batch_id(batch_number)
          `)
          .gte('created_at', startDate)
          .order('created_at', { ascending: false })
          .limit(limit);
        
        if (parameters.qa_monitoring_id) query = query.eq('qa_monitoring_id', parameters.qa_monitoring_id);
        if (parameters.position) query = query.eq('position', parameters.position);
        
        const { data, error } = await query;
        if (error) throw error;
        
        if (!data || data.length === 0) {
          return { type: 'position_linkage', message: 'No position linkage data found', data: [] };
        }
        
        const enriched = data.map((d: any) => ({
          ...d,
          check_date: d.qa_monitoring?.check_date || 'Unknown',
          day_of_incubation: d.qa_monitoring?.day_of_incubation || 'Unknown',
          flock_name: d.flocks?.flock_name || 'Unknown',
          batch_number: d.batches?.batch_number || 'Unknown'
        }));
        
        console.log('[get_position_linkage]', { records: enriched.length });
        return { type: 'position_linkage', message: `Found ${enriched.length} position linkages`, data: enriched };
      }

      // ============ NEW TOOL IMPLEMENTATIONS - Phase 2: Advanced Analytics ============
      
      case "get_mortality_breakdown": {
        const daysBack = parameters.days_back || 60;
        const groupBy = parameters.group_by || 'batch';
        const limit = parameters.limit || 100;
        
        const startDate = getDateRange(daysBack);
        
        let query = supabase
          .from('residue_analysis')
          .select(`
            id, batch_id, analysis_date, sample_size,
            early_dead, mid_dead, late_dead, infertile_eggs,
            batches!left(batch_number, unit_id, flock_id, 
              flocks(flock_name, age_weeks, breed),
              units:unit_id(name))
          `)
          .gte('analysis_date', startDate)
          .order('analysis_date', { ascending: false })
          .limit(limit);
        
        if (parameters.hatchery_id) query = query.eq('batches.unit_id', parameters.hatchery_id);
        if (parameters.flock_id) query = query.eq('batches.flock_id', parameters.flock_id);
        
        const { data, error } = await query;
        if (error) throw error;
        
        if (!data || data.length === 0) {
          return { type: 'mortality_breakdown', message: 'No mortality data found', data: [] };
        }
        
        const enriched = data.map((d: any) => {
          const sampleSize = d.sample_size || 648;
          const earlyDead = d.early_dead || 0;
          const midDead = d.mid_dead || 0;
          const lateDead = d.late_dead || 0;
          const totalDead = earlyDead + midDead + lateDead;
          
          return {
            ...d,
            batch_number: d.batches?.batch_number || 'Unknown',
            flock_name: d.batches?.flocks?.flock_name || 'Unknown',
            age_weeks: d.batches?.flocks?.age_weeks || 'Unknown',
            hatchery: d.batches?.units?.name || 'Unknown',
            early_dead_pct: ((earlyDead / sampleSize) * 100).toFixed(2),
            mid_dead_pct: ((midDead / sampleSize) * 100).toFixed(2),
            late_dead_pct: ((lateDead / sampleSize) * 100).toFixed(2),
            total_dead: totalDead,
            embryonic_mortality_pct: ((totalDead / sampleSize) * 100).toFixed(2)
          };
        });
        
        if (groupBy === 'hatchery') {
          const groups: Record<string, any> = {};
          for (const row of enriched) {
            const key = row.hatchery;
            if (!groups[key]) groups[key] = { hatchery: key, count: 0, early_sum: 0, mid_sum: 0, late_sum: 0, total_samples: 0 };
            groups[key].count++;
            groups[key].early_sum += row.early_dead;
            groups[key].mid_sum += row.mid_dead;
            groups[key].late_sum += row.late_dead;
            groups[key].total_samples += row.sample_size || 648;
          }
          const aggregated = Object.values(groups).map((g: any) => ({
            hatchery: g.hatchery,
            analysis_count: g.count,
            avg_early_dead_pct: ((g.early_sum / g.total_samples) * 100).toFixed(2),
            avg_mid_dead_pct: ((g.mid_sum / g.total_samples) * 100).toFixed(2),
            avg_late_dead_pct: ((g.late_sum / g.total_samples) * 100).toFixed(2),
            avg_embryonic_mortality: (((g.early_sum + g.mid_sum + g.late_sum) / g.total_samples) * 100).toFixed(2)
          }));
          return { type: 'mortality_breakdown', message: `Mortality by hatchery (${aggregated.length})`, grouped: 'hatchery', data: aggregated };
        }
        
        console.log('[get_mortality_breakdown]', { records: enriched.length });
        return { type: 'mortality_breakdown', message: `Found ${enriched.length} mortality records`, data: enriched };
      }

      case "get_pip_analysis": {
        const daysBack = parameters.days_back || 60;
        const groupBy = parameters.group_by || 'batch';
        const limit = parameters.limit || 100;
        
        const startDate = getDateRange(daysBack);
        
        const { data, error } = await supabase
          .from('residue_analysis')
          .select(`
            id, batch_id, analysis_date, sample_size,
            live_pip_number, dead_pip_number, pip_number,
            batches!left(batch_number, unit_id, flocks(flock_name), units:unit_id(name))
          `)
          .gte('analysis_date', startDate)
          .order('analysis_date', { ascending: false })
          .limit(limit);
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
          return { type: 'pip_analysis', message: 'No pip data found', data: [] };
        }
        
        const enriched = data.map((d: any) => {
          const sampleSize = d.sample_size || 648;
          const livePips = d.live_pip_number || 0;
          const deadPips = d.dead_pip_number || 0;
          const totalPips = livePips + deadPips;
          
          return {
            ...d,
            batch_number: d.batches?.batch_number || 'Unknown',
            flock_name: d.batches?.flocks?.flock_name || 'Unknown',
            hatchery: d.batches?.units?.name || 'Unknown',
            live_pip_pct: ((livePips / sampleSize) * 100).toFixed(2),
            dead_pip_pct: ((deadPips / sampleSize) * 100).toFixed(2),
            total_pip_pct: ((totalPips / sampleSize) * 100).toFixed(2),
            pip_mortality_rate: totalPips > 0 ? ((deadPips / totalPips) * 100).toFixed(2) : '0'
          };
        });
        
        console.log('[get_pip_analysis]', { records: enriched.length });
        return { type: 'pip_analysis', message: `Found ${enriched.length} pip records`, data: enriched };
      }

      case "get_cull_analysis": {
        const daysBack = parameters.days_back || 60;
        const groupBy = parameters.group_by || 'flock';
        const limit = parameters.limit || 100;
        
        const startDate = getDateRange(daysBack);
        
        let query = supabase
          .from('residue_analysis')
          .select(`
            id, batch_id, analysis_date, sample_size, cull_chicks,
            batches!left(batch_number, unit_id, flocks(flock_name, breed, age_weeks), units:unit_id(name))
          `)
          .gte('analysis_date', startDate)
          .not('cull_chicks', 'is', null)
          .order('analysis_date', { ascending: false })
          .limit(limit);
        
        if (parameters.breed) query = query.eq('batches.flocks.breed', parameters.breed);
        
        const { data, error } = await query;
        if (error) throw error;
        
        if (!data || data.length === 0) {
          return { type: 'cull_analysis', message: 'No cull data found', data: [] };
        }
        
        const enriched = data.map((d: any) => {
          const sampleSize = d.sample_size || 648;
          const culls = d.cull_chicks || 0;
          
          return {
            ...d,
            batch_number: d.batches?.batch_number || 'Unknown',
            flock_name: d.batches?.flocks?.flock_name || 'Unknown',
            breed: d.batches?.flocks?.breed || 'Unknown',
            age_weeks: d.batches?.flocks?.age_weeks || 'Unknown',
            hatchery: d.batches?.units?.name || 'Unknown',
            cull_pct: ((culls / sampleSize) * 100).toFixed(2)
          };
        });
        
        if (groupBy === 'breed') {
          const groups: Record<string, any> = {};
          for (const row of enriched) {
            const key = row.breed;
            if (!groups[key]) groups[key] = { breed: key, count: 0, cull_sum: 0, sample_sum: 0 };
            groups[key].count++;
            groups[key].cull_sum += row.cull_chicks || 0;
            groups[key].sample_sum += row.sample_size || 648;
          }
          const aggregated = Object.values(groups).map((g: any) => ({
            breed: g.breed,
            analysis_count: g.count,
            total_culls: g.cull_sum,
            avg_cull_pct: ((g.cull_sum / g.sample_sum) * 100).toFixed(2)
          }));
          return { type: 'cull_analysis', message: `Cull data by breed (${aggregated.length})`, grouped: 'breed', data: aggregated };
        }
        
        console.log('[get_cull_analysis]', { records: enriched.length });
        return { type: 'cull_analysis', message: `Found ${enriched.length} cull records`, data: enriched };
      }

      case "get_incubation_day_metrics": {
        const daysBack = parameters.days_back || 30;
        
        const startDate = getDateRange(daysBack);
        
        let query = supabase
          .from('qa_monitoring')
          .select('day_of_incubation, temperature, humidity, temp_avg_overall')
          .gte('check_date', startDate)
          .not('day_of_incubation', 'is', null)
          .order('day_of_incubation');
        
        if (parameters.machine_id) query = query.eq('machine_id', parameters.machine_id);
        
        const { data, error } = await query;
        if (error) throw error;
        
        if (!data || data.length === 0) {
          return { type: 'incubation_day_metrics', message: 'No incubation data found', data: [] };
        }
        
        // Group by day
        const dayGroups: Record<number, { temps: number[], humidity: number[] }> = {};
        for (const row of data) {
          const day = row.day_of_incubation;
          if (!dayGroups[day]) dayGroups[day] = { temps: [], humidity: [] };
          const temp = Number(row.temp_avg_overall || row.temperature || 0);
          const humid = Number(row.humidity || 0);
          if (temp > 0) dayGroups[day].temps.push(temp);
          if (humid > 0) dayGroups[day].humidity.push(humid);
        }
        
        const metrics = Object.entries(dayGroups).map(([day, data]) => ({
          day_of_incubation: Number(day),
          reading_count: data.temps.length,
          avg_temperature: data.temps.length > 0 ? (data.temps.reduce((a, b) => a + b, 0) / data.temps.length).toFixed(1) : null,
          min_temperature: data.temps.length > 0 ? Math.min(...data.temps).toFixed(1) : null,
          max_temperature: data.temps.length > 0 ? Math.max(...data.temps).toFixed(1) : null,
          avg_humidity: data.humidity.length > 0 ? (data.humidity.reduce((a, b) => a + b, 0) / data.humidity.length).toFixed(1) : null
        })).sort((a, b) => a.day_of_incubation - b.day_of_incubation);
        
        console.log('[get_incubation_day_metrics]', { days: metrics.length });
        return { type: 'incubation_day_metrics', message: `Metrics for ${metrics.length} incubation days`, data: metrics };
      }

      case "get_breed_comparison": {
        const daysBack = parameters.days_back || 90;
        
        const startDate = getDateRange(daysBack);
        
        const { data, error } = await supabase
          .from('batches')
          .select(`
            id, total_eggs_set, chicks_hatched,
            flocks!inner(breed),
            residue_analysis!left(early_dead, mid_dead, late_dead, sample_size)
          `)
          .gte('set_date', startDate);
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
          return { type: 'breed_comparison', message: 'No breed data found', data: [] };
        }
        
        const breedGroups: Record<string, any> = {};
        for (const batch of data) {
          const breed = (batch as any).flocks?.breed || 'Unknown';
          if (!breedGroups[breed]) {
            breedGroups[breed] = { breed, batches: 0, eggs: 0, chicks: 0, mortality_sum: 0, sample_sum: 0 };
          }
          breedGroups[breed].batches++;
          breedGroups[breed].eggs += batch.total_eggs_set || 0;
          breedGroups[breed].chicks += batch.chicks_hatched || 0;
          
          const ra = (batch as any).residue_analysis;
          if (ra) {
            const mortality = (ra.early_dead || 0) + (ra.mid_dead || 0) + (ra.late_dead || 0);
            breedGroups[breed].mortality_sum += mortality;
            breedGroups[breed].sample_sum += ra.sample_size || 648;
          }
        }
        
        const comparison = Object.values(breedGroups).map((g: any) => ({
          breed: g.breed,
          batch_count: g.batches,
          total_eggs: g.eggs,
          total_chicks: g.chicks,
          hatch_percent: g.eggs > 0 ? ((g.chicks / g.eggs) * 100).toFixed(1) : null,
          avg_mortality_pct: g.sample_sum > 0 ? ((g.mortality_sum / g.sample_sum) * 100).toFixed(2) : null
        }));
        
        console.log('[get_breed_comparison]', { breeds: comparison.length });
        return { type: 'breed_comparison', message: `Comparison across ${comparison.length} breeds`, data: comparison };
      }

      case "get_age_based_analysis": {
        const daysBack = parameters.days_back || 90;
        const minAge = parameters.min_age_weeks || 0;
        const maxAge = parameters.max_age_weeks || 100;
        
        const startDate = getDateRange(daysBack);
        
        const { data, error } = await supabase
          .from('batches')
          .select(`
            id, total_eggs_set, chicks_hatched, set_date,
            flocks!inner(age_weeks),
            residue_analysis!left(hatch_percent, hof_percent)
          `)
          .gte('set_date', startDate);
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
          return { type: 'age_based_analysis', message: 'No age data found', data: [] };
        }
        
        const ageGroups: Record<number, any> = {};
        for (const batch of data) {
          const age = (batch as any).flocks?.age_weeks || 0;
          if (age < minAge || age > maxAge) continue;
          
          if (!ageGroups[age]) {
            ageGroups[age] = { age_weeks: age, batches: 0, eggs: 0, chicks: 0, hatch_sum: 0, hatch_count: 0 };
          }
          ageGroups[age].batches++;
          ageGroups[age].eggs += batch.total_eggs_set || 0;
          ageGroups[age].chicks += batch.chicks_hatched || 0;
          
          const ra = (batch as any).residue_analysis;
          if (ra?.hatch_percent) {
            ageGroups[age].hatch_sum += Number(ra.hatch_percent);
            ageGroups[age].hatch_count++;
          }
        }
        
        const analysis = Object.values(ageGroups).map((g: any) => ({
          age_weeks: g.age_weeks,
          batch_count: g.batches,
          total_eggs: g.eggs,
          total_chicks: g.chicks,
          calculated_hatch_pct: g.eggs > 0 ? ((g.chicks / g.eggs) * 100).toFixed(1) : null,
          avg_recorded_hatch_pct: g.hatch_count > 0 ? (g.hatch_sum / g.hatch_count).toFixed(1) : null
        })).sort((a, b) => a.age_weeks - b.age_weeks);
        
        // Find optimal age range
        const bestAge = analysis.reduce((best, curr) => {
          const currHatch = Number(curr.calculated_hatch_pct) || 0;
          const bestHatch = Number(best?.calculated_hatch_pct) || 0;
          return currHatch > bestHatch ? curr : best;
        }, analysis[0]);
        
        console.log('[get_age_based_analysis]', { ages: analysis.length });
        return { 
          type: 'age_based_analysis', 
          message: `Analysis across ${analysis.length} age groups`,
          optimal_age: bestAge?.age_weeks,
          data: analysis 
        };
      }

      case "get_critical_windows_status": {
        const today = new Date();
        const includeCompleted = parameters.include_completed || false;
        
        const { data: batches, error } = await supabase
          .from('batches')
          .select(`
            id, batch_number, set_date, status, expected_hatch_date,
            flocks(flock_name),
            machines(machine_number),
            qa_monitoring(candling_results)
          `)
          .in('status', ['in_setter', 'in_hatcher', ...(includeCompleted ? ['completed'] : [])]);
        
        if (error) throw error;
        
        if (!batches || batches.length === 0) {
          return { type: 'critical_windows_status', message: 'No active batches found', data: [] };
        }
        
        const windows = batches.map((b: any) => {
          const setDate = new Date(b.set_date);
          const daysSinceSet = Math.floor((today.getTime() - setDate.getTime()) / (1000 * 60 * 60 * 24));
          
          const hasCandling = (b.qa_monitoring || []).some((qa: any) => qa.candling_results);
          
          let window_type = null;
          let action_required = false;
          let is_overdue = false;
          
          if (daysSinceSet >= 10 && daysSinceSet <= 13) {
            window_type = 'candling';
            action_required = !hasCandling;
          } else if (daysSinceSet >= 14 && daysSinceSet <= 15 && !hasCandling) {
            window_type = 'candling';
            action_required = true;
            is_overdue = true;
          } else if (daysSinceSet === 18 || (daysSinceSet >= 17 && daysSinceSet <= 19)) {
            window_type = 'transfer';
            action_required = b.status === 'in_setter';
            is_overdue = daysSinceSet > 18 && b.status === 'in_setter';
          } else if (daysSinceSet >= 20 && daysSinceSet <= 22) {
            window_type = 'hatch';
            action_required = b.status === 'in_hatcher';
            is_overdue = daysSinceSet > 21;
          }
          
          return {
            batch_id: b.id,
            batch_number: b.batch_number,
            flock_name: b.flocks?.flock_name || 'Unknown',
            machine: b.machines?.machine_number || 'N/A',
            status: b.status,
            days_since_set: daysSinceSet,
            window_type,
            action_required,
            is_overdue
          };
        }).filter(w => w.window_type !== null || parameters.window_type === undefined);
        
        if (parameters.window_type) {
          const filtered = windows.filter(w => w.window_type === parameters.window_type);
          return { type: 'critical_windows_status', message: `${parameters.window_type} windows: ${filtered.length}`, data: filtered };
        }
        
        const summary = {
          candling: windows.filter(w => w.window_type === 'candling').length,
          transfer: windows.filter(w => w.window_type === 'transfer').length,
          hatch: windows.filter(w => w.window_type === 'hatch').length,
          overdue: windows.filter(w => w.is_overdue).length,
          action_required: windows.filter(w => w.action_required).length
        };
        
        console.log('[get_critical_windows_status]', summary);
        return { type: 'critical_windows_status', message: `Found ${windows.length} batches in critical windows`, summary, data: windows };
      }

      case "get_residue_characteristics": {
        const daysBack = parameters.days_back || 60;
        const limit = parameters.limit || 100;
        
        const startDate = getDateRange(daysBack);
        
        const { data, error } = await supabase
          .from('residue_analysis')
          .select(`
            id, batch_id, analysis_date, sample_size,
            brain_defects, dry_egg, malpositioned, upside_down,
            transfer_crack, mold, abnormal, handling_cracks,
            batches!left(batch_number, unit_id, units:unit_id(name))
          `)
          .gte('analysis_date', startDate)
          .order('analysis_date', { ascending: false })
          .limit(limit);
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
          return { type: 'residue_characteristics', message: 'No residue characteristics found', data: [] };
        }
        
        const enriched = data.map((d: any) => {
          const sampleSize = d.sample_size || 648;
          return {
            ...d,
            batch_number: d.batches?.batch_number || 'Unknown',
            hatchery: d.batches?.units?.name || 'Unknown',
            brain_defects_pct: d.brain_defects ? ((d.brain_defects / sampleSize) * 100).toFixed(2) : '0',
            dry_egg_pct: d.dry_egg ? ((d.dry_egg / sampleSize) * 100).toFixed(2) : '0',
            malpositioned_pct: d.malpositioned ? ((d.malpositioned / sampleSize) * 100).toFixed(2) : '0',
            upside_down_pct: d.upside_down ? ((d.upside_down / sampleSize) * 100).toFixed(2) : '0',
            transfer_crack_pct: d.transfer_crack ? ((d.transfer_crack / sampleSize) * 100).toFixed(2) : '0',
            mold_pct: d.mold ? ((d.mold / sampleSize) * 100).toFixed(2) : '0',
            abnormal_pct: d.abnormal ? ((d.abnormal / sampleSize) * 100).toFixed(2) : '0'
          };
        });
        
        // Aggregate totals
        const totals = {
          brain_defects: enriched.reduce((sum, e) => sum + (e.brain_defects || 0), 0),
          dry_egg: enriched.reduce((sum, e) => sum + (e.dry_egg || 0), 0),
          malpositioned: enriched.reduce((sum, e) => sum + (e.malpositioned || 0), 0),
          upside_down: enriched.reduce((sum, e) => sum + (e.upside_down || 0), 0),
          transfer_crack: enriched.reduce((sum, e) => sum + (e.transfer_crack || 0), 0),
          mold: enriched.reduce((sum, e) => sum + (e.mold || 0), 0),
          abnormal: enriched.reduce((sum, e) => sum + (e.abnormal || 0), 0)
        };
        
        console.log('[get_residue_characteristics]', { records: enriched.length });
        return { type: 'residue_characteristics', message: `Found ${enriched.length} records with residue characteristics`, totals, data: enriched };
      }

      case "get_temperature_zone_variance": {
        const daysBack = parameters.days_back || 30;
        const threshold = parameters.threshold || 0.5;
        
        const startDate = getDateRange(daysBack);
        
        let query = supabase
          .from('qa_monitoring')
          .select(`
            id, machine_id, check_date, day_of_incubation,
            temp_avg_front, temp_avg_middle, temp_avg_back, temp_avg_overall,
            machines!left(machine_number, units:unit_id(name))
          `)
          .gte('check_date', startDate)
          .not('temp_avg_front', 'is', null)
          .not('temp_avg_back', 'is', null);
        
        if (parameters.machine_id) query = query.eq('machine_id', parameters.machine_id);
        
        const { data, error } = await query;
        if (error) throw error;
        
        if (!data || data.length === 0) {
          return { type: 'temperature_zone_variance', message: 'No zone temperature data found', data: [] };
        }
        
        const machineZones: Record<string, any> = {};
        for (const row of data) {
          const machineNum = (row as any).machines?.machine_number || 'Unknown';
          const front = Number(row.temp_avg_front || 0);
          const middle = Number(row.temp_avg_middle || 0);
          const back = Number(row.temp_avg_back || 0);
          
          if (!machineZones[machineNum]) {
            machineZones[machineNum] = {
              machine: machineNum,
              hatchery: (row as any).machines?.units?.name || 'Unknown',
              readings: 0,
              front_temps: [],
              middle_temps: [],
              back_temps: [],
              variances: []
            };
          }
          
          machineZones[machineNum].readings++;
          machineZones[machineNum].front_temps.push(front);
          machineZones[machineNum].middle_temps.push(middle);
          machineZones[machineNum].back_temps.push(back);
          
          const variance = Math.max(front, middle, back) - Math.min(front, middle, back);
          machineZones[machineNum].variances.push(variance);
        }
        
        const analysis = Object.values(machineZones).map((m: any) => {
          const avgFront = m.front_temps.reduce((a: number, b: number) => a + b, 0) / m.front_temps.length;
          const avgMiddle = m.middle_temps.reduce((a: number, b: number) => a + b, 0) / m.middle_temps.length;
          const avgBack = m.back_temps.reduce((a: number, b: number) => a + b, 0) / m.back_temps.length;
          const avgVariance = m.variances.reduce((a: number, b: number) => a + b, 0) / m.variances.length;
          const maxVariance = Math.max(...m.variances);
          
          return {
            machine: m.machine,
            hatchery: m.hatchery,
            reading_count: m.readings,
            avg_front: avgFront.toFixed(1),
            avg_middle: avgMiddle.toFixed(1),
            avg_back: avgBack.toFixed(1),
            avg_zone_variance: avgVariance.toFixed(2),
            max_zone_variance: maxVariance.toFixed(2),
            has_issues: avgVariance > threshold,
            hottest_zone: avgFront >= avgMiddle && avgFront >= avgBack ? 'front' : (avgMiddle >= avgBack ? 'middle' : 'back'),
            coldest_zone: avgFront <= avgMiddle && avgFront <= avgBack ? 'front' : (avgMiddle <= avgBack ? 'middle' : 'back')
          };
        });
        
        const issueCount = analysis.filter(a => a.has_issues).length;
        
        console.log('[get_temperature_zone_variance]', { machines: analysis.length, issues: issueCount });
        return { 
          type: 'temperature_zone_variance', 
          message: `Zone variance for ${analysis.length} machines (${issueCount} with issues)`,
          threshold,
          data: analysis 
        };
      }

      case "get_angle_performance": {
        const daysBack = parameters.days_back || 30;
        const optimalAngle = parameters.optimal_angle || 45;
        const tolerance = parameters.tolerance || 5;
        
        const startDate = getDateRange(daysBack);
        
        let query = supabase
          .from('qa_monitoring')
          .select(`
            id, machine_id, check_date, day_of_incubation,
            angle_top_left, angle_mid_left, angle_bottom_left,
            angle_top_right, angle_mid_right, angle_bottom_right,
            machines!left(machine_number)
          `)
          .gte('check_date', startDate);
        
        if (parameters.machine_id) query = query.eq('machine_id', parameters.machine_id);
        
        const { data, error } = await query;
        if (error) throw error;
        
        if (!data || data.length === 0) {
          return { type: 'angle_performance', message: 'No angle data found', data: [] };
        }
        
        const machineAngles: Record<string, any> = {};
        const angleFields = ['angle_top_left', 'angle_mid_left', 'angle_bottom_left', 'angle_top_right', 'angle_mid_right', 'angle_bottom_right'];
        
        for (const row of data) {
          const machineNum = (row as any).machines?.machine_number || 'Unknown';
          
          if (!machineAngles[machineNum]) {
            machineAngles[machineNum] = { machine: machineNum, readings: 0, angles: [], deviations: [] };
          }
          
          for (const field of angleFields) {
            const angle = (row as any)[field];
            if (angle !== null && angle !== undefined) {
              machineAngles[machineNum].angles.push(Number(angle));
              machineAngles[machineNum].deviations.push(Math.abs(Number(angle) - optimalAngle));
            }
          }
          machineAngles[machineNum].readings++;
        }
        
        const analysis = Object.values(machineAngles).map((m: any) => {
          const avgAngle = m.angles.length > 0 ? m.angles.reduce((a: number, b: number) => a + b, 0) / m.angles.length : null;
          const avgDeviation = m.deviations.length > 0 ? m.deviations.reduce((a: number, b: number) => a + b, 0) / m.deviations.length : null;
          const maxDeviation = m.deviations.length > 0 ? Math.max(...m.deviations) : null;
          const withinTolerance = m.deviations.filter((d: number) => d <= tolerance).length;
          
          return {
            machine: m.machine,
            reading_count: m.readings,
            angle_measurements: m.angles.length,
            avg_angle: avgAngle?.toFixed(1),
            avg_deviation: avgDeviation?.toFixed(1),
            max_deviation: maxDeviation?.toFixed(1),
            within_tolerance_pct: m.angles.length > 0 ? ((withinTolerance / m.angles.length) * 100).toFixed(1) : null,
            needs_attention: avgDeviation !== null && avgDeviation > tolerance
          };
        });
        
        const needsAttention = analysis.filter(a => a.needs_attention).length;
        
        console.log('[get_angle_performance]', { machines: analysis.length, needsAttention });
        return { 
          type: 'angle_performance', 
          message: `Angle analysis for ${analysis.length} machines`,
          optimal_angle: optimalAngle,
          tolerance,
          machines_needing_attention: needsAttention,
          data: analysis 
        };
      }

      case "get_humidity_analysis": {
        const daysBack = parameters.days_back || 30;
        const targetHumidity = parameters.target_humidity || 55;
        const groupBy = parameters.group_by || 'machine';
        
        const startDate = getDateRange(daysBack);
        
        let query = supabase
          .from('qa_monitoring')
          .select(`
            id, machine_id, check_date, day_of_incubation, humidity,
            machines!left(machine_number, units:unit_id(name))
          `)
          .gte('check_date', startDate)
          .not('humidity', 'is', null);
        
        if (parameters.machine_id) query = query.eq('machine_id', parameters.machine_id);
        
        const { data, error } = await query;
        if (error) throw error;
        
        if (!data || data.length === 0) {
          return { type: 'humidity_analysis', message: 'No humidity data found', data: [] };
        }
        
        if (groupBy === 'day_of_incubation') {
          const dayGroups: Record<number, number[]> = {};
          for (const row of data) {
            const day = row.day_of_incubation || 0;
            if (!dayGroups[day]) dayGroups[day] = [];
            dayGroups[day].push(Number(row.humidity));
          }
          
          const analysis = Object.entries(dayGroups).map(([day, values]) => ({
            day_of_incubation: Number(day),
            reading_count: values.length,
            avg_humidity: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1),
            min_humidity: Math.min(...values).toFixed(1),
            max_humidity: Math.max(...values).toFixed(1),
            deviation_from_target: ((values.reduce((a, b) => a + b, 0) / values.length) - targetHumidity).toFixed(1)
          })).sort((a, b) => a.day_of_incubation - b.day_of_incubation);
          
          return { type: 'humidity_analysis', message: `Humidity by incubation day`, target: targetHumidity, grouped: 'day_of_incubation', data: analysis };
        }
        
        // Default: group by machine
        const machineGroups: Record<string, { machine: string; hatchery: string; values: number[] }> = {};
        for (const row of data) {
          const machine = (row as any).machines?.machine_number || 'Unknown';
          if (!machineGroups[machine]) {
            machineGroups[machine] = {
              machine,
              hatchery: (row as any).machines?.units?.name || 'Unknown',
              values: []
            };
          }
          machineGroups[machine].values.push(Number(row.humidity));
        }
        
        const analysis = Object.values(machineGroups).map(m => {
          const avg = m.values.reduce((a, b) => a + b, 0) / m.values.length;
          return {
            machine: m.machine,
            hatchery: m.hatchery,
            reading_count: m.values.length,
            avg_humidity: avg.toFixed(1),
            min_humidity: Math.min(...m.values).toFixed(1),
            max_humidity: Math.max(...m.values).toFixed(1),
            deviation_from_target: (avg - targetHumidity).toFixed(1),
            within_range: Math.abs(avg - targetHumidity) <= 5
          };
        });
        
        console.log('[get_humidity_analysis]', { machines: analysis.length });
        return { type: 'humidity_analysis', message: `Humidity analysis for ${analysis.length} machines`, target: targetHumidity, data: analysis };
      }

      case "get_overall_kpis": {
        const daysBack = parameters.days_back || 30;
        
        const startDate = getDateRange(daysBack);
        
        // Parallel fetch all data
        const [batchesRes, alertsRes, machinesRes, residueRes] = await Promise.all([
          supabase.from('batches').select('id, status, total_eggs_set, chicks_hatched, eggs_injected, unit_id').gte('set_date', startDate),
          supabase.from('alerts').select('id, status, severity').eq('status', 'active'),
          supabase.from('machines').select('id, capacity, status'),
          supabase.from('residue_analysis').select('hatch_percent, hof_percent, hoi_percent').gte('analysis_date', startDate)
        ]);
        
        const batches = batchesRes.data || [];
        const alerts = alertsRes.data || [];
        const machines = machinesRes.data || [];
        const residue = residueRes.data || [];
        
        const totalEggs = batches.reduce((sum, b) => sum + (b.total_eggs_set || 0), 0);
        const totalChicks = batches.reduce((sum, b) => sum + (b.chicks_hatched || 0), 0);
        const totalInjected = batches.reduce((sum, b) => sum + (b.eggs_injected || 0), 0);
        
        const activeBatches = batches.filter(b => ['in_setter', 'in_hatcher'].includes(b.status));
        const totalCapacity = machines.reduce((sum, m) => sum + (m.capacity || 0), 0);
        const activeLoad = activeBatches.reduce((sum, b) => sum + (b.total_eggs_set || 0), 0);
        
        const avgHatch = residue.length > 0 
          ? residue.reduce((sum, r) => sum + Number(r.hatch_percent || 0), 0) / residue.length 
          : (totalEggs > 0 ? (totalChicks / totalEggs) * 100 : 0);
        
        const avgHOF = residue.filter(r => r.hof_percent).length > 0
          ? residue.reduce((sum, r) => sum + Number(r.hof_percent || 0), 0) / residue.filter(r => r.hof_percent).length
          : 0;
        
        const avgHOI = residue.filter(r => r.hoi_percent).length > 0
          ? residue.reduce((sum, r) => sum + Number(r.hoi_percent || 0), 0) / residue.filter(r => r.hoi_percent).length
          : (totalInjected > 0 ? (totalChicks / totalInjected) * 100 : 0);
        
        const kpis = {
          period_days: daysBack,
          total_batches: batches.length,
          active_batches: activeBatches.length,
          total_eggs_set: totalEggs,
          total_chicks_hatched: totalChicks,
          overall_hatch_percent: avgHatch.toFixed(1),
          avg_hof_percent: avgHOF.toFixed(1),
          avg_hoi_percent: avgHOI.toFixed(1),
          total_machines: machines.length,
          total_capacity: totalCapacity,
          current_utilization: totalCapacity > 0 ? ((activeLoad / totalCapacity) * 100).toFixed(1) : '0',
          active_alerts: alerts.length,
          critical_alerts: alerts.filter(a => a.severity === 'critical').length
        };
        
        console.log('[get_overall_kpis]', kpis);
        return { type: 'overall_kpis', message: 'Overall KPIs retrieved', data: kpis };
      }

      case "get_trend_analysis": {
        const metric = parameters.metric;
        const period = parameters.period || 'week';
        
        if (!metric) {
          return { error: 'Metric is required', valid_metrics: ['hatch_percent', 'fertility_percent', 'mortality', 'eggs_set', 'chicks_hatched'] };
        }
        
        const now = new Date();
        let currentStart: Date, currentEnd: Date, previousStart: Date, previousEnd: Date;
        
        if (period === 'week') {
          currentEnd = now;
          currentStart = new Date(now);
          currentStart.setDate(currentStart.getDate() - 7);
          previousEnd = new Date(currentStart);
          previousStart = new Date(previousEnd);
          previousStart.setDate(previousStart.getDate() - 7);
        } else if (period === 'month') {
          currentEnd = now;
          currentStart = new Date(now);
          currentStart.setMonth(currentStart.getMonth() - 1);
          previousEnd = new Date(currentStart);
          previousStart = new Date(previousEnd);
          previousStart.setMonth(previousStart.getMonth() - 1);
        } else {
          currentEnd = now;
          currentStart = new Date(now);
          currentStart.setMonth(currentStart.getMonth() - 3);
          previousEnd = new Date(currentStart);
          previousStart = new Date(previousEnd);
          previousStart.setMonth(previousStart.getMonth() - 3);
        }
        
        const [currentData, previousData] = await Promise.all([
          supabase.from('batches')
            .select('total_eggs_set, chicks_hatched, residue_analysis!left(hatch_percent, early_dead, mid_dead, late_dead, sample_size), fertility_analysis!left(fertility_percent)')
            .gte('set_date', currentStart.toISOString().split('T')[0])
            .lte('set_date', currentEnd.toISOString().split('T')[0]),
          supabase.from('batches')
            .select('total_eggs_set, chicks_hatched, residue_analysis!left(hatch_percent, early_dead, mid_dead, late_dead, sample_size), fertility_analysis!left(fertility_percent)')
            .gte('set_date', previousStart.toISOString().split('T')[0])
            .lte('set_date', previousEnd.toISOString().split('T')[0])
        ]);
        
        function calculateMetric(data: any[], metricName: string): number {
          if (!data || data.length === 0) return 0;
          
          if (metricName === 'hatch_percent') {
            const totalEggs = data.reduce((sum, b) => sum + (b.total_eggs_set || 0), 0);
            const totalChicks = data.reduce((sum, b) => sum + (b.chicks_hatched || 0), 0);
            return totalEggs > 0 ? (totalChicks / totalEggs) * 100 : 0;
          }
          if (metricName === 'fertility_percent') {
            const values = data.map(b => Number(b.fertility_analysis?.fertility_percent || 0)).filter(v => v > 0);
            return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
          }
          if (metricName === 'mortality') {
            let totalMortality = 0, totalSamples = 0;
            for (const b of data) {
              const ra = b.residue_analysis;
              if (ra) {
                totalMortality += (ra.early_dead || 0) + (ra.mid_dead || 0) + (ra.late_dead || 0);
                totalSamples += ra.sample_size || 648;
              }
            }
            return totalSamples > 0 ? (totalMortality / totalSamples) * 100 : 0;
          }
          if (metricName === 'eggs_set') {
            return data.reduce((sum, b) => sum + (b.total_eggs_set || 0), 0);
          }
          if (metricName === 'chicks_hatched') {
            return data.reduce((sum, b) => sum + (b.chicks_hatched || 0), 0);
          }
          return 0;
        }
        
        const currentValue = calculateMetric(currentData.data || [], metric);
        const previousValue = calculateMetric(previousData.data || [], metric);
        
        const change = previousValue !== 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0;
        const trend = change > 0 ? 'improving' : (change < 0 ? 'declining' : 'stable');
        
        console.log('[get_trend_analysis]', { metric, period, currentValue, previousValue, change });
        return {
          type: 'trend_analysis',
          message: `${metric} trend over ${period}`,
          metric,
          period,
          current_period: { start: currentStart.toISOString().split('T')[0], end: currentEnd.toISOString().split('T')[0], value: currentValue.toFixed(2), batches: currentData.data?.length || 0 },
          previous_period: { start: previousStart.toISOString().split('T')[0], end: previousEnd.toISOString().split('T')[0], value: previousValue.toFixed(2), batches: previousData.data?.length || 0 },
          change_percent: change.toFixed(1),
          trend,
          is_improvement: (metric === 'mortality' ? change < 0 : change > 0)
        };
      }

      case "get_top_bottom_performers": {
        const entityType = parameters.entity_type || 'flock';
        const metric = parameters.metric;
        const daysBack = parameters.days_back || 30;
        const topCount = parameters.top_count || 5;
        const bottomCount = parameters.bottom_count || 5;
        
        if (!metric) {
          return { error: 'Metric is required', valid_metrics: ['hatch_percent', 'fertility_percent', 'total_eggs', 'total_chicks'] };
        }
        
        const startDate = getDateRange(daysBack);
        
        if (entityType === 'flock') {
          const { data: flocks } = await supabase
            .from('flocks')
            .select(`
              id, flock_name, house_number,
              batches!inner(total_eggs_set, chicks_hatched, set_date)
            `);
          
          if (!flocks || flocks.length === 0) {
            return { type: 'top_bottom_performers', message: 'No flock data found', data: { top: [], bottom: [] } };
          }
          
          const flockMetrics = flocks.map((f: any) => {
            const batches = (f.batches || []).filter((b: any) => b.set_date >= startDate);
            const totalEggs = batches.reduce((sum: number, b: any) => sum + (b.total_eggs_set || 0), 0);
            const totalChicks = batches.reduce((sum: number, b: any) => sum + (b.chicks_hatched || 0), 0);
            
            let value = 0;
            if (metric === 'hatch_percent') value = totalEggs > 0 ? (totalChicks / totalEggs) * 100 : 0;
            else if (metric === 'total_eggs') value = totalEggs;
            else if (metric === 'total_chicks') value = totalChicks;
            
            return {
              entity: f.flock_name,
              entity_id: f.id,
              house: f.house_number,
              batch_count: batches.length,
              metric_value: value
            };
          }).filter(f => f.batch_count > 0);
          
          const sorted = flockMetrics.sort((a, b) => b.metric_value - a.metric_value);
          
          return {
            type: 'top_bottom_performers',
            message: `Top and bottom ${entityType}s by ${metric}`,
            metric,
            entity_type: entityType,
            data: {
              top: sorted.slice(0, topCount),
              bottom: sorted.slice(-bottomCount).reverse()
            }
          };
        }
        
        if (entityType === 'machine') {
          const { data: machines } = await supabase
            .from('machines')
            .select(`
              id, machine_number, machine_type,
              batches!inner(total_eggs_set, chicks_hatched, set_date)
            `);
          
          if (!machines || machines.length === 0) {
            return { type: 'top_bottom_performers', message: 'No machine data found', data: { top: [], bottom: [] } };
          }
          
          const machineMetrics = machines.map((m: any) => {
            const batches = (m.batches || []).filter((b: any) => b.set_date >= startDate);
            const totalEggs = batches.reduce((sum: number, b: any) => sum + (b.total_eggs_set || 0), 0);
            const totalChicks = batches.reduce((sum: number, b: any) => sum + (b.chicks_hatched || 0), 0);
            
            let value = 0;
            if (metric === 'hatch_percent') value = totalEggs > 0 ? (totalChicks / totalEggs) * 100 : 0;
            else if (metric === 'total_eggs') value = totalEggs;
            else if (metric === 'total_chicks') value = totalChicks;
            
            return {
              entity: m.machine_number,
              entity_id: m.id,
              machine_type: m.machine_type,
              batch_count: batches.length,
              metric_value: value
            };
          }).filter(m => m.batch_count > 0);
          
          const sorted = machineMetrics.sort((a, b) => b.metric_value - a.metric_value);
          
          return {
            type: 'top_bottom_performers',
            message: `Top and bottom ${entityType}s by ${metric}`,
            metric,
            entity_type: entityType,
            data: {
              top: sorted.slice(0, topCount),
              bottom: sorted.slice(-bottomCount).reverse()
            }
          };
        }
        
        // Hatchery
        const { data: units } = await supabase
          .from('units')
          .select(`
            id, name, code,
            batches!inner(total_eggs_set, chicks_hatched, set_date)
          `);
        
        if (!units || units.length === 0) {
          return { type: 'top_bottom_performers', message: 'No hatchery data found', data: { top: [], bottom: [] } };
        }
        
        const unitMetrics = units.map((u: any) => {
          const batches = (u.batches || []).filter((b: any) => b.set_date >= startDate);
          const totalEggs = batches.reduce((sum: number, b: any) => sum + (b.total_eggs_set || 0), 0);
          const totalChicks = batches.reduce((sum: number, b: any) => sum + (b.chicks_hatched || 0), 0);
          
          let value = 0;
          if (metric === 'hatch_percent') value = totalEggs > 0 ? (totalChicks / totalEggs) * 100 : 0;
          else if (metric === 'total_eggs') value = totalEggs;
          else if (metric === 'total_chicks') value = totalChicks;
          
          return {
            entity: u.name,
            entity_id: u.id,
            code: u.code,
            batch_count: batches.length,
            metric_value: value
          };
        }).filter(u => u.batch_count > 0);
        
        const sorted = unitMetrics.sort((a, b) => b.metric_value - a.metric_value);
        
        console.log('[get_top_bottom_performers]', { entityType, metric, count: sorted.length });
        return {
          type: 'top_bottom_performers',
          message: `Top and bottom ${entityType}s by ${metric}`,
          metric,
          entity_type: entityType,
          data: {
            top: sorted.slice(0, topCount),
            bottom: sorted.slice(-bottomCount).reverse()
          }
        };
      }

      case "get_anomaly_detection": {
        const metric = parameters.metric;
        const daysBack = parameters.days_back || 30;
        const sensitivity = parameters.sensitivity || 2;
        const limit = parameters.limit || 20;
        
        if (!metric) {
          return { error: 'Metric is required', valid_metrics: ['temperature', 'humidity', 'hatch_percent', 'fertility_percent', 'mortality'] };
        }
        
        const startDate = getDateRange(daysBack);
        
        let values: { id: string; value: number; label: string; date: string }[] = [];
        
        if (metric === 'temperature' || metric === 'humidity') {
          const { data } = await supabase
            .from('qa_monitoring')
            .select(`
              id, check_date, ${metric === 'temperature' ? 'temp_avg_overall, temperature' : 'humidity'},
              batches!left(batch_number)
            `)
            .gte('check_date', startDate);
          
          values = (data || []).map((d: any) => ({
            id: d.id,
            value: Number(metric === 'temperature' ? (d.temp_avg_overall || d.temperature) : d.humidity) || 0,
            label: d.batches?.batch_number || 'Unknown',
            date: d.check_date
          })).filter(v => v.value > 0);
        } else if (metric === 'hatch_percent') {
          const { data } = await supabase
            .from('batches')
            .select('id, batch_number, set_date, total_eggs_set, chicks_hatched')
            .gte('set_date', startDate)
            .gt('total_eggs_set', 0);
          
          values = (data || []).map(d => ({
            id: d.id,
            value: (d.chicks_hatched / d.total_eggs_set) * 100,
            label: d.batch_number,
            date: d.set_date
          }));
        }
        
        if (values.length < 3) {
          return { type: 'anomaly_detection', message: 'Insufficient data for anomaly detection', anomalies: [] };
        }
        
        const numericValues = values.map(v => v.value);
        const mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
        const stdDev = calculateStdDev(numericValues);
        
        const anomalies = values
          .filter(v => Math.abs(v.value - mean) > sensitivity * stdDev)
          .map(v => ({
            ...v,
            deviation: ((v.value - mean) / stdDev).toFixed(2),
            direction: v.value > mean ? 'high' : 'low',
            severity: Math.abs(v.value - mean) > 3 * stdDev ? 'critical' : 'warning'
          }))
          .slice(0, limit);
        
        console.log('[get_anomaly_detection]', { metric, total: values.length, anomalies: anomalies.length });
        return {
          type: 'anomaly_detection',
          message: `Found ${anomalies.length} anomalies in ${metric}`,
          metric,
          statistics: {
            mean: mean.toFixed(2),
            std_dev: stdDev.toFixed(2),
            threshold: (sensitivity * stdDev).toFixed(2),
            total_records: values.length
          },
          anomalies
        };
      }

      // ============ NEW TOOL IMPLEMENTATIONS - Phase 3: Reports ============
      
      case "get_comparison_report": {
        const entityType = parameters.entity_type;
        const entity1 = parameters.entity1_id;
        const entity2 = parameters.entity2_id;
        
        if (!entityType) {
          return { error: 'entity_type is required', valid_types: ['hatchery', 'flock', 'machine', 'period'] };
        }
        
        if (entityType === 'period') {
          // Compare two time periods
          const [period1Data, period2Data] = await Promise.all([
            supabase.from('batches')
              .select('total_eggs_set, chicks_hatched, residue_analysis!left(hatch_percent, hof_percent)')
              .gte('set_date', entity1 || getDateRange(60))
              .lte('set_date', entity2 || getDateRange(30)),
            supabase.from('batches')
              .select('total_eggs_set, chicks_hatched, residue_analysis!left(hatch_percent, hof_percent)')
              .gte('set_date', entity2 || getDateRange(30))
          ]);
          
          const p1 = period1Data.data || [];
          const p2 = period2Data.data || [];
          
          const p1Eggs = p1.reduce((sum, b) => sum + (b.total_eggs_set || 0), 0);
          const p1Chicks = p1.reduce((sum, b) => sum + (b.chicks_hatched || 0), 0);
          const p2Eggs = p2.reduce((sum, b) => sum + (b.total_eggs_set || 0), 0);
          const p2Chicks = p2.reduce((sum, b) => sum + (b.chicks_hatched || 0), 0);
          
          return {
            type: 'comparison_report',
            message: 'Period comparison report',
            entity_type: 'period',
            comparison: {
              period1: { batches: p1.length, eggs: p1Eggs, chicks: p1Chicks, hatch_pct: p1Eggs > 0 ? ((p1Chicks / p1Eggs) * 100).toFixed(1) : '0' },
              period2: { batches: p2.length, eggs: p2Eggs, chicks: p2Chicks, hatch_pct: p2Eggs > 0 ? ((p2Chicks / p2Eggs) * 100).toFixed(1) : '0' },
              differences: {
                batches: p2.length - p1.length,
                eggs: p2Eggs - p1Eggs,
                chicks: p2Chicks - p1Chicks,
                hatch_pct_change: ((p2Eggs > 0 ? (p2Chicks / p2Eggs) : 0) - (p1Eggs > 0 ? (p1Chicks / p1Eggs) : 0)) * 100
              }
            }
          };
        }
        
        // Compare two entities
        const table = entityType === 'hatchery' ? 'units' : (entityType === 'flock' ? 'flocks' : 'machines');
        
        const [entity1Data, entity2Data] = await Promise.all([
          entity1 ? supabase.from(table).select('*, batches(total_eggs_set, chicks_hatched)').eq('id', entity1).single() : Promise.resolve({ data: null }),
          entity2 ? supabase.from(table).select('*, batches(total_eggs_set, chicks_hatched)').eq('id', entity2).single() : Promise.resolve({ data: null })
        ]);
        
        function summarizeEntity(entity: any) {
          if (!entity) return null;
          const batches = entity.batches || [];
          const eggs = batches.reduce((sum: number, b: any) => sum + (b.total_eggs_set || 0), 0);
          const chicks = batches.reduce((sum: number, b: any) => sum + (b.chicks_hatched || 0), 0);
          return {
            name: entity.name || entity.flock_name || entity.machine_number,
            batches: batches.length,
            total_eggs: eggs,
            total_chicks: chicks,
            hatch_percent: eggs > 0 ? ((chicks / eggs) * 100).toFixed(1) : '0'
          };
        }
        
        const summary1 = summarizeEntity(entity1Data.data);
        const summary2 = summarizeEntity(entity2Data.data);
        
        console.log('[get_comparison_report]', { entityType, entity1, entity2 });
        return {
          type: 'comparison_report',
          message: `Comparison between ${entityType}s`,
          entity_type: entityType,
          entity1: summary1,
          entity2: summary2,
          difference: summary1 && summary2 ? {
            batches: summary2.batches - summary1.batches,
            eggs: summary2.total_eggs - summary1.total_eggs,
            chicks: summary2.total_chicks - summary1.total_chicks,
            hatch_pct: (Number(summary2.hatch_percent) - Number(summary1.hatch_percent)).toFixed(1)
          } : null
        };
      }

      case "get_today_summary": {
        const today = new Date().toISOString().split('T')[0];
        
        const [batchesToday, transfersToday, alertsActive, scheduleDue] = await Promise.all([
          supabase.from('batches').select('id, batch_number, total_eggs_set, status').eq('set_date', today),
          supabase.from('machine_transfers').select('id, batch_id').eq('transfer_date', today),
          supabase.from('alerts').select('id, alert_type, severity').eq('status', 'active'),
          supabase.from('residue_analysis_schedule').select('id, batch_id').eq('due_date', today).eq('status', 'pending')
        ]);
        
        // Get expected hatches today
        const { data: hatchesToday } = await supabase
          .from('batches')
          .select('id, batch_number')
          .eq('expected_hatch_date', today)
          .in('status', ['in_hatcher']);
        
        // Get critical windows
        const { data: activeBatches } = await supabase
          .from('batches')
          .select('id, batch_number, set_date, status')
          .in('status', ['in_setter', 'in_hatcher']);
        
        const criticalWindows = { candling: 0, transfer: 0, hatch: 0 };
        for (const batch of activeBatches || []) {
          const setDate = new Date(batch.set_date);
          const daysSinceSet = Math.floor((new Date().getTime() - setDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysSinceSet >= 10 && daysSinceSet <= 13) criticalWindows.candling++;
          if (daysSinceSet >= 17 && daysSinceSet <= 19) criticalWindows.transfer++;
          if (daysSinceSet >= 20 && daysSinceSet <= 22) criticalWindows.hatch++;
        }
        
        const summary = {
          date: today,
          houses_set_today: batchesToday.data?.length || 0,
          eggs_set_today: (batchesToday.data || []).reduce((sum, b) => sum + (b.total_eggs_set || 0), 0),
          transfers_today: transfersToday.data?.length || 0,
          hatches_expected: hatchesToday?.length || 0,
          active_alerts: alertsActive.data?.length || 0,
          critical_alerts: (alertsActive.data || []).filter(a => a.severity === 'critical').length,
          residue_due_today: scheduleDue.data?.length || 0,
          critical_windows: criticalWindows
        };
        
        console.log('[get_today_summary]', summary);
        return { type: 'today_summary', message: "Today's operations summary", data: summary };
      }

      case "get_weekly_report": {
        const weekOffset = parameters.week_offset || 0;
        
        const now = new Date();
        const weekEnd = new Date(now);
        weekEnd.setDate(weekEnd.getDate() - (weekOffset * 7));
        const weekStart = new Date(weekEnd);
        weekStart.setDate(weekStart.getDate() - 7);
        
        const startStr = weekStart.toISOString().split('T')[0];
        const endStr = weekEnd.toISOString().split('T')[0];
        
        // Get previous week for comparison
        const prevWeekEnd = new Date(weekStart);
        const prevWeekStart = new Date(prevWeekEnd);
        prevWeekStart.setDate(prevWeekStart.getDate() - 7);
        
        const [currentWeek, prevWeek] = await Promise.all([
          supabase.from('batches').select('id, total_eggs_set, chicks_hatched, status').gte('set_date', startStr).lte('set_date', endStr),
          supabase.from('batches').select('id, total_eggs_set, chicks_hatched').gte('set_date', prevWeekStart.toISOString().split('T')[0]).lte('set_date', startStr)
        ]);
        
        const cw = currentWeek.data || [];
        const pw = prevWeek.data || [];
        
        const cwEggs = cw.reduce((sum, b) => sum + (b.total_eggs_set || 0), 0);
        const cwChicks = cw.reduce((sum, b) => sum + (b.chicks_hatched || 0), 0);
        const pwEggs = pw.reduce((sum, b) => sum + (b.total_eggs_set || 0), 0);
        const pwChicks = pw.reduce((sum, b) => sum + (b.chicks_hatched || 0), 0);
        
        const cwHatch = cwEggs > 0 ? (cwChicks / cwEggs) * 100 : 0;
        const pwHatch = pwEggs > 0 ? (pwChicks / pwEggs) * 100 : 0;
        
        const report = {
          week_start: startStr,
          week_end: endStr,
          current_week: {
            batches: cw.length,
            eggs_set: cwEggs,
            chicks_hatched: cwChicks,
            hatch_percent: cwHatch.toFixed(1),
            completed: cw.filter(b => b.status === 'completed').length
          },
          previous_week: {
            batches: pw.length,
            eggs_set: pwEggs,
            chicks_hatched: pwChicks,
            hatch_percent: pwHatch.toFixed(1)
          },
          week_over_week: {
            batches_change: cw.length - pw.length,
            eggs_change: cwEggs - pwEggs,
            chicks_change: cwChicks - pwChicks,
            hatch_change: (cwHatch - pwHatch).toFixed(1),
            trend: cwHatch > pwHatch ? 'improving' : (cwHatch < pwHatch ? 'declining' : 'stable')
          }
        };
        
        console.log('[get_weekly_report]', { week: startStr });
        return { type: 'weekly_report', message: `Weekly report for ${startStr} to ${endStr}`, data: report };
      }

      case "get_monthly_report": {
        const monthOffset = parameters.month_offset || 0;
        
        const now = new Date();
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - monthOffset + 1, 0);
        const monthStart = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
        
        const startStr = monthStart.toISOString().split('T')[0];
        const endStr = monthEnd.toISOString().split('T')[0];
        
        // Get previous month for comparison
        const prevMonthEnd = new Date(monthStart);
        prevMonthEnd.setDate(prevMonthEnd.getDate() - 1);
        const prevMonthStart = new Date(prevMonthEnd.getFullYear(), prevMonthEnd.getMonth(), 1);
        
        const [currentMonth, prevMonth, residueData] = await Promise.all([
          supabase.from('batches').select('id, total_eggs_set, chicks_hatched, eggs_injected, status, unit_id').gte('set_date', startStr).lte('set_date', endStr),
          supabase.from('batches').select('id, total_eggs_set, chicks_hatched').gte('set_date', prevMonthStart.toISOString().split('T')[0]).lte('set_date', prevMonthEnd.toISOString().split('T')[0]),
          supabase.from('residue_analysis').select('hatch_percent, hof_percent, hoi_percent, early_dead, mid_dead, late_dead, sample_size').gte('analysis_date', startStr).lte('analysis_date', endStr)
        ]);
        
        const cm = currentMonth.data || [];
        const pm = prevMonth.data || [];
        const rd = residueData.data || [];
        
        const cmEggs = cm.reduce((sum, b) => sum + (b.total_eggs_set || 0), 0);
        const cmChicks = cm.reduce((sum, b) => sum + (b.chicks_hatched || 0), 0);
        const cmInjected = cm.reduce((sum, b) => sum + (b.eggs_injected || 0), 0);
        const pmEggs = pm.reduce((sum, b) => sum + (b.total_eggs_set || 0), 0);
        const pmChicks = pm.reduce((sum, b) => sum + (b.chicks_hatched || 0), 0);
        
        // Calculate averages from residue data
        const avgHOF = rd.length > 0 ? rd.reduce((sum, r) => sum + Number(r.hof_percent || 0), 0) / rd.length : 0;
        const avgHOI = rd.length > 0 ? rd.reduce((sum, r) => sum + Number(r.hoi_percent || 0), 0) / rd.length : 0;
        
        let totalMortality = 0, totalSamples = 0;
        for (const r of rd) {
          totalMortality += (r.early_dead || 0) + (r.mid_dead || 0) + (r.late_dead || 0);
          totalSamples += r.sample_size || 648;
        }
        const avgMortality = totalSamples > 0 ? (totalMortality / totalSamples) * 100 : 0;
        
        const report = {
          month: `${monthStart.toLocaleString('default', { month: 'long' })} ${monthStart.getFullYear()}`,
          month_start: startStr,
          month_end: endStr,
          summary: {
            total_batches: cm.length,
            total_eggs_set: cmEggs,
            total_chicks_hatched: cmChicks,
            total_eggs_injected: cmInjected,
            overall_hatch_percent: cmEggs > 0 ? ((cmChicks / cmEggs) * 100).toFixed(1) : '0',
            avg_hof_percent: avgHOF.toFixed(1),
            avg_hoi_percent: avgHOI.toFixed(1),
            avg_mortality_percent: avgMortality.toFixed(2),
            completed_batches: cm.filter(b => b.status === 'completed').length,
            residue_analyses: rd.length
          },
          month_over_month: {
            batches_change: cm.length - pm.length,
            eggs_change: cmEggs - pmEggs,
            chicks_change: cmChicks - pmChicks,
            hatch_change: ((cmEggs > 0 ? (cmChicks / cmEggs) * 100 : 0) - (pmEggs > 0 ? (pmChicks / pmEggs) * 100 : 0)).toFixed(1)
          }
        };
        
        console.log('[get_monthly_report]', { month: report.month });
        return { type: 'monthly_report', message: `Monthly report for ${report.month}`, data: report };
      }

      default:
        return { error: `Unknown tool: ${toolName}` };
    }
  } catch (error) {
    console.error(`Error executing tool ${toolName}:`, error);
    return { error: `Failed to execute ${toolName}: ${(error as Error).message}` };
  }
}

// Extract structured data from tool results for chart generation
function extractStructuredDataFromTools(toolResults: any[]) {
  const charts: any[] = [];
  const metrics: any = {};

  for (const toolResult of toolResults) {
    try {
      const data = JSON.parse(toolResult.content);
      
      if (data.data && Array.isArray(data.data) && data.data.length > 0) {
        const firstItem = data.data[0];
        
        // Fertility/Hatch data
        if (firstItem.fertility_percent !== undefined || firstItem.hatch_percent !== undefined) {
          charts.push({
            type: 'bar',
            title: 'Fertility & Hatch Rates',
            data: data.data.slice(0, 10).map((item: any) => ({
              name: item.label || item.batch_number || item.flock || 'Unknown',
              fertility: Number(item.fertility_percent || 0),
              hatch: Number(item.hatch_percent || 0),
              hof: Number(item.hof_percent || 0)
            })),
            config: {
              xKey: 'name',
              bars: [
                { key: 'fertility', name: 'Fertility %', color: 'hsl(var(--chart-1))' },
                { key: 'hatch', name: 'Hatch %', color: 'hsl(var(--chart-2))' },
                { key: 'hof', name: 'HOF %', color: 'hsl(var(--chart-3))' }
              ]
            }
          });
        }
        
        // Temperature data
        if (firstItem.temperature !== undefined || firstItem.avg_temperature !== undefined) {
          charts.push({
            type: 'line',
            title: 'Temperature Trends',
            data: data.data.slice(0, 20).map((item: any) => ({
              name: item.house || item.machine || item.check_date || 'Unknown',
              temperature: Number(item.temperature || item.avg_temperature || 0)
            })),
            config: {
              xKey: 'name',
              lines: [{ key: 'temperature', name: 'Temperature °F', color: 'hsl(var(--chart-1))' }]
            }
          });
        }
      }
      
      // Extract KPI metrics
      if (data.type === 'overall_kpis' && data.data) {
        Object.assign(metrics, data.data);
      }
      
      if (data.analytics) {
        Object.assign(metrics, data.analytics.totals || {});
      }
      
    } catch (e) {
      console.error('Error extracting structured data:', e);
    }
  }

  return { charts, metrics };
}

// Generate enhanced fallback response
function generateEnhancedFallbackResponse(toolResults: any[], structuredData: any, isExecutive?: boolean) {
  let summary = 'Based on the retrieved data:\n\n';
  
  for (const toolResult of toolResults) {
    try {
      const data = JSON.parse(toolResult.content);
      
      if (data.message) {
        summary += `• ${data.message}\n`;
      }
      
      if (data.summary) {
        for (const [key, value] of Object.entries(data.summary)) {
          summary += `• ${key.replace(/_/g, ' ')}: ${value}\n`;
        }
      }
      
      if (data.analytics?.totals) {
        summary += `• Total batches: ${data.analytics.totals.count}\n`;
        summary += `• Total eggs set: ${data.analytics.totals.total_eggs_set?.toLocaleString()}\n`;
        summary += `• Average hatch rate: ${data.analytics.totals.avg_hatch_rate}%\n`;
      }
    } catch (e) {}
  }
  
  return {
    response: summary,
    timestamp: new Date().toISOString(),
    ...(structuredData || {})
  };
}

// Generate summary from response
async function generateSummary(response: any, toolResults: any[], isExecutive?: boolean) {
  const insights: string[] = [];
  
  for (const toolResult of toolResults) {
    try {
      const data = JSON.parse(toolResult.content);
      if (data.message) insights.push(data.message);
    } catch (e) {}
  }
  
  return {
    key_points: insights,
    generated_at: new Date().toISOString()
  };
}

// Chart generation functions
function generateEggStatusCharts(data: any[], preferredType?: string) {
  if (!data || data.length === 0) return null;
  
  const chartType = preferredType || 'bar';
  
  return {
    type: 'analytics',
    title: 'Egg Status Analysis',
    charts: [{
      type: chartType,
      title: 'Egg Status Breakdown',
      data: data.slice(0, 10),
      config: {
        xKey: 'name',
        bars: [
          { key: 'fertile', name: 'Fertile', color: 'hsl(var(--chart-1))' },
          { key: 'infertile', name: 'Infertile', color: 'hsl(var(--chart-2))' },
          { key: 'contaminated', name: 'Contaminated', color: 'hsl(var(--chart-3))' }
        ]
      }
    }]
  };
}

function generateBatchCharts(message: string, data: any, preferredType?: string) {
  if (!data || !data.batches) return null;
  
  const batchData = data.batches.slice(0, 10).map((b: any) => ({
    name: b.batch_number || 'Unknown',
    eggs: b.total_eggs_set || 0,
    chicks: b.chicks_hatched || 0,
    hatch_rate: b.total_eggs_set > 0 ? ((b.chicks_hatched / b.total_eggs_set) * 100) : 0
  }));
  
  return {
    type: 'analytics',
    title: 'Batch Overview',
    charts: [{
      type: preferredType || 'bar',
      title: 'Batch Performance',
      data: batchData,
      config: {
        xKey: 'name',
        bars: [
          { key: 'hatch_rate', name: 'Hatch Rate %', color: 'hsl(var(--chart-1))' }
        ]
      }
    }]
  };
}

function generateFertilityCharts(message: string, data: any[], preferredType?: string) {
  if (!data || data.length === 0) return null;
  
  const chartData = data.slice(0, 10).map(item => ({
    name: item.label || item.batch_number || 'Unknown',
    fertility: Number(item.fertility_percent || 0),
    hatch: Number(item.hatch_percent || 0),
    hof: Number(item.hof_percent || 0)
  }));
  
  return {
    type: 'analytics',
    title: 'Fertility Analysis',
    charts: [{
      type: preferredType || 'bar',
      title: 'Fertility Rates Comparison',
      data: chartData,
      config: {
        xKey: 'name',
        bars: [
          { key: 'fertility', name: 'Fertility %', color: 'hsl(var(--chart-1))' },
          { key: 'hatch', name: 'Hatch %', color: 'hsl(var(--chart-2))' },
          { key: 'hof', name: 'HOF %', color: 'hsl(var(--chart-3))' }
        ]
      }
    }]
  };
}

function generateMachineCharts(message: string, machines: any[], preferredType?: string) {
  if (!machines || machines.length === 0) return null;
  
  const machineData = machines.slice(0, 10).map(m => ({
    name: m.machine_number || 'Unknown',
    utilization: Number(m.utilization || 0),
    capacity: Number(m.capacity || 0)
  }));
  
  return {
    type: 'analytics',
    title: 'Machine Utilization',
    charts: [{
      type: preferredType || 'bar',
      title: 'Machine Utilization',
      data: machineData,
      config: {
        xKey: 'name',
        bars: [
          { key: 'utilization', name: 'Utilization %', color: 'hsl(var(--chart-1))' }
        ]
      }
    }]
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, context } = await req.json();
    console.log('AI Chat request:', { message, contextLength: context?.length });

    if (!openaiApiKey) {
      return new Response(JSON.stringify({
        error: 'OpenAI API key not configured',
        response: 'AI assistant is not configured. Please add your OpenAI API key.'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `You are a hatchery management AI assistant with access to comprehensive database tools covering ALL hatchery data.

AVAILABLE DATA RETRIEVAL TOOLS (47 total):
Core Operations:
- get_all_batches, get_batches_by_date_range, get_batch_info
- get_fertility_rates, get_machine_status, get_qa_alerts
- get_recent_activity, smart_retrieve
- get_egg_status_breakdown, get_house_temperatures

QA & Analysis:
- get_qa_performance (18-point temps, humidity, angles)
- get_moisture_loss_trends (weight tracking)
- get_specific_gravity_data (SG tests)
- get_egg_pack_quality (grades, defects)
- get_position_linkage (temp-to-flock mapping)

Performance Analytics:
- get_flock_performance (comprehensive flock metrics)
- get_machine_performance (machine analytics)
- get_hatchery_summary (hatchery-level KPIs)
- get_overall_kpis (dashboard summary)

Advanced Analytics:
- get_mortality_breakdown (early/mid/late dead)
- get_pip_analysis (live/dead pips)
- get_cull_analysis (cull tracking)
- get_incubation_day_metrics (day 0-21 curves)
- get_breed_comparison (breed performance)
- get_age_based_analysis (age correlation)
- get_critical_windows_status (candling/transfer/hatch)
- get_residue_characteristics (defects breakdown)
- get_temperature_zone_variance (hot/cold spots)
- get_angle_performance (setter angles)
- get_humidity_analysis (humidity patterns)
- get_trend_analysis (WoW/MoM trends)
- get_top_bottom_performers (rankings)
- get_anomaly_detection (outlier detection)

Operations Data:
- get_machine_transfers (transfer history)
- get_multi_setter_positions (zone/side/level)
- get_checklist_status (task completions)
- get_batch_history (status timeline)
- get_flock_changes (flock modifications)
- get_residue_schedule (scheduled analyses)
- get_house_allocations (machine allocations)
- get_custom_targets (performance targets)
- get_sop_procedures (SOP templates)
- get_alert_configs (alert settings)

Reports:
- get_comparison_report (entity comparisons)
- get_today_summary (today's snapshot)
- get_weekly_report (weekly summary)
- get_monthly_report (monthly summary)

When analyzing data:
1. Use the most appropriate tool for the question
2. Combine multiple tools for comprehensive analysis
3. Provide clear summaries with actionable insights
4. Always mention specific numbers and percentages
5. Terminology: "House" = batch, "Hatchery" = unit (DHN, SAM, TROY, ENT)`;

    const initialResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        tools: tools,
        tool_choice: 'auto',
        max_tokens: 4000,
      }),
    });

    if (!initialResponse.ok) {
      const errorText = await initialResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${initialResponse.status}`);
    }

    const initialData = await initialResponse.json();
    const assistantMessage = initialData.choices[0].message;

    // Process tool calls
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      const toolResults: any[] = [];

      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        const parameters = JSON.parse(toolCall.function.arguments || '{}');
        
        console.log(`Processing tool call: ${toolName}`);
        const result = await executeTool(toolName, parameters);
        
        toolResults.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          content: JSON.stringify(result)
        });
      }

      // Get final response with tool results
      const finalResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message },
            assistantMessage,
            ...toolResults
          ],
          max_tokens: 4000,
        }),
      });

      if (finalResponse.ok) {
        const finalData = await finalResponse.json();
        const finalText = finalData.choices[0].message.content;
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

      // Fallback if final call fails
      const structuredData = extractStructuredDataFromTools(toolResults);
      const fallbackResponse = generateEnhancedFallbackResponse(toolResults, structuredData);
      return new Response(JSON.stringify(fallbackResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // No tool calls needed
    return new Response(JSON.stringify({
      response: assistantMessage.content,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('AI Chat error:', error);
    return new Response(JSON.stringify({
      error: (error as Error).message,
      response: "I apologize, but I'm having trouble processing your request right now. Please try again."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
