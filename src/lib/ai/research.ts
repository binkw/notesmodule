/**
 * Web research helper for the Notes Agent.
 * Server-side only - uses OpenAI Responses API with web_search_preview tool.
 */

export type ResearchSource = {
  title: string;
  url: string;
  snippet: string;
};

export type ResearchResult = {
  research: string;
  sources: ResearchSource[];
};

const MAX_SOURCES = 5;
const MAX_QUERY_LENGTH = 200;
const MAX_RESEARCH_TEXT = 8000;

/**
 * Run web search using OpenAI Responses API with web_search_preview tool.
 * Returns research summary and sources.
 */
export async function runWebSearch(
  query: string,
  maxSources: number = MAX_SOURCES
): Promise<ResearchResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_RESEARCH_MODEL || "gpt-4o-mini";

  if (!apiKey) {
    console.error("[Research] Missing OPENAI_API_KEY");
    return { research: "", sources: [] };
  }

  const sanitizedQuery = query.slice(0, MAX_QUERY_LENGTH).trim();
  if (!sanitizedQuery) {
    return { research: "", sources: [] };
  }

  console.log("[Research] Starting web search for:", sanitizedQuery);

  try {
    // Use OpenAI Responses API with web_search_preview tool
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        tools: [{ type: "web_search_preview" }],
        input: `Zoek informatie over: ${sanitizedQuery}

Je taak:
1. Zoek relevante bronnen op het web
2. Geef een korte samenvatting van de belangrijkste bevindingen
3. Gebruik maximaal ${maxSources} bronnen

BELANGRIJK: Antwoord ALLEEN in valid JSON formaat:
{
  "research": "Korte samenvatting van bevindingen in het Nederlands",
  "sources": [
    { "title": "Titel van bron", "url": "https://..." }
  ]
}

Geen markdown, geen extra tekst, ALLEEN JSON.`,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Research] API error:", response.status, errorText);
      
      // Fallback: try chat completions API
      return await runWebSearchFallback(sanitizedQuery, apiKey, model, maxSources);
    }

    const data = await response.json();
    console.log("[Research] Raw response received");

    // Parse the response - Responses API returns output_text or output array
    let outputText = "";
    if (data.output_text) {
      outputText = data.output_text;
    } else if (Array.isArray(data.output)) {
      // Find the text output
      for (const item of data.output) {
        if (item.type === "message" && item.content) {
          for (const content of item.content) {
            if (content.type === "output_text" || content.type === "text") {
              outputText = content.text || content.output_text || "";
              break;
            }
          }
        }
      }
    }

    // Also check for inline sources from annotations
    const inlineSources: ResearchSource[] = [];
    if (data.output && Array.isArray(data.output)) {
      for (const item of data.output) {
        if (item.type === "message" && item.content) {
          for (const content of item.content) {
            if (content.annotations && Array.isArray(content.annotations)) {
              for (const ann of content.annotations) {
                if (ann.type === "url_citation" && ann.url) {
                  inlineSources.push({
                    title: ann.title || ann.url,
                    url: ann.url,
                    snippet: ann.text || "",
                  });
                }
              }
            }
          }
        }
      }
    }

    // Try to parse JSON from output
    const result = parseResearchJSON(outputText, inlineSources, maxSources);
    
    if (result.sources.length === 0 && inlineSources.length > 0) {
      result.sources = inlineSources.slice(0, maxSources);
    }

    console.log("[Research] Parsed result:", result.sources.length, "sources found");
    return result;

  } catch (error) {
    console.error("[Research] Error:", error);
    return { research: "", sources: [] };
  }
}

/**
 * Fallback to chat completions API if Responses API fails.
 */
