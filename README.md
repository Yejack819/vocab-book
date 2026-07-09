<div align="center">
  <h1>📚 英语单词本 · Vocab Keeper</h1>
  <p><strong>一个优雅的英语单词管理 & 学习工具</strong></p>
  <p>
    <img alt="Vite" src="https://img.shields.io/badge/Vite-8.x-646CFF?logo=vite" />
    <img alt="React" src="https://img.shields.io/badge/React-19.x-61DAFB?logo=react" />
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-6.x-3178C6?logo=typescript" />
    <img alt="License" src="https://img.shields.io/badge/license-MIT-blue" />
  </p>
</div>

---

## ✨ 功能

| 功能 | 说明 |
|------|------|
| 📖 **单词管理** | 增删改查，搜索/筛选/排序，A-Z 快速导航 |
| 🧠 **卡片学习** | 逐词记忆，单击显示释义，键盘翻页，进度跳转 |
| 🤖 **AI 辅助** | 配置 API 后自动识别词性、填写音标、翻译例句 |
| 🏷️ **词性标签** | 13 种预设词性（含"词组""其他"），多选 |
| 📝 **Markdown 加粗** | 例句中用 `**word**` 渲染为粗体 |
| 🌗 **深色模式** | 一键切换，自动跟随系统偏好 |
| ☑️ **批量操作** | 勾选后批量收藏/删除 |
| 📊 **数据导入/导出** | JSON（追加/覆盖） + CSV（含表头，兼容 Excel） |
| 💾 **本地存储** | 所有数据保存在浏览器 localStorage |
| ⛶ **全屏模式** | 沉浸式学习 |
| 🔄 **瞬时动画** | 按钮点击反馈、弹窗过渡、标签切换动效 |

## 🚀 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器
npm run dev

# 3. 浏览器打开
open http://localhost:5173
```

### 构建生产版本

```bash
npm run build
# 产出在 dist/ 目录
```

## 🤖 AI 配置（可选）

在「设置」页配置兼容 OpenAI API 的服务：

| 字段 | 示例 |
|------|------|
| API Host | `https://api.openai.com` 或 `https://api.deepseek.com` |
| API Key | `sk-...` |
| Model | `gpt-4o-mini` / `deepseek-chat` / `qwen-plus` |

配置后，添加单词时点击 **🤖 AI** 按钮可自动：
- 填写音标（IPA）
- 选择词性
- 填写中文释义
- 翻译英文例句

## 📦 数据格式

### JSON 导入/导出

```json
{
  "version": 1,
  "exportedAt": "2026-07-09T00:00:00.000Z",
  "total": 3,
  "words": [
    {
      "id": "xxx",
      "word": "hello",
      "phonetic": "/həˈloʊ/",
      "meaning": "你好；喂",
      "partOfSpeech": ["interjection", "noun", "verb"],
      "sentences": [
        { "english": "**Hello**, how are you?", "chinese": "你好，你怎么样？" }
      ],
      "isFavorite": true,
      "createdAt": 1780000000000
    }
  ]
}
```

### CSV 导出

表格列：`英文单词, 音标, 词性, 释义, 例句, 例句翻译`

支持勾选「仅导出收藏单词」。

## 🧰 技术栈

- **[Vite](https://vite.dev/)** — 构建工具
- **[React 19](https://react.dev/)** — UI 框架
- **[TypeScript](https://www.typescriptlang.org/)** — 类型安全
- **localStorage** — 数据持久化
- **CSS Custom Properties** — 浅色/深色主题

## 📄 开源协议

MIT License © 2026

---

<p align="center">Made with ❤️ and ☕</p>
