"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Note, Project } from "./types";
import {
  Search,
  Trash2,
  RefreshCw,
  X,
  Plus,
  FileText,
  Mic,
  Sparkles,
  Globe,
  Bot,
  FolderOpen,
  Folder,
  FolderPlus,
  ChevronDown,
  MoreHorizontal,
  ArrowRight,
  Pencil,
  Circle,
  MessageSquare,
  Check,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════
// SORT OPTIONS
// ═══════════════════════════════════════════════════════════════════
type SortOption = "updated" | "created" | "title_asc" | "title_desc";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "updated", label: "Laatst gewijzigd" },
  { value: "created", label: "Laatst gemaakt" },
  { value: "title_asc", label: "Titel A–Z" },
  { value: "title_desc", label: "Titel Z–A" },
];

// ═══════════════════════════════════════════════════════════════════
// CONFIRM MODAL COMPONENT
// ═══════════════════════════════════════════════════════════════════
import { memo } from "react";

type ConfirmModalProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
};

function ConfirmModal({ 
  open, 
  title, 
  message, 
  confirmLabel = "Bevestigen", 
  cancelLabel = "Annuleren",
  onConfirm, 
  onCancel,
  danger = false
}: ConfirmModalProps) {
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      {/* Modal */}
      <div className="relative z-10 w-full max-w-sm mx-4 rounded-[var(--radius-lg)] bg-surface border border-border shadow-xl">
        <div className="p-5">
          <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>
          <p className="mt-2 text-[13px] text-text-secondary leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-2 border-t border-border p-4">
          <button
            onClick={onCancel}
            className="
              flex-1 h-9 px-4
              rounded-[var(--radius-md)]
              bg-surface-hover border border-border
              text-[13px] font-medium text-foreground
              transition-all duration-[var(--motion-fast)]
              hover:bg-background
            "
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`
              flex-1 h-9 px-4
              rounded-[var(--radius-md)]
              text-[13px] font-semibold text-white
              transition-all duration-[var(--motion-fast)]
              ${danger 
                ? "bg-error hover:bg-error/90" 
                : "bg-accent hover:bg-accent-hover"
              }
            `}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// LABEL CHIPS COMPONENT (memoized)
// ═══════════════════════════════════════════════════════════════════

const LabelChips = memo(function LabelChips({ labels, max = 2 }: { labels: string[]; max?: number }) {
  if (!labels || labels.length === 0) return null;
  
  const visible = labels.slice(0, max);
  const remaining = labels.length - max;
  
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((label, i) => (
        <span
          key={i}
          className="inline-flex items-center rounded-full bg-accent-muted px-2 py-0.5 text-[10px] font-medium text-accent"
        >
          {label}
        </span>
      ))}
      {remaining > 0 && (
        <span className="inline-flex items-center rounded-full bg-surface-hover px-2 py-0.5 text-[10px] text-muted">
          +{remaining}
        </span>
      )}
    </div>
  );
});

type NotesClientProps = {
  initialNotes: Note[];
  initialProjects: Project[];
  userId: string;
  initialSelectedId?: string | null;
};

function deriveTitle(content: string) {
  const firstLine = content.split("\n")[0] ?? "";
  const trimmed = firstLine.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 120);
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

// ═══════════════════════════════════════════════════════════════════
// NOTE ROW COMPONENT (memoized for performance)
// ═══════════════════════════════════════════════════════════════════
type NoteRowProps = {
  note: Note;
  active: boolean;
  project?: Project;
  projects: Project[];
  onClick: () => void;
  onDelete: () => void;
  onMoveToProject: (noteId: string, projectId: string | null) => void;
};

