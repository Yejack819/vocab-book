const fs = require("fs");
let c = fs.readFileSync("src/components/ChatView.tsx", "utf-8");

// Update import
c = c.replace(
  "import { chatCompletion } from '../utils/ai';",
  "import { chatCompletionStream } from '../utils/ai';"
);

// Replace handleSend try/catch with streaming version
c = c.replace(
  "    try {\n      const settings = loadAiSettings();\n      if (!settings.host || !settings.apiKey) throw new Error('请先在「设置」中配置 AI Host 和 API Key');\n      const result = await chatCompletion(updated.map(m => ({ role: m.role, content: m.content })), settings);\n      const assistantMsg: ChatMessage = {\n        role: 'assistant', content: result.content, vocabJson: result.vocabJson, timestamp: Date.now(),\n      };\n      const final = [...updated, assistantMsg];\n      setMessages(final);\n      saveChatHistory(final);\n    } catch (err: any) {\n      const errMsg: ChatMessage = { role: 'assistant', content: '❌ ' + err.message, timestamp: Date.now() };\n      const final = [...updated, errMsg];\n      setMessages(final);\n      saveChatHistory(final);\n    } finally { setSending(false); }",
  "    // Placeholder for streaming\n    const placeholderIdx = updated.length;\n    const placeholder: ChatMessage = { role: 'assistant', content: '', timestamp: Date.now() };\n    const withPlaceholder = [...updated, placeholder];\n    setMessages(withPlaceholder);\n\n    const settings = loadAiSettings();\n    if (!settings.host || !settings.apiKey) {\n      const errMsg: ChatMessage = { role: 'assistant', content: '❌ 请先在「设置」中配置 AI Host 和 API Key', timestamp: Date.now() };\n      setMessages([...updated, errMsg]);\n      saveChatHistory([...updated, errMsg]);\n      setSending(false);\n      return;\n    }\n\n    await chatCompletionStream(\n      updated.map(m => ({ role: m.role, content: m.content })),\n      settings,\n      (text) => {\n        setMessages(prev => {\n          const next = [...prev];\n          next[placeholderIdx] = { ...next[placeholderIdx], content: text };\n          return next;\n        });\n      },\n      (fullContent, vocabJson) => {\n        const final = [...updated, { role: 'assistant', content: fullContent, vocabJson, timestamp: Date.now() }];\n        setMessages(final);\n        saveChatHistory(final);\n        setSending(false);\n      },\n      (err) => {\n        const final = [...updated, { role: 'assistant', content: '❌ ' + err.message, timestamp: Date.now() }];\n        setMessages(final);\n        saveChatHistory(final);\n        setSending(false);\n      }\n    );"
);

fs.writeFileSync("src/components/ChatView.tsx", c, "utf-8");
console.log("done");
