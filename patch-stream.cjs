const fs = require("fs");
let a = fs.readFileSync("src/utils/ai.ts", "utf-8");

// Update the ChatResponse interface and CHAT_SYSTEM_PROMPT
a = a.replace(
  "const CHAT_SYSTEM_PROMPT = `You are an English learning assistant.",
  "const CHAT_SYSTEM_PROMPT = (includeSentences: boolean) => `You are an English learning assistant."
);

a = a.replace(
  "- Keep example sentences brief if any`;",
  `- Include example sentences for each word if includeSentences is true, otherwise omit the sentences field entirely.
- If includeSentences is true, provide one natural example sentence per word in English with Chinese translation.\`;`
);

// Replace the old chatCompletion with streaming version
a = a.replace(
  `export async function chatCompletion(messages: {role:string;content:string}[], settings: {host:string;apiKey:string;model:string}): Promise<ChatResponse> {
  const body = {
    model: settings.model,
    messages: [{ role: 'system', content: CHAT_SYSTEM_PROMPT }, ...messages],
    temperature: 0.3,
    max_tokens: 2000,
  };

  const resp = await fetch(settings.host.replace(/\\/+$/, '') + '/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${settings.apiKey}\` },
    body: JSON.stringify(body),
  });

  if (!resp.ok) { const e = await resp.text().catch(()=>''); throw new Error(\`AI 请求失败 (\${resp.status}): \${e.slice(0,200)}\`); }

  const data = await resp.json();
  let content: string = data?.choices?.[0]?.message?.content ?? '';
  if (!content) throw new Error('AI 返回内容为空');

  let vocabJson: string | undefined;
  const vocabMatch = content.match(/---VOCAB_START---([\\s\\S]*?)---VOCAB_END---/);
  if (vocabMatch) {
    vocabJson = vocabMatch[1].trim();
    content = content.replace(/---VOCAB_START---[\\s\\S]*?---VOCAB_END---/, '').trim();
    try { JSON.parse(vocabJson); } catch { vocabJson = undefined; }
  }

  return { content, vocabJson };
}`,
  `export async function chatCompletionStream(
  messages: {role:string;content:string}[],
  settings: {host:string;apiKey:string;model:string;includeSentences?:boolean},
  onChunk: (text: string) => void,
  onDone: (fullContent: string, vocabJson?: string) => void,
  onError: (err: Error) => void
): Promise<void> {
  const prompt = CHAT_SYSTEM_PROMPT(settings.includeSentences !== false);
  const body = {
    model: settings.model,
    messages: [{ role: 'system', content: prompt }, ...messages],
    temperature: 0.3,
    max_tokens: 3000,
    stream: true,
  };

  try {
    const resp = await fetch(settings.host.replace(/\\/+$/, '') + '/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${settings.apiKey}\` },
      body: JSON.stringify(body),
    });

    if (!resp.ok) { const e = await resp.text().catch(()=>''); onError(new Error(\`AI 请求失败 (\${resp.status}): \${e.slice(0,200)}\`)); return; }
    if (!resp.body) { onError(new Error('浏览器不支持流式读取')); return; }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed?.choices?.[0]?.delta?.content;
          if (delta) {
            fullContent += delta;
            onChunk(fullContent);
          }
        } catch {}
      }
    }

    // Process final buffer
    if (buffer.trim().startsWith('data: ')) {
      const data = buffer.trim().slice(6);
      if (data !== '[DONE]') {
        try {
          const parsed = JSON.parse(data);
          const delta = parsed?.choices?.[0]?.delta?.content;
          if (delta) { fullContent += delta; onChunk(fullContent); }
        } catch {}
      }
    }

    // Extract vocab JSON
    let vocabJson: string | undefined;
    const vocabMatch = fullContent.match(/---VOCAB_START---([\\s\\S]*?)---VOCAB_END---/);
    if (vocabMatch) {
      vocabJson = vocabMatch[1].trim();
      fullContent = fullContent.replace(/---VOCAB_START---[\\s\\S]*?---VOCAB_END---/, '').trim();
      try { JSON.parse(vocabJson); } catch { vocabJson = undefined; }
    }

    onDone(fullContent, vocabJson);
  } catch (err: any) {
    onError(err);
  }
}`
);

fs.writeFileSync("src/utils/ai.ts", a, "utf-8");
console.log("ai.ts done");
