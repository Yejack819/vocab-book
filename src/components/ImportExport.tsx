import { useRef, useState, useMemo } from 'react';
import { importJson, exportJson, clearCurrentNotebook, factoryReset, getStats, addNotebook, renameNotebook, deleteNotebook } from '../utils/storage';
import type { VocabExport, Notebook } from '../types/vocab';

interface ImportExportProps {
  onRefresh: () => void;
  currentNb: Notebook;
  notebooks: Notebook[];
  onSwitchNotebook: (id: string) => void;
  onShowWelcome?: () => void;
}

type CsvSortBy = 'createdAt' | 'word' | 'meaning';

export default function ImportExport({ onRefresh, currentNb, notebooks, onSwitchNotebook, onShowWelcome }: ImportExportProps & { onShowWelcome?: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [importMode, setImportMode] = useState<'append' | 'overwrite'>('append');
  const [csvFavOnly, setCsvFavOnly] = useState(false);
  const [showCsvDialog, setShowCsvDialog] = useState(false);
  const [csvSortBy, setCsvSortBy] = useState<CsvSortBy>('createdAt');
  const [csvSortOrder, setCsvSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showStorage, setShowStorage] = useState(false);
  const [storageItems, setStorageItems] = useState<Array<{key:string;size:number;pct:number}>>([]);
  const [storageTotal, setStorageTotal] = useState(0);
  const storageLimit = 5 * 1024 * 1024;
  const stats = getStats();

  const showMsg = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleImport = () => fileInputRef.current?.click();
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json: VocabExport = JSON.parse(text);
      if (!json.words || !Array.isArray(json.words)) { showMsg('error', '无效的 JSON 格式'); return; }
      if (importMode === 'overwrite') clearCurrentNotebook();
      const result = importJson(json);
      showMsg('success', `导入完成（${importMode === 'overwrite' ? '覆盖' : '追加'}）：新增 ${result.imported} 个，跳过 ${result.skipped} 个`);
      onRefresh();
    } catch (err) { showMsg('error', '导入失败'); }
    e.target.value = '';
  };

  const handleExportJson = () => {
    const data = exportJson();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `vocab-export-${new Date().toISOString().replace(/[:-]/g,"").slice(0,14)}.json`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showMsg('success', `JSON 导出完成，共 ${data.total} 个单词`);
  };

  const csvPreview = useMemo(() => {
    const allData = exportJson();
    let list = csvFavOnly ? allData.words.filter(w => w.isFavorite) : [...allData.words];
    list.sort((a, b) => {
      let cmp = 0;
      if (csvSortBy === 'word') cmp = a.word.localeCompare(b.word);
      else if (csvSortBy === 'meaning') cmp = a.meaning.localeCompare(b.meaning);
      else cmp = a.createdAt - b.createdAt;
      return csvSortOrder === 'desc' ? -cmp : cmp;
    });
    return { total: list.length, rows: list.slice(0, 3), all: list };
  }, [csvFavOnly, csvSortBy, csvSortOrder, currentNb.id]);

  const doExportCsv = () => {
    const csvRows = csvPreview.all;
    let csv = '\uFEFF英文单词,音标,词性,释义,例句,例句翻译,是否收藏\n';
    for (const w of csvRows) {
      const esc = (s: string) => `"${(s || '').replace(/"/g, '""')}"`;
      csv += [esc(w.word), esc(w.phonetic || ''), esc((w.partOfSpeech || []).join('; ')), esc(w.meaning), esc(w.sentences.map(s => s.english).join(' | ')), esc(w.sentences.map(s => s.chinese).join(' | ')), w.isFavorite ? '✓' : ''].join(',') + '\n';
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${currentNb.name}-${new Date().toISOString().replace(/[:-]/g,"").slice(0,14)}.csv`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowCsvDialog(false);
    showMsg('success', `CSV 导出完成，共 ${csvRows.length} 个单词`);
  };

  const handleFactoryReset = () => {
    if (window.confirm('确定要恢复出厂设置吗？此操作将清除所有单词本、单词、AI 配置和设置，不可恢复！')) {
      factoryReset();
      showMsg('info', '已恢复出厂设置，页面即将刷新');
      setTimeout(() => window.location.reload(), 1500);
    }
  };

  const handleAddNb = () => {
    const name = prompt('请输入新单词本的名称：');
    if (name && name.trim()) {
      addNotebook(name.trim());
      onRefresh();
    }
  };

  const handleRenameNb = (id: string) => {
    const nb = notebooks.find(n => n.id === id);
    if (!nb) return;
    const name = prompt('请输入新名称：', nb.name);
    if (name && name.trim() && name.trim() !== nb.name) {
      renameNotebook(id, name.trim());
      onRefresh();
    }
  };

  const handleDeleteNb = (id: string) => {
    if (notebooks.length <= 1) { showMsg('error', '至少保留一个单词本'); return; }
    if (window.confirm('确定要删除此单词本及其所有单词吗？不可恢复！')) {
      deleteNotebook(id);
      onRefresh();
      if (id === currentNb.id) onSwitchNotebook(notebooks.filter(n => n.id !== id)[0].id);
    }
  };

  return (
    <div className="import-export">
      <h2>数据管理</h2>

      {/* Notebook Manager */}
      <div className="action-group" style={{ marginBottom: 20 }}>
        <h3>📒 单词本管理</h3>
        <p className="action-desc">当前：<strong>{currentNb.name}</strong>（共 {notebooks.length} 本）</p>
        <div className="notebook-list">
          {notebooks.map(nb => (
            <div key={nb.id} className={`notebook-item ${nb.id === currentNb.id ? 'active' : ''}`}>
              <span className="notebook-name" onClick={() => { onSwitchNotebook(nb.id); }}>{nb.name}</span>
              <div className="notebook-actions">
                <button className="btn btn-small" onClick={() => handleRenameNb(nb.id)}>✏️</button>
                <button className="btn btn-small btn-danger" onClick={() => handleDeleteNb(nb.id)}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
        <button className="btn btn-small" onClick={handleAddNb} style={{ marginTop: 8 }}>＋ 新建单词本</button>
      </div>

      <div className="stats-cards">
        <div className="stat-card"><span className="stat-number">{stats.total}</span><span className="stat-label">单词（当前本）</span></div>
        <div className="stat-card"><span className="stat-number">{stats.favoriteCount}</span><span className="stat-label">收藏</span></div>
        <div className="stat-card"><span className="stat-number">{Object.keys(stats.partOfSpeechCounts).length}</span><span className="stat-label">词性种类</span></div>
      </div>

      <div className="import-export-actions">
        <div className="action-group">
          <h3>导入</h3>
          <div className="import-mode-tabs">
            <button className={`import-mode-tab ${importMode === 'append' ? 'active' : ''}`} onClick={() => setImportMode('append')}>追加</button>
            <button className={`import-mode-tab ${importMode === 'overwrite' ? 'active' : ''}`} onClick={() => setImportMode('overwrite')}>覆盖</button>
          </div>
          <p className="action-desc">{importMode === "append" ? "保留现有数据，只添加新单词" : "先清除当前单词本，再导入"}</p>
          <button className="btn btn-primary" onClick={handleImport}>📂 导入 JSON</button>
          <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleFileChange} />
        </div>

        <div className="action-group">
          <h3>导出 JSON</h3>
          <p className="action-desc">导出当前单词本的数据</p>
          <button className="btn btn-primary" onClick={handleExportJson}>💾 导出 JSON</button>
        </div>

        <div className="action-group">
          <h3>导出 CSV</h3>
          <p className="action-desc">导出当前单词本为表格格式。</p>
          <label className="csv-fav-toggle">
            <input type="checkbox" checked={csvFavOnly} onChange={e => setCsvFavOnly(e.target.checked)} />
            仅导出收藏单词
          </label>
          <button className="btn" onClick={() => setShowCsvDialog(true)}>📊 导出 CSV</button>
        </div>

        <div className="action-group">
          <h3>示例数据</h3>
          <p className="action-desc">导入 3 个示例单词到当前单词本</p>
          <button className="btn btn-small" onClick={() => onShowWelcome?.()} style={{marginBottom:4}}>👋 欢迎引导</button>
          <button className="btn btn-small" onClick={async () => {
            try {
              const resp = await fetch('/vocab-export-20260707.json');
              if (!resp.ok) throw new Error();
              const json: VocabExport = await resp.json();
              const result = importJson(json);
              showMsg('success', `示例数据导入完成：新增 ${result.imported} 个`);
              onRefresh();
            } catch { showMsg('error', '示例数据加载失败'); }
          }}>📥 加载示例数据</button>
        </div>

        <div className="action-group">
          <h3>💾 本地存储</h3>
          <p className="action-desc">查看 localStorage 各项数据占用</p>
          <button className="btn" onClick={() => {
            const items:{key:string;size:number;pct:number}[] = [];
            let total = 0;
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i);
              if (k) {
                const v = localStorage.getItem(k) || '';
                const size = new Blob([k + v]).size;
                total += size;
                items.push({key:k, size, pct: 0});
              }
            }
            items.sort((a,b) => b.size - a.size);
            const limit = storageLimit;
            items.forEach(item => item.pct = Math.round(item.size / limit * 1000) / 10);
            setStorageItems(items);
            setStorageTotal(total);
            setShowStorage(true);
          }}>📊 查看存储详情</button>
        </div>

        <div className="action-group danger">
          <h3>危险操作</h3>
          <p className="action-desc">清除所有单词本、单词、AI 设置和统计，恢复出厂状态。</p>
          <button className="btn btn-danger" onClick={handleFactoryReset}>🗑️ 恢复出厂设置</button>
        </div>
      </div>

      {showCsvDialog && (
        <div className="modal-overlay" onClick={() => setShowCsvDialog(false)}>
          <div className="modal csv-modal" onClick={e => e.stopPropagation()}>
            <h2>📊 导出 CSV</h2>
            <p className="csv-modal-desc">选择排序方式，预览前 3 行。</p>
            <div className="csv-modal-controls">
              <label>排序：<select value={csvSortBy} onChange={e => setCsvSortBy(e.target.value as CsvSortBy)}><option value="createdAt">创建时间</option><option value="word">A-Z</option><option value="meaning">释义</option></select></label>
              <button className="sort-order-btn" onClick={() => setCsvSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}>{csvSortOrder === 'asc' ? '↑ 升序' : '↓ 降序'}</button>
              <span className="csv-modal-count">共 {csvPreview.total} 条</span>
            </div>
            <table className="csv-preview-table"><thead><tr><th>英文单词</th><th>音标</th><th>词性</th><th>释义</th><th>例句</th><th>例句翻译</th><th>是否收藏</th></tr></thead>
              <tbody>{csvPreview.rows.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 16 }}>无数据</td></tr> : csvPreview.rows.map((w, i) => (<tr key={i}><td>{w.word}</td><td style={{ fontFamily: '"Merriweather","Georgia",serif' }}>{w.phonetic || '-'}</td><td>{(w.partOfSpeech || []).join('; ')}</td><td>{w.meaning}</td><td>{w.sentences.map(s => s.english).join(' | ')}</td><td>{w.sentences.map(s => s.chinese).join(' | ')}</td><td>{w.isFavorite ? '✓' : ''}</td></tr>))}</tbody>
            </table>
            <div className="form-actions">
              <button className="btn" onClick={() => setShowCsvDialog(false)}>取消</button>
              <button className="btn btn-primary" onClick={doExportCsv}>💾 确认导出 ({csvPreview.total} 条)</button>
            </div>
          </div>
        </div>
      )}

      {/* Storage modal */}
      {showStorage && (
        <div className="modal-overlay" onClick={() => setShowStorage(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth:500}}>
            <h2>💾 本地存储</h2>
            <p className="action-desc" style={{marginBottom:12}}>
              已用 {(storageTotal / 1024).toFixed(1)} KB / 上限 5 MB
              （{(storageTotal / (5*1024*1024) * 100).toFixed(1)}%）
            </p>
            <div style={{width:'100%',height:8,background:'var(--border)',borderRadius:4,overflow:'hidden',marginBottom:12}}>
              <div style={{width:(storageTotal/(5*1024*1024)*100)+'%',height:'100%',background:'linear-gradient(90deg,var(--primary),var(--primary-border))',borderRadius:4,transition:'width .3s ease'}}></div>
            </div>
            {storageItems.length === 0 && <p style={{color:'var(--text-secondary)'}}>无数据</p>}
            {storageItems.length > 0 && (
              <div style={{display:'flex',flexDirection:'column',gap:4,maxHeight:300,overflowY:'auto'}}>
                {storageItems.map((item, i) => (
                  <div key={i} style={{display:'flex',alignItems:'center',gap:8,fontSize:'.85rem',padding:'4px 8px',borderRadius:4,background:item.key.startsWith('kun-vocab-')?'var(--primary-light)':'transparent'}}>
                    <span style={{flex:1,wordBreak:'break-all'}}>{item.key}</span>
                    <span style={{color:'var(--text-secondary)',whiteSpace:'nowrap'}}>{(item.size / 1024).toFixed(1)} KB</span>
                    <span style={{color:'var(--text-secondary)',width:40,textAlign:'right'}}>{item.pct}%</span>
                    <button className="icon-btn danger" style={{fontSize:'.8rem'}} onClick={() => {
                      if (window.confirm('确定要删除 ' + item.key + ' 吗？')) {
                        localStorage.removeItem(item.key);
                        setStorageItems(prev => prev.filter(x => x.key !== item.key));
                        setStorageTotal(prev => prev - item.size);
                      }
                    }}>🗑️</button>
                  </div>
                ))}
              </div>
            )}
            <div className="form-actions" style={{marginTop:12}}>
              <span style={{fontSize:'.78rem',color:'var(--text-secondary)'}}>浏览器：{navigator.userAgent.includes('Chrome')?'Chromium内核':navigator.userAgent.includes('Safari')?'Safari':'未知'} · 建议上限 5MB</span>
              <button className="btn" onClick={() => setShowStorage(false)}>关闭</button>
            </div>
          </div>
        </div>
      )}

      {message && <div className={`toast toast-${message.type}`}>{message.text}</div>}
    </div>
  );
}
