import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildAgentMessages } from "@/lib/ai/buildMessages";
import {
  runWebSearch,
  formatResearchForPrompt,
  generateSearchQuery,
  type ResearchSource,
} from "@/lib/ai/research";
import {
  fetchMultipleUrls,
  createContentSnippet,
} from "@/lib/web/fetchUrlText";

export const runtime = "nodejs";

// Simple in-memory rate limiting for web search
const webSearchCooldowns = new Map<string, number>();
const WEB_SEARCH_COOLDOWN_MS = 5000; // 5 seconds
const MAX_OPEN_URLS = 2;

// Action types
type ActionType = "append_to_note" | "replace_note" | "update_title" | "add_labels" | "set_labels" | "create_note";

type AppendData = {
  text: string;
  position: "end" | "start";
};

type ReplaceData = {
  content: string;
};

type TitleData = {
  title: string;
};

type LabelsData = {
  labels: string[];
};

type CreateNoteData = {
  title: string;
  content: string;
};

type AgentAction = {
  type: ActionType;
  data: AppendData | ReplaceData | TitleData | LabelsData | CreateNoteData;
};

type ResultData = {
  title: string;
  content: string;
  sources: Array<{ title: string; url: string }>;
};

type AgentResponse = {
  reply: string;
  result: ResultData | null;
  actions: AgentAction[];
  requiresConfirm: boolean;
  assumptions: string[];
};

// Intent detection: auto-detect mode from message content
function detectIntent(message: string): { mode: string; detail: string } | null {
  const lower = message.toLowerCase();
  
  // Market analysis only for explicit requests
  if (lower.match(/marktanalyse|concurrenten|pricing|tam.?sam.?som|markt.?onderzoek/)) {
    return { mode: "market_analysis", detail: "deep" };
  }
  
  // Research mode for research-related requests
  if (lower.match(/zoek\s+(op|naar|online)|onderzoek|bronnen|research/)) {
    return { mode: "research", detail: "normal" };
  }
  
  // Short responses for quick tasks
  if (lower.match(/^(maak\s+)?bullets?$|^vat\s+samen$|^samenvatten$/)) {
    return { mode: "general", detail: "short" };
  }
  
  return null; // Use provided mode/detail
}

function validateResponse(data: unknown, detail: string): AgentResponse | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;

  // Reply is required
  if (typeof obj.reply !== "string" || !obj.reply.trim()) return null;

  // Parse result object
  let result: ResultData | null = null;
  if (obj.result && typeof obj.result === "object") {
    const r = obj.result as Record<string, unknown>;
    result = {
      title: typeof r.title === "string" ? r.title : "",
      content: typeof r.content === "string" ? r.content : "",
      sources: [],
    };
    if (Array.isArray(r.sources)) {
      result.sources = r.sources
        .filter((s): s is Record<string, unknown> => s && typeof s === "object")
        .map((s) => ({
          title: String(s.title || ""),
          url: String(s.url || ""),
        }))
        .filter((s) => s.url.startsWith("http"))
        .slice(0, 10);
    }
  }

  // Parse assumptions
  let assumptions: string[] = [];
  if (Array.isArray(obj.assumptions)) {
    assumptions = obj.assumptions
      .filter((a): a is string => typeof a === "string")
      .slice(0, 5);
  }

  // Actions array
  let actions: AgentAction[] = [];
  if (Array.isArray(obj.actions)) {
    actions = obj.actions
      .filter((a): a is Record<string, unknown> => a && typeof a === "object")
      .map((a) => {
        const type = a.type as ActionType;
        const data = a.data as Record<string, unknown>;

        if (!type || !data) return null;

        // Validate each action type
        switch (type) {
          case "append_to_note":
            if (typeof data.text !== "string") return null;
            return {
              type,
              data: {
                text: data.text.slice(0, 40000),
                position: data.position === "start" ? "start" : "end",
              } as AppendData,
            };

          case "replace_note":
            if (typeof data.content !== "string") return null;
            return {
              type,
              data: {
                content: data.content.slice(0, 40000),
              } as ReplaceData,
            };

          case "update_title":
            if (typeof data.title !== "string") return null;
            return {
              type,
              data: {
                title: data.title.slice(0, 200),
              } as TitleData,
            };

          case "add_labels":
          case "set_labels":
            if (!Array.isArray(data.labels)) return null;
            const validLabels = data.labels
              .filter((l): l is string => typeof l === "string")
              .map((l) => l.trim())
              .filter((l) => l.length > 0 && l.length <= 20)
              .slice(0, 6);
            return {
              type: "set_labels", // Normalize to set_labels
              data: { labels: validLabels } as LabelsData,
            };

          case "create_note":
            if (typeof data.title !== "string" || typeof data.content !== "string") return null;
            return {
              type,
              data: {
                title: data.title.slice(0, 200),
                content: data.content.slice(0, 40000),
              } as CreateNoteData,
            };

          default:
            return null;
        }
      })
      .filter((a): a is AgentAction => a !== null)
      .slice(0, 3); // Max 3 actions
  }

  // requiresConfirm - default to true for safety
  let requiresConfirm = true;
  if (typeof obj.requiresConfirm === "boolean") {
    requiresConfirm = obj.requiresConfirm;
  }
  // Force confirm for replace_note
  if (actions.some((a) => a.type === "replace_note")) {
    requiresConfirm = true;
  }

  return {
    reply: obj.reply.trim(),
    result,
    actions,
    requiresConfirm,
    assumptions,
  };
}

