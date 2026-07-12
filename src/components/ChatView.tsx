import { useState, useRef, useEffect } from 'react';
import type { ChatMessage, ChatSession } from '../types/vocab';
import { loadSessions, saveSessions, getCurrentSessionId, setCurrentSessionId, loadChatDraft, saveChatDraft, loadAiSettings, addWord } from '../utils/storage';
import { chatCompletion, aiGenerateTitle } from '../utils/ai';
import { renderMarkdown } from '../utils/markdown';

function genId() { return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

export default function ChatView({ onRefresh }: { onRefresh?: () => void }) {
  const [sessions, setSessions] = useState<ChatSession[]>(() => loadSessions());
  const [currentId, setCurrentId] = useState(() => getCurrentSessionId());
  const [showList, setShowList] = useState(false);
  const [input, setInput] = useState(() => loadChatDraft());
  const [sending, setSending] = useState(false);
  const [selectedWords, setSelectedWords] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const current = sessions.find(s => s.id === currentId);
  const messages = current?.messages || [];

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { saveChatDraft(input); }, [input]);

  // Auto-create first session
  useEffect(() => {
    if (sessions.length === 0) {
      const nb: ChatSession = { id: genId(), name: '新对话', messages: [], createdAt: Date.now() };
      setSessions([nb]);
      setCurrentId(nb.id);
      setCurrentSessionId(nb.id);
    }
  }, []);

  const persist = (list: ChatSession[], cid: string) => {
    saveSessions(list);
    setCurrentSessionId(cid);
  };

  const ensureSession = () => {
    let list = [...sessions];
    let cid = currentId;
    if (!list.find(s => s.id === cid)) {
      const nb: ChatSession = { id: genId(), name: '对话 ' + (list.length + 1), messages: [], createdAt: Date.now() };
      list.push(nb);
      cid = nb.id;
    }
    return { list, cid };
  };

  const switchSession = (id: string) => {
    setCurrentId(id);
    setCurrentSessionId(id);
    setShowList(false);
    setSelectedWords(new Set());
    setInput('');
  };

  const newSession = () => {
    const nb: ChatSession = { id: genId(), name: '对话 ' + (sessions.length + 1), messages: [], createdAt: Date.now() };
    const list = [...sessions, nb];
    setSessions(list);
    setCurrentId(nb.id);
    persist(list, nb.id);
    setInput('');
  };

  const deleteSession = (id: string) => {
    if (sessions.length <= 1) return;
    const list = sessions.filter(s => s.id !== id);
    const nextId = id === currentId ? list[0].id : currentId;
    setSessions(list);
    setCurrentId(nextId);
    persist(list, nextId);
  };

  const renameSession = (id: string) => {
    const name = prompt('重命名会话：', sessions.find(s => s.id === id)?.name);
    if (name && name.trim()) {
      const list = sessions.map(s => s.id === id ? { ...s, name: name.trim() } : s);
      setSessions(list);
      saveSessions(list);
    }
  };

  const showToast = (text: string) => { setToast(text); setTimeout(() => setToast(null), 3000); };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');

    const { list: slist, cid } = ensureSession();
    const idx = slist.findIndex(s => s.id === cid);
    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: Date.now() };
    const updatedMsgs = [...(slist[idx]?.messages || []), userMsg];
    slist[idx] = { ...slist[idx], messages: updatedMsgs };
    setSessions(slist);
    persist(slist, cid);
    setSending(true);

    try {
      const settings = loadAiSettings();
      if (!settings.host || !settings.apiKey) throw new Error('请先在「设置」中配置 AI Host 和 API Key');
      const result = await chatCompletion(updatedMsgs.map(m => ({ role: m.role, content: m.content })), settings);
      const assistantMsg: ChatMessage = { role: 'assistant', content: result.content, vocabJson: result.vocabJson, timestamp: Date.now() };
      const finalMsgs = [...updatedMsgs, assistantMsg];
      slist[idx] = { ...slist[idx], messages: finalMsgs };
      setSessions([...slist]);
      saveSessions(slist);

      // Auto-name session after first exchange
      if (slist[idx].name.startsWith('新对话') || slist[idx].name.startsWith('对话 ')) {
        aiGenerateTitle(finalMsgs).then(title => {
          if (title) {
            setSessions(prev => {
              const next = prev.map(s => s.id === cid ? { ...s, name: title } : s);
              saveSessions(next);
              return next;
            });
          }
        }).catch(() => {});
      }
    } catch (err: any) {
      const errMsg: ChatMessage = { role: 'assistant', content: '❌ ' + err.message, timestamp: Date.now() };
      const finalMsgs = [...updatedMsgs, errMsg];
      slist[idx] = { ...slist[idx], messages: finalMsgs };
      setSessions([...slist]);
      saveSessions(slist);
    } finally { setSending(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleAddWords = (msgIndex: number) => {
    if (!current) return;
    const msg = current.messages[msgIndex];
    if (!msg?.vocabJson) return;
    try {
      const parsed = JSON.parse(msg.vocabJson);
      if (!parsed.words || !Array.isArray(parsed.words)) return;
      let count = 0;
      parsed.words.forEach((w: any, wi: number) => {
        if (selectedWords.has(wi)) {
          addWord(w.word || '', w.meaning || '', Array.isArray(w.partOfSpeech) ? w.partOfSpeech : (typeof w.partOfSpeech === 'string' ? [w.partOfSpeech] : []), Array.isArray(w.sentences) ? w.sentences : [], w.phonetic || '');
          count++;
        }
      });
      setSelectedWords(new Set());
      showToast('成功添加 ' + count + ' 个单词到当前单词本');
      onRefresh?.();
    } catch {}
  };

  const toggleWord = (idx: number) => {
    setSelectedWords(prev => { const n = new Set(prev); if (n.has(idx)) n.delete(idx); else n.add(idx); return n; });
  };

  return (
    <div className="chat-view" onClick={e => e.stopPropagation()}>
      <div className="chat-header">
        <div className="chat-header-left">
          <button className="btn btn-small" onClick={() => setShowList(!showList)} title="会话列表">☰</button>
          <h2>{current?.name || 'AI 对话'}</h2>
        </div>
        <button className="btn btn-small" onClick={newSession}>＋ 新建</button>
      </div>

      {showList && (
        <div className="chat-session-list">
          {sessions.map(s => (
            <div key={s.id} className={`session-item ${s.id === currentId ? 'active' : ''}`}>
              <span className="session-name" onClick={() => switchSession(s.id)}>{s.name}</span>
              <div className="session-actions">
                <button className="icon-btn" onClick={() => renameSession(s.id)} title="重命名">✏️</button>
                {sessions.length > 1 && <button className="icon-btn danger" onClick={() => deleteSession(s.id)} title="删除">🗑️</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <div className="chat-empty-icon">💬</div>
            <p className="chat-empty-title">开始英语学习对话</p>
            <p className="chat-empty-hint">AI 会自动检测对话中的英语单词，方便你加入单词本</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={'chat-msg ' + (msg.role === 'user' ? 'msg-user' : 'msg-assistant')}>
            <div className="msg-avatar">{msg.role === 'user' ? '👤' : '🤖'}</div>
            <div className="msg-body">
              <div className="msg-label">{msg.role === 'user' ? '你' : 'AI 助手'}</div>
              <div className="msg-content" dangerouslySetInnerHTML={{__html: renderMarkdown(msg.content)}}></div>
              {msg.role === 'assistant' && msg.vocabJson && (() => {
                try { const p = JSON.parse(msg.vocabJson); if (!p.words || !Array.isArray(p.words)) return null;
                  return (
                    <div className="vocab-card">
                      <div className="vocab-card-header">📝 检测到英语单词</div>
                      <div className="vocab-card-list">
                        {p.words.map((w: any, wi: number) => (
                          <label key={wi} className={'vocab-item ' + (selectedWords.has(wi) ? 'checked' : '')}>
                            <input type="checkbox" checked={selectedWords.has(wi)} onChange={() => toggleWord(wi)} />
                            <span className="vi-word">{w.word}</span>
                            {w.phonetic && <span className="vi-phonetic">{w.phonetic}</span>}
                            <span className="vi-pos">{(w.partOfSpeech||[]).slice(0,2).join('/')}</span>
                            <span className="vi-meaning">{w.meaning}</span>
                          </label>
                        ))}
                      </div>
                      <button className="btn btn-primary btn-small" onClick={() => handleAddWords(i)} disabled={selectedWords.size === 0}>➕ 加入单词本 ({selectedWords.size})</button>
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
