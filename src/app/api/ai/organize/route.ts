import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `Je bent een AI-assistent die helpt met het organiseren van notities in projecten/categorieën.
Analyseer de gegeven notities en stel een logische indeling voor.

Reageer ALLEEN met valid JSON in dit formaat:
{
  "projects": [
    { "tempKey": "p1", "name": "Projectnaam" },
    { "tempKey": "p2", "name": "Andere categorie" }
  ],
  "assignments": [
    { "noteId": "uuid-van-note", "projectTempKey": "p1", "why": "Korte uitleg" }
  ]
}

Regels:
- Max 8 projecten
- Alleen notes toewijzen als het logisch is
- Notes zonder duidelijke categorie niet toewijzen
- projectTempKey moet matchen met een project in de projects array
- Nederlandse taal
- GEEN markdown, ALLEEN JSON`;

type GPTProject = {
  tempKey: string;
  name: string;
};

type GPTAssignment = {
  noteId: string;
  projectTempKey: string;
  why: string;
};

type GPTResponse = {
  projects: GPTProject[];
  assignments: GPTAssignment[];
};

function validateGPTResponse(data: unknown): GPTResponse | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  
  if (!Array.isArray(obj.projects) || !Array.isArray(obj.assignments)) return null;
  
  const validProjects = obj.projects.filter((p: unknown) => {
    if (!p || typeof p !== "object") return false;
    const proj = p as Record<string, unknown>;
    return typeof proj.tempKey === "string" && typeof proj.name === "string";
  }) as GPTProject[];
  
  const projectKeys = new Set(validProjects.map((p) => p.tempKey));
  
  const validAssignments = obj.assignments.filter((a: unknown) => {
    if (!a || typeof a !== "object") return false;
    const assign = a as Record<string, unknown>;
    return (
      typeof assign.noteId === "string" &&
      typeof assign.projectTempKey === "string" &&
      typeof assign.why === "string" &&
      projectKeys.has(assign.projectTempKey)
    );
  }) as GPTAssignment[];
  
  return { projects: validProjects, assignments: validAssignments };
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

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(body.limit || 50, 50);

    // Auth check
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Niet ingelogd" },
        { status: 401 }
      );
    }

    // Fetch recent notes
    const { data: notes, error: notesError } = await supabase
      .from("notes")
      .select("id, title, content")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (notesError) {
      return NextResponse.json(
        { error: "Notes ophalen mislukt" },
        { status: 500 }
      );
    }

    if (!notes || notes.length === 0) {
      return NextResponse.json({ suggestions: [] });
    }

    // Build context for GPT
    const notesContext = notes
      .map((n) => `ID: ${n.id}\nTitel: ${n.title || "(geen)"}\nInhoud: ${(n.content || "").slice(0, 200)}...`)
      .join("\n\n---\n\n");

    const userMessage = `Analyseer deze ${notes.length} notities en stel projecten/categorieën voor:

${notesContext}`;

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
        max_tokens: 2000,
        response_format: { type: "json_object" },
      }),
    });

    if (!gptResponse.ok) {
      const errorText = await gptResponse.text();
      console.error("[Organize] GPT error:", gptResponse.status, errorText);
      return NextResponse.json(
        { error: "AI indeling genereren mislukt" },
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
      console.error("[Organize] Invalid JSON from GPT:", content);
      return NextResponse.json(
        { error: "AI gaf ongeldige response" },
        { status: 500 }
      );
    }

    if (!parsed) {
      return NextResponse.json({ suggestions: [] });
    }

    // Store suggestions in DB
    const suggestionsToInsert: Array<{
      user_id: string;
      scope: "workspace";
      note_id: string | null;
      tab: "indelen";
      type: string;
      payload: Record<string, unknown>;
      why: string;
      confidence: "medium";
      status: "pending";
    }> = [];

    // Create project suggestions
    for (const project of parsed.projects) {
      suggestionsToInsert.push({
        user_id: user.id,
        scope: "workspace",
        note_id: null,
        tab: "indelen",
        type: "create_project",
        payload: { name: project.name, tempKey: project.tempKey },
        why: `Voorgesteld project op basis van je notities`,
        confidence: "medium",
        status: "pending",
      });
    }

    // Create assignment suggestions
    for (const assignment of parsed.assignments) {
      suggestionsToInsert.push({
        user_id: user.id,
        scope: "workspace",
        note_id: assignment.noteId,
        tab: "indelen",
        type: "assign_project",
        payload: { noteId: assignment.noteId, projectTempKey: assignment.projectTempKey },
        why: assignment.why,
        confidence: "medium",
        status: "pending",
      });
    }

    if (suggestionsToInsert.length === 0) {
      return NextResponse.json({ suggestions: [] });
    }

    const { data: inserted, error: insertError } = await supabase
      .from("ai_suggestions")
      .insert(suggestionsToInsert)
      .select("*");

    if (insertError) {
      console.error("[Organize] Insert error:", insertError);
      return NextResponse.json(
        { error: "Suggesties opslaan mislukt" },
        { status: 500 }
      );
    }

    return NextResponse.json({ suggestions: inserted });
  } catch (error) {
    console.error("[Organize] Error:", error);
    return NextResponse.json(
      { error: "Server fout" },
      { status: 500 }
    );
  }
}

