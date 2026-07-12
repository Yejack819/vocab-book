const fs = require("fs");
let s = fs.readFileSync("src/utils/storage.ts", "utf-8");

s = s.replace(
  "import type { VocabWord, VocabExport, Sentence, AiSettings, AiStats, Notebook, ChatMessage }",
  "import type { VocabWord, VocabExport, Sentence, AiSettings, AiStats, Notebook, ChatSession }"
);

s = s.replace("const CHAT_HISTORY_KEY = 'kun-vocab-chat-history';\n", "");

s = s.replace(
  "export function loadChatHistory(): ChatMessage[] {\n  try { const r = localStorage.getItem(CHAT_HISTORY_KEY); return r ? JSON.parse(r) : []; }\n  catch { return []; }\n}\n\nexport function saveChatHistory(msgs: ChatMessage[]): void {\n  localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(msgs));\n}\n\nexport function clearChatHistory(): void {\n  localStorage.removeItem(CHAT_HISTORY_KEY);\n}\n\nexport function loadChatDraft(): string {\n  return localStorage.getItem(CHAT_DRAFT_KEY) || '';\n}\n\nexport function saveChatDraft(text: string): void {\n  localStorage.setItem(CHAT_DRAFT_KEY, text);\n}",
  `export function loadSessions(): ChatSession[] {
  try { const r = localStorage.getItem('kun-vocab-chat-sessions'); return r ? JSON.parse(r) : []; }
  catch { return []; }
}

export function saveSessions(sessions: ChatSession[]): void {
  localStorage.setItem('kun-vocab-chat-sessions', JSON.stringify(sessions));
}

export function getCurrentSessionId(): string {
  return localStorage.getItem('kun-vocab-chat-current-session') || '';
}

export function setCurrentSessionId(id: string): void {
  localStorage.setItem('kun-vocab-chat-current-session', id);
}

export function loadChatDraft(): string {
  return localStorage.getItem(CHAT_DRAFT_KEY) || '';
}

export function saveChatDraft(text: string): void {
  localStorage.setItem(CHAT_DRAFT_KEY, text);
}

export function clearAllSessions(): void {
  localStorage.removeItem('kun-vocab-chat-sessions');
  localStorage.removeItem('kun-vocab-chat-current-session');
}`
);

fs.writeFileSync("src/utils/storage.ts", s, "utf-8");
console.log("storage done");
