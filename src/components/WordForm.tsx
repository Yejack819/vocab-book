import { useState } from 'react';
import type { VocabWord, Sentence } from '../types/vocab';
import { PART_OF_SPEECH_OPTIONS } from '../types/vocab';
import { addWord, updateWord } from '../utils/storage';
import { aiAnalyzeWord, aiTranslateSentence, aiGenerateSentence } from '../utils/ai';

interface WordFormProps {
  word?: VocabWord | null;
  onDone: () => void;
  onCancel: () => void;
}

export default function WordForm({ word, onDone, onCancel }: WordFormProps) {
  const isEdit = !!word;
  const [formWord, setFormWord] = useState(word?.word ?? '');
  const [meaning, setMeaning] = useState(word?.meaning ?? '');
  const [phonetic, setPhonetic] = useState(word?.phonetic ?? '');
  const [selectedPos, setSelectedPos] = useState<string[]>(word?.partOfSpeech ?? []);
  const [sentences, setSentences] = useState<Sentence[]>(word?.sentences ?? [{ english: '', chinese: '' }]);
  const [error, setError] = useState('');
  const [translating, setTranslating] = useState<'word' | number | null>(null);

  const handleSentenceChange = (index: number, field: 'english' | 'chinese', value: string) => {
    setSentences(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addSentence = () => setSentences(prev => [...prev, { english: '', chinese: '' }]);
  const removeSentence = (index: number) => { if (sentences.length > 1) setSentences(prev => prev.filter((_, i) => i !== index)); };
  const togglePos = (pos: string) => setSelectedPos(prev => prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos]);

  const handleAiWord = async () => {
    const trimmed = formWord.trim();
    if (!trimmed) { setError('请先输入英文单词'); return; }
    setTranslating('word');
    setError('');
    try {
      const result = await aiAnalyzeWord(trimmed);
      if (result.phonetic) setPhonetic(result.phonetic);
      if (result.meaning) setMeaning(result.meaning);
      if (result.partOfSpeech && result.partOfSpeech.length > 0) {
        setSelectedPos(result.partOfSpeech.filter(p => PART_OF_SPEECH_OPTIONS.some(o => o.value === p)));
      }
    } catch (err: any) { setError(err.message || 'AI 分析失败'); }
    finally { setTranslating(null); }
  };

  const handleAiSentence = async (index: number) => {
    const text = sentences[index].english.trim();
    setTranslating(index);
    setError('');
    try {
      if (!text && formWord.trim()) {
        // 句子为空但有英文单词 → 生成简短标准例句
        const result = await aiGenerateSentence(formWord.trim());
        setSentences(prev => {
          const next = [...prev];
          next[index] = { ...next[index], english: result.english, chinese: result.chinese };
          return next;
        });
      } else if (text) {
        const translation = await aiTranslateSentence(text);
        handleSentenceChange(index, 'chinese', translation);
      } else {
        setError('请先输入英文单词或英文例句');
      }
    } catch (err: any) { setError(err.message || 'AI 出错'); }
    finally { setTranslating(null); }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmedWord = formWord.trim();
    const trimmedMeaning = meaning.trim();
    if (!trimmedWord) { setError('请输入单词'); return; }
    if (!trimmedMeaning) { setError('请输入释义'); return; }
    const validSentences = sentences.filter((s) => s.english.trim() || s.chinese.trim());
    if (isEdit && word) {
      updateWord(word.id, { word: trimmedWord, meaning: trimmedMeaning, phonetic: phonetic.trim() || undefined, partOfSpeech: selectedPos, sentences: validSentences });
    } else {
      addWord(trimmedWord, trimmedMeaning, selectedPos, validSentences, phonetic.trim() || undefined);
    }
    onDone();
  };

  return (
    <form className="word-form" onSubmit={handleSubmit}>
      <h2>{isEdit ? '编辑单词' : '添加单词'}</h2>
      {error && <p className="form-error">{error}</p>}

      <label className="field-with-ai">
        <span>单词 <span className="required">*</span></span>
        <div className="input-row">
          <input type="text" value={formWord} onChange={e => setFormWord(e.target.value)} placeholder="e.g. contribute to" required />
          <button type="button" className="btn btn-ai" onClick={handleAiWord} disabled={translating === 'word'} title="AI 自动识别词性和释义">{translating === 'word' ? '⏳' : '🤖'} AI</button>
        </div>
      </label>

      <label>释义 <span className="required">*</span><input type="text" value={meaning} onChange={e => setMeaning(e.target.value)} placeholder="e.g. 造成，促成" required /></label>
      <label>音标<input type="text" value={phonetic} onChange={e => setPhonetic(e.target.value)} placeholder="/kənˈtrɪbjuːt/" /></label>

      <div className="pos-selector">
        <span className="pos-label">词性</span>
        <div className="pos-chips">
          {PART_OF_SPEECH_OPTIONS.map(opt => (
            <button key={opt.value} type="button" className={`pos-chip ${selectedPos.includes(opt.value) ? 'active' : ''}`} onClick={() => togglePos(opt.value)}>{opt.label}</button>
          ))}
        </div>
      </div>

      <fieldset className="sentences-fieldset">
        <legend>例句</legend>
        {sentences.map((s, i) => (
          <div key={i} className="sentence-block">
            <div className="input-row">
              <input type="text" placeholder="English sentence" value={s.english} onChange={e => handleSentenceChange(i, 'english', e.target.value)} />
              <button type="button" className="btn btn-ai btn-ai-sm" onClick={() => handleAiSentence(i)} disabled={translating === i} title={!s.english.trim() && formWord.trim() ? 'AI 生成例句' : 'AI 翻译'}>
                {translating === i ? '⏳' : '🤖'}
              </button>
            </div>
            <div className="input-row">
              <input type="text" placeholder="中文翻译" value={s.chinese} onChange={e => handleSentenceChange(i, 'chinese', e.target.value)} />
              {sentences.length > 1 && <button type="button" className="icon-btn danger" onClick={() => removeSentence(i)} title="移除例句">✕</button>}
            </div>
          </div>
        ))}
        <button type="button" className="btn btn-small" onClick={addSentence}>＋ 添加例句</button>
      </fieldset>

      <div className="form-actions">
        <button type="button" className="btn" onClick={onCancel}>取消</button>
        <button type="submit" className="btn btn-primary">{isEdit ? '保存' : '添加'}</button>
      </div>
    </form>
  );
}
