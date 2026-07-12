import { useState, useEffect, useCallback } from 'react';
import type { FilterOptions, ThemeMode, Notebook } from './types/vocab';
import { loadWords, loadNotebooks, getCurrentNotebookId, setCurrentNotebookId } from './utils/storage';
import WordList from './components/WordList';
import ImportExport from './components/ImportExport';
import Settings from './components/Settings';
import StudyView from './components/StudyView';
import FullscreenButton from './components/FullscreenButton';
import ChatView from './components/ChatView';
import './App.css';

type Tab = 'list' | 'study' | 'manage' | 'settings';

const defaultFilter: FilterOptions = {
  search: '',
  partOfSpeech: '',
  favoriteOnly: false,
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

function getInitialTheme(): ThemeMode {
  const saved = localStorage.getItem('kun-vocab-theme');
  if (saved === 'dark' || saved === 'light' || saved === 'system') return saved;
  return 'system';
}

function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  return mode;
}

function App() {
  const [tab, setTab] = useState<Tab>('list');
    const [showChat, setShowChat] = useState(false);
  const [notebooks, setNotebooks] = useState<Notebook[]>(() => loadNotebooks());
  const [currentNbId, setCurrentNbId] = useState<string>(() => getCurrentNotebookId());
  const [words, setWords] = useState(() => loadWords());
  const [filter, setFilter] = useState<FilterOptions>(defaultFilter);
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);

  const currentNb = notebooks.find(n => n.id === currentNbId) || notebooks[0];

  const refresh = useCallback(() => {
    setWords(loadWords());
    setNotebooks(loadNotebooks());
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolveTheme(theme));
    localStorage.setItem('kun-vocab-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => document.documentElement.setAttribute('data-theme', resolveTheme('system'));
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const goToTab = (t: Tab) => {
    setTab(t);
  };

  const switchNotebook = (id: string) => {
    setCurrentNotebookId(id);
    setCurrentNbId(id);
    setFilter(defaultFilter);
    setWords(loadWords());
    setNotebooks(loadNotebooks());
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1>📚 英语单词本</h1>
          <div className="notebook-selector">
            <select value={currentNbId} onChange={e => switchNotebook(e.target.value)}>
              {notebooks.map(nb => <option key={nb.id} value={nb.id}>{nb.name}</option>)}
            </select>
          </div>
        </div>
        <nav className="app-nav">
          <button className={`nav-btn ${tab === 'list' ? 'active' : ''}`} onClick={() => goToTab('list')}>📖 单词</button>
          <button className={`nav-btn ${tab === 'study' ? 'active' : ''}`} onClick={() => goToTab('study')}>🧠 学习</button>
          <button className={`nav-btn ${tab === 'manage' ? 'active' : ''}`} onClick={() => goToTab('manage')}>📦 数据</button>
          <button className={`nav-btn ${tab === 'settings' ? 'active' : ''}`} onClick={() => goToTab('settings')}>AI 设置</button>
          <div className="theme-wrapper">
            <button className="theme-toggle" onClick={() => setTheme(prev => prev === 'light' ? 'dark' : prev === 'dark' ? 'system' : 'light')} title="切换主题">
              {theme === 'light' ? '🌙' : theme === 'dark' ? '☀️' : '🌓'}
            </button>
            <div className="theme-dropdown">
              <button className={`theme-opt ${theme === 'light' ? 'active' : ''}`} onClick={() => setTheme('light')}>☀️ 浅色</button>
              <button className={`theme-opt ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')}>🌙 深色</button>
              <button className={`theme-opt ${theme === 'system' ? 'active' : ''}`} onClick={() => setTheme('system')}>🌓 跟随系统</button>
            </div>
          </div>
        </nav>
      </header>

      <main className="app-main">
        <div className="tab-page" data-active={tab === 'list'}><WordList words={words} filter={filter} onFilterChange={setFilter} onRefresh={refresh} /></div>
        <div className="tab-page" data-active={tab === 'manage'}>
          <ImportExport onRefresh={refresh} currentNb={currentNb} notebooks={notebooks} onSwitchNotebook={switchNotebook} />
        </div>
        <div className="tab-page" data-active={tab === 'settings'}><Settings onClose={() => setTab('list')} /></div>
        <div className="tab-page" data-active={tab === 'study'}><StudyView words={words} filter={filter} onRefresh={refresh} /></div>
      </main>

      <footer className="app-footer">
        <p>数据完全存储在浏览器 localStorage 中，关闭页面不会丢失。</p>
      </footer>
      {showChat && <div className="modal-overlay" onClick={() => setShowChat(false)}><div className="chat-modal" onClick={e => e.stopPropagation()}><ChatView /></div></div>}
      <button className="chat-fab" onClick={() => setShowChat(prev => !prev)} title="AI 助手">{showChat ? '←' : 'AI'}</button>
      <FullscreenButton />
    </div>
  );
}

export default App;
