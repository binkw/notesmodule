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
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !suggestion) {
      return NextResponse.json({ error: "Suggestie niet gevonden" }, { status: 404 });
    }

    if (suggestion.status !== "pending") {
      return NextResponse.json({ error: "Suggestie is al verwerkt" }, { status: 400 });
    }

    // Execute action based on type
    const payload = suggestion.payload as Record<string, unknown>;

    try {
      switch (suggestion.type) {
        case "title": {
          // Update note title
          if (!suggestion.note_id) {
            throw new Error("Geen note_id voor title update");
          }
          const { error: updateError } = await supabase
            .from("notes")
            .update({ title: payload.title as string })
            .eq("id", suggestion.note_id)
            .eq("user_id", user.id);
          
          if (updateError) throw updateError;
          break;
        }

        case "next_steps": {
          // Create new note(s) with steps as checklist
          const steps = payload.steps as string[];
          if (!steps || steps.length === 0) {
            throw new Error("Geen steps in payload");
          }
          
          // Create single note with checklist format
          const checklistContent = steps.map((s) => `- [ ] ${s}`).join("\n");
          const { error: createError } = await supabase
            .from("notes")
            .insert({
              user_id: user.id,
              title: "Actiepunten",
              content: checklistContent,
            });
          
          if (createError) throw createError;
          break;
        }

        case "create_project": {
          // Create new project
          const projectName = payload.name as string;
          if (!projectName) {
            throw new Error("Geen project naam in payload");
          }
          
          const { error: createError } = await supabase
            .from("projects")
            .insert({
              user_id: user.id,
              name: projectName,
            });
          
          if (createError) throw createError;
          break;
        }

        case "assign_project": {
          // Assign note to project
          const noteId = payload.noteId as string;
          const projectTempKey = payload.projectTempKey as string;
          
          if (!noteId) {
            throw new Error("Geen noteId in payload");
          }

          // Find the project by looking up accepted create_project suggestion with same tempKey
          // Or use projectId if directly specified
          let projectId = payload.projectId as string | undefined;

          if (!projectId && projectTempKey) {
            // Find accepted create_project suggestion with this tempKey
            const { data: projectSuggestion } = await supabase
              .from("ai_suggestions")
              .select("payload")
              .eq("user_id", user.id)
              .eq("type", "create_project")
              .eq("status", "accepted")
              .contains("payload", { tempKey: projectTempKey })
              .single();

            if (projectSuggestion) {
              // Find the created project by name
              const projectPayload = projectSuggestion.payload as { name: string };
              const { data: project } = await supabase
                .from("projects")
                .select("id")
                .eq("user_id", user.id)
                .eq("name", projectPayload.name)
                .single();
              
              projectId = project?.id;
            }
          }

          if (!projectId) {
            throw new Error("Project niet gevonden. Accepteer eerst het 'Create project' voorstel.");
          }

          const { error: updateError } = await supabase
            .from("notes")
            .update({ project_id: projectId })
            .eq("id", noteId)
            .eq("user_id", user.id);
          
          if (updateError) throw updateError;
          break;
        }

        default:
          throw new Error(`Onbekend suggestie type: ${suggestion.type}`);
      }
    } catch (actionError) {
      console.error("[Accept] Action error:", actionError);
      return NextResponse.json(
        { error: actionError instanceof Error ? actionError.message : "Actie uitvoeren mislukt" },
        { status: 500 }
      );
    }

    // Mark as accepted
    const { error: statusError } = await supabase
      .from("ai_suggestions")
      .update({ status: "accepted", decided_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);

    if (statusError) {
      console.error("[Accept] Status update error:", statusError);
      // Action succeeded but status update failed - log but don't fail
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Accept] Error:", error);
    return NextResponse.json({ error: "Server fout" }, { status: 500 });
  }
}

