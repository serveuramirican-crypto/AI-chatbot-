import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText, tool, stepCountIs } from 'ai';
import { z } from 'zod';

export async function POST(req: Request) {
  try {
    const { message, sessionId } = await req.json()

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    // Phase 1: Fetch Chat History for Context
    let previousContext = "";
    if (sessionId) {
      const { data: history } = await supabase
        .from("chat_messages")
        .select("user_message, ai_response")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (history && history.length > 0) {
        // Reverse to chronological order for the prompt
        const formattedHistory = history.reverse().map(h => 
          `User: ${h.user_message}\nAI: ${h.ai_response}`
        ).join("\n\n");
        previousContext = `\n\n--- PREVIOUS CHAT HISTORY ---\n${formattedHistory}\n--- END HISTORY ---\n`;
      }
    }

    let matchedProducts: any[] = [];
    let source = "Unknown";
    let rawJson: any = null;

    // Fetch Settings
    const { data: settings } = await supabase
      .from('widget_settings')
      .select('*')
      .limit(1)
      .single()

    // Fetch Store Inventory Summary to guide the AI's buttons
    let storeSummaryContext = "";
    try {
      const { data: allProductsData } = await supabase
        .from('knowledge_sources')
        .select('metadata')
        .eq('type', 'product');
        
      if (allProductsData && allProductsData.length > 0) {
        const cats = new Set<string>();
        allProductsData.forEach(p => {
          if (p.metadata?.category) cats.add(p.metadata.category);
        });

        storeSummaryContext = `\n\nSTORE INVENTORY SUMMARY:\nAvailable Categories: ${Array.from(cats).join(', ') || 'Various clothing'}\n(Note: Specific colors and sizes are listed in the individual product descriptions when matched.)`;
      }
    } catch (e) {
      console.error("Failed to fetch store summary:", e);
    }

    let usedAI = false;
    let responseText = "";

    const provider = settings?.api_provider || 'openrouter';
    let apiKey = settings?.api_key || settings?.openrouter_api_key;

    if (!apiKey) {
      if (provider === 'openai') {
        apiKey = process.env.OPENAI_API_KEY;
      } else if (provider === 'openrouter') {
        apiKey = process.env.OPENROUTER_API_KEY;
      } else if (provider === 'anthropic') {
        apiKey = process.env.ANTHROPIC_API_KEY;
      }
    }

    if (settings?.enable_ai_fallback && apiKey) {
      try {
        const systemPrompt = `--- MANDATORY THINKING PROCESS ---
Before you respond, you must strictly follow this process:
1. READ user intent.
2. CHECK if criteria (size/color) is missing. STATE CHECK: If you do not have the user's size, color preference, or specific style, you are in the GATHERING_INFO state. You MUST ask exactly ONE clarifying question (e.g., "What size do you wear?" or "Any color preference?"). You are STRICTLY FORBIDDEN from presenting products or using the search tool until you have gathered at least one or two specific criteria.
3. ASK if missing.
4. SEARCH Knowledge Base if criteria is present. NEVER confirm product availability, sizes, colors, or prices from memory. You MUST ALWAYS use the searchKnowledgeBase tool to verify real-time data before telling the user an item is in stock.
5. RESPOND based ONLY on Knowledge Base results.
----------------------------------

CRITICAL INSTRUCTION: When a user asks for specific products with attributes like size or color, you MUST extract these exact values and pass them as size and color arguments to the searchKnowledgeBase tool. Never ignore user filters.
CRITICAL: You MUST use the searchKnowledgeBase tool for product inquiries. If the user asks for a color in Arabic or French (e.g., "اللون الأسود" or "noir"), you MUST translate it to English (e.g., "black") before passing it to the color parameter in the tool call. Do the same for categories.

CRITICAL SCHEMA RULE: You must strictly match the tool argument keys exactly as defined (\`query\`, \`size\`, \`color\`).
* NEVER translate these keys into French (DO NOT use "categorie", "couleur", or "taille").
* The values for \`size\` and \`color\` MUST be flat strings, NEVER arrays (e.g., use "black", NOT ["black"]).

COLOR MAPPING RULE: You must translate ALL color inputs to English. If a user provides a French color, you MUST map it to the English equivalent: "noir" -> "black", "bleu" -> "blue", "blanc" -> "white", "rouge" -> "red". If the color cannot be mapped to a standard English color, you must omit the color filter entirely rather than passing a foreign word. Do NOT pass non-English color strings.

${settings.system_prompt || "You are a helpful customer support assistant. Provide brief, concise answers."}

CRITICAL RULE: At the end of every response, you MUST provide 2 to 4 short suggested reply buttons to guide the user's next choice. Format them EXACTLY like this:
[BUTTON] Option 1 [/BUTTON]
[BUTTON] Option 2 [/BUTTON]

CRITICAL RULE FOR BUTTONS: When suggesting categories, colors, or sizes in your buttons, you MUST ONLY use the EXACT options that exist in the STORE INVENTORY SUMMARY or search results. NEVER invent or guess categories, colors, or sizes that are not in the database.

${storeSummaryContext}
${previousContext}
`;

        const aiModelName = settings.ai_model || "meta-llama/llama-3-8b-instruct:free";
        let aiModelProvider;

        if (provider === 'anthropic') {
          const anthropic = createAnthropic({ apiKey: apiKey });
          aiModelProvider = anthropic(aiModelName);
        } else if (provider === 'openai') {
          const openai = createOpenAI({ apiKey: apiKey });
          aiModelProvider = openai(aiModelName);
        } else {
          const openrouter = createOpenRouter({ apiKey: apiKey });
          aiModelProvider = openrouter(aiModelName);
        }

        // ─── TOOL TIMEOUT CONSTANT ────────────────────────────────────────────
        const TOOL_TIMEOUT_MS = 7000; // 7-second strict timeout for KB searches

        const searchKnowledgeBaseTool = tool({
          description: 'Search the store inventory for products.',
          parameters: z.object({
            query: z.string().describe('The product name, description, or category to search for.'),
            size: z.string().optional().describe('Strictly a single plain string for the size, e.g., "S", "M", "L". NEVER an array.'),
            color: z.string().optional().describe('Strictly a single plain string for the color translated to English, e.g., "black", "red", "blue". NEVER an array.')
          }),
          execute: async ({ query, size, color }: { query: string; size?: string; color?: string }) => {
            console.log(`[searchKnowledgeBase] Tool triggered — query: "${query}", size: "${size ?? 'N/A'}", color: "${color ?? 'N/A'}"`);

            let supabaseQuery = supabase.from('products').select('*');

            // 1. Text search across name, description, and category
            if (query) {
              supabaseQuery = supabaseQuery.or(`name.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`);
            }

            // 2. Wildcard filters for size and color (so "S" matches "S,M,L" or "Size S")
            if (size) {
              supabaseQuery = supabaseQuery.ilike('size', `%${size}%`);
            }
            if (color) {
              supabaseQuery = supabaseQuery.ilike('color', `%${color}%`);
            }

            // ── Timeout wrapper ──────────────────────────────────────────────────
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('TOOL_TIMEOUT')), TOOL_TIMEOUT_MS)
            );

            let data: any[] | null = null;
            let dbError: any = null;
            try {
              const result = await Promise.race([supabaseQuery, timeoutPromise]) as { data: any[]; error: any };
              data = result.data;
              dbError = result.error;
            } catch (err: any) {
              if (err?.message === 'TOOL_TIMEOUT') {
                console.warn('[searchKnowledgeBase] ⏱ Query timed out after', TOOL_TIMEOUT_MS, 'ms — returning fallback.');
                // Return a sentinel string the catch below will recognise
                return '__TIMEOUT__';
              }
              throw err;
            }

            if (dbError) throw dbError;

            // ── Debug log: empty result ──────────────────────────────────────────
            if (!data || data.length === 0) {
              console.warn(`[searchKnowledgeBase] ⚠️ Empty result for query="${query}", size="${size ?? ''}", color="${color ?? ''}". No products matched.`);
              return [];
            }

            matchedProducts.push(...data); // Save for UI Carousel
            return data;
          },
        } as any);

        console.log('Tools being used:', JSON.stringify({ searchKnowledgeBase: searchKnowledgeBaseTool }, null, 2));

        // ── Global error boundary around generateText + tool execution ─────────
        let text = '';
        let toolCalls: any[] = [];
        let toolResults: any[] = [];
        let usage: any = null;

        const ARABIC_FALLBACK = 'سمحليا، وقع واحد الخطأ تقني، واش تقدر تعاود السؤال ديالك؟';
        const TIMEOUT_FALLBACK = 'البحث أخد وقت طويل، واش تقدر تدق السؤال أكثر؟';

        try {
          const result = await generateText({
            model: aiModelProvider,
            system: systemPrompt,
            prompt: message,
            stopWhen: stepCountIs(3),
            tools: {
              searchKnowledgeBase: searchKnowledgeBaseTool
            },
            toolChoice: 'required',
          });

          text = result.text ?? '';
          toolCalls = (result.toolCalls as any[]) ?? [];
          toolResults = (result.toolResults as any[]) ?? [];
          usage = result.usage;

          // ── Detect timeout sentinel from tool ────────────────────────────────
          const hadTimeout = toolResults.some((tr: any) => tr?.result === '__TIMEOUT__');
          if (hadTimeout) {
            console.warn('[chat/route] searchKnowledgeBase timed out — serving timeout fallback message.');
            text = TIMEOUT_FALLBACK;
          }

          // ── Detect empty AI response ─────────────────────────────────────────
          if (!text || text.trim() === '') {
            console.warn('[chat/route] generateText returned an empty response — serving Arabic fallback message.');
            text = ARABIC_FALLBACK;
          }

        } catch (toolError: any) {
          console.error('[chat/route] ❌ generateText / tool execution failed:', toolError?.message ?? toolError);
          text = ARABIC_FALLBACK;
        }

        // Parse dynamic buttons
        const buttonRegex = /\[BUTTON\](.*?)\[\/BUTTON\]/g;
        let suggestedButtons: string[] = [];
        let match;
        while ((match = buttonRegex.exec(text)) !== null) {
          suggestedButtons.push(match[1].trim());
        }
        responseText = text.replace(buttonRegex, '').trim();

        const providerName = provider === 'openai' ? 'OpenAI' : provider === 'anthropic' ? 'Anthropic' : 'OpenRouter';
        source = toolCalls && toolCalls.length > 0 ? `${providerName} + Tool Call` : providerName;

        // Deduplicate matched products for UI
        const uniqueProducts = Array.from(new Map(matchedProducts.map(p => [p.name, p])).values());

        rawJson = { 
          suggested_buttons: suggestedButtons,
          tool_calls: toolCalls,
          tool_results: toolResults,
          usage: usage
        };
        
        if (uniqueProducts.length > 0) {
          rawJson.matched_products = uniqueProducts;
        }

        usedAI = true;

        // Log token usage
        if (usage?.totalTokens && settings.id) {
          supabase.from("usage_logs").insert([
            { widget_id: settings.id, tokens_used: usage.totalTokens }
          ]).then(({ error }) => {
            if (error) console.error("Error logging usage:", error)
          })
        }

      } catch (error: any) {
        console.error("[AI STREAM ERROR]:", error)
        return NextResponse.json({ 
          error: error.message || error.toString(), 
          raw_error: error,
          stack: error.stack
        }, { status: 500 });
      }
    }

    if (!usedAI) {
      // If AI is disabled or keys are missing
      responseText = "AI is disabled or no valid API key was found."
      source = "System Warning"
      rawJson = { warning: "No AI interaction triggered" }
    }

    // Save the interaction to chat_messages
    if (sessionId) {
      await supabase.from("chat_messages").insert([
        { 
          session_id: sessionId, 
          user_message: message, 
          ai_response: responseText 
        }
      ])
    }

    return NextResponse.json({ response: responseText, source, raw_json: rawJson })
    
  } catch (error) {
    console.error("API Route Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
