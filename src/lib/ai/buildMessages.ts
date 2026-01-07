/**
 * Helper functies om consistent AI messages te bouwen.
 * Elke builder combineert de base system prompt met specifieke output rules.
 */

import {
  AI_SYSTEM_PROMPT,
  CHAT_OUTPUT_RULES,
  LABEL_OUTPUT_RULES,
  CONVERSATION_OUTPUT_RULES,
  AGENT_CHARTER,
  AGENT_OUTPUT_CONTRACT,
  DETAIL_LENGTH_RULES,
  MODE_TEMPLATES,
} from "./instructions";

type Message = {
  role: "system" | "user";
  content: string;
};

/**
 * Bouw messages voor de chat endpoint.
 */
export function buildChatMessages(
  noteTitle: string | null,
  noteContent: string,
  userMessage: string
): Message[] {
  const noteContext = `
NOTITIE TITEL: ${noteTitle || "(geen titel)"}

NOTITIE INHOUD:
${noteContent.slice(0, 6000) || "(leeg)"}
`.trim();

  return [
    { role: "system", content: AI_SYSTEM_PROMPT },
    { role: "system", content: CHAT_OUTPUT_RULES },
    { role: "user", content: `${noteContext}\n\n---\n\nGEBRUIKER VRAAGT: ${userMessage.trim()}` },
  ];
}

/**
 * Bouw messages voor de label endpoint.
 */
export function buildLabelMessages(
  noteTitle: string | null,
  noteContent: string
): Message[] {
  const noteContext = `
Genereer labels voor deze notitie:

TITEL: ${noteTitle || "(geen titel)"}

INHOUD:
${noteContent.slice(0, 1500) || "(leeg)"}
`.trim();

  return [
    { role: "system", content: AI_SYSTEM_PROMPT },
    { role: "system", content: LABEL_OUTPUT_RULES },
    { role: "user", content: noteContext },
  ];
}

/**
 * Bouw messages voor de conversation endpoint (speaker diarization + summary).
 */
export function buildConversationMessages(transcriptText: string): Message[] {
  const context = `
Verwerk deze gesprekstranscriptie:

${transcriptText.slice(0, 8000)}
`.trim();

  return [
    { role: "system", content: AI_SYSTEM_PROMPT },
    { role: "system", content: CONVERSATION_OUTPUT_RULES },
    { role: "user", content: context },
  ];
}

type DetailLevel = "short" | "normal" | "deep";
type AgentMode = "general" | "research" | "market_analysis";

type AgentMessageOptions = {
  noteTitle: string | null;
  noteContent: string;
  userMessage: string;
  detail: DetailLevel;
  mode: AgentMode;
  webEnabled: boolean;
  researchContext?: string;
};

/**
 * Bouw messages voor de agent endpoint.
 * Co-pilot style: proactief, direct, waarde-leverend.
 */
export function buildAgentMessages(options: AgentMessageOptions): Message[] {
  const {
    noteTitle,
    noteContent,
    userMessage,
    detail,
    mode,
    webEnabled,
    researchContext,
  } = options;

  const trimmedContent = noteContent.slice(0, 6000);
  const isEmpty = !trimmedContent || trimmedContent.trim().length < 10;

  // Get length guidance and template for mode
  const lengthRule = DETAIL_LENGTH_RULES[detail];
  const template = MODE_TEMPLATES[mode];

  // Simpler note context
  const noteContext = isEmpty
    ? `NOTITIE: "${noteTitle || 'Zonder titel'}" (nog leeg - help de gebruiker starten)`
    : `NOTITIE: "${noteTitle || 'Zonder titel'}"\n\n${trimmedContent}`;

  // Build messages array - simpler, more conversational
  const messages: Message[] = [
    { role: "system", content: AGENT_CHARTER },
    { role: "system", content: AGENT_OUTPUT_CONTRACT },
  ];
  
  // Add mode context only if not general
  if (mode !== "general") {
    messages.push({ role: "system", content: `MODE: ${mode}\n${template}` });
  }
  
  // Add detail guidance
  messages.push({ role: "system", content: lengthRule.instruction });
  
  // Web search context
  if (webEnabled && researchContext) {
    messages.push({ 
      role: "system", 
      content: `WEB SEARCH RESULTATEN:\n${researchContext}\n\nGebruik deze bronnen in je antwoord en vermeld ze.` 
    });
  } else if (!webEnabled) {
    messages.push({ 
      role: "system", 
      content: `Web search staat UIT. Werk met de notitie-inhoud + algemene kennis. Als de user om online info vraagt, bied aan om web search aan te zetten.` 
    });
  }

  // User context and question combined
  messages.push({ 
    role: "user", 
    content: `${noteContext}\n\n---\n\n${userMessage.trim()}` 
  });

  return messages;
}

