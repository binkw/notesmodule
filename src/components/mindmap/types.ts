export type NodeColor = "default" | "gray" | "orange" | "blue" | "green";

export const NODE_COLORS: { value: NodeColor; label: string; bg: string; border: string }[] = [
  { value: "default", label: "Wit", bg: "#ffffff", border: "#e6e6e6" },
  { value: "gray", label: "Grijs", bg: "#f5f5f5", border: "#d4d4d4" },
  { value: "orange", label: "Oranje", bg: "#fff7ed", border: "#fdba74" },
  { value: "blue", label: "Blauw", bg: "#eff6ff", border: "#93c5fd" },
  { value: "green", label: "Groen", bg: "#f0fdf4", border: "#86efac" },
];

export type MindmapNode = {
  id: string;
  user_id: string;
  note_id: string | null;
  label: string;
  position_x: number;
  position_y: number;
  color: NodeColor;
  created_at: string;
  updated_at: string;
};

export type MindmapEdge = {
  id: string;
  user_id: string;
  source_node_id: string;
  target_node_id: string;
  created_at: string;
};

