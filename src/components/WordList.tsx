import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { VocabWord, FilterOptions, Notebook } from '../types/vocab';
import { toggleFavorite, deleteWord, loadNotebooks, getCurrentNotebookId, moveWordsBetweenNotebooks } from '../utils/storage';
import WordForm from './WordForm';

interface WordListProps {
  words: VocabWord[];
  filter: FilterOptions;
  onFilterChange: (f: FilterOptions) => void;
  onRefresh: () => void;
}

const ALPHABET = '#ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/** 提取单词首字母，数字/符号归为 # */
function firstLetter(word: string): string {
  const ch = word.trim().charAt(0).toUpperCase();
  if (/[A-Z]/.test(ch)) return ch;
  return '#';
}

/** 将 Markdown 粗体 **xx** 渲染为 <strong> */
function renderBold(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

export default function WordList({ words, filter, onFilterChange, onRefresh }: WordListProps) {
  const [editingWord, setEditingWord] = useState<VocabWord | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchCsv, setShowBatchCsv] = useState(false);
  const [batchCsvSortBy, setBatchCsvSortBy] = useState<'createdAt' | 'word' | 'meaning'>('createdAt');
  const [batchCsvOrder, setBatchCsvOrder] = useState<'asc' | 'desc'>('desc');
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [targetNbId, setTargetNbId] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const showMsg = (text: string) => {
    setToast(text);
    setTimeout(() => setToast(null), 3000);
  };
  const gridRef = useRef<HTMLDivElement>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);

  // 提取所有词性
  const allPartOfSpeech = useMemo(
    () => [...new Set(words.flatMap((w) => w.partOfSpeech))].sort(),
    [words]
  );

  // 筛选 + 排序
  const filtered = useMemo(() => {
    let result = words.filter((w) => {
      if (filter.search) {
        const q = filter.search.toLowerCase();
        if (
          !w.word.toLowerCase().includes(q) &&
          !w.meaning.toLowerCase().includes(q) &&
          !w.sentences.some((s) => s.english.toLowerCase().includes(q) || s.chinese.includes(q))
        ) {
          return false;
        }
      }
      if (filter.partOfSpeech && !w.partOfSpeech.includes(filter.partOfSpeech)) return false;
      if (filter.favoriteOnly && !w.isFavorite) return false;
      return true;
    });

    result.sort((a, b) => {
      let cmp = 0;
      if (filter.sortBy === 'word') cmp = a.word.localeCompare(b.word);
      else if (filter.sortBy === 'meaning') cmp = a.meaning.localeCompare(b.meaning);
      else cmp = a.createdAt - b.createdAt;
      return filter.sortOrder === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [words, filter]);

  // 首字母分组，用于 A-Z 条
  const letterCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const w of filtered) {
      const l = firstLetter(w.word);
      map[l] = (map[l] || 0) + 1;
    }
    return map;
  }, [filtered]);

  // 每个字母在网格中的第一个索引（用于滚动定位）
  const letterFirstIndex = useMemo(() => {
    const map: Record<string, number> = {};
    for (let i = 0; i < filtered.length; i++) {
      const l = firstLetter(filtered[i].word);
      if (map[l] === undefined) map[l] = i;
    }
    return map;
  }, [filtered]);

  const scrollToLetter = useCallback((letter: string) => {
    const idx = letterFirstIndex[letter];
    if (idx === undefined) return;
    const el = document.getElementById(`word-card-${filtered[idx].id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [letterFirstIndex, filtered]);

  // 批量操作
  const handleToggleFavorite = useCallback((id: string) => {
    toggleFavorite(id);
    onRefresh();
  }, [onRefresh]);

  const handleDelete = useCallback((id: string) => {
    if (window.confirm('确定要删除这个单词吗？')) {
      deleteWord(id);
      onRefresh();
    }
  }, [onRefresh]);

  const otherNotebooks: Notebook[] = loadNotebooks().filter(nb => nb.id !== getCurrentNotebookId());

  const handleMove = () => {
    if (!targetNbId) return;
    const nbName = otherNotebooks.find(n => n.id === targetNbId)?.name || '目标单词本';
    const count = moveWordsBetweenNotebooks([...selectedIds], targetNbId);
    setSelectedIds(new Set());
    setShowMoveModal(false);
    setTargetNbId('');
    onRefresh();
    showMsg(`已移动 ${count} 个单词到「${nbName}」`);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filtered.map(w => w.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  // Batch CSV export
  const batchCsvPreview = useMemo(() => {
    const list = words.filter(w => selectedIds.has(w.id));
    list.sort((a, b) => {
      let cmp = 0;
      if (batchCsvSortBy === 'word') cmp = a.word.localeCompare(b.word);
      else if (batchCsvSortBy === 'meaning') cmp = a.meaning.localeCompare(b.meaning);
      else cmp = a.createdAt - b.createdAt;
      return batchCsvOrder === 'desc' ? -cmp : cmp;
    });
    return { total: list.length, rows: list.slice(0, 3), all: list };
  }, [selectedIds, words, batchCsvSortBy, batchCsvOrder]);

  const doBatchCsv = () => {
    const csvRows = batchCsvPreview.all;
    let csv = '\uFEFF英文单词,音标,词性,释义,例句,例句翻译,是否收藏\n';
    for (const w of csvRows) {
      const esc = (s: string) => `"${(s || '').replace(/"/g, '""')}"`;
      csv += [esc(w.word), esc(w.phonetic || ''), esc((w.partOfSpeech || []).join('; ')), esc(w.meaning), esc(w.sentences.map(s => s.english).join(' | ')), esc(w.sentences.map(s => s.chinese).join(' | '))].join(',') + '\n';
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `vocab-selected-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.csv`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowBatchCsv(false);
  };


  const batchDelete = () => {
    if (selectedIds.size === 0) return;
    if (window.confirm(`确定要删除选中的 ${selectedIds.size} 个单词吗？`)) {
      for (const id of selectedIds) {
        deleteWord(id);
      }
      setSelectedIds(new Set());
      onRefresh();
    }
  };

  const handleFilterChange = (f: FilterOptions) => {
    setSelectedIds(new Set());
    onFilterChange(f);
  };

  // 以上所有 hooks / state / computed 均在此声明

  const isSortByWordAsc = filter.sortBy === 'word' && filter.sortOrder === 'asc';
  const hasSelection = selectedIds.size > 0;

  // 全选复选框的 indeterminate 状态
  const isAllSelected = hasSelection && selectedIds.size === filtered.length;
  const isSomeSelected = hasSelection && selectedIds.size > 0 && selectedIds.size < filtered.length;
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = isSomeSelected && !isAllSelected;
    }
  });

  return (
    <div className="word-list-container">
      {/* 工具栏 */}
      <div className="toolbar">
        <div className="toolbar-row">
          <div className="search-box">
            <input
              type="text"
              placeholder="搜索单词 / 释义 / 例句…"
              value={filter.search}
              onChange={(e) => handleFilterChange({ ...filter, search: e.target.value })}
            />
            {filter.search && (
              <button className="clear-btn" onClick={() => handleFilterChange({ ...filter, search: '' })}>
                ✕
              </button>
            )}
          </div>
          <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
            ＋ 添加单词
          </button>
        </div>
        <div className="toolbar-row filters">
          <label>
            词性：
            <select value={filter.partOfSpeech} onChange={(e) => handleFilterChange({ ...filter, partOfSpeech: e.target.value })}>
              <option value="">全部</option>
              {allPartOfSpeech.map((pos) => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={filter.favoriteOnly}
              onChange={(e) => handleFilterChange({ ...filter, favoriteOnly: e.target.checked })}
            />
            仅收藏
          </label>
          <label>
            排序：
            <select value={filter.sortBy} onChange={(e) => handleFilterChange({ ...filter, sortBy: e.target.value as FilterOptions['sortBy'] })}>
              <option value="createdAt">创建时间</option>
              <option value="word">A-Z</option>
              <option value="meaning">释义</option>
            </select>
            <button
              className="sort-order-btn"
              onClick={() => handleFilterChange({ ...filter, sortOrder: filter.sortOrder === 'asc' ? 'desc' : 'asc' })}
              title={filter.sortOrder === 'asc' ? '升序' : '降序'}
            >
              {filter.sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </label>
          <span className="word-count">共 {filtered.length} 个单词</span>
        </div>
      </div>

      {/* 批量操作工具栏 */}
      <div className={`batch-toolbar visible`}>
        <label className="batch-select-all">
          <input
            type="checkbox"
            ref={selectAllRef}
            checked={hasSelection && selectedIds.size === filtered.length}
            onChange={() => hasSelection ? deselectAll() : selectAll()}
          />
          全选
        </label>
        <span className="batch-info">已选 {selectedIds.size} 项</span>
        {(() => {
          const hasFav = filtered.some(w => selectedIds.has(w.id) && w.isFavorite);
          return (
            <button className="btn btn-small" onClick={() => {
              for (const id of selectedIds) {
                const w = words.find(x => x.id === id);
                if (hasFav) { if (w && w.isFavorite) toggleFavorite(id); }
                else { if (w && !w.isFavorite) toggleFavorite(id); }
              }
              setSelectedIds(new Set());
              onRefresh();
            }}>
              {hasFav ? '☆ 取消收藏' : '★ 全部收藏'}
            </button>
          );
        })()}
        <button className="btn btn-small btn-danger" onClick={batchDelete}>
          🗑 批量删除
        </button>
        <button className="btn btn-small" onClick={() => setShowBatchCsv(true)}>
          📊 导出 CSV
        </button>
        <button className="btn btn-small" onClick={() => setShowMoveModal(true)}>
          📂 移动
        </button>
      </div>

      {/* 列表 + A-Z 侧边栏 */}
      <div className="word-list-layout">
        <div className="word-list-content" ref={gridRef}>
          {filtered.length === 0 ? (
            <div className="empty-state">
              <p>{words.length === 0 ? '还没有单词，点击"添加单词"开始吧' : '没有匹配的单词'}</p>
            </div>
          ) : (
            <>
              {/* 分组标题 + 卡片 */}
              {filtered.map((w, index) => {
                const letter = firstLetter(w.word);
                const showHeader = index === 0 || firstLetter(filtered[index - 1].word) !== letter;
                return (
                  <div key={w.id}>
                    {isSortByWordAsc && showHeader && (
                      <div className="letter-group-header" id={`letter-${letter}`}>
                        <span className="letter-badge">{letter}</span>
                      </div>
                    )}
                    <div
                      id={`word-card-${w.id}`}
                      className={`word-card ${w.isFavorite ? 'favorite' : ''}`}
                    >
                      <label className="card-checkbox" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(w.id)}
                            onChange={() => toggleSelect(w.id)}
                          />
                        </label>
                      <div className="card-body">
                        <div className="card-header">
                          <div className="word-title-group">
                            <h3 className="word-text">{w.word}</h3>
                            {w.phonetic && <span className="word-phonetic">{w.phonetic}</span>}
                          </div>
                          <div className="card-actions">
                            <button
                              className={`icon-btn ${w.isFavorite ? 'starred' : ''}`}
                              onClick={() => handleToggleFavorite(w.id)}
                              title={w.isFavorite ? '取消收藏' : '收藏'}
                            >
                              {w.isFavorite ? '★' : '☆'}
                            </button>
                            <button className="icon-btn" onClick={() => setEditingWord(w)} title="编辑">
                              ✏️
                            </button>
                            <button className="icon-btn danger" onClick={() => handleDelete(w.id)} title="删除">
                              🗑️
                            </button>
                          </div>
                        </div>
                        <p className="meaning">{w.meaning}</p>
                        <div className="pos-tags">
                          {w.partOfSpeech.map((pos) => (
                            <span key={pos} className="pos-tag">{pos}</span>
                          ))}
                        </div>
                        {w.sentences.length > 0 && (
                          <div className="sentences">
                            {w.sentences.map((s, i) => (
                              <div key={i} className="sentence-item">
                                <p className="sentence-en" dangerouslySetInnerHTML={{ __html: renderBold(s.english) }}></p>
                                <p className="sentence-zh">{s.chinese}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* A-Z 侧边栏（仅在按 A-Z 升序时显示） */}
        {isSortByWordAsc && filtered.length > 0 && (
          <nav className="alphabet-sidebar">
            {ALPHABET.map((letter) => (
              <button
                key={letter}
                className={`alpha-btn ${letterCounts[letter] ? 'has-words' : ''}`}
                onClick={() => scrollToLetter(letter)}
                title={letter === '#' ? '数字/符号' : `${letter} — ${letterCounts[letter] || 0} 个`}
              >
                {letter}
              </button>
            ))}
          </nav>
        )}
      </div>

      {/* 批量 CSV 弹窗 */}
      {showBatchCsv && (
        <div className="modal-overlay" onClick={() => setShowBatchCsv(false)}>
          <div className="modal csv-modal" onClick={e => e.stopPropagation()}>
            <h2>📊 导出选中单词为 CSV</h2>
            <p className="csv-modal-desc">已选 {batchCsvPreview.total} 个单词，选择排序方式后确认导出。</p>

            <div className="csv-modal-controls">
              <label>
                排序：
                <select value={batchCsvSortBy} onChange={e => setBatchCsvSortBy(e.target.value as any)}>
                  <option value="createdAt">创建时间</option>
                  <option value="word">A-Z</option>
                  <option value="meaning">释义</option>
                </select>
              </label>
              <button className="sort-order-btn" onClick={() => setBatchCsvOrder(prev => prev === 'asc' ? 'desc' : 'asc')}>
                {batchCsvOrder === 'asc' ? '↑ 升序' : '↓ 降序'}
              </button>
              <span className="csv-modal-count">共 {batchCsvPreview.total} 条</span>
            </div>

            <table className="csv-preview-table">
              <thead>
                <tr>
                  <th>英文单词</th><th>音标</th><th>词性</th><th>释义</th><th>例句</th><th>例句翻译</th>
                </tr>
              </thead>
              <tbody>
                {batchCsvPreview.rows.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 16 }}>无数据</td></tr>
                ) : (
                  batchCsvPreview.rows.map((rw, i) => (
                    <tr key={i}>
                      <td>{rw.word}</td>
                      <td style={{ fontFamily: '"Merriweather","Georgia",serif' }}>{rw.phonetic || '-'}</td>
                      <td>{(rw.partOfSpeech || []).join('; ')}</td>
                      <td>{rw.meaning}</td>
                      <td>{rw.sentences.map(s => s.english).join(' | ')}</td>
                      <td>{rw.sentences.map(s => s.chinese).join(' | ')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div className="form-actions">
              <button className="btn" onClick={() => setShowBatchCsv(false)}>取消</button>
              <button className="btn btn-primary" onClick={doBatchCsv}>💾 确认导出 ({batchCsvPreview.total} 条)</button>
            </div>
          </div>
        </div>
      )}

      {/* CSV 弹窗 */}
      {showBatchCsv && (
        <div className="modal-overlay" onClick={() => setShowBatchCsv(false)}>
          <div className="modal csv-modal" onClick={e => e.stopPropagation()}>
            <h2>📊 导出选中单词为 CSV</h2>
            <p className="csv-modal-desc">已选 {batchCsvPreview.total} 个单词，选择排序方式后确认导出。</p>
            <div className="csv-modal-controls">
              <label>排序：<select value={batchCsvSortBy} onChange={e => setBatchCsvSortBy(e.target.value as any)}>
                <option value="createdAt">创建时间</option>
                <option value="word">A-Z</option>
                <option value="meaning">释义</option>
              </select></label>
              <button className="sort-order-btn" onClick={() => setBatchCsvOrder(prev => prev === 'asc' ? 'desc' : 'asc')}>{batchCsvOrder === 'asc' ? '↑ 升序' : '↓ 降序'}</button>
              <span className="csv-modal-count">共 {batchCsvPreview.total} 条</span>
            </div>
            <table className="csv-preview-table">
              <thead><tr><th>英文单词</th><th>音标</th><th>词性</th><th>释义</th><th>例句</th><th>例句翻译</th></tr></thead>
              <tbody>{batchCsvPreview.rows.length === 0 ? <tr><td colSpan={6} style={{textAlign:'center', color:'var(--text-secondary)', padding:16}}>无数据</td></tr> : batchCsvPreview.rows.map((rw,i) => <tr key={i}><td>{rw.word}</td><td style={{fontFamily:'"Merriweather","Georgia",serif'}}>{rw.phonetic||'-'}</td><td>{(rw.partOfSpeech||[]).join('; ')}</td><td>{rw.meaning}</td><td>{rw.sentences.map(s=>s.english).join(' | ')}</td><td>{rw.sentences.map(s=>s.chinese).join(' | ')}</td></tr>)}</tbody>
            </table>
            <div className="form-actions">
              <button className="btn" onClick={() => setShowBatchCsv(false)}>取消</button>
              <button className="btn btn-primary" onClick={doBatchCsv}>💾 确认导出 ({batchCsvPreview.total} 条)</button>
            </div>
          </div>
        </div>
      )}

      {/* 移动弹窗 */}
      {showMoveModal && (
        <div className="modal-overlay" onClick={() => setShowMoveModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>📂 移动选中单词</h2>
            <p style={{marginBottom:16,color:'var(--text-secondary)'}}>将选中的 {selectedIds.size} 个单词移动到：</p>
            <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:16}}>
              {otherNotebooks.map(nb => (
                <label key={nb.id} style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',padding:'8px 12px',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)'}}>
                  <input type="radio" name="tnb" value={nb.id} checked={targetNbId===nb.id} onChange={() => setTargetNbId(nb.id)} />
                  {nb.name}
                </label>
              ))}
              {otherNotebooks.length === 0 && <p style={{color:'var(--text-secondary)'}}>没有其他单词本，请先在「数据」页创建。</p>}
            </div>
            <div className="form-actions">
              <button className="btn" onClick={() => setShowMoveModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleMove} disabled={!targetNbId}>确认移动</button>
            </div>
          </div>
        </div>
      )}

      {/* 添加/编辑弹窗 */}
      {(showAddForm || editingWord) && (
        <div className="modal-overlay" onClick={() => { setShowAddForm(false); setEditingWord(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <WordForm
              word={editingWord}
              onDone={() => {
                setShowAddForm(false);
                setEditingWord(null);
                onRefresh();
              }}
              onCancel={() => { setShowAddForm(false); setEditingWord(null); }}
            />
          </div>
        </div>
      )}

      {toast && <div className="toast toast-success">{toast}</div>}
    </div>
  );
}
