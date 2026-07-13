import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { VocabWord, FilterOptions } from '../types/vocab';
import { toggleFavorite } from '../utils/storage';

/** 将 Markdown 粗体 **xx** 渲染为 <strong> */
function renderBold(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

interface StudyViewProps {
  words: VocabWord[];
  filter: FilterOptions;
  onRefresh: () => void;
}

export default function StudyView({ words, filter, onRefresh }: StudyViewProps) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [favOnlyFilter, setFavOnlyFilter] = useState(false);
  const [jumpInput, setJumpInput] = useState<string | null>(null);
  const jumpRef = useRef<HTMLInputElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoInterval, setAutoInterval] = useState(5);
  const [showChineseOnAuto, setShowChineseOnAuto] = useState(true);
  const [showAutoSettings, setShowAutoSettings] = useState(false);

  // 与列表一致的筛选逻辑
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

    // 学习页自身的"仅收藏"二次筛选
    if (favOnlyFilter) result = result.filter(w => w.isFavorite);

    return result;
  }, [words, filter, favOnlyFilter]);

  const clampedIndex = Math.min(index, Math.max(0, filtered.length - 1));
  const current: VocabWord | null = filtered.length > 0 ? filtered[clampedIndex] : null;

  const goPrev = useCallback(() => {
    setRevealed(false);
    setIndex(i => Math.max(0, i - 1));
  }, []);

  const goNext = useCallback(() => {
    setRevealed(false);
    setIndex(i => Math.min(filtered.length - 1, i + 1));
  }, [filtered.length]);

  const toggleReveal = () => setRevealed(r => !r);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') goPrev();
    else if (e.key === 'ArrowRight') goNext();
    else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleReveal(); }
  }, [goPrev, goNext]);

  const handleJump = () => {
    const num = parseInt(jumpInput || '', 10);
    if (!isNaN(num) && num >= 1 && num <= filtered.length) {
      setIndex(num - 1);
      setRevealed(false);
    }
    setJumpInput(null);
  };

  useEffect(() => {
    if (jumpInput !== null && jumpRef.current) {
      jumpRef.current.focus();
      jumpRef.current.select();
    }
  }, [jumpInput]);

  // Auto-play
  useEffect(() => {
    if (!isPlaying || filtered.length === 0) return;
    const halfMs = autoInterval * 1000 / 2;
    const fullMs = autoInterval * 1000;
    let halfTimer: any;
    let fullTimer: any;

    if (showChineseOnAuto) {
      halfTimer = setTimeout(() => {
        setRevealed(true);
        
      }, halfMs);
    }

    fullTimer = setTimeout(() => {
      goNext();
      
    }, fullMs);

    return () => { clearTimeout(halfTimer); clearTimeout(fullTimer); };
  }, [isPlaying, autoInterval, showChineseOnAuto, filtered.length, index]);

  const handleToggleFav = () => {
    if (!current) return;
    toggleFavorite(current.id);
    onRefresh();
  };

  if (filtered.length === 0) {
    return (
      <div className="study-view">
        <div className="study-empty">
          <p>{words.length === 0 ? '还没有单词，先去添加一些吧 📝' : '列表筛选后没有匹配的单词'}</p>
          {favOnlyFilter && words.length > 0 && (
            <button className="btn btn-small" onClick={() => setFavOnlyFilter(false)}>
              取消仅收藏
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="study-view" tabIndex={0} onKeyDown={handleKeyDown}>
      {/* Top bar */}
      <div className="study-topbar">
        <div className="study-progress">
          {jumpInput !== null ? (
            <span className="jump-input-wrap">
              第 <input ref={jumpRef} type="number" min={1} max={filtered.length} className="jump-input" value={jumpInput} onChange={e => setJumpInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleJump(); if (e.key === 'Escape') setJumpInput(null); }} onBlur={handleJump} /> / {filtered.length} 个
            </span>
          ) : (
            <span className="jump-trigger" onClick={() => setJumpInput(String(clampedIndex + 1))} title="点击跳转">
              第 <strong>{clampedIndex + 1}</strong> / {filtered.length} 个
            </span>
          )}
          {favOnlyFilter && <span className="study-badge">仅收藏</span>}
        </div>
        <div className="study-controls">
          <button className="btn btn-small" onClick={() => setShowAutoSettings(true)} style={{fontSize:'.82rem'}} title="播放设置">⏱️</button>
          <label className="study-fav-toggle">
            <input type="checkbox" checked={favOnlyFilter} onChange={e => { setFavOnlyFilter(e.target.checked); setIndex(0); setRevealed(false); }} />
            仅收藏
          </label>
          <button className="btn btn-small" onClick={() => { setIndex(0); setRevealed(false); }}>🔄 重头</button>
        </div>
      </div>

      {/* Flashcard */}
      <div className={`study-card ${revealed ? 'revealed' : ''}`} onClick={toggleReveal}>
        <div className="study-card-inner">
          {/* Front: English only */}
          <div className="study-front">
            <div className="study-word-row">
              <h2 className="study-word">{current!.word}</h2>
            {current!.phonetic && <span className="study-phonetic">{current!.phonetic}</span>}
              <button
                className={`icon-btn study-fav-btn ${current!.isFavorite ? 'starred' : ''}`}
                onClick={e => { e.stopPropagation(); handleToggleFav(); }}
                title={current!.isFavorite ? '取消收藏' : '收藏'}
              >
                {current!.isFavorite ? '★' : '☆'}
              </button>
            </div>
            {current!.partOfSpeech.length > 0 && (
              <div className="pos-tags" style={{ justifyContent: 'center' }}>
                {current!.partOfSpeech.map(pos => (
                  <span key={pos} className="pos-tag">{pos}</span>
                ))}
              </div>
            )}
            {current!.sentences.length > 0 && (
              <div className="study-sentences">
                {current!.sentences.map((s, i) => (
                  <p key={i} className="study-sentence-en" dangerouslySetInnerHTML={{ __html: renderBold(s.english) }} />
                ))}
              </div>
            )}
            {!revealed && <p className="study-hint">👆 单击显示中文</p>}
          </div>

          {/* Back: Chinese translation */}
          {revealed && (
          <div className="study-back" style={{marginTop:-8}}>
            <p className="study-meaning">{current!.meaning}</p>
            {current!.sentences.length > 0 && (
              <div className="study-sentences">
                {current!.sentences.map((s, i) => (
                  <p key={i} className="study-sentence-zh">{s.chinese}</p>
                ))}
              </div>
            )}
          </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="study-nav">
        <button className="btn" onClick={goPrev} disabled={clampedIndex === 0}>
          ◀ 上一个
        </button>
        <button className="btn" onClick={() => setIsPlaying(!isPlaying)}>
          {isPlaying ? '⏸ 暂停' : '▶ 播放'}
        </button>
        <button className="btn" onClick={goNext} disabled={clampedIndex === filtered.length - 1}>
          下一个 ▶
        </button>
      </div>

      {showAutoSettings && (
        <div className="modal-overlay" onClick={() => setShowAutoSettings(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth:400}}>
            <h2>⏱️ 自动播放设置</h2>
            <label style={{display:'block',marginBottom:14,fontSize:'.9rem'}}>
              切换间隔（秒）
              <input type="number" min={2} max={60} value={autoInterval} onChange={e => setAutoInterval(Math.max(2, parseInt(e.target.value) || 5))} style={{display:'block',width:'100%',marginTop:4,padding:'8px 12px',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',fontSize:'.9rem',background:'var(--surface)',color:'var(--text)'}} />
            </label>
            <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',padding:'8px 12px',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',marginBottom:16}}>
              <input type="checkbox" checked={showChineseOnAuto} onChange={e => setShowChineseOnAuto(e.target.checked)} style={{accentColor:'var(--primary)',width:18,height:18}} />
              <span style={{fontSize:'.9rem'}}>自动切换时显示中文（间隔一半时间时展示）</span>
            </label>
            <div className="form-actions">
              <button className="btn" onClick={() => setShowAutoSettings(false)}>关闭</button>
            </div>
          </div>
        </div>
      )}

      <p className="study-keyhint">键盘：← 上一个 &nbsp;→ 下一个 &nbsp; 空格/回车 显示/隐藏</p>
    </div>
  );
}
