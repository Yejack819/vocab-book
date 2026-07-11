/** 例句 */
export interface Sentence {
  english: string;
  chinese: string;
}

/** 单词条目 - 完全兼容导入的 JSON 结构 */
export interface VocabWord {
  id: string;
  word: string;
  phonetic?: string;
  meaning: string;
  partOfSpeech: string[];
  sentences: Sentence[];
  isFavorite: boolean;
  createdAt: number;
}

/** 导入/导出用的 JSON 根结构 */
export interface VocabExport {
  version: number;
  exportedAt: string;
  total: number;
  words: VocabWord[];
}

/** 筛选排序选项 */
export interface FilterOptions {
  search: string;
  partOfSpeech: string;
  favoriteOnly: boolean;
  sortBy: 'createdAt' | 'word' | 'meaning';
  sortOrder: 'asc' | 'desc';
}

/** 主题模式 */
export type ThemeMode = 'light' | 'dark' | 'system';

/** AI 设置 */
export interface AiSettings {
  host: string;
  apiKey: string;
  model: string;
}

/** 词性选项列表（预置 + 自定义） */
export const PART_OF_SPEECH_OPTIONS = [
  { value: 'verb', label: '动词 (verb)' },
  { value: 'noun', label: '名词 (noun)' },
  { value: 'adjective', label: '形容词 (adjective)' },
  { value: 'adverb', label: '副词 (adverb)' },
  { value: 'preposition', label: '介词 (preposition)' },
  { value: 'conjunction', label: '连词 (conjunction)' },
  { value: 'pronoun', label: '代词 (pronoun)' },
  { value: 'determiner', label: '限定词 (determiner)' },
  { value: 'article', label: '冠词 (article)' },
  { value: 'numeral', label: '数词 (numeral)' },
  { value: 'interjection', label: '感叹词 (interjection)' },
  { value: 'phrase', label: '词组' },
  { value: 'other', label: '其他' },
] as const;

export const DEFAULT_AI_SETTINGS: AiSettings = {
  host: '',
  apiKey: '',
  model: 'gpt-4o-mini',
};

/** AI 请求统计 */
export interface AiStats {
  total: number;
  success: number;
  failure: number;
  error: number;
  emptyResponse: number;
  estimatedTokens: {
    prompt: number;
    completion: number;
  };
}

export const DEFAULT_AI_STATS: AiStats = {
  total: 0,
  success: 0,
  failure: 0,
  error: 0,
  emptyResponse: 0,
  estimatedTokens: { prompt: 0, completion: 0 },
};

/** 单词本 */
export interface Notebook {
  id: string;
  name: string;
  createdAt: number;
}

/** 聊天消息 */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  vocabJson?: string;
  timestamp: number;
}

/** AI 设置扩展 */
export interface AiSettings {
  host: string;
  apiKey: string;
  model: string;
  chatModel?: string;
}
