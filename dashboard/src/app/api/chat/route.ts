import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(req: Request) {
  try {
    const { message, sessionId } = await req.json()

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    // Save the user's message to chat_logs
    if (sessionId) {
      await supabase.from("chat_logs").insert([
        { session_id: sessionId, message: message, sender: "user" }
      ])
    }

    // Phase 1: Database Search (Basic keyword matching on text sources)
    // We search the 'metadata->>content' for the keywords in the message.
    // For a production app, use pgvector embeddings instead.
    const searchTerms = message.split(' ').filter((w: string) => w.length > 3)
    let dbMatch = null
    let matchedProduct = null
    let source = "Unknown"
    let rawJson: any = null

    if (searchTerms.length > 0) {
      const orConditions = searchTerms.map((term: string) => 
        `metadata->>content.ilike.%${term}%,metadata->>name.ilike.%${term}%,metadata->>description.ilike.%${term}%,metadata->>category.ilike.%${term}%`
      ).join(',')
        
      const { data: sources } = await supabase
        .from('knowledge_sources')
        .select('*')
        .in('type', ['text', 'product'])
        .or(orConditions)
        .limit(1)
      
      if (sources && sources.length > 0) {
        if (sources[0].type === 'product') {
          matchedProduct = sources[0].metadata
        } else {
          dbMatch = sources[0].metadata?.content
        }
      }
    }

    let responseText = ""

    if (matchedProduct) {
      responseText = `Here is a product you might be interested in:\n\n**${matchedProduct.name}** - ${matchedProduct.price}\n`
      if (matchedProduct.category) responseText += `*Category: ${matchedProduct.category}*\n\n`
      if (matchedProduct.description) responseText += `${matchedProduct.description}\n\n`
      if (matchedProduct.link) responseText += `[View Product](${matchedProduct.link})\n`
      if (matchedProduct.image_url) responseText += `\n![${matchedProduct.name}](${matchedProduct.image_url})`
      
      source = "Supabase"
      rawJson = { matched_product: matchedProduct }
    } else if (dbMatch) {
      // Return the matched knowledge base entry
      responseText = `Based on our knowledge base: ${dbMatch}`
      source = "Supabase"
      rawJson = { matched_content: dbMatch }
    } else {
      // Phase 2: AI Fallback using OpenRouter
      const { data: settings } = await supabase
        .from('widget_settings')
        .select('*')
        .limit(1)
        .single()

      if (settings?.enable_ai_fallback) {
        if (!settings?.openrouter_api_key) {
          source = "System Error"
          rawJson = { error: "API Key not configured" }
          responseText = "I'm sorry, my AI provider API Key is not configured."
        } else {
          try {
            const payload = {
              model: settings.ai_model || "meta-llama/llama-3-8b-instruct:free",
              messages: [
                { role: "system", content: "You are a helpful customer support assistant. Provide brief, concise answers." },
                { role: "user", content: message }
              ]
            }
            console.log("OpenRouter Request Payload:", JSON.stringify(payload, null, 2))

            const openRouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${settings.openrouter_api_key}`,
                "HTTP-Referer": process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:3000",
                "Content-Type": "application/json"
              },
              body: JSON.stringify(payload)
            })

            if (openRouterRes.ok) {
              const result = await openRouterRes.json()
              responseText = result.choices[0].message.content
              source = "OpenRouter"
              rawJson = result
            } else {
              const errorText = await openRouterRes.text()
              console.error("OpenRouter Error:", errorText)
              responseText = "I'm sorry, I'm currently unable to connect to my AI provider. Please try again later."
              source = "OpenRouter Error"
              rawJson = {
                status: openRouterRes.status,
                statusText: openRouterRes.statusText,
                error: errorText
              }
            }
          } catch (error: any) {
            console.error("Fetch Error:", error)
            responseText = "I'm sorry, I encountered an error while trying to process your request."
            source = "System Error"
            rawJson = { error: error.message || String(error) }
          }
        }
      } else {
        responseText = "I'm sorry, I don't have the answer to that and AI fallback is currently disabled."
        source = "System"
        rawJson = { info: "AI Fallback is disabled in settings" }
      }
    }

    // Save the bot's response to chat_logs
    if (sessionId) {
      await supabase.from("chat_logs").insert([
        { session_id: sessionId, message: responseText, sender: "bot" }
      ])
    }

    // Phase 3: Response
    return NextResponse.json({ response: responseText, source, raw_json: rawJson })
    
  } catch (error) {
    console.error("API Route Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
