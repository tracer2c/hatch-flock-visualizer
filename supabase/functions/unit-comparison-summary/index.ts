import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { selectedUnits, dateRange } = await req.json();
    
    console.log('Processing unit comparison summary for units:', selectedUnits);

    if (!selectedUnits || selectedUnits.length === 0) {
      return new Response(JSON.stringify({ error: 'No units selected' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch comprehensive data for selected units
    const fromDate = new Date(dateRange.from).toISOString();
    const toDate = new Date(dateRange.to).toISOString();

    const { data: batchData, error: batchError } = await supabase
      .from('batches')
      .select(`
        *,
        flock:flocks(
          breed,
          flock_number,
          house_number
        ),
        unit:units(
          name,
          id
        ),
        fertility_analysis(
          fertility_percent,
          hof_percent,
          clear_percent,
          analysis_date
        ),
        egg_pack_quality(
          quality_score,
          shell_quality,
          albumen_quality,
          yolk_quality
        ),
        qa_monitoring(
          temperature_celsius,
          humidity_percent,
          co2_ppm,
          recorded_at
        ),
        residue_analysis(
          residue_percent,
          analysis_date
        )
      `)
      .in('unit_id', selectedUnits)
      .gte('set_date', fromDate)
      .lte('set_date', toDate);

    if (batchError) {
      console.error('Error fetching batch data:', batchError);
      return new Response(JSON.stringify({ error: 'Failed to fetch batch data' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process and structure the data for AI analysis
    const unitSummary = selectedUnits.map(unitId => {
      const unitBatches = batchData?.filter(batch => batch.unit_id === unitId) || [];
      const unitName = unitBatches[0]?.unit?.name || `Unit ${unitId}`;
      
      // Calculate metrics
      const totalBatches = unitBatches.length;
      const completedBatches = unitBatches.filter(b => b.status === 'completed').length;
      
      const avgFertility = unitBatches.reduce((sum, batch) => {
        const fertility = batch.fertility_analysis?.[0]?.fertility_percent || 0;
        return sum + fertility;
      }, 0) / (unitBatches.length || 1);

      const avgHatch = unitBatches.reduce((sum, batch) => {
        const hatch = batch.fertility_analysis?.[0]?.hof_percent || 0;
        return sum + hatch;
      }, 0) / (unitBatches.length || 1);

      const avgQuality = unitBatches.reduce((sum, batch) => {
        const quality = batch.egg_pack_quality?.[0]?.quality_score || 0;
        return sum + quality;
      }, 0) / (unitBatches.length || 1);

      const avgResidue = unitBatches.reduce((sum, batch) => {
        const residue = batch.residue_analysis?.[0]?.residue_percent || 0;
        return sum + residue;
      }, 0) / (unitBatches.length || 1);

      // Environmental data
      const envData = unitBatches.flatMap(batch => batch.qa_monitoring || []);
      const avgTemp = envData.reduce((sum, qa) => sum + (qa.temperature_celsius || 0), 0) / (envData.length || 1);
      const avgHumidity = envData.reduce((sum, qa) => sum + (qa.humidity_percent || 0), 0) / (envData.length || 1);

      return {
        unitName,
        unitId,
        totalBatches,
        completedBatches,
        metrics: {
          fertilityPercent: Number(avgFertility.toFixed(2)),
          hatchPercent: Number(avgHatch.toFixed(2)),
          qualityScore: Number(avgQuality.toFixed(2)),
          residuePercent: Number(avgResidue.toFixed(2)),
          avgTemperature: Number(avgTemp.toFixed(1)),
          avgHumidity: Number(avgHumidity.toFixed(1))
        },
        recentBatches: unitBatches.slice(0, 3).map(batch => ({
          batchNumber: batch.batch_number,
          breed: batch.flock?.breed,
          status: batch.status,
          setDate: batch.set_date
        }))
      };
    });

    console.log('Unit summary prepared:', unitSummary);

    // Prepare data for GPT analysis
    const analysisPrompt = `As a hatchery performance analyst, analyze the following unit comparison data and provide insights:

UNITS ANALYZED: ${selectedUnits.length} units
DATE RANGE: ${fromDate.split('T')[0]} to ${toDate.split('T')[0]}

UNIT PERFORMANCE DATA:
${unitSummary.map(unit => `
UNIT: ${unit.unitName}
- Total Batches: ${unit.totalBatches} (${unit.completedBatches} completed)
- Fertility Rate: ${unit.metrics.fertilityPercent}%
- Hatch Rate: ${unit.metrics.hatchPercent}%
- Quality Score: ${unit.metrics.qualityScore}/100
- Residue Level: ${unit.metrics.residuePercent}%
- Avg Temperature: ${unit.metrics.avgTemperature}°C
- Avg Humidity: ${unit.metrics.avgHumidity}%
- Recent Batches: ${unit.recentBatches.map(b => `${b.batchNumber} (${b.breed}, ${b.status})`).join(', ')}
`).join('\n')}

Please provide:
1. **Performance Ranking**: Rank units from best to worst performing overall
2. **Key Insights**: Identify 3-4 most important patterns or differences
3. **Specific Issues**: Flag any units with concerning metrics (low fertility/hatch, high residue)
4. **Recommendations**: Suggest 2-3 specific actions to improve underperforming units
5. **Environmental Analysis**: Comment on temperature/humidity patterns if significant

Keep your analysis professional, data-driven, and actionable for hatchery operations management.`;

    if (!openAIApiKey) {
      return new Response(JSON.stringify({ 
        error: 'OpenAI API key not configured',
        unitSummary 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Call OpenAI API for analysis
    console.log('Sending data to OpenAI for analysis...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert hatchery performance analyst with deep knowledge of poultry production, incubation processes, and operational optimization. Provide clear, actionable insights based on performance data.' 
          },
          { role: 'user', content: analysisPrompt }
        ],
        max_completion_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      return new Response(JSON.stringify({ 
        error: 'Failed to generate AI analysis',
        unitSummary 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await response.json();
    const aiSummary = aiData.choices[0].message.content;

    console.log('AI analysis completed successfully');

    return new Response(JSON.stringify({ 
      unitSummary,
      aiSummary,
      dateRange: { from: fromDate, to: toDate }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in unit-comparison-summary function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});