const NoteRow = memo(function NoteRow({ 
  note, 
  active, 
  project, 
  projects,
  onClick, 
  onDelete,
  onMoveToProject,
}: NoteRowProps) {
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  
  return (
    <div
      onClick={onClick}
      className={`
        group relative cursor-pointer
        rounded-[var(--radius-md)] px-3 py-2.5
        transition-all duration-[var(--motion-fast)]
        ${active
          ? "bg-accent-muted border-l-[3px] border-l-accent"
          : "hover:bg-surface-hover border-l-[3px] border-l-transparent"
        }
      `}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {/* Title row */}
          <div className="flex items-center gap-1.5">
            <p className={`
              truncate text-[13px]
              ${active ? "font-semibold text-foreground" : "font-medium text-text-secondary"}
            `}>
              {note.title || "Zonder titel"}
            </p>
            {note.kind === "conversation" && (
              <Mic className="flex-shrink-0 h-3 w-3 text-accent" />
            )}
          </div>
          
          {/* Preview */}
          <p className="mt-0.5 truncate text-[12px] text-muted leading-snug">
            {note.content?.slice(0, 50) || "Lege note..."}
          </p>
          
          {/* Labels */}
          {note.labels && note.labels.length > 0 && (
            <div className="mt-1.5">
              <LabelChips labels={note.labels} max={2} />
            </div>
          )}
          
          {/* Project badge */}
          {project && (
            <div className="mt-1 flex items-center gap-1 text-[10px] text-accent font-medium">
              <Folder className="h-3 w-3" />
              {project.name}
            </div>
          )}
        </div>
        
        {/* Date */}
        <span className="flex-shrink-0 text-[10px] text-muted tabular-nums pt-0.5">
          {formatDate(note.created_at)}
        </span>
      </div>
      
      {/* Hover actions */}
      <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-[var(--motion-fast)]">
        {/* Move to project */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMoveMenu(!showMoveMenu);
            }}
            className="
              h-6 w-6 flex items-center justify-center
              rounded-[var(--radius-sm)]
              text-muted
              hover:bg-surface-hover hover:text-foreground
            "
            title="Verplaatsen"
          >
            <FolderOpen className="h-3.5 w-3.5" />
          </button>
          
          {/* Move menu popover */}
          {showMoveMenu && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={(e) => { e.stopPropagation(); setShowMoveMenu(false); }} 
              />
              <div className="absolute right-0 top-7 z-50 w-40 rounded-[var(--radius-md)] bg-surface border border-border shadow-lg overflow-hidden">
                <div className="px-2 py-1.5 border-b border-border">
                  <p className="text-[10px] font-medium text-muted">Verplaatsen naar</p>
                </div>
                <div className="py-1 max-h-48 overflow-y-auto">
                  {/* No project option */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveToProject(note.id, null);
                      setShowMoveMenu(false);
                    }}
                    className={`
                      w-full flex items-center gap-2 px-2 py-1.5 text-left
                      text-[11px] transition-colors
                      ${note.project_id === null 
                        ? "bg-accent-muted text-accent font-medium" 
                        : "text-text-secondary hover:bg-surface-hover"
                      }
                    `}
                  >
                    <Circle className="h-3 w-3" />
                    Inbox
                  </button>
                  {/* Projects */}
                  {projects.map((p) => (
                    <button
                      key={p.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveToProject(note.id, p.id);
                        setShowMoveMenu(false);
                      }}
                      className={`
                        w-full flex items-center gap-2 px-2 py-1.5 text-left
                        text-[11px] transition-colors
                        ${note.project_id === p.id 
                          ? "bg-accent-muted text-accent font-medium" 
                          : "text-text-secondary hover:bg-surface-hover"
                        }
                      `}
                    >
                      <Folder className="h-3 w-3" />
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
        
        {/* Delete button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="
            h-6 w-6 flex items-center justify-center
            rounded-[var(--radius-sm)]
            text-muted
            hover:bg-error-muted hover:text-error
          "
          title="Verwijderen"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════
// MIC BUTTON COMPONENT
// ═══════════════════════════════════════════════════════════════════
type MicButtonProps = {
  onConversation: (dialogue: string, summary: string, labels: string[]) => void;
  disabled?: boolean;
};

function MicButton({ onConversation, disabled }: MicButtonProps) {
  const [state, setState] = useState<"idle" | "recording" | "transcribing" | "processing" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string>("");
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      
      chunks.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };
      
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        
        if (blob.size < 1000) {
          setError("Opname te kort");
          setState("idle");
          return;
        }

        // Step 1: Transcribe with Whisper
        setState("transcribing");
        setStatusText("Transcriberen...");
        
        const formData = new FormData();
        formData.append("file", blob, "recording.webm");
        
        try {
          const transcribeRes = await fetch("/api/transcribe", {
            method: "POST",
            body: formData,
          });
          
          if (!transcribeRes.ok) {
            const data = await transcribeRes.json();
            throw new Error(data.error || "Transcriptie mislukt");
          }
          
          const transcribeData = await transcribeRes.json();
          const rawText = transcribeData.text;
          
          if (!rawText || rawText.trim().length < 10) {
            throw new Error("Transcriptie te kort of leeg");
          }
          
          // Step 2: Process with conversation endpoint (speaker diarization + summary)
          setState("processing");
          setStatusText("Verwerken...");
          
          const convRes = await fetch("/api/ai/conversation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: rawText }),
          });
          
          if (!convRes.ok) {
            // Fallback: use raw transcript
            onConversation(rawText, "", ["Gesprek"]);
            setState("idle");
            setStatusText("");
            return;
          }
          
          const convData = await convRes.json();
          onConversation(
            convData.dialogue || rawText,
            convData.summary || "",
            convData.labels || ["Gesprek"]
          );
          
          setState("idle");
          setStatusText("");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Verwerken mislukt");
          setState("error");
          setTimeout(() => {
            setState("idle");
            setStatusText("");
          }, 3000);
        }
      };
      
      mediaRecorder.current = recorder;
      recorder.start();
      setState("recording");
    } catch {
      setError("Microfoon toegang geweigerd");
      setState("error");
      setTimeout(() => setState("idle"), 3000);
    }
  }, [onConversation]);

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && state === "recording") {
      mediaRecorder.current.stop();
    }
  }, [state]);

  const handleClick = () => {
    if (state === "recording") {
      stopRecording();
    } else if (state === "idle") {
      startRecording();
    }
  };

  const isProcessing = state === "transcribing" || state === "processing";

  return (
    <div className="relative flex items-center gap-2">
      <button
        onClick={handleClick}
        disabled={disabled || isProcessing}
        title={state === "recording" ? "Stop opname" : "Start spraakopname"}
        className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
          state === "recording"
            ? "animate-pulse bg-red-500 text-white"
            : isProcessing
              ? "bg-accent/20 text-accent"
              : state === "error"
                ? "bg-red-100 text-red-600"
                : "bg-surface text-muted hover:bg-background hover:text-foreground"
        } disabled:opacity-50`}
      >
        {isProcessing ? (
          <span className="animate-spin text-sm">⏳</span>
        ) : (
          <span className="text-lg">🎤</span>
        )}
      </button>
      {statusText && (
        <span className="text-xs text-muted">{statusText}</span>
      )}
      {error && (
        <div className="absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-red-600 px-2 py-1 text-xs text-white">
          {error}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// AGENT PANEL COMPONENT
// ═══════════════════════════════════════════════════════════════════
type AgentAction = {
  type: "append_to_note" | "replace_note" | "update_title" | "add_labels" | "set_labels" | "create_note";
  data: Record<string, unknown>;
};

type AgentSource = {
  title: string;
  url: string;
  snippet?: string;
};

type AgentResult = {
  title: string;
  content: string;
  sources: AgentSource[];
};

type AgentMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  result?: AgentResult | null;
  actions?: AgentAction[];
  requiresConfirm?: boolean;
  actionStatus?: "pending" | "executed" | "dismissed";
  sources?: AgentSource[];
  assumptions?: string[];
};

type AgentPanelProps = {
  selectedNoteId: string | null;
  selectedNoteTitle: string | null;
  onNoteUpdated: (updatedNote: { id: string; title?: string; content?: string; labels?: string[] }) => void;
  onNoteCreated: (noteId: string) => void;
};

const WEB_SEARCH_STORAGE_KEY = "agentWebSearchEnabled";
const DETAIL_STORAGE_KEY = "agentDetailLevel";
const MODE_STORAGE_KEY = "agentMode";

type DetailLevel = "short" | "normal" | "deep";
type AgentMode = "general" | "research" | "market_analysis";

const DETAIL_LABELS: Record<DetailLevel, string> = {
  short: "Kort",
  normal: "Normaal", 
  deep: "Diep",
};

const MODE_LABELS: Record<AgentMode, string> = {
  general: "Co-pilot",
  research: "Onderzoek",
  market_analysis: "Analyse",
};

// Quick action chips for common tasks
const QUICK_ACTIONS = [
  { label: "Samenvatten", prompt: "Vat deze note samen in 3-5 bullets" },
  { label: "Actiepunten", prompt: "Maak een lijst van actiepunten uit deze note" },
  { label: "Structureer", prompt: "Herschrijf met betere structuur (headers, bullets)" },
  { label: "Verbeter", prompt: "Verbeter de tekst: duidelijker, korter, professioneler" },
  { label: "Plan", prompt: "Maak een concreet 7-dagen plan op basis van deze note" },
];

function AgentPanel({ selectedNoteId, selectedNoteTitle, onNoteUpdated, onNoteCreated }: AgentPanelProps) {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [detailLevel, setDetailLevel] = useState<DetailLevel>("normal");
  const [agentMode, setAgentMode] = useState<AgentMode>("general");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevNoteIdRef = useRef<string | null>(null);

  // Load preferences from localStorage
  useEffect(() => {
    const storedWeb = localStorage.getItem(WEB_SEARCH_STORAGE_KEY);
    if (storedWeb === "true") setWebSearchEnabled(true);
    
    const storedDetail = localStorage.getItem(DETAIL_STORAGE_KEY) as DetailLevel;
    if (storedDetail && ["short", "normal", "deep"].includes(storedDetail)) {
      setDetailLevel(storedDetail);
    }
    
    const storedMode = localStorage.getItem(MODE_STORAGE_KEY) as AgentMode;
    if (storedMode && ["general", "research", "market_analysis"].includes(storedMode)) {
      setAgentMode(storedMode);
    }
  }, []);

  // Toggle web search
  const toggleWebSearch = () => {
    setWebSearchEnabled((prev) => {
      const newValue = !prev;
      localStorage.setItem(WEB_SEARCH_STORAGE_KEY, String(newValue));
      return newValue;
    });
  };

  // Set detail level
  const handleDetailChange = (level: DetailLevel) => {
    setDetailLevel(level);
    localStorage.setItem(DETAIL_STORAGE_KEY, level);
  };

  // Set mode
  const handleModeChange = (mode: AgentMode) => {
    setAgentMode(mode);
    localStorage.setItem(MODE_STORAGE_KEY, mode);
  };

  // Reset when note changes
  useEffect(() => {
    if (prevNoteIdRef.current !== selectedNoteId) {
      setMessages([]);
      setError(null);
      prevNoteIdRef.current = selectedNoteId;
    }
  }, [selectedNoteId]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !selectedNoteId || loading) return;

    const userMessage: AgentMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setLoadingStatus(webSearchEnabled ? "Zoeken..." : "Verwerken...");
    setError(null);

    try {
      if (webSearchEnabled) {
        setLoadingStatus("Web search...");
      }
      
      // First, preview
      setLoadingStatus(agentMode === "research" ? "Analyseren..." : agentMode === "market_analysis" ? "Markt analyseren..." : "Schrijven...");
      const res = await fetch("/api/ai/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noteId: selectedNoteId,
          message: userMessage.content,
          execute: false,
          web: webSearchEnabled,
          detail: detailLevel,
          mode: agentMode,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Agent mislukt");
      }

      const data = await res.json();

      const assistantMessage: AgentMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.reply || "Geen antwoord.",
        result: data.result || null,
        actions: data.actions || [],
        requiresConfirm: data.requiresConfirm ?? true,
        actionStatus: data.actions?.length > 0 ? "pending" : undefined,
        sources: data.sources || undefined,
        assumptions: data.assumptions || undefined,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Auto-execute if no confirm needed and has actions
      if (data.actions?.length > 0 && !data.requiresConfirm) {
        await executeActions(assistantMessage.id, selectedNoteId, userMessage.content);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fout bij versturen");
    } finally {
      setLoading(false);
      setLoadingStatus("");
    }
  };

  const executeActions = async (messageId: string, noteId: string, originalMessage: string) => {
    setLoading(true);
    setLoadingStatus("Opslaan...");
    try {
      const res = await fetch("/api/ai/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noteId,
          message: originalMessage,
          execute: true,
          web: webSearchEnabled,
          detail: detailLevel,
          mode: agentMode,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Uitvoeren mislukt");
      }

      const data = await res.json();

      // Update message status
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, actionStatus: "executed" } : m
        )
      );

      // Notify parent about note update
      if (data.updatedNote) {
        onNoteUpdated(data.updatedNote);
      }

      // Notify parent about new note creation
      if (data.createdNoteId) {
        onNoteCreated(data.createdNoteId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Uitvoeren mislukt");
    } finally {
      setLoading(false);
      setLoadingStatus("");
    }
  };

  const handleExecute = (messageId: string) => {
    const message = messages.find((m) => m.id === messageId);
    if (!message || !selectedNoteId) return;

    // Find the user message that preceded this assistant message
    const messageIndex = messages.findIndex((m) => m.id === messageId);
    const userMessage = messages.slice(0, messageIndex).reverse().find((m) => m.role === "user");

    executeActions(messageId, selectedNoteId, userMessage?.content || "");
  };

  const handleDismiss = (messageId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, actionStatus: "dismissed" } : m
      )
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getActionPreview = (action: AgentAction) => {
    switch (action.type) {
      case "append_to_note": {
        const text = (action.data.text as string) || "";
        const preview = text.length > 100 ? text.slice(0, 100) + "..." : text;
        return `Toevoegen: "${preview}"`;
      }
      case "replace_note": {
        const content = (action.data.content as string) || "";
        const preview = content.length > 100 ? content.slice(0, 100) + "..." : content;
        return `Vervangen: "${preview}"`;
      }
      case "update_title":
        return `Nieuwe titel: "${action.data.title}"`;
      case "add_labels":
      case "set_labels":
        return `Labels: ${(action.data.labels as string[])?.join(", ")}`;
      case "create_note":
        return `Nieuwe note: "${action.data.title}"`;
      default:
        return action.type;
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {/* Header - compact card style */}
      <div className="flex-shrink-0 border-b border-border">
        {/* Title row */}
        <div className="flex items-center justify-between px-4 h-14">
          <div className="min-w-0 flex-1">
            <h2 className="text-[14px] font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              Co-pilot
            </h2>
            {selectedNoteId ? (
              <p className="text-[11px] text-accent truncate font-medium flex items-center gap-1" title={selectedNoteTitle || "Zonder titel"}>
                <FileText className="h-3 w-3" />
                {selectedNoteTitle || "Zonder titel"}
              </p>
            ) : (
              <p className="text-[11px] text-muted">
                Selecteer een note
              </p>
            )}
          </div>
          
          {/* Web Search Toggle */}
          <button
            onClick={toggleWebSearch}
            className={`
              flex items-center gap-2 h-8 px-2.5
              rounded-[var(--radius-md)]
              text-[11px] font-medium
              transition-all duration-[var(--motion-fast)]
              ${webSearchEnabled 
                ? "bg-accent-muted text-accent" 
                : "bg-surface-hover text-muted hover:text-foreground"
              }
            `}
            title={webSearchEnabled ? "Web search uit" : "Web search aan"}
          >
            <Globe className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{webSearchEnabled ? "Aan" : "Uit"}</span>
          </button>
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between gap-2 px-4 pb-3">
          {/* Detail Level - segmented control */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-[var(--radius-md)] bg-surface-hover">
            {(["short", "normal", "deep"] as DetailLevel[]).map((level) => (
              <button
                key={level}
                onClick={() => handleDetailChange(level)}
                className={`
                  h-7 px-2.5
                  rounded-[calc(var(--radius-md)-2px)]
                  text-[10px] font-semibold
                  transition-all duration-[var(--motion-fast)]
                  ${detailLevel === level
                    ? "bg-accent text-white shadow-sm"
                    : "text-muted hover:text-foreground"
                  }
                `}
              >
                {DETAIL_LABELS[level]}
              </button>
            ))}
          </div>

          {/* Mode Selector */}
          <select
            value={agentMode}
            onChange={(e) => handleModeChange(e.target.value as AgentMode)}
            className="
              h-7 px-2 pr-6
              rounded-[var(--radius-md)]
              bg-surface-hover border-none
              text-[10px] font-semibold text-text-secondary
              outline-none cursor-pointer
              appearance-none
              focus:ring-1 focus:ring-accent
            "
            style={{ 
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 6px center',
            }}
          >
            {(["general", "research", "market_analysis"] as AgentMode[]).map((mode) => (
              <option key={mode} value={mode}>
                {MODE_LABELS[mode]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Messages - scrollable area - min-h-0 required for flex scroll */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 overscroll-contain">
        {!selectedNoteId ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-10 w-10 text-muted/20 mb-3" />
            <p className="text-[13px] text-text-secondary">Selecteer een note om te beginnen</p>
            <p className="mt-1 text-[11px] text-muted">Ik help je met samenvatten, structureren en meer</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center py-8">
            <p className="text-[13px] text-text-secondary font-medium mb-4">Hoe kan ik helpen?</p>
            {/* Quick action chips */}
            <div className="flex flex-wrap justify-center gap-2 max-w-[280px]">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  onClick={() => {
                    setInput(action.prompt);
                    // Auto-submit after short delay
                    setTimeout(() => {
                      const form = document.getElementById("agent-form");
                      if (form) form.dispatchEvent(new Event("submit", { bubbles: true }));
                    }, 100);
                  }}
                  className="
                    px-3 py-1.5 rounded-full
                    bg-surface-hover border border-border
                    text-[11px] font-medium text-text-secondary
                    transition-all duration-[var(--motion-fast)]
                    hover:bg-accent-muted hover:text-accent hover:border-accent/30
                    active:scale-[0.97]
                  "
                >
                  {action.label}
                </button>
              ))}
            </div>
            {webSearchEnabled && (
              <button
                onClick={() => setInput("Zoek online naar informatie over ")}
                className="
                  mt-3 px-3 py-1.5 rounded-full flex items-center gap-1.5
                  bg-accent-muted border border-accent/20
                  text-[11px] font-medium text-accent
                  transition-all duration-[var(--motion-fast)]
                  hover:bg-accent hover:text-white
                  active:scale-[0.97]
                "
              >
                <Globe className="h-3 w-3" />
                Zoek bronnen
              </button>
            )}
            <p className="mt-6 text-[11px] text-muted/60 max-w-[220px] text-center">
              Of stel gewoon een vraag in je eigen woorden
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className="animate-fade-in">
                {/* Message card */}
                <div className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`
                      max-w-[90%] rounded-[var(--radius-lg)] px-4 py-3
                      ${message.role === "user"
                        ? "bg-accent-subtle text-foreground"
                        : "bg-surface border border-border text-foreground"
                      }
                    `}
                  >
                    {message.role === "assistant" && (
                      <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-border/50">
                        <Bot className="h-3.5 w-3.5 text-accent" />
                        <span className="text-[11px] font-semibold text-muted">Co-pilot</span>
                      </div>
                    )}
                    <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>

                {/* Result preview (collapsible card) */}
                {message.result?.content && (
                  <div className="mt-3 ml-0 rounded-[var(--radius-lg)] border border-border bg-surface p-4">
                    {message.result.title && (
                      <p className="text-[12px] font-semibold text-foreground mb-2 flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-muted" />
                        {message.result.title}
                      </p>
                    )}
                    <div className="text-[12px] text-text-secondary max-h-32 overflow-y-auto leading-relaxed">
                      <p className="whitespace-pre-wrap">
                        {message.result.content.slice(0, 400)}{message.result.content.length > 400 ? "..." : ""}
                      </p>
                    </div>
                    <p className="mt-2 pt-2 border-t border-border/50 text-[10px] text-muted">
                      {message.result.content.length.toLocaleString()} tekens
                    </p>
                  </div>
                )}

                {/* Assumptions */}
                {message.assumptions && message.assumptions.length > 0 && (
                  <div className="mt-3 ml-0 rounded-[var(--radius-md)] bg-warning-muted border border-warning/20 px-4 py-3">
                    <p className="text-[11px] font-semibold text-warning mb-1.5 flex items-center gap-1.5">
                      Aannames
                    </p>
                    <ul className="text-[11px] text-warning/80 space-y-1">
                      {message.assumptions.map((a, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="opacity-50">•</span>
                          <span>{a}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Actions Card - custom not template */}
                {message.actions && message.actions.length > 0 && message.actionStatus === "pending" && (
                  <div className="mt-3 ml-0 rounded-[var(--radius-lg)] border-2 border-accent/30 bg-accent-subtle p-4">
                    <p className="text-[12px] font-semibold text-accent flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5" />
                      {message.actions.length} actie{message.actions.length > 1 ? "s" : ""}
                    </p>
                    <div className="mt-3 space-y-2">
                      {message.actions.map((action, i) => (
                        <div key={i} className="text-[11px] text-foreground bg-background/50 rounded-[var(--radius-md)] p-2 border-l-2 border-accent/40">
                          {getActionPreview(action)}
                        </div>
                      ))}
                    </div>
                    {message.requiresConfirm ? (
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() => handleExecute(message.id)}
                          disabled={loading}
                          className="
                            flex-1 h-9
                            rounded-[var(--radius-md)] bg-accent
                            text-[12px] font-semibold text-white
                            transition-all duration-[var(--motion-fast)]
                            hover:bg-accent-hover active:scale-[0.98]
                            disabled:opacity-50
                          "
                        >
                          {loading ? "Bezig..." : "✓ Toepassen"}
                        </button>
                        <button
                          onClick={() => handleDismiss(message.id)}
                          className="
                            flex-1 h-9
                            rounded-[var(--radius-md)]
                            bg-surface border border-border
                            text-[12px] font-medium text-text-secondary
                            transition-all duration-[var(--motion-fast)]
                            hover:bg-surface-hover
                          "
                        >
                          Annuleren
                        </button>
                      </div>
                    ) : (
                      <p className="mt-3 text-[10px] text-accent/70 flex items-center gap-1.5">
                        <Circle className="h-2.5 w-2.5 animate-pulse fill-current" />
                        Automatisch uitvoeren...
                      </p>
                    )}
                  </div>
                )}

                {/* Executed status */}
                {message.actions && message.actions.length > 0 && message.actionStatus === "executed" && (
                  <div className="mt-3 ml-0 rounded-[var(--radius-md)] bg-success-muted border border-success/20 px-4 py-2 text-[12px] text-success font-medium flex items-center gap-2">
                    Uitgevoerd
                  </div>
                )}
                {message.actions && message.actions.length > 0 && message.actionStatus === "dismissed" && (
                  <div className="mt-3 ml-0 rounded-[var(--radius-md)] bg-surface-hover px-4 py-2 text-[12px] text-muted">
                    Geannuleerd
                  </div>
                )}

                {/* Sources */}
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-3 ml-0 rounded-[var(--radius-md)] border border-border bg-surface p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2">Bronnen</p>
                    <div className="space-y-1.5">
                      {message.sources.map((source, i) => (
                        <a
                          key={i}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-[11px] text-accent hover:underline group"
                          title={source.title}
                        >
                          <span className="text-muted group-hover:text-accent">[{i + 1}]</span>
                          <span className="truncate">{source.title}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex-shrink-0 border-t border-error/20 bg-error-muted px-4 py-2 text-[12px] text-error font-medium">
          ⚠️ {error}
        </div>
      )}

      {/* Input - sticky bottom */}
      <div className="flex-shrink-0 border-t border-border p-3 bg-surface">
        {/* Loading status */}
        {loading && loadingStatus && (
          <div className="mb-2 text-[11px] text-accent font-medium flex items-center gap-2 animate-pulse">
            <Circle className="h-2.5 w-2.5 fill-current" />
            {loadingStatus}
          </div>
        )}
        <form 
          id="agent-form"
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex gap-2"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!selectedNoteId || loading}
            placeholder={!selectedNoteId ? "Selecteer een note..." : "Stel een vraag of geef een opdracht..."}
            className="
              flex-1 min-h-[44px] px-3 py-2.5
              rounded-[var(--radius-md)]
              bg-background border border-border
              text-[13px] text-foreground
              placeholder:text-muted
              resize-none
              transition-all duration-[var(--motion-fast)]
              focus:border-accent focus:outline-none
              disabled:opacity-50
            "
            rows={2}
          />
          <button
            type="submit"
            disabled={!selectedNoteId || !input.trim() || loading}
            className="
              self-end h-11 w-11
              rounded-[var(--radius-md)] bg-accent
              text-white text-[16px] font-bold
              transition-all duration-[var(--motion-fast)]
              hover:bg-accent-hover active:scale-[0.95]
              disabled:opacity-40
              flex items-center justify-center
            "
          >
            {loading ? "…" : "→"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
export function NotesClient({
  initialNotes,
  initialProjects,
  userId,
  initialSelectedId = null,
}: NotesClientProps) {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSelectedId ?? initialNotes[0]?.id ?? null
  );
  const [editorValue, setEditorValue] = useState(
    initialNotes.find((n) => n.id === initialSelectedId)?.content ??
      initialNotes[0]?.content ??
      ""
  );
  const [titleValue, setTitleValue] = useState(
    initialNotes.find((n) => n.id === initialSelectedId)?.title ??
      initialNotes[0]?.title ??
      ""
  );
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [labelStatus, setLabelStatus] = useState<"idle" | "labeling" | "done">("idle");
  const [isPending, startTransition] = useTransition();
  const [activeProjectFilter, setActiveProjectFilter] = useState<string | null>(null);
  const labelDebounceRef = useRef<NodeJS.Timeout | null>(null);
  
  // Create project state
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);
  
  // Search & Sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("updated");
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  // Delete confirm modal state
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; noteId: string | null }>({
    open: false,
    noteId: null,
  });

  const supabase = useMemo(() => getBrowserSupabaseClient(), []);

  // Auto-label function (debounced, after save)
  const triggerAutoLabel = useCallback(async (noteId: string) => {
    // Clear any existing debounce
    if (labelDebounceRef.current) {
      clearTimeout(labelDebounceRef.current);
    }
    
    // Debounce: wait 1.2s before labeling
    labelDebounceRef.current = setTimeout(async () => {
      setLabelStatus("labeling");
      try {
        const res = await fetch("/api/ai/label-note", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ noteId }),
        });
        
        if (res.ok) {
          const data = await res.json();
          // Update note labels in state
          setNotes((prev) =>
            prev.map((n) =>
              n.id === noteId ? { ...n, labels: data.labels || [] } : n
            )
          );
        }
      } catch {
        // Silent fail for auto-labeling
      } finally {
        setLabelStatus("done");
        setTimeout(() => setLabelStatus("idle"), 1500);
      }
    }, 1200);
  }, []);

  useEffect(() => {
    const note = notes.find((n) => n.id === selectedId);
    setEditorValue(note?.content ?? "");
    setTitleValue(note?.title ?? "");
    setSaveStatus("idle");
  }, [selectedId, notes]);

  const refreshNotes = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setLoading(false);

    if (error || !data) return;

    setNotes(data as Note[]);
    const preferredId =
      selectedId && data.find((n) => n.id === selectedId)
        ? selectedId
        : data[0]?.id ?? null;
    setSelectedId(preferredId);
  }, [supabase, userId, selectedId]);

  const refreshProjects = useCallback(async () => {
    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    
    if (data) {
      setProjects(data as Project[]);
    }
  }, [supabase, userId]);

  async function handleNewNote(
    content?: string, 
    kind: "note" | "conversation" = "note", 
    summary?: string,
    initialLabels?: string[]
  ) {
    setLoading(true);
    const insertData: Record<string, unknown> = { 
      user_id: userId, 
      content: content || "", 
      title: content ? deriveTitle(content) : null,
      kind,
      // Auto-assign to selected project (if not "Alles")
      project_id: activeProjectFilter || null,
    };
    if (summary) {
      insertData.summary = summary;
    }
    if (initialLabels && initialLabels.length > 0) {
      insertData.labels = initialLabels;
    }
    
    const { error, data } = await supabase
      .from("notes")
      .insert(insertData)
      .select("*")
      .single();
    setLoading(false);

    if (error || !data) return;

    const newNote = data as Note;
    setNotes((prev) => [newNote, ...prev]);
    setSelectedId(newNote.id);
    
    // Trigger auto-labeling if content exists and no initial labels
    if (content && content.length > 10 && (!initialLabels || initialLabels.length === 0)) {
      triggerAutoLabel(newNote.id);
    }
  }

  async function handleSave() {
    if (!selectedId) return;
    setSaveStatus("saving");

    const title = titleValue?.trim() ? titleValue.trim() : deriveTitle(editorValue);
    const { error } = await supabase
      .from("notes")
      .update({ content: editorValue, title })
      .eq("id", selectedId)
      .eq("user_id", userId);

    if (error) {
      setSaveStatus("idle");
      return;
    }

    setNotes((prev) =>
      prev.map((n) =>
        n.id === selectedId ? { ...n, content: editorValue, title } : n
      )
    );
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 1500);
    
    // Trigger auto-labeling after successful save
    triggerAutoLabel(selectedId);
  }

  // Open delete confirmation modal
  function requestDelete(id: string) {
    setDeleteConfirm({ open: true, noteId: id });
  }
  
  // Actually delete the note (called from modal)
  async function confirmDelete() {
    const id = deleteConfirm.noteId;
    if (!id) return;
    
    setDeleteConfirm({ open: false, noteId: null });
    setLoading(true);

    const { error } = await supabase
      .from("notes")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    setLoading(false);
    if (error) return;

    const remaining = notes.filter((n) => n.id !== id);
    setNotes(remaining);
    // Select next note or clear selection
    if (selectedId === id) {
      setSelectedId(remaining[0]?.id ?? null);
    }
  }
  
  // Cancel delete
  function cancelDelete() {
    setDeleteConfirm({ open: false, noteId: null });
  }

  // Move note to project
  async function handleMoveToProject(noteId: string, projectId: string | null) {
    const { error } = await supabase
      .from("notes")
      .update({ project_id: projectId, updated_at: new Date().toISOString() })
      .eq("id", noteId)
      .eq("user_id", userId);

    if (error) {
      console.error("Failed to move note:", error);
      return;
    }

    // Update local state
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, project_id: projectId } : n))
    );
  }

  // Update selected note's project from editor
  async function handleUpdateNoteProject(projectId: string | null) {
    if (!selectedId) return;
    
    const { error } = await supabase
      .from("notes")
      .update({ project_id: projectId, updated_at: new Date().toISOString() })
      .eq("id", selectedId)
      .eq("user_id", userId);

    if (error) {
      console.error("Failed to update note project:", error);
      return;
    }

    // Update local state
    setNotes((prev) =>
      prev.map((n) => (n.id === selectedId ? { ...n, project_id: projectId } : n))
    );
  }

  // Create a new project
  async function handleCreateProject() {
    const name = newProjectName.trim();
    if (!name || creatingProject) return;
    
    setCreatingProject(true);
    
    const { error, data } = await supabase
      .from("projects")
      .insert({ user_id: userId, name })
      .select("*")
      .single();

    setCreatingProject(false);
    
    if (error || !data) {
      console.error("Failed to create project:", error);
      return;
    }

    // Add to local state
    const newProject = data as Project;
    setProjects((prev) => [newProject, ...prev]);
    
    // Reset input
    setNewProjectName("");
    setShowNewProject(false);
    
    // Auto-select the new project filter
    setActiveProjectFilter(newProject.id);
  }

  // Handle conversation from mic (after Whisper + GPT processing)
  const handleConversation = useCallback((dialogue: string, summary: string, labels: string[]) => {
    handleNewNote(dialogue, "conversation", summary, labels);
  }, []);

  useEffect(() => {
    startTransition(() => {
      refreshNotes();
      refreshProjects();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedNote = notes.find((n) => n.id === selectedId) || null;
  const isLoading = loading || isPending;

  // Handle note updates from agent (already saved server-side)
  const handleNoteUpdated = useCallback((updatedNote: { 
    id: string; 
    title?: string; 
    content?: string; 
    labels?: string[] 
  }) => {
    // Update local notes state
    setNotes((prev) =>
      prev.map((n) =>
        n.id === updatedNote.id
          ? { 
              ...n, 
              ...(updatedNote.title !== undefined && { title: updatedNote.title }),
              ...(updatedNote.content !== undefined && { content: updatedNote.content }),
              ...(updatedNote.labels !== undefined && { labels: updatedNote.labels }),
            }
          : n
      )
    );
    
    // Update editor values if this is the selected note
    if (updatedNote.id === selectedId) {
      if (updatedNote.title !== undefined) setTitleValue(updatedNote.title);
      if (updatedNote.content !== undefined) setEditorValue(updatedNote.content);
    }
    
    // Show saved status
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 1500);
  }, [selectedId]);

  // Handle new note creation from agent
  const handleNoteCreated = useCallback(async (noteId: string) => {
    // Refresh notes list to include the new note
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error || !data) return;

    setNotes(data as Note[]);
    
    // Select the new note
    setSelectedId(noteId);
    
    // Show feedback
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 1500);
  }, [supabase, userId]);

  // Search debounce effect
  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 200);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery]);

  // Filter and sort notes
  const filteredNotes = useMemo(() => {
    let result = notes;
    
    // Filter by project
    if (activeProjectFilter) {
      result = result.filter((n) => n.project_id === activeProjectFilter);
    }
    
    // Filter by search query
    if (debouncedSearch.trim()) {
      const query = debouncedSearch.toLowerCase();
      result = result.filter((n) => {
        const titleMatch = (n.title || "").toLowerCase().includes(query);
        const contentMatch = (n.content || "").toLowerCase().includes(query);
        const labelsMatch = (n.labels || []).some((l) => l.toLowerCase().includes(query));
        return titleMatch || contentMatch || labelsMatch;
      });
    }
    
    // Sort
    const sorted = [...result];
    switch (sortBy) {
      case "updated":
        sorted.sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime());
        break;
      case "created":
        sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case "title_asc":
        sorted.sort((a, b) => (a.title || "").localeCompare(b.title || "", "nl"));
        break;
      case "title_desc":
        sorted.sort((a, b) => (b.title || "").localeCompare(a.title || "", "nl"));
        break;
    }
    
    return sorted;
  }, [notes, activeProjectFilter, debouncedSearch, sortBy]);

  return (
    <div className="grid h-full min-h-0 grid-cols-[300px_1fr_380px] gap-0">
      {/* ═══════════════════════════════════════════════════════════════════
          COLUMN A: Projects + Notes List (Left)
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col min-h-0 border-r border-border bg-surface overflow-hidden">
        {/* Projects Section */}
        <div className="flex-shrink-0 border-b border-border p-4">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted">
            Projecten
          </h3>
          <div className="space-y-0.5">
            <button
              onClick={() => setActiveProjectFilter(null)}
              className={`
                flex w-full items-center gap-2.5 h-9 px-3
                rounded-[var(--radius-md)] text-[13px]
                transition-all duration-[var(--motion-fast)]
                ${activeProjectFilter === null
                  ? "bg-accent-muted font-medium text-foreground"
                  : "text-text-secondary hover:bg-surface-hover hover:text-foreground"
                }
              `}
            >
              <Circle className="h-4 w-4 opacity-60" />
              <span className="flex-1 text-left">Alles</span>
              <span className="text-[11px] text-muted tabular-nums">{notes.length}</span>
            </button>
            {projects.map((project) => {
              const count = notes.filter((n) => n.project_id === project.id).length;
              return (
                <button
                  key={project.id}
                  onClick={() => setActiveProjectFilter(project.id)}
                  className={`
                    flex w-full items-center gap-2.5 h-9 px-3
                    rounded-[var(--radius-md)] text-[13px]
                    transition-all duration-[var(--motion-fast)]
                    ${activeProjectFilter === project.id
                      ? "bg-accent-muted font-medium text-foreground"
                      : "text-text-secondary hover:bg-surface-hover hover:text-foreground"
                    }
                  `}
                >
                  <Folder className="h-4 w-4 opacity-60" />
                  <span className="flex-1 text-left truncate">{project.name}</span>
                  <span className="text-[11px] text-muted tabular-nums">{count}</span>
                </button>
              );
            })}
            
            {/* Create new project */}
            {showNewProject ? (
              <div className="mt-2 flex items-center gap-1.5">
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateProject();
                    if (e.key === "Escape") {
                      setShowNewProject(false);
                      setNewProjectName("");
                    }
                  }}
                  placeholder="Projectnaam..."
                  autoFocus
                  className="
                    flex-1 h-8 px-2.5
                    rounded-[var(--radius-md)]
                    bg-background border border-border
                    text-[12px] text-foreground
                    placeholder:text-muted
                    focus:border-accent focus:outline-none
                  "
                />
                <button
                  onClick={handleCreateProject}
                  disabled={!newProjectName.trim() || creatingProject}
                  className="
                    h-8 w-8 flex items-center justify-center
                    rounded-[var(--radius-md)]
                    bg-accent text-white
                    transition-all duration-[var(--motion-fast)]
                    hover:bg-accent-hover active:scale-[0.97]
                    disabled:opacity-50
                  "
                  title="Opslaan"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    setShowNewProject(false);
                    setNewProjectName("");
                  }}
                  className="
                    h-8 w-8 flex items-center justify-center
                    rounded-[var(--radius-md)]
                    text-muted
                    transition-all duration-[var(--motion-fast)]
                    hover:bg-surface-hover hover:text-foreground
                  "
                  title="Annuleren"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowNewProject(true)}
                className="
                  mt-2 flex w-full items-center gap-2.5 h-9 px-3
                  rounded-[var(--radius-md)] text-[13px]
                  text-muted
                  transition-all duration-[var(--motion-fast)]
                  hover:bg-surface-hover hover:text-foreground
                "
              >
                <FolderPlus className="h-4 w-4 opacity-60" />
                <span className="flex-1 text-left">Nieuw project</span>
              </button>
            )}
          </div>
        </div>

        {/* Notes Section */}
        <div className="flex flex-1 flex-col min-h-0">
          {/* Notes Header */}
          <div className="flex-shrink-0 flex items-center justify-between border-b border-border px-4 h-11">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Notes
              <span className="ml-1.5 text-[10px] font-normal text-muted/60">
                ({filteredNotes.length})
              </span>
            </h3>
            <button
              onClick={refreshNotes}
              disabled={isLoading}
              className={`
                h-7 w-7 flex items-center justify-center
                rounded-[var(--radius-sm)] text-muted
                transition-all duration-[var(--motion-fast)]
                hover:bg-surface-hover hover:text-foreground
                disabled:opacity-50
                ${isLoading ? "animate-spin" : ""}
              `}
              title="Vernieuwen"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Search & Sort Toolbar */}
          <div className="flex-shrink-0 border-b border-border px-3 py-2 space-y-2">
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Zoeken..."
                className="
                  w-full h-8 pl-8 pr-8
                  rounded-[var(--radius-md)]
                  bg-background border border-border
                  text-[12px] text-foreground
                  placeholder:text-muted
                  transition-all duration-[var(--motion-fast)]
                  focus:border-accent focus:outline-none
                "
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                  title="Wissen"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {/* Sort dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="
                w-full h-8 px-2.5
                rounded-[var(--radius-md)]
                bg-background border border-border
                text-[11px] text-text-secondary
                cursor-pointer
                transition-all duration-[var(--motion-fast)]
                focus:border-accent focus:outline-none
              "
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* New Note Button */}
          <div className="flex-shrink-0 p-3">
            <button
              onClick={() => handleNewNote()}
              disabled={isLoading}
              className="
                w-full h-10 flex items-center justify-center gap-2
                rounded-[var(--radius-md)] bg-accent
                text-[13px] font-semibold text-white
                transition-all duration-[var(--motion-fast)]
                hover:bg-accent-hover active:scale-[0.98]
                disabled:opacity-60
              "
            >
              <Plus className="h-4 w-4" />
              Nieuwe note
            </button>
          </div>

          {/* Notes List (scrollable) - min-h-0 required for flex scroll */}
          <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-3 overscroll-contain">
            {isLoading && !notes.length ? (
              <div className="space-y-2 px-1">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse rounded-[var(--radius-md)] bg-surface-hover p-3">
                    <div className="h-3.5 w-24 rounded bg-border" />
                    <div className="mt-2 h-3 w-32 rounded bg-border/60" />
                  </div>
                ))}
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
                <FileText className="h-10 w-10 text-muted/20 mb-3" />
                <p className="text-[13px] text-text-secondary">
                  {activeProjectFilter ? "Geen notes in dit project" : "Nog geen notes"}
                </p>
                <p className="mt-1 text-[12px] text-muted">Maak je eerste note</p>
              </div>
            ) : (
              <div className="space-y-0.5 px-1">
                {filteredNotes.map((note) => (
                  <NoteRow
                    key={note.id}
                    note={note}
                    active={note.id === selectedId}
                    project={projects.find((p) => p.id === note.project_id)}
                    projects={projects}
                    onClick={() => setSelectedId(note.id)}
                    onDelete={() => requestDelete(note.id)}
                    onMoveToProject={handleMoveToProject}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          COLUMN B: Notepad/Editor (Middle)
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col min-h-0 min-w-0 border-r border-border bg-background overflow-hidden">
        {selectedNote ? (
          <>
            {/* Editor Header - sticky */}
            <div className="flex-shrink-0 border-b border-border px-6 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="text-[13px] font-medium text-text-secondary truncate">
                    {selectedNote.title || "Zonder titel"}
                  </span>
                  {selectedNote.kind === "conversation" && (
                    <span className="flex-shrink-0 rounded-full bg-accent-subtle px-2.5 py-1 text-[10px] font-semibold text-accent flex items-center gap-1">
                      <Mic className="h-3 w-3" />
                      Gesprek
                    </span>
                  )}
                  
                  {/* Project selector dropdown */}
                  <div className="relative">
                    <select
                      value={selectedNote.project_id || ""}
                      onChange={(e) => handleUpdateNoteProject(e.target.value || null)}
                      className="
                        h-7 pl-7 pr-6 appearance-none
                        rounded-[var(--radius-md)]
                        bg-surface border border-border
                        text-[11px] font-medium text-text-secondary
                        cursor-pointer
                        transition-all duration-[var(--motion-fast)]
                        hover:bg-surface-hover hover:border-border-hover
                        focus:border-accent focus:outline-none
                      "
                    >
                      <option value="">Inbox</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <Folder className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
                    <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted pointer-events-none" />
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <MicButton onConversation={handleConversation} disabled={isLoading} />
                  
                  {/* Status indicator */}
                  <span className={`
                    text-[11px] font-medium min-w-[60px] text-right
                    transition-colors duration-[var(--motion-fast)]
                    ${saveStatus === "saving" || labelStatus === "labeling" ? "text-accent animate-pulse" : ""}
                    ${saveStatus === "saved" || labelStatus === "done" ? "text-success" : ""}
                    ${saveStatus === "idle" && labelStatus === "idle" ? "text-muted" : ""}
                  `}>
                    {saveStatus === "saving" && "Saving..."}
                    {saveStatus === "saved" && "✓ Saved"}
                    {labelStatus === "labeling" && "Labels..."}
                    {labelStatus === "done" && "✓ Labels"}
                    {saveStatus === "idle" && labelStatus === "idle" && "—"}
                  </span>
                  
                  <button
                    onClick={handleSave}
                    disabled={isLoading || saveStatus === "saving"}
                    className="
                      h-8 px-4
                      rounded-[var(--radius-md)]
                      bg-surface border border-border
                      text-[12px] font-medium text-foreground
                      transition-all duration-[var(--motion-fast)]
                      hover:bg-surface-hover hover:border-border-hover
                      active:scale-[0.98]
                      disabled:opacity-50
                    "
                  >
                    Opslaan
                  </button>
                  
                  {/* Delete button */}
                  <button
                    onClick={() => requestDelete(selectedNote.id)}
                    disabled={isLoading}
                    className="
                      h-8 w-8 flex items-center justify-center
                      rounded-[var(--radius-md)]
                      bg-surface border border-border
                      text-muted
                      transition-all duration-[var(--motion-fast)]
                      hover:bg-error-muted hover:border-error/30 hover:text-error
                      disabled:opacity-50
                    "
                    title="Verwijderen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              {/* Labels in header */}
              {selectedNote.labels && selectedNote.labels.length > 0 && (
                <div className="mt-3">
                  <LabelChips labels={selectedNote.labels} max={10} />
                </div>
              )}
            </div>

            {/* Summary for conversation notes */}
            {selectedNote.summary && (
              <div className="flex-shrink-0 border-b border-border bg-accent-subtle px-6 py-3">
                <p className="text-[11px] font-semibold text-accent uppercase tracking-wider">Samenvatting</p>
                <p className="mt-1.5 text-[13px] text-text-secondary leading-relaxed">{selectedNote.summary}</p>
              </div>
            )}

            {/* Editor Body - scrollable content - min-h-0 required for flex scroll */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
              <div className="p-6 pb-20">
                <input
                  className="
                    w-full mb-4 bg-transparent
                    text-[24px] font-semibold text-foreground
                    outline-none border-none
                    placeholder:text-muted
                  "
                  placeholder="Titel..."
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                />
                <textarea
                  className="
                    w-full min-h-[400px] bg-transparent
                    text-[15px] leading-[1.8] text-foreground
                    outline-none border-none resize-none
                    placeholder:text-muted
                  "
                  value={editorValue}
                  onChange={(e) => setEditorValue(e.target.value)}
                  placeholder="Begin met schrijven..."
                />
              </div>
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex flex-1 flex-col items-center justify-center text-center p-8">
            <Pencil className="h-16 w-16 text-muted/10 mb-6" />
            <p className="text-[15px] font-medium text-text-secondary">
              Selecteer een note of maak een nieuwe
            </p>
            <p className="mt-2 text-[13px] text-muted max-w-xs">
              Begin met schrijven in je persoonlijke notepad
            </p>
            <div className="mt-8 flex gap-3">
              <button
                onClick={() => handleNewNote()}
                disabled={isLoading}
                className="
                  h-10 px-5
                  rounded-[var(--radius-md)] bg-accent
                  text-[13px] font-semibold text-white
                  transition-all duration-[var(--motion-fast)]
                  hover:bg-accent-hover active:scale-[0.98]
                  disabled:opacity-60
                "
              >
                <Plus className="h-4 w-4 inline-block mr-1" />
                Nieuwe note
              </button>
              <MicButton onConversation={handleConversation} disabled={isLoading} />
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          COLUMN C: Agent Panel (Right)
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col min-h-0 bg-surface overflow-hidden">
        <AgentPanel
          selectedNoteId={selectedId}
          selectedNoteTitle={selectedNote?.title || null}
          onNoteUpdated={handleNoteUpdated}
          onNoteCreated={handleNoteCreated}
        />
      </div>
      
      {/* Delete Confirm Modal */}
      <ConfirmModal
        open={deleteConfirm.open}
        title="Note verwijderen"
        message="Weet je zeker dat je deze note wilt verwijderen? Dit kan niet ongedaan worden gemaakt."
        confirmLabel="Verwijderen"
        cancelLabel="Annuleren"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        danger
      />
    </div>
  );
}
