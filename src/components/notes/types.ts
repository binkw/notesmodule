export type NoteKind = "note" | "conversation";

export type Note = {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string | null;
  content: string;
  labels: string[];
  summary: string | null;
  kind: NoteKind;
  created_at: string;
  updated_at: string;
};

export type Project = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
};

export type AISuggestionScope = "note" | "workspace";
export type AISuggestionTab = "suggesties" | "indelen";
export type AISuggestionConfidence = "low" | "medium" | "high";
export type AISuggestionStatus = "pending" | "accepted" | "rejected";

// Suggestion types
export type SuggestionType = 
  | "title"           // Update note title
  | "next_steps"      // Create checklist/tasks
  | "create_project"  // Create new project
  | "assign_project"; // Assign note to project

export type AISuggestion = {
  id: string;
  user_id: string;
  scope: AISuggestionScope;
  note_id: string | null;
  tab: AISuggestionTab;
  type: SuggestionType;
  payload: Record<string, unknown>;
  why: string;
  confidence: AISuggestionConfidence;
  status: AISuggestionStatus;
  created_at: string;
  decided_at: string | null;
};

// Payload types for different suggestion types
export type TitlePayload = {
  title: string;
};

export type NextStepsPayload = {
  steps: string[];
};

export type CreateProjectPayload = {
  name: string;
  tempKey: string; // Used to link assignments before project is created
};

export type AssignProjectPayload = {
  noteId: string;
  projectTempKey?: string; // For new projects
  projectId?: string;      // For existing projects
};
