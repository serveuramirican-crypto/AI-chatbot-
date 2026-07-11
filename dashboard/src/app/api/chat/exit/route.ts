import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { userMessage, exitConditions } = await req.json()

    if (!userMessage || !exitConditions || exitConditions.length === 0) {
      return NextResponse.json({ id: null })
    }

    const conditionsList = exitConditions
      .map((ec: any, i: number) => `${i + 1}. [ID: ${ec.id}] ${ec.description}`)
      .join("\n")

    const systemPrompt = `You are a routing classifier. Given a user message and a list of exit conditions, determine if the user message matches any exit condition semantically.
Return ONLY the ID of the matched condition (e.g. "ec_123_abc"), or return "none" if no condition matches.
Do not explain. Return exactly one word.`

    const userPrompt = `User message: "${userMessage}"

Exit conditions:
${conditionsList}

Does the user message match any exit condition? Return the ID or "none":`

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY || ''}`,
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "AI Chatbot Dashboard",
      },
      body: JSON.stringify({
        model: "anthropic/claude-3-haiku",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 50,
        temperature: 0,
      }),
    })

    if (!res.ok) {
      console.error("OpenRouter API Error (Exit Match):", await res.text())
      return NextResponse.json({ id: null })
    }

    const data = await res.json()
    const answer = (data?.choices?.[0]?.message?.content ?? "").trim()
    
    if (answer && answer.toLowerCase() !== "none") {
      // Find exact match (stripping any punctuation Claude might add)
      const found = exitConditions.find((ec: any) => answer.includes(ec.id))
      return NextResponse.json({ id: found ? found.id : null })
    }

    return NextResponse.json({ id: null })
  } catch (error) {
    console.error("Error in /api/chat/exit:", error)
    return NextResponse.json({ id: null })
  }
}
