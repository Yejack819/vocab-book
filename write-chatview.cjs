const fs = require("fs");
const chatView = `import { useState, useRef, useEffect } from 'react';
import type { ChatMessage, ChatSession } from '../types/vocab';
import { loadSessions, saveSessions, getCurrentSessionId, setCurrentSessionId, loadChatDraft, saveChatDraft, loadAiSettings, addWord } from '../utils/storage';
import { chatCompletion } from '../utils/ai';
import { renderMarkdown } from '../utils/markdown';

function genId() { return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

export default function ChatView({ onClose }: { onClose?: () => void }) {
  const [sessions, setSessions] = useState<ChatSession[]>(() => loadSessions());
  const [currentId, setCurrentId] = useState(() => getCurrentSessionId() || genId());
  const [sending, setSending] = useState(false);
  const [selectedWords, setSelectedWords] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [showSessions, setShowSessions] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const currentSession = sessions.find(s => s.id === currentId) || { id: currentId, name: '默认对话', messages: [], createdAt: Date.now() };
  const messages = currentSession.messages || [];

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { setCurrentSessionId(currentId); }, [currentId]);

  const persist = (id: string, msgs: ChatMessage[]) => {
    const exists = sessions.find(s => s.id === id);
    let next: ChatSession[];
    if (exists) {
      next = sessions.map(s => s.id === id ? { ...s, messages: msgs } : s);
    } else {
      next = [...sessions, { id, name: '对话 ' + (sessions.length + 1), messages: msgs, createdAt: Date.now() }];
    }
    setSessions(next);
    saveSessions(next);
  };

  const switchSession = (id: string) => { setCurrentId(id); setSelectedWords(new Set()); };

  const newSession = () => {
    const id = genId();
    const name = '对话 ' + (sessions.length + 1);
    const next = [...sessions, { id, name, messages: [], createdAt: Date.now() }];
    setSessions(next); saveSessions(next); setCurrentId(id); setSelectedWords(new Set());
  };

  const deleteSession = (id: string) => {
    if (sessions.length <= 1) return;
    const next = sessions.filter(s => s.id !== id);
    setSessions(next); saveSessions(next);
    if (currentId === id) setCurrentId(next[0].id);
  };

  const renameSession = (id: string) => {
    const val = renameVal.trim();
    if (!val) return;
    const next = sessions.map(s => s.id === id ? { ...s, name: val } : s);
    setSessions(next); saveSessions(next); setRenamingId(null);
  };

  const showToast = (text: string) => { setToast(text); setTimeout(() => setToast(null), 3000); };

  const handleSend = async () => {
    const text = (inputRef.current?.value || '').trim();
    if (!text || sending) return;
    if (inputRef.current) inputRef.current.value = '';
    saveChatDraft('');

    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: Date.now() };
    const updated = [...messages, userMsg];
    persist(currentId, updated);
    setSending(true);

    try {
      const settings = loadAiSettings();
      if (!settings.host || !settings.apiKey) throw new Error('\u8bf7\u5148\u5728\u300c\u8bbe\u7f6e\u300d\u4e2d\u914d\u7f6e AI Host \u548c API Key');
      const result = await chatCompletion(updated.map(m => ({ role: m.role, content: m.content })), settings);
      const final = [...updated, { role: 'assistant' as const, content: result.content, vocabJson: result.vocabJson, timestamp: Date.now() }];
      persist(currentId, final);
    } catch (err: any) {
      const final = [...updated, { role: 'assistant' as const, content: '\u274c ' + err.message, timestamp: Date.now() }];
      persist(currentId, final);
    } finally { setSending(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
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
      showToast('\u6210\u529f\u6dfb\u52a0 ' + count + ' \u4e2a\u5355\u8bcd\u5230\u5f53\u524d\u5355\u8bcd\u672c');
    } catch {}
  };

  const toggleWord = (idx: number) => {
    setSelectedWords(prev => { const next = new Set(prev); if (next.has(idx)) next.delete(idx); else next.add(idx); return next; });
  };

  return (
    <div className="chat-view">
      <div className="chat-header">
        <div className="chat-header-left">
          <button className="btn btn-small" onClick={() => setShowSessions(!showSessions)} style={{fontSize:'.85rem'}}>{showSessions ? '\u2715' : '\u2630'}</button>
          <h2 style={{fontSize:'1rem',margin:0}}>{currentSession.name}</h2>
        </div>
        <button className="btn btn-small" onClick={newSession}>+ \u65b0\u5bf9\u8bdd</button>
      </div>

      {showSessions && (
        <div className="chat-session-list" style={{borderBottom:'1px solid var(--border)',maxHeight:200,overflowY:'auto',padding:'8px 12px',background:'var(--surface-hover)'}}>
          {sessions.map(s => (
            <div key={s.id} style={{display:'flex',alignItems:'center',gap:6,padding:'4px 8px',borderRadius:6,cursor:'pointer',background:s.id===currentId?'var(--primary-light)':'transparent',marginBottom:2}}>
              {renamingId === s.id ? (
                <input value={renameVal} onChange={e=>setRenameVal(e.target.value)} onBlur={()=>renameSession(s.id)} onKeyDown={e=>e.key==='Enter'&&renameSession(s.id)} autoFocus style={{flex:1,fontSize:'.85rem'}} />
              ) : (
                <span style={{flex:1,fontSize:'.85rem'}} onClick={()=>{switchSession(s.id);setShowSessions(false);}}>{s.name}</span>
              )}
              <button className="icon-btn" style={{fontSize:'.8rem'}} onClick={()=>{setRenamingId(s.id);setRenameVal(s.name);}}>\u270f\ufe0f</button>
              {sessions.length > 1 && <button className="icon-btn danger" style={{fontSize:'.8rem'}} onClick={()=>deleteSession(s.id)}>\ud83d\uddd1\ufe0f</button>}
            </div>
          ))}
        </div>
      )}

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <div className="chat-empty-icon">\ud83d\udcac</div>
            <p className="chat-empty-title">\u5f00\u59cb\u82f1\u8bed\u5b66\u4e60\u5bf9\u8bdd</p>
            <p className="chat-empty-hint">AI \u4f1a\u81ea\u52a8\u68c0\u6d4b\u5bf9\u8bdd\u4e2d\u7684\u82f1\u8bed\u5355\u8bcd\uff0c\u65b9\u4fbf\u4f60\u52a0\u5165\u5355\u8bcd\u672c</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={\`chat-msg \${msg.role === 'user' ? 'msg-user' : 'msg-assistant'}\`}>
            <div className="msg-avatar">{msg.role === 'user' ? '\ud83d\udc64' : '\ud83e\udd16'}</div>
            <div className="msg-body">
              <div className="msg-label">{msg.role === 'user' ? '\u4f60' : 'AI \u52a9\u624b'}</div>
              <div className="msg-content" dangerouslySetInnerHTML={{__html:renderMarkdown(msg.content)}}></div>
              {msg.role === 'assistant' && msg.vocabJson && (() => {
                try {
                  const parsed = JSON.parse(msg.vocabJson);
                  if (!parsed.words || !Array.isArray(parsed.words)) return null;
                  return (
                    <div className="vocab-card">
                      <div className="vocab-card-header">\ud83d\udcdd \u68c0\u6d4b\u5230\u82f1\u8bed\u5355\u8bcd</div>
                      <div className="vocab-card-list">
                        {parsed.words.map((w: any, wi: number) => (
                          <label key={wi} className={\`vocab-item \${selectedWords.has(wi) ? 'checked' : ''}\`}>
                            <input type="checkbox" checked={selectedWords.has(wi)} onChange={() => toggleWord(wi)} />
                            <span className="vi-word">{w.word}</span>
                            {w.phonetic && <span className="vi-phonetic">{w.phonetic}</span>}
                            <span className="vi-pos">{(w.partOfSpeech||[]).slice(0, 2).join('/')}</span>
                            <span className="vi-meaning">{w.meaning}</span>
                          </label>
                        ))}
                      </div>
                      <button className="btn btn-primary btn-small" onClick={() => handleAddWords(i)} disabled={selectedWords.size === 0}>
                        \u2795 \u52a0\u5165\u5355\u8bcd\u672c ({selectedWords.size})
                      </button>
                    </div>
                  );
                } catch { return null; }
              })()}
            </div>
          </div>
        ))}
        {sending && <div className="chat-msg msg-assistant"><div className="msg-avatar">\ud83e\udd16</div><div className="msg-body"><div className="msg-label">AI \u52a9\u624b</div><div className="msg-content">\u23f3 \u601d\u8003\u4e2d\u2026</div></div></div>}
        <div ref={endRef} />
      </div>

      <div className="chat-input-area">
        <textarea ref={inputRef} defaultValue={loadChatDraft()} onKeyDown={handleKeyDown} onChange={e => saveChatDraft(e.target.value)} placeholder="\u8f93\u5165\u6d88\u606f\uff0cEnter \u53d1\u9001\uff0cShift+Enter \u6362\u884c" rows={2} />
        <button className="btn btn-primary send-btn" onClick={handleSend} disabled={sending}>{sending ? '\u23f3' : '\u53d1\u9001'}</button>
      </div>

      {toast && <div className="toast toast-success">{toast}</div>}
    </div>
  );
}
`;
fs.writeFileSync("src/components/ChatView.tsx", chatView, "utf-8");
console.log("chatview created: " + chatView.length + " chars");
