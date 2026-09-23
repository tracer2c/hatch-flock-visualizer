import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { z } from 'npm:zod'

const NumberOrNull = z.number().nullable().optional()

const TotalsSchema = z.object({
  eggsSet: z.number().optional(),
  chicksHatched: z.number().optional(),
  fertilitySample: z.number().optional(),
  fertileEggs: z.number().optional(),
  residueSample: z.number().optional(),
  contaminatedEggs: z.number().optional(),
  lateDead: z.number().optional(),
  earlyDead: z.number().optional(),
  upsideDown: z.number().optional(),
  fertilityPercent: NumberOrNull,
  contaminationPercent: NumberOrNull,
  lateDeadPercent: NumberOrNull,
  hatchPercent: NumberOrNull,
})

const RowSchema = z.object({
  flock: z.string().optional(),
  house: z.string().optional(),
  hatchery: z.string().optional(),
  eggsSet: z.number().optional(),
  fertilityPercent: NumberOrNull,
  contaminationPercent: NumberOrNull,
  lateDeadPercent: NumberOrNull,
  upsideDown: z.number().optional(),
  earlyDead: z.number().optional(),
  hatchPercent: NumberOrNull,
  completeness: z.number().optional(),
})

const BodySchema = z.object({
  reportType: z.enum(['house', 'fertility', 'comparison']),
  totals: TotalsSchema,
  priorTotals: TotalsSchema.optional(),
  rows: z.array(RowSchema).max(40).default([]),
})

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function safeMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string') {
    return payload.message
  }
  if (payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string') {
    return payload.error
  }
  return fallback
}

function extractCompletedText(event: Record<string, unknown>) {
  const response = event.response
  if (!response || typeof response !== 'object') return ''
  const outputText = (response as { output_text?: unknown }).output_text
  if (typeof outputText === 'string') return outputText
  return ''
}

async function readResponsesStream(response: Response) {
  if (!response.body) return ''
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let text = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split('\n\n')
    buffer = events.pop() || ''
    for (const rawEvent of events) {
      const dataLines = rawEvent
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trim())
      for (const dataLine of dataLines) {
        if (!dataLine || dataLine === '[DONE]') continue
        try {
          const event = JSON.parse(dataLine) as Record<string, unknown>
          if (event.type === 'response.output_text.delta' && typeof event.delta === 'string') {
            text += event.delta
          }
          if (event.type === 'response.completed') {
            text ||= extractCompletedText(event)
          }
        } catch (_error) {
          // Ignore malformed stream fragments and keep reading.
        }
      }
    }
  }

  return text.trim()
}

function parseSummary(text: string) {
  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim()
  try {
    const parsed = JSON.parse(cleaned) as { summary?: unknown }
    if (Array.isArray(parsed.summary)) {
      return parsed.summary
        .filter((line): line is string => typeof line === 'string' && line.trim().length > 0)
        .map((line) => line.replace(/ai summary/gi, 'summary').trim())
        .slice(0, 4)
    }
  } catch (_error) {
    // Fall through to line parsing.
  }

  return cleaned
    .split('\n')
    .map((line) => line.replace(/^[-*•\d.\s]+/, '').replace(/ai summary/gi, 'summary').trim())
    .filter(Boolean)
    .slice(0, 4)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const key = Deno.env.get('LOVABLE_API_KEY')
  if (!key) {
    return jsonResponse({ error: 'Report summary is not configured.' }, 500)
  }

  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch (_error) {
    return jsonResponse({ error: 'Invalid request body.' }, 400)
  }

  const parsed = BodySchema.safeParse(rawBody)
  if (!parsed.success) {
    return jsonResponse({ error: parsed.error.flatten().fieldErrors }, 400)
  }

  const payload = parsed.data
  const prompt = [
    'Write a concise breeder management report summary as JSON only.',
    'Use exactly this shape: {"summary":["line 1","line 2","line 3"]}.',
    'Do not use the phrase AI summary. The section heading in the PDF is Summary.',
    'Mention useful performance trends, outliers, and incomplete data if visible.',
    'Keep each line under 150 characters and avoid model/provider names.',
    JSON.stringify(payload),
  ].join('\n')

  const gatewayResponse = await fetch('https://ai.gateway.lovable.dev/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Lovable-API-Key': key,
      'X-Lovable-AIG-SDK': 'fetch',
    },
    body: JSON.stringify({
      model: 'openai/gpt-6-astra',
      input: prompt,
      stream: true,
      reasoning: { effort: 'low', summary: 'auto' },
      include: ['reasoning.encrypted_content'],
      text: {
        format: {
          type: 'json_schema',
          name: 'report_summary',
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              summary: {
                type: 'array',
                items: { type: 'string' },
              },
            },
            required: ['summary'],
          },
          strict: true,
        },
      },
    }),
  })

  if (!gatewayResponse.ok) {
    let body: unknown = null
    try {
      body = await gatewayResponse.json()
    } catch (_error) {
      body = null
    }
    return jsonResponse({ error: safeMessage(body, 'Summary could not be generated.'), status: gatewayResponse.status }, gatewayResponse.status)
  }

  const text = await readResponsesStream(gatewayResponse)
  const summary = parseSummary(text)
  return jsonResponse({ summary })
})
