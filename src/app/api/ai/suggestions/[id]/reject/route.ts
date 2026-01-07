import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: Params) {
  try {
    const { id } = await context.params;
    
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    // Fetch suggestion
    const { data: suggestion, error: fetchError } = await supabase
      .from("ai_suggestions")
      .select("id, status")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !suggestion) {
      return NextResponse.json({ error: "Suggestie niet gevonden" }, { status: 404 });
    }

    if (suggestion.status !== "pending") {
      return NextResponse.json({ error: "Suggestie is al verwerkt" }, { status: 400 });
    }

    // Mark as rejected
    const { error: updateError } = await supabase
      .from("ai_suggestions")
      .update({ status: "rejected", decided_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("[Reject] Update error:", updateError);
      return NextResponse.json({ error: "Status update mislukt" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Reject] Error:", error);
    return NextResponse.json({ error: "Server fout" }, { status: 500 });
  }
}

