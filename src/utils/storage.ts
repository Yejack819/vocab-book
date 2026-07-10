import type { VocabWord, VocabExport, Sentence, AiSettings, AiStats, Notebook } from '../types/vocab';
import { DEFAULT_AI_SETTINGS, DEFAULT_AI_STATS } from '../types/vocab';

const NOTEBOOKS_KEY = 'kun-vocab-notebooks';
const CURRENT_KEY = 'kun-vocab-current-notebook';
const OLD_WORDS_KEY = 'kun-vocab-words';
const AI_SETTINGS_KEY = 'kun-vocab-ai-settings';
const AI_STATS_KEY = 'kun-vocab-ai-stats';

function wordsKey(id: string) { return `kun-vocab-words-${id}`; }

// ---------- Notebook CRUD ----------

function generateId(): string {
  const c = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let r = 'nb';
  for (let i = 0; i < 10; i++) r += c[Math.floor(Math.random() * c.length)];
  return r;
}

export function loadNotebooks(): Notebook[] {
  try {
    const raw = localStorage.getItem(NOTEBOOKS_KEY);
    if (raw) return JSON.parse(raw);
    // Migration from old single-notebook format
    const oldWords = localStorage.getItem(OLD_WORDS_KEY);
    const defaultNb: Notebook = { id: 'default', name: '默认单词本', createdAt: Date.now() };
    if (oldWords) {
      // Migrate old data to default notebook
      localStorage.setItem(wordsKey('default'), oldWords);
      localStorage.removeItem(OLD_WORDS_KEY);
    }
    localStorage.setItem(NOTEBOOKS_KEY, JSON.stringify([defaultNb]));
    localStorage.setItem(CURRENT_KEY, 'default');
    return [defaultNb];
  } catch { return []; }
}

export function saveNotebooks(nbs: Notebook[]): void {
  localStorage.setItem(NOTEBOOKS_KEY, JSON.stringify(nbs));
}

export function getCurrentNotebookId(): string {
  return localStorage.getItem(CURRENT_KEY) || 'default';
}

export function setCurrentNotebookId(id: string): void {
  localStorage.setItem(CURRENT_KEY, id);
}

export function addNotebook(name: string): Notebook {
  const nb: Notebook = { id: generateId(), name, createdAt: Date.now() };
  const list = loadNotebooks();
  list.push(nb);
  saveNotebooks(list);
  return nb;
}

export function renameNotebook(id: string, name: string): void {
  const list = loadNotebooks();
  const nb = list.find(n => n.id === id);
  if (nb) { nb.name = name; saveNotebooks(list); }
}

export function deleteNotebook(id: string): boolean {
  const list = loadNotebooks();
  if (list.length <= 1) return false; // can't delete last
  const idx = list.findIndex(n => n.id === id);
  if (idx === -1) return false;
  list.splice(idx, 1);
  saveNotebooks(list);
  localStorage.removeItem(wordsKey(id));
  // If current was deleted, switch to first
  if (getCurrentNotebookId() === id) setCurrentNotebookId(list[0].id);
  return true;
}

// ---------- Word CRUD (current notebook) ----------

function getWordsKey(): string {
  const id = getCurrentNotebookId();
  return wordsKey(id);
}

