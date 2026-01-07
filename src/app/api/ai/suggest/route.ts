import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `Je bent een AI-assistent die helpt met het organiseren van notities.
Analyseer de gegeven notitie en genereer 1-6 suggesties.

Mogelijke suggestie types:
- "title": Stel een betere titel voor
- "next_steps": Identificeer actiepunten/taken uit de tekst

Reageer ALLEEN met valid JSON in dit formaat:
{
  "suggestions": [
    {
      "type": "title",
      "why": "Korte uitleg waarom",
      "confidence": "low" | "medium" | "high",
      "payload": { "title": "Voorgestelde titel" }
    },
    {
      "type": "next_steps",
      "why": "Korte uitleg waarom",
      "confidence": "low" | "medium" | "high",
      "payload": { "steps": ["Stap 1", "Stap 2"] }
    }
  ]
}

Regels:
- Max 6 suggesties
- Alleen relevante suggesties
- confidence: "high" als duidelijk, "medium" als waarschijnlijk, "low" als gok
- Nederlandse taal
- GEEN markdown, ALLEEN JSON`;

type SuggestionPayload = {
  title?: string;
  steps?: string[];
};

type GPTSuggestion = {
  type: "title" | "next_steps";
  why: string;
  confidence: "low" | "medium" | "high";
  payload: SuggestionPayload;
};

type GPTResponse = {
  suggestions: GPTSuggestion[];
};

function validateGPTResponse(data: unknown): GPTResponse | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  
  if (!Array.isArray(obj.suggestions)) return null;
  
  const validTypes = ["title", "next_steps"];
  const validConfidences = ["low", "medium", "high"];
  
  const validSuggestions = obj.suggestions.filter((s: unknown) => {
    if (!s || typeof s !== "object") return false;
    const sug = s as Record<string, unknown>;
    
    if (!validTypes.includes(sug.type as string)) return false;
    if (!validConfidences.includes(sug.confidence as string)) return false;
    if (typeof sug.why !== "string") return false;
    if (!sug.payload || typeof sug.payload !== "object") return false;
    
    return true;
  });
  
  return { suggestions: validSuggestions as GPTSuggestion[] };
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
    const { noteId } = body;

    if (!noteId) {
      return NextResponse.json(
        { error: "noteId is verplicht" },
        { status: 400 }
      );
    }

    // Auth check
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Niet ingelogd" },
        { status: 401 }
      );
    }

    // Fetch note
    const { data: note, error: noteError } = await supabase
      .from("notes")
      .select("*")
      .eq("id", noteId)
      .eq("user_id", user.id)
      .single();

    if (noteError || !note) {
      return NextResponse.json(
        { error: "Note niet gevonden" },
        { status: 404 }
      );
    }

    // Call GPT
    const userMessage = `Analyseer deze notitie en geef suggesties:

Titel: ${note.title || "(geen titel)"}
Inhoud:
${note.content || "(leeg)"}`;

    const gptResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 1000,
        response_format: { type: "json_object" },
      }),
    });

    if (!gptResponse.ok) {
      const errorText = await gptResponse.text();
      console.error("[Suggest] GPT error:", gptResponse.status, errorText);
      return NextResponse.json(
        { error: "AI suggesties genereren mislukt" },
        { status: 500 }
      );
    }

    const gptResult = await gptResponse.json();
    const content = gptResult.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: "Geen response van AI" },
        { status: 500 }
      );
    }

    // Parse and validate JSON
    let parsed: GPTResponse | null = null;
    try {
      const jsonData = JSON.parse(content);
      parsed = validateGPTResponse(jsonData);
    } catch {
      console.error("[Suggest] Invalid JSON from GPT:", content);
      return NextResponse.json(
        { error: "AI gaf ongeldige response" },
        { status: 500 }
      );
    }

    if (!parsed || parsed.suggestions.length === 0) {
      return NextResponse.json({ suggestions: [] });
    }

    // Store suggestions in DB
    const suggestionsToInsert = parsed.suggestions.map((s) => ({
      user_id: user.id,
      scope: "note" as const,
      note_id: noteId,
      tab: "suggesties" as const,
      type: s.type,
      payload: s.payload,
      why: s.why,
      confidence: s.confidence,
      status: "pending" as const,
    }));

    const { data: inserted, error: insertError } = await supabase
      .from("ai_suggestions")
      .insert(suggestionsToInsert)
      .select("*");

    if (insertError) {
      console.error("[Suggest] Insert error:", insertError);
      return NextResponse.json(
        { error: "Suggesties opslaan mislukt" },
        { status: 500 }
      );
    }

    return NextResponse.json({ suggestions: inserted });
  } catch (error) {
    console.error("[Suggest] Error:", error);
    return NextResponse.json(
      { error: "Server fout" },
      { status: 500 }
    );
  }
}

