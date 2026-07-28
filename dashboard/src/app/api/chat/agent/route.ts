import { NextResponse } from 'next/server'
import { supabaseServer, supabaseReadOnly } from '@/lib/supabase-server'
import { QUERY_PRODUCTS_DB_TOOL_SCHEMA, SEARCH_KNOWLEDGE_BASE_TOOL_SCHEMA } from '@/types/agent'

// Hardcoded OpenRouter key as ultimate fallback (also stored in agents.api_key)
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_MODEL = 'anthropic/claude-sonnet-4.6'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string | null
  tool_calls?: any[]
  tool_call_id?: string
  name?: string
}

interface RequestBody {
  agentId: string
  messages: ChatMessage[]
  sessionId?: string
  userContext?: string
}

interface AgentRecord {
  instructions: string | null
  model_id: string
  custom_model_id: string | null
  api_key: string | null
  tools: any[]
  knowledge_base?: any
  response_examples?: { question: string, answer: string, buttons?: string[] }[] | null
}

interface ProductResult {
  name: string
  price: number
  features: string[]
  image_url?: string
  link?: string
  size?: string
  color?: string
  category?: string
  description?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Color / size vocabulary for query cleaning
// ─────────────────────────────────────────────────────────────────────────────

const COLOR_MAP: Record<string, string> = {
  black: 'black', noir: 'black', أسود: 'black',
  white: 'white', blanc: 'white', أبيض: 'white',
  red: 'red', rouge: 'red', أحمر: 'red',
  blue: 'blue', bleu: 'blue', أزرق: 'blue',
  green: 'green', vert: 'green', أخضر: 'green',
  yellow: 'yellow', jaune: 'yellow', أصفر: 'yellow',
  gray: 'gray', grey: 'gray', gris: 'gray', رمادي: 'gray',
  brown: 'brown', marron: 'brown', بني: 'brown',
  pink: 'pink', rose: 'pink', وردي: 'pink',
  orange: 'orange', برتقالي: 'orange',
  purple: 'purple', violet: 'purple', بنفسجي: 'purple',
}

const SIZE_TOKENS = new Set(['xs', 's', 'm', 'l', 'xl', 'xxl', '2xl', '3xl', 'xsmall', 'small', 'medium', 'large'])

// Noise words that are not product keywords
const NOISE_WORDS = new Set([
  'do', 'you', 'have', 'is', 'there', 'any', 'the', 'a', 'an', 'with', 'and', 'or', 'for',
  'size', 'taille', 'couleur', 'color', 'colour', 'en', 'de', 'le', 'la', 'les', 'du',
  'واش', 'عندكم', 'كاين', 'بغيت', 'نبغي', 'فين', 'كيفاش', 'بلاصة', 'هل', 'عندي',
])

/**
 * Split a raw user query into meaningful product keywords, ignoring
 * color names, size tokens, and common noise words.
 */
function extractProductKeywords(raw: string): string[] {
  return raw
    .toLowerCase()
    .split(/[\s,]+/)
    .filter(t => t.length > 1 && !COLOR_MAP[t] && !SIZE_TOKENS.has(t) && !NOISE_WORDS.has(t))
}

function stripThinking(raw: string): string {
  if (!raw) return '';
  return raw.replace(/<thinking>[\s\S]*?(?:<\/thinking>|$)/gi, '').trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

async function queryProductsDb(
  searchQuery: string,
  color?: string,
  size?: string,
  category?: string,
  agentSourceIds?: string[]
): Promise<ProductResult[]> {
  if (agentSourceIds && agentSourceIds.length === 0) return []

  // ── Step 1: build a clean keyword list (strip color/size/noise words) ───────
  const keywords = extractProductKeywords(searchQuery)
  console.log(`[queryProductsDb] keywords=${JSON.stringify(keywords)}, color=${color ?? 'none'}, size=${size ?? 'none'}`)

  // ── Step 2: build the OR filter for each keyword ────────────────────────────
  const buildQuery = (kws: string[], col?: string, sz?: string) => {
    let q = supabaseReadOnly
      .from('products')
      .select('name, price, description, image_url, link, size, color, category')

    if (agentSourceIds && agentSourceIds.length > 0) {
      q = q.in('id', agentSourceIds)
    }

    if (kws.length > 0) {
      const orClauses = kws
        .map(k => `name.ilike.%${k}%,description.ilike.%${k}%,category.ilike.%${k}%,color.ilike.%${k}%`)
        .join(',')
      q = q.or(orClauses)
    }

    if (category) q = q.ilike('category', `%${category}%`)
    if (col) q = q.ilike('color', `%${col}%`)
    if (sz) q = q.ilike('size', `%${sz}%`)

    return q.limit(8)
  }

  // ── Step 3: first try WITH color+size filters ────────────────────────────────
  const { data: strict, error: e1 } = await buildQuery(keywords, color, size)
  if (e1) { console.error('[queryProductsDb] Supabase error (strict):', e1.message) }
  if (strict && strict.length > 0) {
    console.log(`[queryProductsDb] strict hit: ${strict.length} rows`)
    return strict.map(row => ({
      name: row.name,
      price: row.price,
      features: [], // Fallback since it's removed from DB
      image_url: row.image_url,
      link: row.link,
      size: row.size,
      color: row.color,
      category: row.category,
      description: row.description,
    }))
  }

  // ── Step 4: fallback — drop size filter, keep color ─────────────────────────
  if (size) {
    const { data: noSize, error: e2 } = await buildQuery(keywords, color, undefined)
    if (e2) console.error('[queryProductsDb] Supabase error (no-size):', e2.message)
    if (noSize && noSize.length > 0) {
      console.log(`[queryProductsDb] no-size fallback hit: ${noSize.length} rows`)
      return noSize.map(row => ({ name: row.name, price: row.price, features: [], image_url: row.image_url, link: row.link }))
    }
  }

  // ── Step 5: final fallback — keyword only, no attribute filters ──────────────
  const { data: loose, error: e3 } = await buildQuery(keywords, undefined, undefined)
  if (e3) console.error('[queryProductsDb] Supabase error (loose):', e3.message)
  if (loose && loose.length > 0) {
    console.log(`[queryProductsDb] loose fallback hit: ${loose.length} rows`)
    return loose.map(row => ({ name: row.name, price: row.price, features: [], image_url: row.image_url, link: row.link, size: row.size, color: row.color, category: row.category, description: row.description }))
  }

  // ── Step 6: absolute fallback — search raw query as-is ──────────────────────
  if (keywords.length === 0) {
    // query was ALL noise/color/size words — just fetch first products
    let q = supabaseReadOnly
      .from('products')
      .select('name, price, description, image_url, link, size, color, category')

    if (agentSourceIds && agentSourceIds.length > 0) {
      q = q.in('id', agentSourceIds)
    }

    const { data: all } = await q.limit(8)
    if (all && all.length > 0) {
      console.log(`[queryProductsDb] global fallback hit: ${all.length} rows`)
      return all.map(row => ({ name: row.name, price: row.price, features: [], image_url: row.image_url, link: row.link, size: row.size, color: row.color, category: row.category, description: row.description }))
    }
  }

  console.warn(`[queryProductsDb] ⚠️ No results for any strategy — query="${searchQuery}"`)
  return []
}

// Search knowledge_sources table (for text/url/other KB entries)
async function searchKnowledgeSources(rawQuery: string, agentSourceIds?: string[]): Promise<string> {
  if (agentSourceIds && agentSourceIds.length === 0) return ''

  const keywords = extractProductKeywords(rawQuery)
  if (keywords.length === 0) return ''

  let q = supabaseReadOnly
    .from('knowledge_sources')
    .select('source_path, metadata, type')
    .eq('status', 'active')

  if (agentSourceIds && agentSourceIds.length > 0) {
    q = q.in('id', agentSourceIds)
  }

  const { data, error } = await q.limit(10)

  if (error || !data || data.length === 0) return ''

  // Match any row whose source_path or metadata JSON contains one of our keywords
  const matched = data.filter(row => {
    const path = (row.source_path || '').toLowerCase()
    const meta = JSON.stringify(row.metadata || '').toLowerCase()
    return keywords.some(k => path.includes(k) || meta.includes(k))
  })

  if (matched.length === 0) return ''
  return matched.map(row => {
    if (row.type === 'text') return row.metadata?.content || ''
    return `${row.source_path}: ${JSON.stringify(row.metadata || {})}`
  }).join('\n')
}

function formatProductsForLLM(products: ProductResult[]): string {
  if (products.length === 0) {
    return 'No matching products were found in the catalog for this query.'
  }
  return products
    .map(
      (p, i) =>
        `--- Product ${i + 1} ---\n` +
        `  Product Name : ${p.name}\n` +
        `  Price        : ${p.price} MAD\n` +
        `  Category     : ${p.category ?? 'N/A'}\n` +
        `  Size         : ${p.size ?? 'N/A'}\n` +
        `  Couleur      : ${p.color ?? 'N/A'}\n` +
        `  Description  : ${p.description ?? 'N/A'}\n` +
        (p.image_url ? `  Image URL    : ${p.image_url}\n` : '') +
        (p.link ? `  Link         : ${p.link}\n` : '')
    )
    .join('\n')
}

function buildSystemPrompt(
  agentConfig: AgentRecord,
  hasProductsDbTool: boolean,
  hasButtonsTool: boolean,
  hasProductDisplayTool: boolean,
  hasKnowledgeBaseTool: boolean,
  hasResponseExampleTool: boolean,
  userContext: string = ''
): string {
  const defaultInstructions = `## Role & Identity
You are Sophie, an expert Product Recommendation Specialist for our clothing store.

## CRITICAL MEMORY & CONTEXT RULES (Read this first)
You have access to the user's current selections here: {{user_context}}

1. PRE-CHECK: Before generating any response, look strictly at {{user_context}}.

2. LOGIC FLOW:
   - IF {{user_context}} contains data (e.g., category, size, color):
     - YOU MUST NOT greet the user (no "Hello", "Welcome", or "Hi").
     - YOU MUST NOT ask for information already provided in {{user_context}}.
     - IMMEDIATELY provide a precise product recommendation based on these preferences.
     - BE DIRECT, concise, and sales-focused.
     - Assume the user knows you already.

   - IF {{user_context}} IS EMPTY (or contains 'No preferences selected'):
     - Be warm and welcoming.
     - Introduce yourself briefly as Sophie.
     - Politely ask the user what they are looking for to start the flow.

## Interaction Style
- Keep answers short, natural, and helpful.
- Never apologize for existing data.
- Treat the conversation as a continuous professional flow.`;

  let prompt = agentConfig.instructions || defaultInstructions;
  prompt = prompt.replace(/\{\{user_context\}\}/g, userContext ? userContext : 'No selections yet');
  
  prompt += `\n\nCRITICAL: NEVER output tool calls, function names, or raw database queries in your visible text response. You must use the designated tool calling API silently to fetch data before speaking.`

  if (hasKnowledgeBaseTool) {
    prompt += `\n\n[Tool guidance: search_knowledge_base]
To find products, you MUST search the Knowledge Base using the relevant tool. DO NOT use strict database queries if the knowledge base tool is available.
CRITICAL — Language: If the user speaks Arabic or French (e.g. "قمصان", "سراويل", "chemise"), translate product keywords to French/English before querying, because the catalog is in French/English.
CRITICAL — Field Analysis: Every product in the Knowledge Base has exactly 6 fields you MUST analyse:
  1. Product Name  — matches the product type (e.g. "chemise", "pull")
  2. Price         — the price in MAD
  3. Category      — the product category (e.g. "chemise", "pulls")
  4. Size          — available size (e.g. S, M, L, XL)
  5. Couleur       — the color of the product (e.g. RED, BLACK, BLUE)
  6. Description   — full product details
When the user asks for a product, you MUST compare EACH of these 6 fields against the user's exact criteria (size, color, category, etc.) one by one BEFORE deciding which product to show. NEVER show a product that doesn't match ALL the criteria the user specified.
CRITICAL — Accuracy: Before answering, verify 100% that each product in your response EXACTLY matches the tool results from the CURRENT turn. DO NOT reuse products from earlier messages.
If no product matches all criteria, apologize politely (e.g. "سمحليا، هاد الموديل بـ الضبط ما متوفرش حاليا") and suggest an available alternative.`
  }

  if (hasProductsDbTool && !hasKnowledgeBaseTool) {
    prompt += `\n\n[Tool guidance: query_products_db]\nYou have access to a live product database via the query_products_db tool.\nWhenever the user asks about product features, availability, stock, or pricing,\nyou MUST call query_products_db before answering.\nIf the query_products_db tool returns no results (an empty array), DO NOT attempt to output the <product_display> tag. Instead, you MUST politely apologize (e.g., "سمحليا، هاد الموديل بـ الضبط ما متوفرش حاليا"), and immediately suggest a relevant alternative from the available categories.`
  }

  if (hasProductDisplayTool) {
    prompt += `\n\n[RESPONSE STRUCTURE - Follow EXACTLY]\nYour response MUST follow this 3-part structure when showing products:\n\nPART 1 - Intro (1 line only): One friendly sentence in Arabic/French.\n\nPART 2 - Product Cards:\nUse the <product_display> XML tag. ALWAYS include ALL these fields per product:\n<product_display>[{"name":"...","price":"...","image_url":"...","description":"max 10 words","link":"...","color":"...","size":"...","category":"...","fabric":"..."}]</product_display>\nFIELD RULES:\n- color: the Couleur field from KB (e.g. BLACK, RED, BLUE)\n- size: the Size field from KB (e.g. S, M, L, XL)\n- category: the Category field from KB (e.g. chemise)\n- fabric: material from the Description field (e.g. Coton 100%, Polyester 58%)\n- image_url: exact URL from KB. If none: https://placehold.co/400x300?text=ProductName\n- description: SHORT max 10 words summary\n- CRITICAL: products must match KB results from THIS turn ONLY. Never copy from previous messages.\n- Do NOT use markdown code fences around the JSON.\n\nPART 3 - Closing + Buttons:\nOne short closing sentence then the <options> quick-reply buttons.`
  }

  prompt += `\n\n[Execution & Reasoning Rules]
CRITICAL: When the user asks for a product or specifies criteria (such as product name, size, color, category), you MUST IMMEDIATELY call the search tool (search_knowledge_base or query_products_db) FIRST before generating any visible response text.
CRITICAL: NEVER output raw <thinking> tags, function call names, or internal reasoning blocks in your visible text response. Perform all tool calls silently using the tool calling API.`

  if (hasButtonsTool) {
    prompt += `\n\n[Quick Reply Buttons]\nAt the very end of your response, you MUST provide 3 to 4 short, highly relevant suggested replies for the user to click. Format them strictly as a JSON array enclosed in XML tags like this: <options>["Order Support", "FAQ", "Track Order"]</options>\nDo NOT explain or label the options block — just append it directly after your main response text.`
  }

  // ── RESPONSE EXAMPLES: injected LAST so it has maximum override priority ──────
  if (hasResponseExampleTool && agentConfig.response_examples && agentConfig.response_examples.length > 0) {
    const examplesFormatted = agentConfig.response_examples
      .map(ex => {
        let finalAnswer = ex.answer
        const buttons = (ex as any).buttons as string[] | undefined
        if (buttons && buttons.filter(b => b.trim()).length > 0) {
          const validBtns = buttons.filter(b => b.trim())
          finalAnswer += `\n<options>${JSON.stringify(validBtns)}</options>`
        }
        return `User: "${ex.question}"\nAssistant: "${finalAnswer}"`
      })
      .join('\n\n')

    prompt += `\n\n\
════════════════════════════════════════
ABSOLUTE RESPONSE OVERRIDE — FEW-SHOT EXAMPLES
════════════════════════════════════════
The following Question/Answer pairs are MANDATORY response templates.
They OVERRIDE all other instructions, tone guidelines, and tools.

RULES:
1. When the user's message EXACTLY matches or is SEMANTICALLY equivalent to one of the questions below, you MUST respond with the EXACT answer shown — word for word, no paraphrasing.
2. These examples take ABSOLUTE PRIORITY over the Knowledge Base, the product database, and all other instructions above.
3. Do NOT add extra context, apologies, or modifications to the provided answer.

EXAMPLES:
${examplesFormatted}
════════════════════════════════════════`
  }

  return prompt
}

// ─────────────────────────────────────────────────────────────────────────────
// Call OpenRouter via native fetch (no SDK required)
// ─────────────────────────────────────────────────────────────────────────────

async function callOpenRouter(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  tools?: any[]
): Promise<any> {
  const bodyPayload: any = {
    model,
    messages,
    max_tokens: 4096,
  }
  if (tools && tools.length > 0) {
    bodyPayload.tools = tools
  }

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'Agent Studio Orchestrator',
    },
    body: JSON.stringify(bodyPayload),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`OpenRouter API error ${res.status}: ${errText}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message || { role: 'assistant', content: '' }
}

// ─────────────────────────────────────────────────────────────────────────────
// API Route Handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { agentId, messages, sessionId: incomingSessionId, userContext } = body as RequestBody

    if (!agentId) {
      return NextResponse.json({ error: 'agentId is required' }, { status: 400 })
    }

    // ── Session management ─────────────────────────────────────────────────────
    let sessionId = incomingSessionId ?? null

    if (!sessionId) {
      // Create a new session
      const freshUuid = crypto.randomUUID();
      const shortId = freshUuid.slice(0, 5);
      const { data: newSession, error: sessionError } = await supabaseServer
        .from('chat_sessions')
        .insert({ id: freshUuid, user_name: `Visitor-${shortId}`, agent_id: agentId })
        .select('id')
        .single()

      if (sessionError || !newSession) {
        console.error('[chat/agent] Failed to create chat session:', sessionError)
        // Non-fatal — continue without persistence
      } else {
        sessionId = newSession.id as string
      }
    }

    // ── Fetch conversation history from DB ────────────────────────────────────
    let historyMessages: ChatMessage[] = []
    if (sessionId) {
      const { data: historyRows } = await supabaseServer
        .from('chat_messages')
        .select('role, content')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })

      if (historyRows && historyRows.length > 0) {
        historyMessages = historyRows.map((r: any) => ({
          role: r.role as 'user' | 'assistant',
          content: r.content,
        }))
      }
    }

    // ── Save incoming user message to DB ──────────────────────────────────────
    // (Handled by the client hook when handleSend/handleButtonClick/handleQuickReply executes)

    // Fetch the agent from Supabase using the reliable server client
    const { data: agent, error: fetchError } = await supabaseServer
      .from('agents')
      .select('instructions, model_id, custom_model_id, api_key, tools, knowledge_base, response_examples')
      .eq('id', agentId)
      .single()

    if (fetchError || !agent) {
      console.error('Error fetching agent details:', fetchError)
      return NextResponse.json(
        { error: `Agent not found: ${fetchError?.message || 'unknown'}` },
        { status: 404 }
      )
    }

    const agentRecord = agent as AgentRecord
    const enabledTools = (agentRecord.tools || []).filter((t: any) => t.enabled)
    const hasProductsDbTool = enabledTools.some((t: any) => t.id === 'query_products_db')
    const hasKnowledgeBaseTool = enabledTools.some((t: any) => t.id === 'knowledge_base')
    const hasButtonsTool = enabledTools.some((t: any) => t.id === 'buttons')
    // 'cards' and 'carousels' both use the same <product_display> format;
    // the frontend chooses single-card vs carousel based on array length.
    const hasProductDisplayTool = enabledTools.some((t: any) => t.id === 'cards' || t.id === 'carousels')
    const hasResponseExampleTool = enabledTools.some((t: any) => t.id === 'response_example')

    const agentSourceIds = (agentRecord.knowledge_base?.documents || []).map((d: any) => d.id)

    const systemInstruction = buildSystemPrompt(agentRecord, hasProductsDbTool, hasButtonsTool, hasProductDisplayTool, hasKnowledgeBaseTool, hasResponseExampleTool, userContext)

    // Determine which API key and model to use.
    // Priority: DB api_key → OPENROUTER_API_KEY env var → hardcoded fallback
    const apiKey =
      agentRecord.api_key ||
      process.env.OPENROUTER_API_KEY ||
      OPENROUTER_API_KEY

    // Determine model
    let model = OPENROUTER_MODEL
    if (agentRecord.model_id === 'openrouter/custom' && agentRecord.custom_model_id) {
      model = agentRecord.custom_model_id
    } else if (agentRecord.model_id && agentRecord.model_id !== 'openrouter/custom') {
      // Map internal model ids to OpenRouter model strings
      const modelMap: Record<string, string> = {
        'gpt-4o': 'openai/gpt-4o',
        'gpt-4o-mini': 'openai/gpt-4o-mini',
        'claude-3-5-sonnet': 'anthropic/claude-3-5-sonnet',
        'claude-3-5-haiku': 'anthropic/claude-3-5-haiku',
      }
      model = modelMap[agentRecord.model_id] || OPENROUTER_MODEL
    }

    // Use DB history as source of truth for context; ignore client-sent history
    // to avoid duplication (client only sends the new message)
    const lastUserMsg = messages.filter(m => m.role === 'user').at(-1)
    const newUserMessage: ChatMessage[] = lastUserMsg ? [lastUserMsg] : []

    let currentMessages: ChatMessage[] = [
      { role: 'system', content: systemInstruction },
      ...historyMessages,
      ...newUserMessage,
    ]

    const toolsPayload: any[] = []

    if (hasProductsDbTool) {
      toolsPayload.push({
        type: 'function',
        function: QUERY_PRODUCTS_DB_TOOL_SCHEMA
      })
    }

    if (hasKnowledgeBaseTool) {
      toolsPayload.push({
        type: 'function',
        function: SEARCH_KNOWLEDGE_BASE_TOOL_SCHEMA
      })
    }

    // ── Dynamic API Tools ───────────────────────────────────────────────────
    const apiTools = enabledTools.filter((t: any) => t.type === 'api')
    for (const apiTool of apiTools) {
      const config = apiTool.config || {}
      const apiConfig = config.apiConfig || {}
      
      const parameters: any = {
        type: 'object',
        properties: {},
        required: [],
      }

      // Add body variables as properties
      if (apiConfig.bodyVariables && Array.isArray(apiConfig.bodyVariables)) {
        for (const v of apiConfig.bodyVariables) {
          if (v.key) {
            parameters.properties[v.key] = { type: 'string', description: `Value for ${v.key}` }
            parameters.required.push(v.key)
          }
        }
      }

      // Add URL parameters as properties
      if (apiConfig.params && Array.isArray(apiConfig.params)) {
        for (const p of apiConfig.params) {
          if (p.key) {
            parameters.properties[p.key] = { type: 'string', description: `URL Parameter: ${p.key}` }
            parameters.required.push(p.key)
          }
        }
      }

      toolsPayload.push({
        type: 'function',
        function: {
          name: apiTool.id,
          description: config.triggerOverride || `Execute API request`,
          parameters
        }
      })
    }

    let finalResponseContent = ''
    const maxSteps = 5

    for (let i = 0; i < maxSteps; i++) {
      const message = await callOpenRouter(apiKey, model, currentMessages, toolsPayload)

      if (message.tool_calls && message.tool_calls.length > 0) {
        currentMessages.push(message)

        for (const toolCall of message.tool_calls) {
          if (toolCall.function.name === 'query_products_db') {
            const args = JSON.parse(toolCall.function.arguments || '{}')
            const dbResult = await queryProductsDb(args.search_query || '', args.color, args.size, args.category, agentSourceIds)
            const formattedResult = formatProductsForLLM(dbResult)

            currentMessages.push({
              role: 'tool',
              name: toolCall.function.name,
              tool_call_id: toolCall.id,
              content: formattedResult
            })
          } else if (toolCall.function.name === 'search_knowledge_base') {
            const toolArgs = toolCall.function.arguments ? JSON.parse(toolCall.function.arguments) : {}
            const rawQuery: string = toolArgs.query || ''

            // ── Step 1: Use structured params from LLM if available ─────────────
            let detectedColor: string | undefined = toolArgs.color?.toLowerCase()
            let detectedSize: string | undefined = toolArgs.size?.toUpperCase()
            let detectedCategory: string | undefined = toolArgs.category

            // ── Step 2: Also scan query tokens as backup ────────────────────────
            const tokens = rawQuery.toLowerCase().split(/[\s,]+/)
            for (const token of tokens) {
              if (!detectedColor && COLOR_MAP[token]) detectedColor = COLOR_MAP[token]
              if (!detectedSize && SIZE_TOKENS.has(token)) detectedSize = token.toUpperCase()
            }

            console.log(`[search_knowledge_base] Query: "${rawQuery}" | color: ${detectedColor ?? 'none'} | size: ${detectedSize ?? 'none'} | category: ${detectedCategory ?? 'none'}`)

            // ── Step 3: Multi-pass strict search ───────────────────────────────
            // Pass A: strict — all filters applied
            let dbResult = await queryProductsDb(rawQuery, detectedColor, detectedSize, detectedCategory, agentSourceIds)

            // Pass B: if nothing found and we have color+size, try without size
            if (dbResult.length === 0 && detectedColor && detectedSize) {
              console.log('[search_knowledge_base] Pass B: dropping size filter')
              dbResult = await queryProductsDb(rawQuery, detectedColor, undefined, detectedCategory, agentSourceIds)
            }

            // Pass C: if still nothing, try without color
            if (dbResult.length === 0 && detectedColor) {
              console.log('[search_knowledge_base] Pass C: dropping color filter')
              dbResult = await queryProductsDb(rawQuery, undefined, detectedSize, detectedCategory, agentSourceIds)
            }

            // ── Step 4: Post-filter — hard remove products that don't match color/size ──
            // This is the key accuracy guard: even if DB returned a fuzzy match,
            // we reject anything that doesn't match the user's explicit criteria.
            if (detectedColor) {
              const colorFiltered = dbResult.filter(p =>
                p.color && p.color.toLowerCase().includes(detectedColor!)
              )
              // Only apply strict color filter if it doesn't eliminate everything
              if (colorFiltered.length > 0) {
                dbResult = colorFiltered
                console.log(`[search_knowledge_base] Post-filter color=${detectedColor}: ${dbResult.length} remain`)
              } else {
                console.warn(`[search_knowledge_base] Color post-filter eliminated all results — keeping originals for graceful apology`)
                dbResult = [] // Force "not found" if color is wrong
              }
            }

            if (detectedSize && dbResult.length > 0) {
              const sizeFiltered = dbResult.filter(p =>
                p.size && p.size.toUpperCase().split(/[,/\s]+/).includes(detectedSize!)
              )
              if (sizeFiltered.length > 0) {
                dbResult = sizeFiltered
                console.log(`[search_knowledge_base] Post-filter size=${detectedSize}: ${dbResult.length} remain`)
              }
            }

            // ── Step 5: Also search knowledge_sources ──────────────────────────
            const kbContext = await searchKnowledgeSources(rawQuery, agentSourceIds)

            let combinedResult = formatProductsForLLM(dbResult)
            if (kbContext) combinedResult += `\n\nAdditional Knowledge Base Context:\n${kbContext}`

            if (!dbResult.length && !kbContext) {
              console.warn(`[search_knowledge_base] ⚠️ No results — query="${rawQuery}", color="${detectedColor ?? ''}", size="${detectedSize ?? ''}"`)
              combinedResult = `No products found matching: color=${detectedColor ?? 'any'}, size=${detectedSize ?? 'any'}, query="${rawQuery}". Please apologize to the user and suggest available alternatives.`
            }

            currentMessages.push({
              role: 'tool',
              name: toolCall.function.name,
              tool_call_id: toolCall.id,
              content: combinedResult
            })
          } else {
            const mappedApiTool = apiTools.find((t: any) => t.id === toolCall.function.name)
            if (mappedApiTool) {
              const toolArgs = toolCall.function.arguments ? JSON.parse(toolCall.function.arguments) : {}
              const config = mappedApiTool.config || {}
              const apiConfig = config.apiConfig || {}
              
              let finalUrl = apiConfig.url || ''
              
              // Replace URL variables {variable} with args or ''
              const urlRegex = /\{([^}]+)\}/g
              finalUrl = finalUrl.replace(urlRegex, (_: string, key: string) => {
                return toolArgs[key] !== undefined ? encodeURIComponent(String(toolArgs[key])) : ''
              })

              // Build URL params
              if (apiConfig.params && apiConfig.params.length > 0) {
                const searchParams = new URLSearchParams()
                for (const p of apiConfig.params) {
                  if (p.key) {
                    searchParams.append(p.key, toolArgs[p.key] !== undefined ? toolArgs[p.key] : p.value)
                  }
                }
                const qs = searchParams.toString()
                if (qs) {
                  finalUrl += (finalUrl.includes('?') ? '&' : '?') + qs
                }
              }

              // Build Headers
              const headers: Record<string, string> = {}
              if (apiConfig.headers) {
                for (const h of apiConfig.headers) {
                  if (h.key) headers[h.key] = h.value
                }
              }

              // Build Body
              let body: string | undefined = undefined
              if (apiConfig.method !== 'GET' && apiConfig.method !== 'HEAD' && apiConfig.bodyVariables) {
                const bodyObj: Record<string, any> = {}
                for (const v of apiConfig.bodyVariables) {
                  if (v.key) {
                    bodyObj[v.key] = toolArgs[v.key] !== undefined ? toolArgs[v.key] : v.value
                  }
                }
                if (Object.keys(bodyObj).length > 0) {
                  body = JSON.stringify(bodyObj)
                  headers['Content-Type'] = 'application/json'
                }
              }

              try {
                // If asyncExecution is true, we don't await the result to block the stream
                // However, in this route context, we might just await it anyway or fire and forget
                let resultText = ''
                if (config.asyncExecution) {
                  fetch(finalUrl, { method: apiConfig.method || 'GET', headers, body }).catch(e => console.error('Async API Error:', e))
                  resultText = 'Action triggered asynchronously.'
                } else {
                  const controller = new AbortController()
                  const timeoutId = setTimeout(() => controller.abort(), (apiConfig.timeout || 10) * 1000)
                  
                  const res = await fetch(finalUrl, {
                    method: apiConfig.method || 'GET',
                    headers,
                    body,
                    signal: controller.signal
                  })
                  clearTimeout(timeoutId)
                  
                  if (!res.ok) {
                    throw new Error(`API returned ${res.status}: ${res.statusText}`)
                  }
                  
                  if (config.captureResponse) {
                    const data = await res.json()
                    resultText = JSON.stringify(data)
                  } else {
                    resultText = 'Action completed successfully.'
                  }
                }
                
                currentMessages.push({
                  role: 'tool',
                  name: toolCall.function.name,
                  tool_call_id: toolCall.id,
                  content: resultText
                })
              } catch (e: any) {
                console.error(`[Dynamic API] Error calling ${finalUrl}:`, e)
                currentMessages.push({
                  role: 'tool',
                  name: toolCall.function.name,
                  tool_call_id: toolCall.id,
                  content: `API Error: ${e.message}`
                })
              }
            }
          }
        }
      } else {
        finalResponseContent = message.content || ''
        break
      }
    }

    // ── Save assistant response to DB ──────────────────────────────────────
    // (Handled by the client after parsing)

    // Strip any internal thinking block before returning response
    finalResponseContent = stripThinking(finalResponseContent)

    return NextResponse.json({
      role: 'assistant',
      content: finalResponseContent,
      sessionId,
    })

  } catch (error: any) {
    console.error('Error in orchestrator API route:', error)
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
