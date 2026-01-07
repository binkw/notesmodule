import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NotesClient } from "@/components/notes/notes-client";
import type { Note, Project } from "@/components/notes/types";

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ noteId?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  // Fetch notes and projects in parallel
  const [{ data: notesData, error: notesError }, { data: projectsData }] = await Promise.all([
    supabase
      .from("notes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("projects")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const notes = notesError || !notesData ? [] : (notesData as Note[]);
  const projects = (projectsData as Project[]) || [];
  
  const initialSelectedId =
    params.noteId && notes.find((n) => n.id === params.noteId)
      ? params.noteId
      : null;

  return (
    <NotesClient
      initialNotes={notes}
      initialProjects={projects}
      userId={user.id}
      initialSelectedId={initialSelectedId}
    />
  );
}
