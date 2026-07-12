import { loadAiSettings, loadAiStats, saveAiStats } from './storage';

interface AiTranslateResult {
  phonetic?: string;
  partOfSpeech?: string[];
  meaning?: string;
}

function recordStats(result: 'success' | 'failure' | 'error' | 'empty', promptTokens = 0, completionTokens = 0) {
  try {
    const s = loadAiStats();
    s.total++;
    if (result === 'success') s.success++;
    else if (result === 'failure') s.failure++;
    else if (result === 'error') s.error++;
    else if (result === 'empty') s.emptyResponse++;
    s.estimatedTokens.prompt += promptTokens;
    s.estimatedTokens.completion += completionTokens;
    saveAiStats(s);
  } catch {}
}

export async function aiAnalyzeWord(word: string): Promise<AiTranslateResult> {
  const settings = loadAiSettings();
  if (!settings.host || !settings.apiKey) throw new Error('请先在「设置」中配置 AI 的 host 和 apiKey');

  const body = {
    model: settings.model,
    messages: [
      { role: 'system', content: '你是一位英语词汇专家。请分析用户提供的英文单词，返回严格的 JSON 格式（不要 markdown 代码块标记）。\n\n返回格式：\n{\n  "phonetic": "/音标/",\n  "partOfSpeech": ["词性1", "词性2"],\n  "meaning": "中文释义"\n}\n\n- phonetic 是该单词的标准国际音标（IPA），用 / / 包裹，如 /kənˈtrɪbjuːt/\n- 如果无法确定音标，返回空字符串\n- 词性列表只能从以下值中选择：verb, noun, adjective, adverb, preposition, conjunction, pronoun, determiner, article, numeral, interjection, phrase, other\n- 如果单词有多个词性，全部列出\n- meaning 是常见的中文释义，多个释义用逗号分隔\n- 如果单词是短语（如 "look after"），词性用 phrase\n- 只返回 JSON，不要任何额外的说明文字' },
      { role: 'user', content: word },
    ],
    temperature: 0.01,
    max_tokens: 300,
  };

  const response = await fetch(settings.host.replace(/\/+$/, '') + '/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.apiKey}` },
    body: JSON.stringify(body),
  });

  if (!response.ok) { await response.text().catch(() => ''); recordStats('failure'); throw new Error(`AI 请求失败 (${response.status})`); }

  const data = await response.json();
  const content: string = data?.choices?.[0]?.message?.content ?? '';
  if (!content) { recordStats('empty'); throw new Error('AI 返回内容为空'); }

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  const parsed: AiTranslateResult = JSON.parse(jsonMatch ? jsonMatch[0] : content);
  recordStats('success', data?.usage?.prompt_tokens || 0, data?.usage?.completion_tokens || 0);
  return {
    phonetic: typeof parsed.phonetic === 'string' ? parsed.phonetic : '',
    partOfSpeech: Array.isArray(parsed.partOfSpeech) ? parsed.partOfSpeech : [],
    meaning: parsed.meaning ?? '',
  };
}

export interface ChatResponse {
  content: string;
  vocabJson?: string;
}

const CHAT_SYSTEM_PROMPT = 'You are an English learning assistant. Answer in Chinese naturally.\n\nAfter each response, if the conversation involves English vocabulary words, extract them and output a JSON block at the very end with these exact markers:\n\n---VOCAB_START---\n{"words":[{"word":"...","phonetic":"/.../","meaning":"中文释义","partOfSpeech":["verb"]}]}\n---VOCAB_END---\n\nRules:\n- Only include words directly relevant to the conversation\n- Provide accurate IPA phonetics and Chinese meanings\n- List all applicable parts of speech\n- Omit the sentences field entirely (do NOT include example sentences)\n- If no relevant vocabulary, omit the VOCAB block entirely\n- The JSON must be valid and parseable\n- Do NOT add any text after the VOCAB_END marker';

