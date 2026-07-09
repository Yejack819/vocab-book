import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { VocabWord, FilterOptions } from '../types/vocab';
import { toggleFavorite, deleteWord } from '../utils/storage';
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

  const batchFavorite = (value: boolean) => {
    if (selectedIds.size === 0) return;
    for (const id of selectedIds) {
      const word = words.find(w => w.id === id);
      if (word && word.isFavorite !== value) {
        toggleFavorite(id);
      }
    }
    setSelectedIds(new Set());
    onRefresh();
  };

  // 当筛选变化时清除选中
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
      <div className={`batch-toolbar ${hasSelection ? 'visible' : ''}`}>
        <label className="batch-select-all">
          <input
            type="checkbox"
            ref={selectAllRef}
            checked={hasSelection && selectedIds.size === filtered.length}
            onChange={() => hasSelection ? deselectAll() : selectAll()}
          />
          全选
        </label>
        {hasSelection && (
          <>
            <span className="batch-info">已选 {selectedIds.size} 项</span>
            <button className="btn btn-small" onClick={() => batchFavorite(true)}>
              ★ 批量收藏
            </button>
            <button className="btn btn-small" onClick={() => batchFavorite(false)}>
              ☆ 取消收藏
            </button>
            <button className="btn btn-small btn-danger" onClick={batchDelete}>
              🗑 批量删除
            </button>
          </>
        )}
        {!hasSelection && (
          <span className="batch-info batch-hint">勾选单词前的复选框进行批量操作</span>
        )}
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
    </div>
  );
}
