import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildChatMessages } from "@/lib/ai/buildMessages";

export const runtime = "nodejs";

type ChatResponse = {
  reply: string;
  editProposal: {
    title?: string;
    content?: string;
  } | null;
};

function validateResponse(data: unknown): ChatResponse | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  
  if (typeof obj.reply !== "string" || !obj.reply.trim()) return null;
  
  let editProposal: ChatResponse["editProposal"] = null;
  
  if (obj.editProposal && typeof obj.editProposal === "object") {
    const proposal = obj.editProposal as Record<string, unknown>;
    const hasTitle = typeof proposal.title === "string" && proposal.title.trim();
    const hasContent = typeof proposal.content === "string" && proposal.content.trim();
    
    if (hasTitle || hasContent) {
      editProposal = {};
      if (hasTitle) editProposal.title = (proposal.title as string).trim();
      if (hasContent) {
        const content = (proposal.content as string).trim();
        editProposal.content = content.slice(0, 40000);
      }
    }
  }
  
  return {
    reply: obj.reply.trim(),
    editProposal,
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
    const { noteId, message } = body;

    if (!noteId) {
      return NextResponse.json(
        { error: "noteId is verplicht" },
        { status: 400 }
      );
    }
    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "message is verplicht" },
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
      .select("title, content")
      .eq("id", noteId)
      .eq("user_id", user.id)
      .single();

    if (noteError || !note) {
      return NextResponse.json(
        { error: "Note niet gevonden" },
        { status: 404 }
      );
    }

    // Build messages using centralized instructions
    const messages = buildChatMessages(
      note.title,
      note.content || "",
      message.trim()
    );

    const gptResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 4000,
        response_format: { type: "json_object" },
      }),
    });

    if (!gptResponse.ok) {
      console.error("[Chat] GPT error:", gptResponse.status);
      return NextResponse.json(
        { error: "AI antwoord mislukt" },
        { status: 500 }
      );
    }

    const gptResult = await gptResponse.json();
    const content = gptResult.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: "Geen antwoord van AI" },
        { status: 500 }
      );
    }

    let result: ChatResponse | null = null;
    try {
      const jsonData = JSON.parse(content);
      result = validateResponse(jsonData);
    } catch {
      console.error("[Chat] Invalid JSON from GPT:", content);
      return NextResponse.json({
        reply: "Sorry, ik kon geen goed antwoord genereren. Probeer het opnieuw.",
        editProposal: null,
      });
    }

    if (!result) {
      return NextResponse.json({
        reply: "Sorry, ik kon geen goed antwoord genereren. Probeer het opnieuw.",
        editProposal: null,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Chat] Error:", error);
    return NextResponse.json(
      { error: "Server fout" },
      { status: 500 }
    );
  }
}
