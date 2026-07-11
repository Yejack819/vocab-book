import { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../types/vocab';
import { loadChatHistory, saveChatHistory, clearChatHistory, loadChatDraft, saveChatDraft, loadAiSettings, addWord } from '../utils/storage';
import { chatCompletion } from '../utils/ai';
import { renderMarkdown } from '../utils/markdown';

export default function ChatView({ onRefresh }: { onRefresh?: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadChatHistory());
  const [input, setInput] = useState(() => loadChatDraft());
  const [sending, setSending] = useState(false);
  const [selectedWords, setSelectedWords] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { saveChatDraft(input); }, [input]);

  const showToast = (text: string) => { setToast(text); setTimeout(() => setToast(null), 3000); };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: Date.now() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    saveChatHistory(updated);
    setSending(true);

    try {
      const settings = loadAiSettings();
      if (!settings.host || !settings.apiKey) throw new Error('请先在「设置」中配置 AI Host 和 API Key');
      const result = await chatCompletion(updated.map(m => ({ role: m.role, content: m.content })), settings);
      const final = [...updated, { role: 'assistant' as const, content: result.content, vocabJson: result.vocabJson, timestamp: Date.now() }];
      setMessages(final);
      saveChatHistory(final);
    } catch (err: any) {
      const final = [...updated, { role: 'assistant' as const, content: '❌ ' + err.message, timestamp: Date.now() }];
      setMessages(final);
      saveChatHistory(final);
    } finally { setSending(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleClear = () => {
    if (window.confirm('确定清除所有对话记录吗？')) { setMessages([]); clearChatHistory(); }
  };

  const handleAddWords = (msgIndex: number) => {
    const msg = messages[msgIndex];
    if (!msg.vocabJson) return;
    try {
      const parsed = JSON.parse(msg.vocabJson);
      if (!parsed.words || !Array.isArray(parsed.words)) return;
      let count = 0;
      parsed.words.forEach((w: any, wi: number) => {
        if (selectedWords.has(wi)) {
          const pos = Array.isArray(w.partOfSpeech) ? w.partOfSpeech : (typeof w.partOfSpeech === 'string' ? [w.partOfSpeech] : []);
          addWord(w.word || '', w.meaning || '', pos, Array.isArray(w.sentences) ? w.sentences : [], w.phonetic || '');
          count++;
        }
      });
      setSelectedWords(new Set());
      showToast(`成功添加 ${count} 个单词到当前单词本`);
      onRefresh?.();
    } catch {}
  };

  const toggleWord = (idx: number) => {
    setSelectedWords(prev => { const next = new Set(prev); if (next.has(idx)) next.delete(idx); else next.add(idx); return next; });
  };

  return (
    <div className="chat-view">
      <div className="chat-header">
        <h2>💬 AI 对话</h2>
        <button className="btn btn-small" onClick={handleClear}>🗑️ 清空记录</button>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <div className="chat-empty-icon">💬</div>
            <p className="chat-empty-title">开始英语学习对话</p>
            <p className="chat-empty-hint">AI 会自动检测对话中的英语单词，方便你加入单词本</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`chat-msg ${msg.role === 'user' ? 'msg-user' : 'msg-assistant'}`}>
            <div className="msg-avatar">{msg.role === 'user' ? '👤' : '🤖'}</div>
            <div className="msg-body">
              <div className="msg-label">{msg.role === 'user' ? '你' : 'AI 助手'}</div>
              <div className="msg-content" dangerouslySetInnerHTML={{__html:renderMarkdown(msg.content)}}></div>
              {msg.role === 'assistant' && msg.vocabJson && (() => {
                try {
                  const parsed = JSON.parse(msg.vocabJson);
                  if (!parsed.words || !Array.isArray(parsed.words)) return null;
                  return (
                    <div className="vocab-card">
                      <div className="vocab-card-header">📝 检测到英语单词</div>
                      <div className="vocab-card-list">
                        {parsed.words.map((w: any, wi: number) => (
                          <label key={wi} className={`vocab-item ${selectedWords.has(wi) ? 'checked' : ''}`}>
                            <input type="checkbox" checked={selectedWords.has(wi)} onChange={() => toggleWord(wi)} />
                            <span className="vi-word">{w.word}</span>
                            {w.phonetic && <span className="vi-phonetic">{w.phonetic}</span>}
                            <span className="vi-pos">{(w.partOfSpeech||[]).slice(0, 2).join('/')}</span>
                            <span className="vi-meaning">{w.meaning}</span>
                          </label>
                        ))}
                      </div>
                      <button className="btn btn-primary btn-small" onClick={() => handleAddWords(i)} disabled={selectedWords.size === 0}>
                        ➕ 加入单词本 ({selectedWords.size})
                      </button>
                    </div>
                  );
                } catch { return null; }
              })()}
            </div>
          </div>
        ))}
        {sending && <div className="chat-msg msg-assistant"><div className="msg-avatar">🤖</div><div className="msg-body"><div className="msg-label">AI 助手</div><div className="msg-content">⏳ 思考中…</div></div></div>}
        <div ref={endRef} />
      </div>

      <div className="chat-input-area">
        <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="输入消息，Enter 发送，Shift+Enter 换行" rows={2} />
        <button className="btn btn-primary send-btn" onClick={handleSend} disabled={sending || !input.trim()}>{sending ? '⏳' : '发送'}</button>
      </div>

      {toast && <div className="toast toast-success">{toast}</div>}
    </div>
  );
}
