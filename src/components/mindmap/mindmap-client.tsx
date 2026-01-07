"use client";

import { useMemo, useRef, useState, useCallback } from "react";
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  Edge as FlowEdge,
  MiniMap,
  Node as FlowNode,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  Connection,
  NodeChange,
  EdgeChange,
  useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";
import { useRouter } from "next/navigation";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import type { MindmapEdge, MindmapNode, NodeColor } from "./types";
import { NODE_COLORS } from "./types";
import type { Note } from "../notes/types";
import { Plus, ZoomIn, ZoomOut, Maximize, Save, Trash2, Circle, Network, Target } from "lucide-react";

type MindmapClientProps = {
  initialNodes: MindmapNode[];
  initialEdges: MindmapEdge[];
  notes: Note[];
  userId: string;
};

type Status =
  | { state: "idle"; message?: string }
  | { state: "dirty"; message?: string }
  | { state: "saving"; message?: string }
  | { state: "saved"; message?: string }
  | { state: "error"; message: string };

function getNodeStyle(color: NodeColor, selected: boolean = false) {
  const colorDef = NODE_COLORS.find((c) => c.value === color) ?? NODE_COLORS[0];
  return {
    background: colorDef.bg,
    border: selected ? `2px solid var(--color-accent)` : `1px solid ${colorDef.border}`,
    borderRadius: "var(--radius-md)",
    padding: "10px 14px",
    fontSize: "13px",
    fontWeight: "500",
    color: "#1a1a1a",
    boxShadow: selected 
      ? "0 0 0 3px var(--color-accent-muted), 0 2px 8px rgba(0,0,0,0.15)" 
      : "0 1px 4px rgba(0,0,0,0.08)",
    transition: "all 150ms cubic-bezier(0.2, 0.8, 0.2, 1)",
  };
}

function toFlowNodes(nodes: MindmapNode[]): FlowNode[] {
  return nodes.map((n) => ({
    id: n.id,
    position: { x: n.position_x, y: n.position_y },
    data: { label: n.label, noteId: n.note_id, color: n.color || "default" },
    type: "default",
    style: getNodeStyle((n.color || "default") as NodeColor),
  }));
}

function toFlowEdges(edges: MindmapEdge[]): FlowEdge[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.source_node_id,
    target: e.target_node_id,
  }));
}

function Toolbar({
  onAddNode,
  onSave,
  onFit,
  onZoomIn,
  onZoomOut,
  status,
}: {
  onAddNode: () => void;
  onSave: () => void;
  onFit: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  status: Status;
}) {
  const statusStyles: Record<Status["state"], string> = {
    idle: "text-muted",
    dirty: "text-accent",
    saving: "text-accent animate-pulse",
    saved: "text-success",
    error: "text-error",
  };

  const statusLabel =
    status.state === "dirty"
      ? "Niet opgeslagen"
      : status.state === "saving"
        ? "Opslaan..."
        : status.state === "saved"
          ? "Opgeslagen"
          : status.state === "error"
            ? status.message ?? "Fout"
            : "";

  return (
    <div className="
      flex items-center gap-2
      rounded-[var(--radius-lg)] border border-border
      bg-surface/95 backdrop-blur-sm
      px-3 py-2 shadow-md
    ">
      <button
        className="
          h-8 px-3.5 flex items-center gap-1.5
          rounded-[var(--radius-md)] bg-accent
          text-[12px] font-semibold text-white
          transition-all duration-[var(--motion-fast)]
          hover:bg-accent-hover active:scale-[0.97]
        "
        onClick={onAddNode}
      >
        <Plus className="h-3.5 w-3.5" />
        Node
      </button>
      <button
        className="
          h-8 px-3.5
          rounded-[var(--radius-md)]
          bg-foreground text-background
          text-[12px] font-semibold
          transition-all duration-[var(--motion-fast)]
          hover:opacity-90 active:scale-[0.97]
          disabled:opacity-50
        "
        onClick={onSave}
        disabled={status.state === "saving"}
      >
        Opslaan
      </button>
      <div className="h-5 w-px bg-border" />
      <button
        className="
          h-8 w-8 flex items-center justify-center
          rounded-[var(--radius-md)]
          text-[14px] text-muted
          transition-all duration-[var(--motion-fast)]
          hover:bg-surface-hover hover:text-foreground
        "
        onClick={onFit}
        title="Fit view"
      >
        ⊡
      </button>
      <button
        className="
          h-8 w-8 flex items-center justify-center
          rounded-[var(--radius-md)]
          text-[16px] text-muted
          transition-all duration-[var(--motion-fast)]
          hover:bg-surface-hover hover:text-foreground
        "
        onClick={onZoomIn}
        title="Zoom in"
      >
        +
      </button>
      <button
        className="
          h-8 w-8 flex items-center justify-center
          rounded-[var(--radius-md)]
          text-[16px] text-muted
          transition-all duration-[var(--motion-fast)]
          hover:bg-surface-hover hover:text-foreground
        "
        onClick={onZoomOut}
        title="Zoom out"
      >
        −
      </button>
      {statusLabel && (
        <>
          <div className="h-5 w-px bg-border" />
          <span className={`text-[11px] font-medium ${statusStyles[status.state]}`}>
            {statusLabel}
          </span>
        </>
      )}
    </div>
  );
}

