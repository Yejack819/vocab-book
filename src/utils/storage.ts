import type { VocabWord, VocabExport, Sentence, AiSettings, AiStats } from '../types/vocab';
import { DEFAULT_AI_SETTINGS, DEFAULT_AI_STATS } from '../types/vocab';

const STORAGE_KEY = 'kun-vocab-words';
const AI_SETTINGS_KEY = 'kun-vocab-ai-settings';
const AI_STATS_KEY = 'kun-vocab-ai-stats';

/** 生成短唯一 ID */
function generateId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'm';
  for (let i = 0; i < 13; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/** 读取全部单词 */
export function loadWords(): VocabWord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

/** 保存全部单词 */
function saveWords(words: VocabWord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
}

/** 获取单个单词 */
export function getWord(id: string): VocabWord | undefined {
  return loadWords().find((w) => w.id === id);
}

/** 添加单词 */
export function addWord(word: string, meaning: string, partOfSpeech: string[], sentences: Sentence[], phonetic?: string): VocabWord {
  const words = loadWords();
  const newWord: VocabWord = {
    id: generateId(),
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

/** 更新单词 */
export function updateWord(id: string, data: Partial<Omit<VocabWord, 'id' | 'createdAt'>>): VocabWord | null {
  const words = loadWords();
  const index = words.findIndex((w) => w.id === id);
  if (index === -1) return null;
  words[index] = { ...words[index], ...data };
  saveWords(words);
  return words[index];
}

/** 删除单词 */
export function deleteWord(id: string): boolean {
  const words = loadWords();
  const filtered = words.filter((w) => w.id !== id);
  if (filtered.length === words.length) return false;
  saveWords(filtered);
  return true;
}

/** 切换收藏 */
export function toggleFavorite(id: string): VocabWord | null {
  const words = loadWords();
  const index = words.findIndex((w) => w.id === id);
  if (index === -1) return null;
  words[index].isFavorite = !words[index].isFavorite;
  saveWords(words);
  return words[index];
}

/** 导入 JSON（完全兼容 vocab-export 格式） */
export function importJson(json: VocabExport): { imported: number; skipped: number } {
  if (!json.words || !Array.isArray(json.words)) {
    return { imported: 0, skipped: 0 };
  }
  const existing = loadWords();
  const existingIds = new Set(existing.map((w) => w.id));
  let imported = 0;
  let skipped = 0;

  for (const word of json.words) {
    if (existingIds.has(word.id)) {
      skipped++;
      continue;
    }
    existing.push(word);
    existingIds.add(word.id);
    imported++;
  }

  saveWords(existing);
  return { imported, skipped };
}

/** 导出 JSON（完全兼容 vocab-export 格式） */
export function exportJson(): VocabExport {
  const words = loadWords();
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    total: words.length,
    words,
  };
}

/** 清除全部数据 */
export function clearAll(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** 获取统计信息 */
export function getStats() {
  const words = loadWords();
  const favoriteCount = words.filter((w) => w.isFavorite).length;
  const partOfSpeechCounts: Record<string, number> = {};
  for (const w of words) {
    for (const pos of w.partOfSpeech) {
      partOfSpeechCounts[pos] = (partOfSpeechCounts[pos] || 0) + 1;
    }
  }
  return {
    total: words.length,
    favoriteCount,
    partOfSpeechCounts,
  };
}

/** 读取 AI 设置 */
export function loadAiSettings(): AiSettings {
  try {
    const raw = localStorage.getItem(AI_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_AI_SETTINGS };
    return { ...DEFAULT_AI_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_AI_SETTINGS };
  }
}

/** 保存 AI 设置 */
export function saveAiSettings(settings: AiSettings): void {
  localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(settings));
}

/** 读取 AI 请求统计 */
export function loadAiStats(): AiStats {
  try {
    const raw = localStorage.getItem(AI_STATS_KEY);
    if (!raw) return { ...DEFAULT_AI_STATS };
    return { ...DEFAULT_AI_STATS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_AI_STATS };
  }
}

/** 保存 AI 请求统计 */
export function saveAiStats(stats: AiStats): void {
  localStorage.setItem(AI_STATS_KEY, JSON.stringify(stats));
}

/** 重置 AI 请求统计 */
export function resetAiStats(): void {
  localStorage.removeItem(AI_STATS_KEY);
}
