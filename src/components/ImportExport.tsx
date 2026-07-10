import { useRef, useState, useMemo } from 'react';
import { importJson, exportJson, clearAll, getStats } from '../utils/storage';
import type { VocabExport } from '../types/vocab';

interface ImportExportProps {
  onRefresh: () => void;
}

type CsvSortBy = 'createdAt' | 'word' | 'meaning';

export default function ImportExport({ onRefresh }: ImportExportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [importMode, setImportMode] = useState<'append' | 'overwrite'>('append');
  const [csvFavOnly, setCsvFavOnly] = useState(false);
  const [showCsvDialog, setShowCsvDialog] = useState(false);
  const [csvSortBy, setCsvSortBy] = useState<CsvSortBy>('createdAt');
  const [csvSortOrder, setCsvSortOrder] = useState<'asc' | 'desc'>('desc');
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
      if (!json.words || !Array.isArray(json.words)) { showMsg('error', '无效的 JSON 格式：缺少 words 数组'); return; }
      if (importMode === 'overwrite') clearAll();
      const result = importJson(json);
      showMsg('success', `导入完成（${importMode === 'overwrite' ? '覆盖' : '追加'}）：新增 ${result.imported} 个，跳过 ${result.skipped} 个`);
      onRefresh();
    } catch (err) {
      showMsg('error', `导入失败：${err instanceof Error ? err.message : '文件解析错误'}`);
    }
    e.target.value = '';
  };

  const handleExportJson = () => {
    const data = exportJson();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `vocab-export-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.json`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showMsg('success', `JSON 导出完成，共 ${data.total} 个单词`);
  };

  // CSV dialog: preview data
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
  }, [csvFavOnly, csvSortBy, csvSortOrder]);

  const doExportCsv = () => {
    const csvRows = csvPreview.all;
    let csv = '\uFEFF英文单词,音标,词性,释义,例句,例句翻译\n';
    for (const w of csvRows) {
      const esc = (s: string) => `"${(s || '').replace(/"/g, '""')}"`;
      csv += [
        esc(w.word), esc(w.phonetic || ''),
        esc((w.partOfSpeech || []).join('; ')),
        esc(w.meaning),
        esc(w.sentences.map(s => s.english).join(' | ')),
        esc(w.sentences.map(s => s.chinese).join(' | ')),
      ].join(',') + '\n';
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `vocab-export-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.csv`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowCsvDialog(false);
    showMsg('success', `CSV 导出完成，共 ${csvRows.length} 个单词`);
  };

  const handleClearAll = () => {
    if (window.confirm('确定要清除所有单词数据吗？此操作不可恢复！')) {
      clearAll();
      showMsg('info', '已清除所有数据');
      onRefresh();
    }
  };

  const handleDownloadSample = async () => {
    try {
      const resp = await fetch('/vocab-export-20260707.json');
      if (!resp.ok) throw new Error('');
      const json: VocabExport = await resp.json();
      const result = importJson(json);
      showMsg('success', `示例数据导入完成：新增 ${result.imported} 个，跳过 ${result.skipped} 个`);
      onRefresh();
    } catch {
      showMsg('error', '示例数据加载失败');
    }
  };

  return (
    <div className="import-export">
      <h2>数据管理</h2>

      <div className="stats-cards">
        <div className="stat-card"><span className="stat-number">{stats.total}</span><span className="stat-label">总单词</span></div>
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
          <p className="action-desc">{importMode === 'append' ? '保留现有数据，只添加新单词' : '清除全部数据后再导入'}</p>
          <button className="btn btn-primary" onClick={handleImport}>📂 导入 JSON</button>
          <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleFileChange} />
        </div>

        <div className="action-group">
          <h3>导出 JSON</h3>
          <p className="action-desc">导出为标准的 vocab-export JSON 格式</p>
          <button className="btn btn-primary" onClick={handleExportJson}>💾 导出 JSON</button>
        </div>

        <div className="action-group">
          <h3>导出 CSV</h3>
          <p className="action-desc">导出为表格格式，可用 Excel/WPS 打开。</p>
          <label className="csv-fav-toggle">
            <input type="checkbox" checked={csvFavOnly} onChange={e => setCsvFavOnly(e.target.checked)} />
            仅导出收藏单词
          </label>
          <button className="btn" onClick={() => setShowCsvDialog(true)}>📊 导出 CSV</button>
        </div>

        <div className="action-group">
          <h3>示例数据</h3>
          <p className="action-desc">导入 3 个示例单词数据用于体验</p>
          <button className="btn" onClick={handleDownloadSample}>📥 加载示例数据</button>
        </div>

        <div className="action-group danger">
          <h3>危险操作</h3>
          <p className="action-desc">彻底清除所有单词数据，不可恢复</p>
          <button className="btn btn-danger" onClick={handleClearAll}>🗑️ 清除全部数据</button>
        </div>
      </div>

      {/* CSV 导出弹窗 */}
      {showCsvDialog && (
        <div className="modal-overlay" onClick={() => setShowCsvDialog(false)}>
          <div className="modal csv-modal" onClick={e => e.stopPropagation()}>
            <h2>📊 导出 CSV</h2>
            <p className="csv-modal-desc">选择排序方式，预览前 3 行，确认后导出。</p>

            <div className="csv-modal-controls">
              <label>
                排序：
                <select value={csvSortBy} onChange={e => setCsvSortBy(e.target.value as CsvSortBy)}>
                  <option value="createdAt">创建时间</option>
                  <option value="word">A-Z</option>
                  <option value="meaning">释义</option>
                </select>
              </label>
              <button className="sort-order-btn" onClick={() => setCsvSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}>
                {csvSortOrder === 'asc' ? '↑ 升序' : '↓ 降序'}
              </button>
              <span className="csv-modal-count">共 {csvPreview.total} 条</span>
            </div>

            <table className="csv-preview-table">
              <thead>
                <tr>
                  <th>英文单词</th><th>音标</th><th>词性</th><th>释义</th><th>例句</th><th>例句翻译</th>
                </tr>
              </thead>
              <tbody>
                {csvPreview.rows.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 16 }}>无数据</td></tr>
                ) : (
                  csvPreview.rows.map((w, i) => (
                    <tr key={i}>
                      <td>{w.word}</td>
                      <td style={{ fontFamily: '"Merriweather","Georgia",serif' }}>{w.phonetic || '-'}</td>
                      <td>{(w.partOfSpeech || []).join('; ')}</td>
                      <td>{w.meaning}</td>
                      <td>{w.sentences.map(s => s.english).join(' | ')}</td>
                      <td>{w.sentences.map(s => s.chinese).join(' | ')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div className="form-actions">
              <button className="btn" onClick={() => setShowCsvDialog(false)}>取消</button>
              <button className="btn btn-primary" onClick={doExportCsv}>💾 确认导出 ({csvPreview.total} 条)</button>
            </div>
          </div>
        </div>
      )}

      {message && <div className={`toast toast-${message.type}`}>{message.text}</div>}
    </div>
  );
}
