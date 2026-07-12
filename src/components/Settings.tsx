import { useState } from 'react';
import type { AiStats } from '../types/vocab';
import { loadAiSettings, saveAiSettings, loadAiStats, resetAiStats } from '../utils/storage';

interface SettingsProps {
  onClose?: () => void;
}

export default function Settings({ onClose }: SettingsProps) {
  const saved = loadAiSettings();
  const [chatModel, setChatModel] = useState(saved.chatModel || saved.model);
  const [host, setHost] = useState(saved.host);
  const [apiKey, setApiKey] = useState(saved.apiKey);
  const [model, setModel] = useState(saved.model);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [stats, setStats] = useState<AiStats>(loadAiStats);

  const handleSave = () => {
    const trimmedHost = host.trim();
    const trimmedKey = apiKey.trim();
    const trimmedModel = model.trim();

    if (!trimmedHost) { setMessage({ type: 'error', text: '请输入 API Host' }); return; }
    if (!trimmedKey) { setMessage({ type: 'error', text: '请输入 API Key' }); return; }
    if (!trimmedModel) { setMessage({ type: 'error', text: '请输入模型名称' }); return; }

    saveAiSettings({ host: trimmedHost.replace(/\/+$/, ''), apiKey: trimmedKey, model: trimmedModel, chatModel: chatModel.trim() || trimmedModel });
    setMessage({ type: 'success', text: '设置已保存' });
    setTimeout(() => onClose?.(), 1200);
  };

  const handleTest = async () => {
    const h = host.trim().replace(/\/+$/, '');
    const k = apiKey.trim();
    const m = model.trim();
    if (!h || !k) { setMessage({ type: 'error', text: '请先填写 Host 和 API Key' }); return; }
    setMessage({ type: 'success', text: '正在测试连接…' });
    try {
      const resp = await fetch(h + '/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${k}` },
        body: JSON.stringify({ model: m || 'gpt-4o-mini', messages: [{ role: 'user', content: 'Hello' }], max_tokens: 5 }),
      });
      if (!resp.ok) { const e = await resp.text().catch(() => ''); throw new Error(`${resp.status}: ${e.slice(0, 100)}`); }
      setMessage({ type: 'success', text: '✅ 连接成功！API 正常工作。' });
    } catch (err: any) {
      setMessage({ type: 'error', text: `❌ 连接失败: ${err.message}` });
    }
  };

  const refreshStats = () => setStats(loadAiStats());

  const totalTokens = stats.estimatedTokens.prompt + stats.estimatedTokens.completion;
  const fmtTokens = totalTokens >= 1000000 ? (totalTokens / 1000000).toFixed(1) + 'M' : totalTokens >= 1000 ? (totalTokens / 1000).toFixed(1) + 'k' : String(totalTokens);

  return (
    <div className="settings">
      <h2>⚙️ AI 设置</h2>
      <p className="settings-desc">配置 AI API 后，添加单词时可通过 AI 自动识词性、填音标和翻译例句。兼容 OpenAI API 格式的服务。</p>

      {message && <div className={`form-error ${message.type === 'success' ? 'success-msg' : ''}`}>{message.text}</div>}

      <label>API Host<input type="text" value={host} onChange={e => setHost(e.target.value)} placeholder="https://api.openai.com" /><span className="field-hint">例如：https://api.openai.com 或 https://api.deepseek.com</span></label>
      <label>API Key<input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk-..." /></label>
      <label>Model<input type="text" value={model} onChange={e => setModel(e.target.value)} placeholder="gpt-4o-mini" /><span className="field-hint">例如：gpt-4o-mini, deepseek-chat, qwen-plus 等</span></label>

      <label>对话模型（留空则与上方相同）<input type="text" value={chatModel} onChange={e => setChatModel(e.target.value)} placeholder={saved.model || "gpt-4o-mini"} /><span className="field-hint">AI 对话使用的模型，可与单词分析不同。</span></label>

            <div className="form-actions">
        <button type="button" className="btn" onClick={handleTest}>🔌 测试连接</button>
        <button type="button" className="btn btn-primary" onClick={handleSave}>💾 保存设置</button>
      </div>

      <hr className="settings-divider" />

      <h2>📊 AI 请求统计 <button className="btn btn-small" onClick={refreshStats} style={{ marginLeft: 8 }}>🔄</button></h2>
      <div className="stats-cards">
        <div className="stat-card"><span className="stat-number">{stats.total}</span><span className="stat-label">总请求</span></div>
        <div className="stat-card"><span className="stat-number" style={{ color: 'var(--success)' }}>{stats.success}</span><span className="stat-label">成功</span></div>
        <div className="stat-card"><span className="stat-number" style={{ color: 'var(--danger)' }}>{stats.failure}</span><span className="stat-label">失败</span></div>
        <div className="stat-card"><span className="stat-number" style={{ color: 'var(--danger)' }}>{stats.error}</span><span className="stat-label">出错</span></div>
        <div className="stat-card"><span className="stat-number" style={{ color: 'var(--text-secondary)' }}>{stats.emptyResponse}</span><span className="stat-label">回答为空</span></div>
        <div className="stat-card"><span className="stat-number" style={{ fontSize: '0.9rem' }}>≈{fmtTokens}</span><span className="stat-label">预计 tokens</span></div>
      </div>
      <div className="form-actions" style={{ marginTop: 0 }}>
        <button type="button" className="btn btn-small btn-danger" onClick={() => { resetAiStats(); refreshStats(); }}>🗑️ 重置统计</button>
      </div>
    </div>
  );
}