async function runWebSearchFallback(
  query: string,
  apiKey: string,
  model: string,
  maxSources: number
): Promise<ResearchResult> {
  console.log("[Research] Trying fallback chat completions API");

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: `Je bent een research assistent. Zoek informatie en geef resultaten in JSON formaat.

Antwoord ALLEEN met valid JSON:
{
  "research": "Korte samenvatting in het Nederlands",
  "sources": [{ "title": "...", "url": "https://..." }]
}

Max ${maxSources} bronnen. Geen markdown.`,
          },
          {
            role: "user",
            content: `Zoek informatie over: ${query}`,
          },
        ],
        tools: [
          {
            type: "web_search_preview",
            search_context_size: "medium",
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      console.error("[Research] Fallback API error:", response.status);
      return { research: "", sources: [] };
    }

    const data = await response.json();
    const messageContent = data.choices?.[0]?.message?.content || "";

    // Extract sources from annotations
    const annotationSources: ResearchSource[] = [];
    const annotations = data.choices?.[0]?.message?.annotations || [];
    
    for (const ann of annotations.slice(0, maxSources)) {
      if (ann.type === "url_citation" && ann.url_citation) {
        annotationSources.push({
          title: ann.url_citation.title || ann.url_citation.url,
          url: ann.url_citation.url,
          snippet: ann.text || "",
        });
      }
    }

    const result = parseResearchJSON(messageContent, annotationSources, maxSources);
    console.log("[Research] Fallback result:", result.sources.length, "sources");
    return result;

  } catch (error) {
    console.error("[Research] Fallback error:", error);
    return { research: "", sources: [] };
  }
}

/**
 * Parse research JSON from model output.
 */
function parseResearchJSON(
  text: string,
  fallbackSources: ResearchSource[],
  maxSources: number
): ResearchResult {
  // Try to extract JSON from the text
  let jsonStr = text.trim();
  
  // Remove markdown code blocks if present
  if (jsonStr.startsWith("```json")) {
    jsonStr = jsonStr.slice(7);
  } else if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.slice(3);
  }
  if (jsonStr.endsWith("```")) {
    jsonStr = jsonStr.slice(0, -3);
  }
  jsonStr = jsonStr.trim();

  try {
    const parsed = JSON.parse(jsonStr);
    
    // Validate structure
    const research = typeof parsed.research === "string" 
      ? parsed.research.slice(0, MAX_RESEARCH_TEXT) 
      : text.slice(0, MAX_RESEARCH_TEXT);
    
    const sources: ResearchSource[] = [];
    
    if (Array.isArray(parsed.sources)) {
      for (const src of parsed.sources.slice(0, maxSources)) {
        if (
          src &&
          typeof src.url === "string" &&
          src.url.startsWith("https://") &&
          typeof src.title === "string" &&
          src.title.length > 0
        ) {
          sources.push({
            title: src.title.slice(0, 200),
            url: src.url,
            snippet: typeof src.snippet === "string" ? src.snippet.slice(0, 500) : "",
          });
        }
      }
    }

    // Use fallback sources if none found in JSON
    if (sources.length === 0 && fallbackSources.length > 0) {
      return { research, sources: fallbackSources.slice(0, maxSources) };
    }

    return { research, sources };
  } catch {
    // JSON parse failed - return text as research with fallback sources
    console.log("[Research] JSON parse failed, using fallback");
    return {
      research: text.slice(0, MAX_RESEARCH_TEXT),
      sources: fallbackSources.slice(0, maxSources),
    };
  }
}

/**
 * Format research results for inclusion in agent prompt.
 */
export function formatResearchForPrompt(result: ResearchResult): string {
  if (!result.research && result.sources.length === 0) {
    return "";
  }

  let formatted = `\n\n--- WEB RESEARCH ---\n${result.research}`;
  
  if (result.sources.length > 0) {
    formatted += "\n\nGevonden bronnen:";
    result.sources.forEach((source, i) => {
      formatted += `\n[${i + 1}] ${source.title} - ${source.url}`;
    });
  }
  
  formatted += "\n--- EINDE RESEARCH ---\n";
  
  return formatted;
}

/**
 * Generate a search query from the user message.
 */
export function generateSearchQuery(message: string, noteTitle: string | null): string {
  // Extract search intent from message
  const searchPatterns = [
    /zoek\s+(?:op\s+)?(?:naar\s+)?(.+)/i,
    /wat\s+(?:is|zijn|weet je over)\s+(.+)/i,
    /informatie\s+over\s+(.+)/i,
  ];

  for (const pattern of searchPatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      return match[1].slice(0, MAX_QUERY_LENGTH).trim();
    }
  }

  // Default: use message with optional note context
  const context = noteTitle ? `${noteTitle}: ` : "";
  return `${context}${message}`.slice(0, MAX_QUERY_LENGTH);
}