function SelectionPanel({
  selectedNode,
  onUpdateLabel,
  onUpdateColor,
  onLinkNote,
  onDeleteNode,
  notes,
  onOpenNote,
}: {
  selectedNode: FlowNode | null;
  onUpdateLabel: (label: string) => void;
  onUpdateColor: (color: NodeColor) => void;
  onLinkNote: (noteId: string | null) => void;
  onDeleteNode: () => void;
  notes: Note[];
  onOpenNote: (noteId: string) => void;
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!selectedNode) {
    return (
      <div className="
        flex h-full flex-col items-center justify-center
        rounded-[var(--radius-lg)] border border-border
        bg-surface p-6 text-center
      ">
        <Target className="h-8 w-8 mx-auto mb-3 text-muted/20" />
        <p className="text-[13px] text-text-secondary font-medium">Selecteer een node</p>
        <p className="mt-1 text-[12px] text-muted">Klik op een node om te bewerken</p>
      </div>
    );
  }

  const noteId = (selectedNode.data as Record<string, unknown>)?.noteId as string | null;
  const label = ((selectedNode.data as Record<string, unknown>)?.label as string) ?? "";
  const color: NodeColor = ((selectedNode.data as Record<string, unknown>)?.color as NodeColor) ?? "default";

  return (
    <div className="flex flex-col rounded-[var(--radius-lg)] border border-border bg-surface overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 h-12">
        <p className="text-[13px] font-semibold text-foreground">Node details</p>
        {noteId && (
          <button
            className="text-[11px] font-medium text-accent hover:underline"
            onClick={() => onOpenNote(noteId)}
          >
            Naar note →
          </button>
        )}
      </div>

      <div className="space-y-4 p-4">
        <div className="space-y-2">
          <label className="text-[11px] font-semibold text-muted uppercase tracking-wider">Label</label>
          <input
            className="
              w-full h-10 px-3
              rounded-[var(--radius-md)] border border-border
              bg-background text-[13px] text-foreground
              transition-colors duration-[var(--motion-fast)]
              outline-none focus:border-accent
            "
            value={label}
            onChange={(e) => onUpdateLabel(e.target.value)}
            aria-label="Node label"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-semibold text-muted uppercase tracking-wider">Kleur</label>
          <div className="flex gap-2">
            {NODE_COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => onUpdateColor(c.value)}
                className={`
                  h-8 w-8 rounded-full border-2
                  transition-all duration-[var(--motion-fast)]
                  ${color === c.value 
                    ? "border-accent ring-2 ring-accent/20 scale-110" 
                    : "border-transparent hover:scale-110"
                  }
                `}
                style={{ backgroundColor: c.bg, boxShadow: `inset 0 0 0 1px ${c.border}` }}
                title={c.label}
                aria-label={c.label}
              />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-semibold text-muted uppercase tracking-wider">Koppel aan note</label>
          <select
            className="
              w-full h-10 px-3
              rounded-[var(--radius-md)] border border-border
              bg-background text-[13px] text-foreground
              transition-colors duration-[var(--motion-fast)]
              outline-none focus:border-accent cursor-pointer
            "
            value={noteId ?? ""}
            onChange={(e) => onLinkNote(e.target.value || null)}
            aria-label="Koppel note"
          >
            <option value="">Geen koppeling</option>
            {notes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.title || "Zonder titel"}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="border-t border-border p-4">
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="
              w-full h-9
              rounded-[var(--radius-md)]
              bg-error-muted border border-error/20
              text-[12px] font-medium text-error
              transition-all duration-[var(--motion-fast)]
              hover:bg-error/20
            "
          >
            Verwijder node
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-[12px] text-muted">Weet je het zeker? Dit verwijdert ook alle verbindingen.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="
                  flex-1 h-9
                  rounded-[var(--radius-md)]
                  border border-border bg-surface
                  text-[12px] font-medium text-foreground
                  transition-all duration-[var(--motion-fast)]
                  hover:bg-surface-hover
                "
              >
                Annuleren
              </button>
              <button
                onClick={() => { onDeleteNode(); setShowDeleteConfirm(false); }}
                className="
                  flex-1 h-9
                  rounded-[var(--radius-md)]
                  bg-error text-white
                  text-[12px] font-medium
                  transition-all duration-[var(--motion-fast)]
                  hover:opacity-90 active:scale-[0.98]
                "
              >
                Verwijder
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MindmapCanvas({
  initialNodes,
  initialEdges,
  notes,
  userId,
}: MindmapClientProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(toFlowNodes(initialNodes));
  const [edges, setEdges, onEdgesChange] = useEdgesState(toFlowEdges(initialEdges));
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const router = useRouter();
  const supabase = useMemo(() => getBrowserSupabaseClient(), []);
  const rf = useReactFlow();
  const positionTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;

  const handleAddNode = useCallback(async () => {
    const nodeId = crypto.randomUUID();
    const posX = Math.random() * 200 + 100;
    const posY = Math.random() * 200 + 100;

    // Create optimistic node - show immediately
    const flowNode: FlowNode = {
      id: nodeId,
      type: "default",
      position: { x: posX, y: posY },
      data: { label: "Nieuwe node", noteId: null, color: "default" },
      style: getNodeStyle("default"),
    };

    setNodes((nds) => [...nds, flowNode]);
    setSelectedNodeId(nodeId);
    setStatus({ state: "saving", message: "Node opslaan..." });

    // Insert - only required fields, let DB defaults handle rest
    const { data, error } = await supabase
      .from("mindmap_nodes")
      .insert({
        id: nodeId,
        user_id: userId,
        label: "Nieuwe node",
        position_x: posX,
        position_y: posY,
      })
      .select("id");

    if (error?.message) {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setSelectedNodeId(null);
      setStatus({ state: "error", message: error.message });
      return;
    }

    if (!data || data.length === 0) {
      // RLS blocked or other issue - keep node locally
      setStatus({ state: "dirty", message: "Opslaan mislukt" });
      return;
    }

    setStatus({ state: "saved", message: "Opgeslagen." });
  }, [supabase, userId, setNodes]);

  const handleConnect = useCallback(async (connection: Connection) => {
    if (!connection.source || !connection.target) return;

    const edgeId = crypto.randomUUID();

    // Optimistic update
    setEdges((eds) => addEdge({ id: edgeId, source: connection.source!, target: connection.target! }, eds));
    setStatus({ state: "saving", message: "Verbinding opslaan..." });

    const { error: insertError } = await supabase
      .from("mindmap_edges")
      .insert({
        id: edgeId,
        user_id: userId,
        source_node_id: connection.source,
        target_node_id: connection.target,
      });

    if (insertError) {
      // Rollback
      setEdges((eds) => eds.filter((e) => e.id !== edgeId));
      setStatus({ state: "error", message: "Verbinding opslaan mislukt." });
      return;
    }

    setStatus({ state: "saved", message: "Opgeslagen." });
  }, [supabase, userId, setEdges]);

  const handleSave = useCallback(async () => {
    setStatus({ state: "saving", message: "Opslaan..." });

    // Save all nodes - only include fields that exist in DB
    const dbNodes = nodes.map((n) => ({
      id: n.id,
      user_id: userId,
      note_id: (n.data as Record<string, unknown>)?.noteId as string | null ?? null,
      label: ((n.data as Record<string, unknown>)?.label as string) ?? "Node",
      position_x: n.position.x,
      position_y: n.position.y,
    }));

    const dbEdges = edges.map((e) => ({
      id: e.id,
      user_id: userId,
      source_node_id: e.source,
      target_node_id: e.target,
    }));

    if (dbNodes.length > 0) {
      const { error: nodeError } = await supabase
        .from("mindmap_nodes")
        .upsert(dbNodes, { onConflict: "id" });

      if (nodeError?.message) {
        setStatus({ state: "error", message: "Nodes opslaan mislukt: " + nodeError.message });
        return;
      }
    }

    if (dbEdges.length > 0) {
      const { error: edgeError } = await supabase
        .from("mindmap_edges")
        .upsert(dbEdges, { onConflict: "id" });

      if (edgeError?.message) {
        setStatus({ state: "error", message: "Edges opslaan mislukt: " + edgeError.message });
        return;
      }
    }

    setStatus({ state: "saved", message: "Opgeslagen." });
  }, [nodes, edges, supabase, userId]);

  const handleNodeClick = useCallback((_: unknown, node: FlowNode) => {
    setSelectedNodeId(node.id);
  }, []);

  const handleOpenNote = useCallback((noteId: string) => {
    router.push(`/app/notes?noteId=${noteId}`);
  }, [router]);

  const handleUpdateSelectedLabel = useCallback((value: string) => {
    if (!selectedNodeId) return;
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedNodeId ? { ...n, data: { ...n.data, label: value } } : n
      )
    );
    setStatus({ state: "dirty", message: "Niet opgeslagen" });
  }, [selectedNodeId, setNodes]);

  const handleUpdateSelectedColor = useCallback(async (color: NodeColor) => {
    if (!selectedNodeId) return;

    // Optimistic update - always update UI
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedNodeId
          ? { ...n, data: { ...n.data, color }, style: getNodeStyle(color) }
          : n
      )
    );

    // Try to save color to DB (might fail if column doesn't exist)
    const { error } = await supabase
      .from("mindmap_nodes")
      .update({ color })
      .eq("id", selectedNodeId)
      .eq("user_id", userId);

    // Only show error if it's a real error (not column missing)
    if (error?.message && !error.message.includes("column")) {
      setStatus({ state: "error", message: "Kleur opslaan mislukt." });
    } else {
      setStatus({ state: "saved", message: "Opgeslagen." });
    }
  }, [selectedNodeId, supabase, userId, setNodes]);

  const handleLinkNote = useCallback(async (noteId: string | null) => {
    if (!selectedNodeId) return;

    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedNodeId ? { ...n, data: { ...n.data, noteId } } : n
      )
    );
    setStatus({ state: "saving", message: "Koppeling opslaan..." });

    const { error } = await supabase
      .from("mindmap_nodes")
      .update({ note_id: noteId })
      .eq("id", selectedNodeId)
      .eq("user_id", userId);

    if (error) {
      setStatus({ state: "error", message: "Koppeling opslaan mislukt." });
    } else {
      setStatus({ state: "saved", message: "Opgeslagen." });
    }
  }, [selectedNodeId, supabase, userId, setNodes]);

  const handleDeleteSelectedNode = useCallback(async () => {
    if (!selectedNodeId) return;

    const nodeToDelete = selectedNodeId;
    
    // Optimistic delete
    setNodes((nds) => nds.filter((n) => n.id !== nodeToDelete));
    setEdges((eds) => eds.filter((e) => e.source !== nodeToDelete && e.target !== nodeToDelete));
    setSelectedNodeId(null);
    setStatus({ state: "saving", message: "Verwijderen..." });

    const { error } = await supabase
      .from("mindmap_nodes")
      .delete()
      .eq("id", nodeToDelete)
      .eq("user_id", userId);

    if (error) {
      setStatus({ state: "error", message: "Verwijderen mislukt: " + error.message });
      // Could reload data here to restore state
      return;
    }

    setStatus({ state: "saved", message: "Verwijderd." });
  }, [selectedNodeId, supabase, userId, setNodes, setEdges]);

  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes);

    changes.forEach((c) => {
      if (c.type === "position" && c.dragging === false && c.position) {
        // Only save when drag ends
        const nodeId = c.id;
        const pos = c.position;

        if (positionTimers.current[nodeId]) {
          clearTimeout(positionTimers.current[nodeId]);
        }

        positionTimers.current[nodeId] = setTimeout(async () => {
          setStatus({ state: "saving", message: "Positie opslaan..." });
          const { error } = await supabase
            .from("mindmap_nodes")
            .update({ position_x: pos.x, position_y: pos.y })
            .eq("id", nodeId)
            .eq("user_id", userId);

          if (error) {
            setStatus({ state: "error", message: "Positie opslaan mislukt." });
          } else {
            setStatus({ state: "saved", message: "Opgeslagen." });
          }
        }, 300);
      }
    });
  }, [onNodesChange, supabase, userId]);

  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    onEdgesChange(changes);

    const removed = changes
      .filter((c): c is EdgeChange & { type: "remove"; id: string } => c.type === "remove")
      .map((c) => c.id);

    if (removed.length > 0) {
      setStatus({ state: "saving", message: "Verbinding verwijderen..." });
      supabase
        .from("mindmap_edges")
        .delete()
        .in("id", removed)
        .eq("user_id", userId)
        .then(({ error }) => {
          if (error) {
            setStatus({ state: "error", message: "Verwijderen mislukt." });
          } else {
            setStatus({ state: "saved", message: "Verwijderd." });
          }
        });
    }
  }, [onEdgesChange, supabase, userId]);

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  return (
    <div className="flex h-full flex-col gap-4 p-4 overflow-hidden">
      {/* Toolbar - fixed */}
      <div className="flex-shrink-0">
        <Toolbar
          onAddNode={handleAddNode}
          onSave={handleSave}
          onFit={() => rf.fitView({ padding: 0.2 })}
          onZoomIn={() => rf.zoomIn()}
          onZoomOut={() => rf.zoomOut()}
          status={status}
        />
      </div>

      {/* Canvas + Panel */}
      <div className="flex flex-1 gap-4 min-h-0">
        {/* React Flow Canvas */}
        <div className="relative flex-1 overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface">
          {nodes.length === 0 && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center">
              <Network className="h-12 w-12 text-muted/15 mb-4" />
              <p className="text-[14px] font-medium text-text-secondary">Nog geen nodes</p>
              <p className="mt-1 text-[12px] text-muted">Voeg een node toe om te beginnen</p>
            </div>
          )}
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={handleConnect}
            onNodeClick={handleNodeClick}
            onPaneClick={handlePaneClick}
            fitView
            className="bg-background"
            style={{ background: "var(--bg)" }}
          >
            <Background color="rgba(255,255,255,0.05)" gap={20} />
            <MiniMap 
              style={{ 
                background: "var(--surface)", 
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
              }}
              maskColor="rgba(0,0,0,0.6)"
            />
            <Controls 
              showInteractive={false}
              style={{
                background: "var(--surface)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
              }}
            />
          </ReactFlow>
        </div>

        {/* Selection Panel */}
        <div className="w-72 flex-shrink-0">
          <SelectionPanel
            selectedNode={selectedNode}
            onUpdateLabel={handleUpdateSelectedLabel}
            onUpdateColor={handleUpdateSelectedColor}
            onLinkNote={handleLinkNote}
            onDeleteNode={handleDeleteSelectedNode}
            notes={notes}
            onOpenNote={handleOpenNote}
          />
        </div>
      </div>
    </div>
  );
}

export function MindmapClient(props: MindmapClientProps) {
  return (
    <ReactFlowProvider>
      <MindmapCanvas {...props} />
    </ReactFlowProvider>
  );
}
