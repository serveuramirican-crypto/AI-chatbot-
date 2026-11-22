import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

function stripThinking(raw: string): string {
  if (!raw) return ''
  return raw.replace(/<thinking>[\s\S]*?(?:<\/thinking>|$)/gi, '').trim()
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { promptId, promptContent, context, variables } = body

    let finalPromptContent = promptContent || ''

    // 1. If promptId is provided, look up the prompt definition in Supabase
    if (promptId) {
      const { data: promptRow } = await supabaseServer
        .from('prompts')
        .select('*')
        .eq('id', promptId)
        .maybeSingle()

      if (promptRow?.content) {
        finalPromptContent = promptRow.content
      }
    }

    if (!finalPromptContent.trim()) {
      return NextResponse.json(
        { error: 'Prompt content is empty or could not be found' },
        { status: 400 }
      )
    }

    // 2. Fetch AI provider & API key from widget_settings or agents or environment
    const { data: settings } = await supabaseServer
      .from('widget_settings')
      .select('*')
      .limit(1)
      .maybeSingle()

    let apiKey = settings?.api_key || settings?.openrouter_api_key || process.env.OPENROUTER_API_KEY
    const provider = settings?.api_provider || 'openrouter'
    let model = settings?.ai_model || 'anthropic/claude-haiku-4.5'
    if (model === 'anthropic/claude-3-haiku') {
      model = 'anthropic/claude-haiku-4.5'
    }

    if (!apiKey) {
      // Fallback: check agents table for an active OpenRouter key
      const { data: agentRow } = await supabaseServer
        .from('agents')
        .select('api_key')
        .not('api_key', 'is', null)
        .limit(1)
        .maybeSingle()

      if (agentRow?.api_key) {
        apiKey = agentRow.api_key
      }
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'No AI API key configured in widget_settings or environment' },
        { status: 500 }
      )
    }

    // 3. Assemble variables summary context
    const varSummary =
      variables && Object.keys(variables).length > 0
        ? Object.entries(variables)
            .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
            .join('\n')
        : '(none)'

    // 4. Construct system instruction and user prompt
    const systemPrompt = `You are an automated workflow variable extraction and processing engine.
Your task is to execute the following instructions accurately and return ONLY the final concise extracted or generated value.
Never include meta-commentary, markdown backticks (unless requested), or pleasantries.
Return direct content that can be stored as a variable value.`

    const userPrompt = `### TASK INSTRUCTIONS:
${finalPromptContent}

### CURRENT WORKFLOW VARIABLES:
${varSummary}

### CONVERSATION CONTEXT & RECENT USER INPUT:
${context || '(no prior conversation)'}

### FINAL VALUE TO ASSIGN:
(Generate the exact concise response now)`

    // 5. Call OpenRouter API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://ai-chatbot.app',
        'X-Title': 'AI Chatbot Workflow Set Node',
      },
      body: JSON.stringify({
        model: model || 'anthropic/claude-3-haiku',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 600,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('[Set Prompt API Error]', response.status, errText)
      return NextResponse.json(
        { error: `AI provider error: ${errText}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    const rawResult = data.choices?.[0]?.message?.content || ''
    const cleanResult = stripThinking(rawResult).trim()

    return NextResponse.json({ result: cleanResult })
  } catch (err: any) {
    console.error('[Set Prompt Route Catch]', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
