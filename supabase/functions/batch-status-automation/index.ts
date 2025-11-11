import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AutomationRule {
  id: string;
  company_id: string;
  rule_name: string;
  from_status: string;
  to_status: string;
  min_days_after_set: number;
  requires_fertility_data: boolean;
  requires_residue_data: boolean;
  requires_qa_data: boolean;
  min_qa_checks_required: number;
  is_enabled: boolean;
}

interface Batch {
  id: string;
  batch_number: string;
  status: string;
  set_date: string;
  company_id: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { trigger } = await req.json().catch(() => ({ trigger: 'manual' }));
    
    console.log(`Batch status automation triggered: ${trigger}`);

    // Fetch all enabled automation rules
    const { data: rules, error: rulesError } = await supabase
      .from('batch_status_automation_rules')
      .select('*')
      .eq('is_enabled', true)
      .order('min_days_after_set', { ascending: true });

    if (rulesError) {
      console.error('Error fetching rules:', rulesError);
      throw rulesError;
    }

    console.log(`Found ${rules?.length || 0} enabled automation rules`);

    // Fetch batches that might need status updates
    const { data: batches, error: batchesError } = await supabase
      .from('batches')
      .select('id, batch_number, status, set_date, company_id')
      .in('status', ['setting', 'incubating', 'hatching']);

    if (batchesError) {
      console.error('Error fetching batches:', batchesError);
      throw batchesError;
    }

    console.log(`Processing ${batches?.length || 0} active batches`);

    let updatedCount = 0;
    const results = [];

    // Process each batch
    for (const batch of batches || []) {
      const daysSinceSet = Math.floor(
        (new Date().getTime() - new Date(batch.set_date).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Find applicable rules for this batch's current status
      const applicableRules = rules?.filter(
        (rule: AutomationRule) => 
          rule.from_status === batch.status &&
          rule.company_id === batch.company_id &&
          daysSinceSet >= rule.min_days_after_set
      ) || [];

      for (const rule of applicableRules) {
        // Check data requirements
        const dataValidation = await validateRequiredData(
          supabase,
          batch.id,
          rule.requires_fertility_data,
          rule.requires_residue_data,
          rule.requires_qa_data,
          rule.min_qa_checks_required
        );

        if (dataValidation.passed) {
          // Update batch status
          const { error: updateError } = await supabase
            .from('batches')
            .update({ status: rule.to_status })
            .eq('id', batch.id);

          if (updateError) {
            console.error(`Error updating batch ${batch.batch_number}:`, updateError);
            results.push({
              batch: batch.batch_number,
              success: false,
              error: updateError.message
            });
            continue;
          }

          // Log status change to history
          await supabase
            .from('batch_status_history')
            .insert({
              batch_id: batch.id,
              from_status: batch.status,
              to_status: rule.to_status,
              changed_by: null, // null indicates automatic change
              change_type: 'automatic',
              rule_applied: rule.rule_name,
              days_since_set: daysSinceSet,
              data_validation_passed: true,
              notes: `Automatically transitioned by rule: ${rule.rule_name}`
            });

          console.log(`Updated batch ${batch.batch_number}: ${batch.status} -> ${rule.to_status}`);
          updatedCount++;
          results.push({
            batch: batch.batch_number,
            from_status: batch.status,
            to_status: rule.to_status,
            rule: rule.rule_name,
            days_since_set: daysSinceSet,
            success: true
          });

          // Only apply first matching rule per batch
          break;
        } else {
          console.log(`Batch ${batch.batch_number} needs more data: ${dataValidation.reason}`);
          results.push({
            batch: batch.batch_number,
            status: batch.status,
            rule: rule.rule_name,
            success: false,
            reason: dataValidation.reason,
            days_since_set: daysSinceSet
          });
        }
      }
    }

    const response = {
      success: true,
      trigger,
      timestamp: new Date().toISOString(),
      batches_processed: batches?.length || 0,
      batches_updated: updatedCount,
      results
    };

    console.log('Automation complete:', response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in batch-status-automation:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function validateRequiredData(
  supabase: any,
  batchId: string,
  requiresFertility: boolean,
  requiresResidue: boolean,
  requiresQA: boolean,
  minQAChecks: number
): Promise<{ passed: boolean; reason?: string }> {
  // Check fertility data if required
  if (requiresFertility) {
    const { data: fertility } = await supabase
      .from('fertility_analysis')
      .select('id')
      .eq('batch_id', batchId)
      .limit(1);

    if (!fertility || fertility.length === 0) {
      return { passed: false, reason: 'Missing fertility analysis data' };
    }
  }

  // Check residue data if required
  if (requiresResidue) {
    const { data: residue } = await supabase
      .from('residue_analysis')
      .select('id')
      .eq('batch_id', batchId)
      .limit(1);

    if (!residue || residue.length === 0) {
      return { passed: false, reason: 'Missing residue analysis data' };
    }
  }

  // Check QA monitoring data if required
  if (requiresQA && minQAChecks > 0) {
    const { data: qaChecks, count } = await supabase
      .from('qa_monitoring')
      .select('id', { count: 'exact' })
      .eq('batch_id', batchId);

    if (!qaChecks || (count || 0) < minQAChecks) {
      return { 
        passed: false, 
        reason: `Insufficient QA checks (${count || 0}/${minQAChecks})` 
      };
    }
  }

  return { passed: true };
}
