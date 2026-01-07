import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { MindmapClient } from "@/components/mindmap/mindmap-client";
import type { MindmapEdge, MindmapNode } from "@/components/mindmap/types";
import type { Note } from "@/components/notes/types";

export default async function MindmapPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  const [{ data: nodesData }, { data: edgesData }, { data: notesData }] =
    await Promise.all([
      supabase
        .from("mindmap_nodes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("mindmap_edges")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("notes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

  const nodes = (nodesData as MindmapNode[]) ?? [];
  const edges = (edgesData as MindmapEdge[]) ?? [];
  const notes = (notesData as Note[]) ?? [];

  return (
    <MindmapClient
      initialNodes={nodes}
      initialEdges={edges}
      notes={notes}
      userId={user.id}
    />
  );
}

