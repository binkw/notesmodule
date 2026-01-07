import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildConversationMessages } from "@/lib/ai/buildMessages";

export const runtime = "nodejs";

type ConversationResponse = {
  dialogue: string;
  summary: string;
  labels: string[];
};

function validateResponse(data: unknown): ConversationResponse | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  
  if (typeof obj.dialogue !== "string" || !obj.dialogue.trim()) return null;
  if (typeof obj.summary !== "string" || !obj.summary.trim()) return null;
  if (!Array.isArray(obj.labels)) return null;
  
  const validLabels = obj.labels
    .filter((l): l is string => typeof l === "string")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && l.length <= 20)
    .slice(0, 6);
  
  // Ensure "Gesprek" is the first label
  if (!validLabels.includes("Gesprek")) {
    validLabels.unshift("Gesprek");
  } else {
    const idx = validLabels.indexOf("Gesprek");
    if (idx > 0) {
      validLabels.splice(idx, 1);
      validLabels.unshift("Gesprek");
    }
  }
  
  return {
    dialogue: obj.dialogue.trim(),
    summary: obj.summary.trim(),
    labels: validLabels.slice(0, 6),
  };
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
    const { text } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "text is verplicht" },
        { status: 400 }
      );
    }

    if (text.trim().length < 20) {
      return NextResponse.json(
        { error: "Tekst te kort (minimaal 20 karakters)" },
        { status: 400 }
      );
    }

    if (text.length > 50000) {
      return NextResponse.json(
        { error: "Tekst te lang (maximaal 50000 karakters)" },
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

    // Build messages using centralized instructions
    const messages = buildConversationMessages(text);

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
        max_tokens: 4000,
        response_format: { type: "json_object" },
      }),
    });

    if (!gptResponse.ok) {
      console.error("[Conversation] GPT error:", gptResponse.status);
      return NextResponse.json(
        { error: "Gesprek verwerken mislukt" },
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

    let result: ConversationResponse | null = null;
    try {
      const jsonData = JSON.parse(content);
      result = validateResponse(jsonData);
    } catch {
      console.error("[Conversation] Invalid JSON from GPT:", content);
      return NextResponse.json({
        dialogue: `Spreker A: ${text}`,
        summary: "Transcriptie van spraakopname.",
        labels: ["Gesprek"],
      });
    }

    if (!result) {
      return NextResponse.json({
        dialogue: `Spreker A: ${text}`,
        summary: "Transcriptie van spraakopname.",
        labels: ["Gesprek"],
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Conversation] Error:", error);
    return NextResponse.json(
      { error: "Server fout" },
      { status: 500 }
    );
  }
}
