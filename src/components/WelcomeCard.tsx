import { useState } from 'react';

const SLIDES = [
  { title: '👋 你好！', text: '欢迎使用 Vocab Keeper（英语单词本），一个优雅的英语单词管理、学习与 AI 对话工具。' },
  { title: '📖 单词列表', text: '在「单词」页面可以增删改查单词，支持搜索、筛选、排序，A-Z 快速导航。添加单词时可用 AI 自动识别词性、填写音标和释义。' },
  { title: '🧠 卡片学习', text: '在「学习」页面进行逐词记忆，单击卡片显示释义，键盘或按钮翻页，支持进度跳转和仅收藏模式。' },
  { title: '📦 数据管理', text: '支持多单词本管理（新建/重命名/删除），JSON 导入（追加/覆盖），CSV 导出（含排序预览），示例数据一键加载。' },
  { title: '🤖 AI 功能', text: '右下角 AI 按钮打开对话助手，支持多会话。对话中 AI 自动检测英语词汇，可勾选一键加入单词本。单词编辑和例句也可用 AI 辅助。' },
  { title: '🔌 API 配置', text: '在「AI 设置」页配置 API（兼容 OpenAI 格式）。推荐服务：\n• OpenAI: https://platform.openai.com\n• DeepSeek: https://platform.deepseek.com\n• 通义千问: https://help.aliyun.com/model-studio\n配置后记得点击「测试连接」验证。' },
  { title: '✨ 更多功能', text: '• 琥珀色主题，浅色/深色/跟随系统三种模式\n• 全屏模式沉浸学习\n• AI 请求统计和 token 消耗追踪\n• Markdown 渲染、瞬时动画、响应式布局' },
  { title: '🎉 欢迎使用', text: '', isLast: true },
];

export default function WelcomeCard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const s = SLIDES[step];

  const next = () => { if (step < SLIDES.length - 1) setStep(prev => prev + 1); };
  const prev = () => { if (step > 0) setStep(prev => prev - 1); };

  if (s.isLast) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal welcome-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520, textAlign: 'center', padding: 40 }}>
          <h2 style={{ fontSize: '2rem', marginBottom: 12 }}>🎉</h2>
          <h2 style={{ marginBottom: 16 }}>准备好了，开始吧！</h2>
          <p style={{ fontSize: '.82rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
            GitHub: <a href="https://github.com/Yejack819/vocab-book" target="_blank" rel="noopener">github.com/Yejack819/vocab-book</a><br />
            本项目基于 MIT 开源协议发布<br />
            与 DeepSeek 独立开发<br />
            感谢 Kun 项目提供开发便利
          </p>
          <button className="btn btn-primary" onClick={onClose} style={{ marginTop: 20 }}>开始使用 🚀</button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal welcome-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520, minHeight: 280, padding: 32, display: 'flex', flexDirection: 'column' }}>
        <div className="welcome-progress" style={{ display: 'flex', gap: 6, marginBottom: 20, justifyContent: 'center' }}>
          {SLIDES.map((_, i) => (
            <div key={i} style={{ width: i === step ? 24 : 8, height: 8, borderRadius: 4, background: i === step ? 'var(--primary)' : 'var(--border)', transition: 'all .3s' }} />
          ))}
        </div>
        <h2 style={{ marginBottom: 12, fontSize: '1.3rem' }}>{s.title}</h2>
        <p style={{ flex: 1, fontSize: '.95rem', lineHeight: 1.7, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{s.text}</p>
        <div className="form-actions" style={{ marginTop: 20 }}>
          {step > 0 && <button className="btn" onClick={prev}>← 上一步</button>}
          <button className="btn" onClick={onClose} style={{ marginRight: 'auto' }}>跳过</button>
          <button className="btn btn-primary" onClick={next}>下一步 →</button>
        </div>
      </div>
    </div>
  );
}
