import { useState, useEffect, useCallback } from 'react';
import type { FilterOptions, ThemeMode } from './types/vocab';
import { loadWords } from './utils/storage';
import WordList from './components/WordList';
import ImportExport from './components/ImportExport';
import Settings from './components/Settings';
import FullscreenButton from './components/FullscreenButton';
import StudyView from './components/StudyView';
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
  if (saved === 'dark' || saved === 'light') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function App() {
  const [tab, setTab] = useState<Tab>('list');
  const [words, setWords] = useState(loadWords);
  const [filter, setFilter] = useState<FilterOptions>(defaultFilter);
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);

  const refresh = useCallback(() => {
    setWords(loadWords());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('kun-vocab-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1>📚 英语单词本</h1>
          <p className="subtitle">基于 Vite + React + TypeScript — 数据存储在浏览器本地</p>
        </div>
        <nav className="app-nav">
          <button
            className={`nav-btn ${tab === 'list' ? 'active' : ''}`}
            onClick={() => setTab('list')}
          >
            📖 单词
          </button>
          <button
            className={`nav-btn ${tab === 'study' ? 'active' : ''}`}
            onClick={() => setTab('study')}
          >
            🧠 学习
          </button>
          <button
            className={`nav-btn ${tab === 'manage' ? 'active' : ''}`}
            onClick={() => setTab('manage')}
          >
            📦 数据
          </button>
          <button
            className={`nav-btn ${tab === 'settings' ? 'active' : ''}`}
            onClick={() => setTab('settings')}
          >
            🤖 AI设置
          </button>
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            title={theme === 'light' ? '切换到深色模式' : '切换到浅色模式'}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </nav>
      </header>

      <main className="app-main">
        <div className="tab-page" data-active={tab === 'list'}><WordList words={words} filter={filter} onFilterChange={setFilter} onRefresh={refresh} /></div>
        <div className="tab-page" data-active={tab === 'manage'}><ImportExport onRefresh={refresh} /></div>
        <div className="tab-page" data-active={tab === 'settings'}><Settings onClose={() => setTab('list')} /></div>
        <div className="tab-page" data-active={tab === 'study'}><StudyView words={words} filter={filter} onRefresh={refresh} /></div>
      </main>

      <footer className="app-footer">
        <p>数据完全存储在浏览器 localStorage 中，关闭页面不会丢失。</p>
      </footer>
      <FullscreenButton />
    </div>
  );
}

export default App;
