import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES = [
  "audio/webm",
  "audio/mp3",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/ogg",
  "audio/flac",
  "audio/m4a",
];

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_TRANSCRIBE_MODEL || "whisper-1";

    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key niet geconfigureerd" },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Geen audio bestand ontvangen" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Bestand te groot (max 20MB)" },
        { status: 400 }
      );
    }

    // Validate file type
    const fileType = file.type || "audio/webm";
    if (!ALLOWED_TYPES.some((t) => fileType.includes(t.split("/")[1]))) {
      return NextResponse.json(
        { error: `Ongeldig bestandstype: ${fileType}` },
        { status: 400 }
      );
    }

    // Create FormData for OpenAI
    const openaiFormData = new FormData();
    openaiFormData.append("file", file, file.name || "audio.webm");
    openaiFormData.append("model", model);
    openaiFormData.append("language", "nl"); // Dutch
    openaiFormData.append("response_format", "json");

    const response = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: openaiFormData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Transcribe] OpenAI error:", response.status, errorText);
      return NextResponse.json(
        { error: "Transcriptie mislukt" },
        { status: 500 }
      );
    }

    const result = await response.json();

    return NextResponse.json({ text: result.text || "" });
  } catch (error) {
    console.error("[Transcribe] Error:", error);
    return NextResponse.json(
      { error: "Server fout bij transcriptie" },
      { status: 500 }
    );
  }
}

