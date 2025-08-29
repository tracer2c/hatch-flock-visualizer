import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const hatcheryKnowledge = `
You are a helpful assistant for a hatchery management system. You help users understand the application features, interpret data, and provide guidance on hatchery operations.

HATCHERY DOMAIN KNOWLEDGE:
- Incubation Process: Eggs are set in incubators, go through various stages (setting, candling, transfer, hatch), and result in chicks
- Key Metrics: Hatch rate, fertility rate, early/late mortality, first grade chicks, culls, etc.
- Data Types: Egg pack data, fertility data, QA measurements, residue analysis, environmental conditions
- Process Flow: Setting → Incubation → Candling → Transfer → Hatching → Chick Processing
- Units/Houses: Physical locations where batches are processed
- Batches: Groups of eggs processed together with tracking numbers
- Breeds: Different chicken breeds with varying performance characteristics
- SOPs: Standard Operating Procedures for consistent operations

APPLICATION FEATURES:
- Dashboard: Overview of operations, alerts, and key metrics
- Smart Analytics: AI-powered insights and interactive charts
- Process Flow: Visual workflow of hatchery operations
- Advanced Analytics: Detailed comparison tools and specialized analysis
- Data Entry: Input interfaces for various operational data
- Daily Checklist: Routine task management
- Management: User and system configuration
- Reports: Comprehensive documentation and analysis

Always provide helpful, accurate information about hatchery operations and guide users on how to use the application effectively.
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { message, pageContext, pageDescription, currentPath } = await req.json();

    if (!message) {
      throw new Error('Message is required');
    }

    console.log('Contextual help request:', {
      message,
      pageContext,
      currentPath
    });

    const systemPrompt = `${hatcheryKnowledge}

CURRENT CONTEXT:
- Page: ${pageContext}
- Description: ${pageDescription}
- Path: ${currentPath}

The user is currently viewing the "${pageContext}" page. ${pageDescription}

Provide helpful, contextual responses about:
1. What the user is currently looking at
2. How to use the current page features
3. Interpret any data or metrics they might be seeing
4. General hatchery operation guidance
5. Navigation help for related features

Keep responses concise but informative. Be friendly and professional.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const assistantResponse = data.choices[0]?.message?.content;

    if (!assistantResponse) {
      throw new Error('No response from OpenAI');
    }

    console.log('Generated response for contextual help');

    return new Response(JSON.stringify({ response: assistantResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in contextual-help function:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      response: "I'm sorry, I'm having trouble processing your request right now. Please try again in a moment."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});