import { loadAiSettings, loadAiStats, saveAiStats } from './storage';

interface AiTranslateResult {
  phonetic?: string;
  partOfSpeech?: string[];
  meaning?: string;
}

/**
 * 调用 AI 分析单词：根据英文单词推断词性和中文释义
 * 返回结构化 JSON
 */

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
  if (!settings.host || !settings.apiKey) {
    throw new Error('请先在「设置」中配置 AI 的 host 和 apiKey');
  }

  const body = {
    model: settings.model,
    messages: [
      {
        role: 'system',
        content: `你是一位英语词汇专家。请分析用户提供的英文单词，返回严格的 JSON 格式（不要 markdown 代码块标记）。

返回格式：
{
  "phonetic": "/音标/",
  "partOfSpeech": ["词性1", "词性2"],
  "meaning": "中文释义"
}

- phonetic 是该单词的标准国际音标（IPA），用 / / 包裹，如 /kənˈtrɪbjuːt/
- 如果无法确定音标，返回空字符串
- 词性列表只能从以下值中选择：verb, noun, adjective, adverb, preposition, conjunction, pronoun, determiner, article, numeral, interjection, phrase, other
- 如果单词有多个词性，全部列出
- meaning 是常见的中文释义，多个释义用逗号分隔
- 如果单词是短语（如 "look after"），词性用 phrase
- 只返回 JSON，不要任何额外的说明文字`,
      },
      { role: 'user', content: word },
    ],
    temperature: 0.01,
    max_tokens: 300,
  };

  const response = await fetch(settings.host.replace(/\/+$/, '') + '/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => 'unknown error');
    recordStats('failure');
    throw new Error(`AI 请求失败 (${response.status}): ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  const content: string = data?.choices?.[0]?.message?.content ?? '';
  if (!content) { recordStats('empty'); throw new Error('AI 返回内容为空'); }

  // 尝试提取 JSON（兼容带 markdown 代码块的情况）
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  const parsed: AiTranslateResult = JSON.parse(jsonMatch ? jsonMatch[0] : content);

  recordStats('success', data?.usage?.prompt_tokens || 0, data?.usage?.completion_tokens || 0);
  return {
    phonetic: typeof parsed.phonetic === 'string' ? parsed.phonetic : '',
    partOfSpeech: Array.isArray(parsed.partOfSpeech) ? parsed.partOfSpeech : [],
    meaning: parsed.meaning ?? '',
  };
}

/**
 * 调用 AI 翻译英文例句到中文
 */
export async function aiTranslateSentence(english: string): Promise<string> {
  const settings = loadAiSettings();
  if (!settings.host || !settings.apiKey) {
    throw new Error('请先在「设置」中配置 AI 的 host 和 apiKey');
  }

  const body = {
    model: settings.model,
    messages: [
      {
        role: 'system',
        content: `你是一位专业翻译。请将用户提供的英文句子翻译成自然的中文。

规则：
1. 只返回中文翻译，不要任何额外的说明文字
2. 翻译要自然流畅，符合中文表达习惯
3. 保持原意的准确性
4. 不要加引号或其它标记`,
      },
      { role: 'user', content: english },
    ],
    temperature: 0.1,
    max_tokens: 500,
  };

  const response = await fetch(settings.host.replace(/\/+$/, '') + '/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => 'unknown error');
    recordStats('failure');
    throw new Error(`AI 请求失败 (${response.status}): ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  const content: string = data?.choices?.[0]?.message?.content ?? '';
  if (!content) { recordStats('empty'); throw new Error('AI 返回内容为空'); }

  recordStats('success', data?.usage?.prompt_tokens || 0, data?.usage?.completion_tokens || 0);
  return content.trim();
}
