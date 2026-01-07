import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildLabelMessages } from "@/lib/ai/buildMessages";

export const runtime = "nodejs";

function validateLabels(data: unknown): string[] {
  if (!data || typeof data !== "object") return [];
  const obj = data as Record<string, unknown>;
  
  if (!Array.isArray(obj.labels)) return [];
  
  const validLabels = obj.labels
    .filter((l): l is string => typeof l === "string")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && l.length <= 20)
    .slice(0, 6);
  
  return validLabels;
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

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Niet ingelogd" },
        { status: 401 }
      );
    }

    const { data: note, error: noteError } = await supabase
      .from("notes")
      .select("id, title, content")
      .eq("id", noteId)
      .eq("user_id", user.id)
      .single();

    if (noteError || !note) {
      return NextResponse.json(
        { error: "Note niet gevonden" },
        { status: 404 }
      );
    }

    if (!note.content || note.content.trim().length < 10) {
      return NextResponse.json({ noteId, labels: [] });
    }

    // Build messages using centralized instructions
    const messages = buildLabelMessages(note.title, note.content);

    const gptResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.5,
        max_tokens: 200,
        response_format: { type: "json_object" },
      }),
    });

    if (!gptResponse.ok) {
      console.error("[LabelNote] GPT error:", gptResponse.status);
      return NextResponse.json(
        { error: "Labels genereren mislukt" },
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

    let labels: string[] = [];
    try {
      const jsonData = JSON.parse(content);
      labels = validateLabels(jsonData);
    } catch {
      console.error("[LabelNote] Invalid JSON from GPT:", content);
      return NextResponse.json({ noteId, labels: [] });
    }

    const { error: updateError } = await supabase
      .from("notes")
      .update({ labels })
      .eq("id", noteId)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("[LabelNote] Update error:", updateError);
      return NextResponse.json(
        { error: "Labels opslaan mislukt" },
        { status: 500 }
      );
    }

    return NextResponse.json({ noteId, labels });
  } catch (error) {
    console.error("[LabelNote] Error:", error);
    return NextResponse.json(
      { error: "Server fout" },
      { status: 500 }
    );
  }
}
