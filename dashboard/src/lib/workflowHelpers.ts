export interface ProductItem {
  name: string;
  price: string;
  image: string;
  image_url?: string;
  description: string;
  link: string;
  // Extended fields for the details table
  color?: string;
  size?: string;
  category?: string;
  fabric?: string;
}

/**
 * Extracts AI-generated product cards from a <product_display>[...] block.
 * Runs FIRST in the parse pipeline so the raw block is stripped before
 * parseQuickReplies sees the text.
 * Degrades gracefully — bad JSON or absent tag returns empty array.
 */
export function parseProductDisplay(raw: string): {
  text: string;
  closingText: string;
  productCards: ProductItem[];
} {
  try {
    const match = raw.match(
      /([\s\S]*?)<product_display>\s*(\[[\s\S]*?\])\s*<\/product_display>([\s\S]*)/,
    );
    if (!match) return { text: raw, closingText: "", productCards: [] };
    const parsed = JSON.parse(match[2]);
    if (!Array.isArray(parsed))
      return { text: raw, closingText: "", productCards: [] };
    const productCards: ProductItem[] = parsed
      .filter(
        (item: any) =>
          item && typeof item === "object" && typeof item.name === "string",
      )
      .map((item: any) => {
        let finalImageUrl = item.image_url
          ? String(item.image_url)
          : item.imageUrl
            ? String(item.imageUrl)
            : undefined;

        // If the AI generated a placeholder URL with an unencoded space, fix it
        if (
          finalImageUrl &&
          finalImageUrl.includes("placehold.co") &&
          finalImageUrl.includes("?text=")
        ) {
          try {
            const urlObj = new URL(finalImageUrl);
            const textParam = urlObj.searchParams.get("text");
            if (textParam) {
              urlObj.searchParams.set("text", textParam);
              finalImageUrl = urlObj.toString();
            }
          } catch (e) {
            // ignore invalid URL
          }
        }

        return {
          name: String(item.name ?? ""),
          price: String(item.price ?? ""),
          image: String(
            item.image ??
            `https://placehold.co/400x300?text=${encodeURIComponent(item.name || "Product")}`,
          ),
          image_url: finalImageUrl,
          description: String(item.description ?? ""),
          link: String(item.link ?? "#"),
          // Extended fields for details table
          color: item.color ? String(item.color) : undefined,
          size: item.size ? String(item.size) : undefined,
          category: item.category ? String(item.category) : undefined,
          fabric: item.fabric ? String(item.fabric) : undefined,
        };
      });
    return {
      text: match[1].trimEnd(),
      closingText: match[3].trim(),
      productCards,
    };
  } catch {
    return { text: raw, closingText: "", productCards: [] };
  }
}

/**
 * Extracts AI-generated quick reply options from a <options>[...] block at the
 * end of a bot message. Returns the cleaned text and the parsed string array.
 * Degrades gracefully: if the tag is absent or the JSON is malformed, returns
 * the original text with an empty options array — no errors thrown.
 */
export function parseQuickReplies(raw: string): {
  text: string;
  quickReplies: string[];
} {
  try {
    const match = raw.match(/<options>\s*(\[[\s\S]*?\])\s*<\/options>/);
    if (!match) return { text: raw, quickReplies: [] };
    const parsed = JSON.parse(match[1]);
    if (!Array.isArray(parsed)) return { text: raw, quickReplies: [] };
    const quickReplies = parsed
      .filter((item) => typeof item === "string" && item.trim().length > 0)
      .map((item: string) => item.trim());
    // Strip the <options> block (and any leading whitespace before it) from display text
    const text = raw
      .replace(/\s*<options>\s*\[[\s\S]*?\]\s*<\/options>/, "")
      .trimEnd();
    return { text, quickReplies };
  } catch {
    return { text: raw, quickReplies: [] };
  }
}

/**
 * Strips the <thinking>...</thinking> reasoning block from the bot's response.
 * This is internal chain-of-thought that should never be shown to the end user.
 */
export function stripThinking(raw: string): string {
  return raw.replace(/<thinking>[\s\S]*?<\/thinking>/g, "").trim();
}

/**
 * Semantically checks if a user message matches any exit condition description.
 * Uses a lightweight LLM call to the OpenRouter API.
 * Returns the matched ExitCondition id or null.
 */
export async function matchExitCondition(
  userMessage: string,
  exitConditions: { id: string; description: string }[],
): Promise<string | null> {
  if (!exitConditions.length) return null;

  // Fast path: direct substring match (case-insensitive)
  const lower = userMessage.toLowerCase();
  for (const ec of exitConditions) {
    if (!ec.description) continue;
    // Extract key phrases from the description to check
    const descLower = ec.description.toLowerCase();
    // Check if the user message contains significant words from the description
    const words = descLower.split(/\s+/).filter((w) => w.length > 3);
    const matchCount = words.filter((w) => lower.includes(w)).length;
    if (words.length > 0 && matchCount / words.length >= 0.6) {
      return ec.id;
    }
  }

  // LLM-based semantic matching via server route
  try {
    // If the widget passes a project ID/host, you might need to resolve the absolute URL.
    // However, the widget loader or Next.js handles relative paths if hosted same-origin.
    // Assuming standard Next.js setup:
    const baseUrl = typeof window !== 'undefined' && (window as any).AIChatbotHost 
      ? (window as any).AIChatbotHost 
      : "";

    const res = await fetch(`${baseUrl}/api/chat/exit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userMessage,
        exitConditions,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.id || null;
  } catch (e) {
    console.error("matchExitCondition error:", e);
  }

  return null;
}

/**
 * Parses a <details_table>...</details_table> block into structured rows.
 * Expected format: JSON array of objects {label, value}
 */
export function parseDetailsTable(raw: string): {
  text: string;
  detailsTable: { label: string; value: string }[] | null;
} {
  try {
    const match = raw.match(/<details_table>\s*(\[[\s\S]*?\])\s*<\/details_table>/);
    if (!match) return { text: raw, detailsTable: null };
    const parsed = JSON.parse(match[1]);
    if (!Array.isArray(parsed)) return { text: raw, detailsTable: null };
    const text = raw
      .replace(/\s*<details_table>\s*\[[\s\S]*?\]\s*<\/details_table>/, "")
      .trimEnd();
    return { text, detailsTable: parsed };
  } catch {
    return { text: raw, detailsTable: null };
  }
}