export function loadWords(): VocabWord[] {
  try {
    const raw = localStorage.getItem(getWordsKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function saveWords(words: VocabWord[]): void {
  localStorage.setItem(getWordsKey(), JSON.stringify(words));
}

export function getWord(id: string): VocabWord | undefined {
  return loadWords().find(w => w.id === id);
}

export function addWord(word: string, meaning: string, partOfSpeech: string[], sentences: Sentence[], phonetic?: string): VocabWord {
  const words = loadWords();
  const newWord: VocabWord = {
    id: 'm' + Math.random().toString(36).slice(2, 15),
    word,
    meaning,
    phonetic: phonetic || undefined,
    partOfSpeech,
    sentences,
    isFavorite: false,
    createdAt: Date.now(),
  };
  words.push(newWord);
  saveWords(words);
  return newWord;
}

export function updateWord(id: string, data: Partial<Omit<VocabWord, 'id' | 'createdAt'>>): VocabWord | null {
  const words = loadWords();
  const idx = words.findIndex(w => w.id === id);
  if (idx === -1) return null;
  words[idx] = { ...words[idx], ...data };
  saveWords(words);
  return words[idx];
}

export function deleteWord(id: string): boolean {
  const words = loadWords();
  const filtered = words.filter(w => w.id !== id);
  if (filtered.length === words.length) return false;
  saveWords(filtered);
  return true;
}

export function toggleFavorite(id: string): VocabWord | null {
  const words = loadWords();
  const idx = words.findIndex(w => w.id === id);
  if (idx === -1) return null;
  words[idx].isFavorite = !words[idx].isFavorite;
  saveWords(words);
  return words[idx];
}

export function importJson(json: VocabExport): { imported: number; skipped: number } {
  if (!json.words || !Array.isArray(json.words)) return { imported: 0, skipped: 0 };
  const existing = loadWords();
  const existingIds = new Set(existing.map(w => w.id));
  let imported = 0, skipped = 0;
  for (const word of json.words) {
    if (existingIds.has(word.id)) { skipped++; continue; }
    existing.push(word);
    existingIds.add(word.id);
    imported++;
  }
  saveWords(existing);
  return { imported, skipped };
}

export function exportJson(): VocabExport {
  const words = loadWords();
  return { version: 1, exportedAt: new Date().toISOString(), total: words.length, words };
}

/** Clear current notebook's words only */
export function moveWordsBetweenNotebooks(wordIds: string[], toNotebookId: string): number {
  const fromWords = loadWords();
  const toKey = wordsKey(toNotebookId);
  let toWords: VocabWord[] = [];
  try { const raw = localStorage.getItem(toKey); if (raw) toWords = JSON.parse(raw); if (!Array.isArray(toWords)) toWords = []; } catch { toWords = []; }
  const moved: VocabWord[] = [];
  const remaining: VocabWord[] = [];
  for (const w of fromWords) {
    if (wordIds.includes(w.id)) moved.push(w);
    else remaining.push(w);
  }
  toWords.push(...moved);
  localStorage.setItem(getWordsKey(), JSON.stringify(remaining));
  localStorage.setItem(toKey, JSON.stringify(toWords));
  return moved.length;
}

export function clearCurrentNotebook(): void {
  localStorage.removeItem(getWordsKey());
}

/** Factory reset: all notebooks, AI settings, stats, theme */
export function factoryReset(): void {
  const nbs = loadNotebooks();
  for (const nb of nbs) localStorage.removeItem(wordsKey(nb.id));
  localStorage.removeItem(NOTEBOOKS_KEY);
  localStorage.removeItem(CURRENT_KEY);
  localStorage.removeItem(AI_SETTINGS_KEY);
  localStorage.removeItem(AI_STATS_KEY);
  localStorage.removeItem('kun-vocab-theme');
}

// ---------- Stats ----------

export function getStats() {
  const words = loadWords();
  const favoriteCount = words.filter(w => w.isFavorite).length;
  const partOfSpeechCounts: Record<string, number> = {};
  for (const w of words) for (const pos of w.partOfSpeech) partOfSpeechCounts[pos] = (partOfSpeechCounts[pos] || 0) + 1;
  return { total: words.length, favoriteCount, partOfSpeechCounts };
}

export function loadAiSettings(): AiSettings {
  try { const raw = localStorage.getItem(AI_SETTINGS_KEY); return raw ? { ...DEFAULT_AI_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_AI_SETTINGS }; }
  catch { return { ...DEFAULT_AI_SETTINGS }; }
}

export function saveAiSettings(settings: AiSettings): void {
  localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(settings));
}

export function loadAiStats(): AiStats {
  try { const raw = localStorage.getItem(AI_STATS_KEY); return raw ? { ...DEFAULT_AI_STATS, ...JSON.parse(raw) } : { ...DEFAULT_AI_STATS }; }
  catch { return { ...DEFAULT_AI_STATS }; }
}

export function saveAiStats(stats: AiStats): void {
  localStorage.setItem(AI_STATS_KEY, JSON.stringify(stats));
}

export function resetAiStats(): void {
  localStorage.removeItem(AI_STATS_KEY);
}