export async function chatCompletion(messages: {role:string;content:string}[], settings: {host:string;apiKey:string;model:string}): Promise<ChatResponse> {
  const body = {
    model: settings.model,
    messages: [{ role: 'system', content: CHAT_SYSTEM_PROMPT }, ...messages],
    temperature: 0.3,
    max_tokens: 2000,
  };

  const resp = await fetch(settings.host.replace(/\/+$/, '') + '/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + settings.apiKey },
    body: JSON.stringify(body),
  });

  if (!resp.ok) { await resp.text().catch(() => ''); throw new Error('AI error: ' + resp.status); }
  const data = await resp.json();
  let content = data?.choices?.[0]?.message?.content ?? '';
  if (!content) throw new Error('AI return empty');

  // Record stats
  const pt = data?.usage?.prompt_tokens || 0;
  const ct = data?.usage?.completion_tokens || 0;
  try {
    const s = loadAiStats();
    s.total++; s.success++; s.estimatedTokens.prompt += pt; s.estimatedTokens.completion += ct;
    saveAiStats(s);
  } catch {}

  let vocabJson;
  const m = content.match(/---VOCAB_START---([\s\S]*?)---VOCAB_END---/);
  if (m) { vocabJson = m[1].trim(); content = content.replace(/---VOCAB_START---[\s\S]*?---VOCAB_END---/, '').trim(); try { JSON.parse(vocabJson); } catch { vocabJson = undefined; } }
  return { content, vocabJson };
}

export async function aiGenerateSentence(word: string): Promise<{ english: string; chinese: string }> {
  const settings = loadAiSettings();
  if (!settings.host || !settings.apiKey) throw new Error('请先在「设置」中配置 AI 的 host 和 apiKey');

  const resp = await fetch(settings.host.replace(/\/+$/, '') + '/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + settings.apiKey },
    body: JSON.stringify({
      model: settings.model,
      messages: [
        { role: 'system', content: '为用户单词 "' + word + '" 提供一句简短的英文例句（不超过15个单词）和中文翻译。仅返回 JSON：{"english":"...","chinese":"..."}' },
      ],
      temperature: 0.3,
      max_tokens: 300,
    }),
  });
  if (!resp.ok) throw new Error('AI error');
  const data = await resp.json();
  const txt = data?.choices?.[0]?.message?.content || '';
  const j = txt.match(/\{[\s\S]*\}/);
  if (j) { const r = JSON.parse(j[0]); return { english: r.english || '', chinese: r.chinese || '' }; }
  throw new Error('Parse failed');
}

export async function aiGenerateTitle(conversation: {role:string;content:string}[]): Promise<string> {
  const settings = JSON.parse(localStorage.getItem('kun-vocab-ai-settings') || '{}');
  const host = (settings.host || '').replace(/\/+$/, '');
  const key = settings.apiKey || '';
  const model = settings.model || 'gpt-4o-mini';
  if (!host || !key) return '';

  try {
    const resp = await fetch(host + '/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'Based on the conversation below, generate a very short title (3-6 words in the user\'s language). Return ONLY the title, no quotes or punctuation.' },
          ...conversation.slice(-2),
        ],
        temperature: 0.3,
        max_tokens: 30,
      }),
    });
    if (!resp.ok) return '';
    const data = await resp.json();
    const txt = data?.choices?.[0]?.message?.content || '';
    return txt.replace(/[""'']/g, '').trim().slice(0, 30) || '';
  } catch { return ''; }
}

export async function aiTranslateSentence(english: string): Promise<string> {
  const settings = loadAiSettings();
  if (!settings.host || !settings.apiKey) throw new Error('请先在「设置」中配置 AI 的 host 和 apiKey');

  const body = {
    model: settings.model,
    messages: [
      { role: 'system', content: '你是一位专业翻译。请将用户提供的英文句子翻译成自然的中文。\n\n规则：\n1. 只返回中文翻译，不要任何额外的说明文字\n2. 翻译要自然流畅，符合中文表达习惯\n3. 保持原意的准确性\n4. 不要加引号或其它标记' },
      { role: 'user', content: english },
    ],
    temperature: 0.1,
    max_tokens: 500,
  };

  const response = await fetch(settings.host.replace(/\/+$/, '') + '/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.apiKey}` },
    body: JSON.stringify(body),
  });

  if (!response.ok) { const e = await response.text().catch(() => ''); recordStats('failure'); throw new Error(`AI 请求失败 (${response.status}): ${e.slice(0, 200)}`); }
  const data = await response.json();
  const content: string = data?.choices?.[0]?.message?.content ?? '';
  if (!content) { recordStats('empty'); throw new Error('AI 返回内容为空'); }
  recordStats('success', data?.usage?.prompt_tokens || 0, data?.usage?.completion_tokens || 0);
  return content.trim();
}