// Check if response seems too thin for substantive requests
function responseSeemsIncomplete(response: AgentResponse, message: string): boolean {
  const lower = message.toLowerCase();
  
  // Only check for substantive requests
  const isSubstantive = lower.match(/analyseer|rapport|marktanalyse|onderzoek.*uitgebreid|deep|diep/);
  if (!isSubstantive) return false;
  
  // Check if result content is very thin (less than 400 chars for a substantive request)
  const contentLength = response.result?.content?.length || 0;
  const actionContentLength = response.actions.reduce((sum, a) => {
    const data = a.data as Record<string, unknown>;
    return sum + String(data.text || data.content || "").length;
  }, 0);
  
  return (contentLength + actionContentLength) < 400;
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_TEXT_MODEL || "gpt-4o";

    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key niet geconfigureerd" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { 
      noteId, 
      message, 
      execute = false, 
      web = false,
      detail = "normal",
      mode = "general",
    } = body;

    // Validate: noteId is REQUIRED (anti-hallucination guardrail)
    if (!noteId || typeof noteId !== "string") {
      return NextResponse.json(
        { error: "Selecteer eerst een notitie om de agent te gebruiken." },
        { status: 400 }
      );
    }
    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "message is verplicht" }, { status: 400 });
    }
    // Validate detail level
    const validDetails = ["short", "normal", "deep"];
    const validModes = ["general", "research", "market_analysis"];
    
    // Intent detection: auto-detect mode from message if not explicitly set or if general
    const detectedIntent = detectIntent(message);
    let actualDetail = validDetails.includes(detail) ? detail : "normal";
    let actualMode = validModes.includes(mode) ? mode : "general";
    
    // Override with detected intent for better UX
    if (detectedIntent) {
      // Only override if user hasn't explicitly chosen a different mode
      if (mode === "general" || !validModes.includes(mode)) {
        actualMode = detectedIntent.mode;
      }
      // Suggest shorter detail for quick tasks
      if (detectedIntent.detail === "short" && detail === "normal") {
        actualDetail = "short";
      }
    }

    // Auth check
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    // Rate limiting for web search
    if (web) {
      const lastCall = webSearchCooldowns.get(user.id);
      const now = Date.now();
      if (lastCall && now - lastCall < WEB_SEARCH_COOLDOWN_MS) {
        const waitSeconds = Math.ceil((WEB_SEARCH_COOLDOWN_MS - (now - lastCall)) / 1000);
        return NextResponse.json(
          { error: `Even wachten... (${waitSeconds}s)` },
          { status: 429 }
        );
      }
      webSearchCooldowns.set(user.id, now);
    }

    // Fetch note from DB (server is source of truth - anti-hallucination)
    const { data: noteData, error: noteError } = await supabase
      .from("notes")
      .select("id, title, content, labels")
      .eq("id", noteId)
      .eq("user_id", user.id)
      .single();

    if (noteError || !noteData) {
      return NextResponse.json({ error: "Note niet gevonden" }, { status: 404 });
    }
    
    const note = noteData;
    const noteIsEmpty = !note.content || note.content.trim().length < 10;

    // Handle empty note: be helpful, not blocking
    if (noteIsEmpty && !web) {
      const needsContent = message.toLowerCase().includes("samenva") || 
                          message.toLowerCase().includes("bullet") ||
                          message.toLowerCase().includes("herschrijf alles");
      
      if (needsContent) {
        return NextResponse.json({
          reply: `Je notitie is nog leeg. Ik kan helpen zodra je wat tekst hebt toegevoegd, of ik kan online zoeken als je de web search aanzet. Waar gaat je notitie over?`,
          result: null,
          actions: [],
          requiresConfirm: false,
          assumptions: [],
        });
      }
    }

    // Web research pipeline (if enabled)
    let researchContext = "";
    let sources: ResearchSource[] = [];
    let pageSnippets = "";
    
    if (web) {
      console.log("[Agent] Web search enabled, starting research pipeline");
      
      // Step 1: Run web search
      const searchQuery = generateSearchQuery(message.trim(), note?.title || null);
      console.log("[Agent] Search query:", searchQuery);
      
      const research = await runWebSearch(searchQuery);
      sources = research.sources;
      researchContext = formatResearchForPrompt(research);
      
      console.log("[Agent] Research complete:", sources.length, "sources found");

      // Step 2: Open top sources to get more context
      if (sources.length > 0) {
        const urls = sources.map((s) => s.url);
        const fetchResults = await fetchMultipleUrls(urls, MAX_OPEN_URLS);
        pageSnippets = createContentSnippet(fetchResults);
        console.log("[Agent] Fetched", fetchResults.filter((r) => r.success).length, "pages");
      }
    }

    // Build full research context
    const fullResearchContext = researchContext + (pageSnippets ? `\n\n${pageSnippets}` : "");
    
    // Build messages with new options
    const messages = buildAgentMessages({
      noteTitle: note?.title || null,
      noteContent: note?.content || "",
      userMessage: message.trim(),
      detail: actualDetail,
      mode: actualMode,
      webEnabled: web,
      researchContext: fullResearchContext || undefined,
    });

    // Call GPT
    console.log("[Agent] Calling GPT model:", model);
    const gptResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.4,
        max_tokens: 4000,
        response_format: { type: "json_object" },
      }),
    });

    if (!gptResponse.ok) {
      const errorText = await gptResponse.text();
      console.error("[Agent] GPT error:", gptResponse.status, errorText);
      return NextResponse.json({ error: "AI antwoord mislukt" }, { status: 500 });
    }

    const gptResult = await gptResponse.json();
    const content = gptResult.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ error: "Geen antwoord van AI" }, { status: 500 });
    }

    // Parse and validate
    let agentResult: AgentResponse | null = null;
    try {
      const jsonData = JSON.parse(content);
      agentResult = validateResponse(jsonData, actualDetail);
    } catch {
      console.error("[Agent] Invalid JSON from GPT:", content);
      return NextResponse.json({
        reply: "Sorry, ik kon geen goed antwoord genereren. Probeer het opnieuw.",
        result: null,
        actions: [],
        requiresConfirm: false,
        assumptions: [],
      });
    }

    if (!agentResult) {
      return NextResponse.json({
        reply: "Sorry, ik kon geen goed antwoord genereren. Probeer het opnieuw.",
        result: null,
        actions: [],
        requiresConfirm: false,
        assumptions: [],
      });
    }

    // Check if response seems incomplete for deep/substantive requests
    // Only retry for truly thin responses on complex requests
    if (responseSeemsIncomplete(agentResult, message)) {
      console.log("[Agent] Response seems thin for substantive request, requesting more detail");
      
      // Add gentle expansion request and retry
      const retryMessages = [
        ...messages,
        { role: "assistant" as const, content },
        { role: "user" as const, content: `Dit is te kort voor mijn vraag. Kun je meer details geven? Voeg context, voorbeelden of next steps toe.` },
      ];

      const retryResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: retryMessages,
          temperature: 0.4,
          max_tokens: 4000,
          response_format: { type: "json_object" },
        }),
      });

      if (retryResponse.ok) {
        const retryResult = await retryResponse.json();
        const retryContent = retryResult.choices?.[0]?.message?.content;
        if (retryContent) {
          try {
            const retryJson = JSON.parse(retryContent);
            const expandedResult = validateResponse(retryJson, actualDetail);
            if (expandedResult) {
              agentResult = expandedResult;
              console.log("[Agent] Expanded response accepted");
            }
          } catch {
            console.log("[Agent] Retry parse failed, using original");
          }
        }
      }
    }

    // PREVIEW mode - return without executing
    if (!execute) {
      return NextResponse.json({
        ...agentResult,
        sources: web ? sources : undefined,
      });
    }

    // EXECUTE mode - perform actions
    if (execute && agentResult.actions.length > 0) {
      let updatedNote = note ? { ...note } : null;
      let createdNoteId: string | null = null;

      for (const action of agentResult.actions) {
        switch (action.type) {
          case "append_to_note": {
            if (!updatedNote) break;
            const data = action.data as AppendData;
            const separator = "\n\n";
            if (data.position === "start") {
              updatedNote.content = data.text + separator + (updatedNote.content || "");
            } else {
              updatedNote.content = (updatedNote.content || "") + separator + data.text;
            }
            break;
          }

          case "replace_note": {
            if (!updatedNote) break;
            const data = action.data as ReplaceData;
            updatedNote.content = data.content;
            break;
          }

          case "update_title": {
            if (!updatedNote) break;
            const data = action.data as TitleData;
            updatedNote.title = data.title;
            break;
          }

          case "add_labels":
          case "set_labels": {
            if (!updatedNote) break;
            const data = action.data as LabelsData;
            // set_labels replaces labels, not merges
            updatedNote.labels = data.labels.slice(0, 6);
            break;
          }

          case "create_note": {
            const data = action.data as CreateNoteData;
            const { data: newNote, error: createError } = await supabase
              .from("notes")
              .insert({
                user_id: user.id,
                title: data.title,
                content: data.content,
                labels: [],
              })
              .select("id")
              .single();

            if (createError) {
              console.error("[Agent] Create note error:", createError);
            } else if (newNote) {
              createdNoteId = newNote.id;
              console.log("[Agent] Created new note:", createdNoteId);
            }
            break;
          }
        }
      }

      // Update existing note in database
      if (updatedNote && noteId) {
        const updateData: Record<string, unknown> = {};
        if (updatedNote.content !== note?.content) updateData.content = updatedNote.content;
        if (updatedNote.title !== note?.title) updateData.title = updatedNote.title;
        if (JSON.stringify(updatedNote.labels) !== JSON.stringify(note?.labels)) {
          updateData.labels = updatedNote.labels;
        }

        if (Object.keys(updateData).length > 0) {
          const { error: updateError } = await supabase
            .from("notes")
            .update(updateData)
            .eq("id", noteId)
            .eq("user_id", user.id);

          if (updateError) {
            console.error("[Agent] Update error:", updateError);
            return NextResponse.json({ error: "Wijzigingen opslaan mislukt" }, { status: 500 });
          }
        }
      }

      return NextResponse.json({
        ...agentResult,
        executed: true,
        updatedNote: updatedNote ? {
          id: noteId,
          title: updatedNote.title,
          content: updatedNote.content,
          labels: updatedNote.labels,
        } : undefined,
        createdNoteId,
        sources: web ? sources : undefined,
      });
    }

    return NextResponse.json({
      ...agentResult,
      sources: web ? sources : undefined,
    });
  } catch (error) {
    console.error("[Agent] Error:", error);
    return NextResponse.json({ error: "Server fout" }, { status: 500 });
  }
}
