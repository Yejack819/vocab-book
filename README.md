<div align="center">
  <h1>📚 英语单词本 · Vocab Keeper</h1>
  <p><strong>一个优雅的英语单词管理、学习 & AI 对话工具</strong></p>
  <p>
    <img alt="Vite" src="https://img.shields.io/badge/Vite-8.x-646CFF?logo=vite" />
    <img alt="React" src="https://img.shields.io/badge/React-19.x-61DAFB?logo=react" />
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-6.x-3178C6?logo=typescript" />
    <img alt="License" src="https://img.shields.io/badge/license-MIT-blue" />
  </p>
  <p>
    <a href="https://vocab-book-peach.vercel.app" target="_blank">
      <img alt="Vercel" src="https://img.shields.io/badge/demo-vocab--book--peach.vercel.app-000?logo=vercel" />
    </a>
  </p>
</div>

---

## ✨ 功能一览

### 📖 单词管理
| 功能 | 说明 |
|------|------|
| **增删改查** | 添加/编辑/删除单词，13 种预设词性标签（含词组、其他） |
| **搜索/筛选/排序** | 全文搜索、按词性筛选、按时间/A-Z/释义排序 |
| **A-Z 快速导航** | 右侧字母条，点击跳转到对应字母组 |
| **音标** | Merriweather 衬线字体显示 IPA 国际音标 |
| **Markdown 粗体** | 例句中 `**word**` 渲染为加粗 |
| **批量操作** | 全选/批量收藏（智能单按钮）/批量删除/批量移动/导出 CSV |

### 🧠 卡片学习
| 功能 | 说明 |
|------|------|
| **逐词记忆** | 单击卡片显示释义和翻译，再次单击隐藏 |
| **键盘/按钮翻页** | ← 上一个 / → 下一个，支持进度跳转 |
| **仅收藏模式** | 只复习收藏的单词 |
| **顺序同步** | 与列表页排序筛选保持一致 |

### 🤖 AI 对话助手
| 功能 | 说明 |
|------|------|
| **浮动聊天** | 点击右下角 AI 按钮打开/关闭，浮于页面上方 |
| **多会话管理** | 新建/切换/重命名/删除会话，每会话独立保存 |
| **Markdown 渲染** | 支持粗体、代码、标题、列表、链接 |
| **单词提取** | AI 自动检测对话中的英语词汇，可勾选一键加入单词本 |
| **请求统计** | 对话计入 AI 请求计数和 token 消耗统计 |

### 🎨 界面与体验
| 功能 | 说明 |
|------|------|
| **琥珀色主题** | 温暖琥珀色调，浅色/深色/跟随系统三种模式 |
| **主题下拉菜单** | 悬停主题按钮弹出选择面板 |
| **瞬时动画** | 按钮点击回弹、弹窗淡入缩放、标签页切换动效 |
| **全屏模式** | 沉浸式学习 |
| **响应式布局** | 手机/平板/桌面自适应 |

### 📊 数据管理
| 功能 | 说明 |
|------|------|
| **多单词本** | 独立的数据空间，可新建/重命名/删除，下拉快速切换 |
| **导入** | JSON 格式，支持追加/覆盖两种模式 |
| **导出 JSON** | 标准 vocab-export 格式 |
| **导出 CSV** | 表格格式，含表头，可选排序方式和仅收藏，预览前三行 |
| **示例数据** | 一键加载 3 个示例单词 |
| **恢复出厂** | 清除所有单词本、AI 配置和设置 |

### ⚙️ AI 设置
| 功能 | 说明 |
|------|------|
| **API 配置** | 兼容 OpenAI 格式（Host/Key/Model） |
| **独立对话模型** | 可与单词分析使用不同的模型 |
| **请求统计** | 显示总请求数、成功/失败/出错/空回答次数、预计 token 消耗 |

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

## 🤖 AI 配置

在「AI 设置」页配置兼容 OpenAI API 的服务：

| 字段 | 示例 |
|------|------|
| API Host | `https://api.openai.com` 或 `https://api.deepseek.com` |
| API Key | `sk-...` |
| 模型 | `gpt-4o-mini` / `deepseek-chat` / `qwen-plus` |

### 单词编辑 AI
添加单词时点击 **🤖 AI** 按钮自动：填写音标 → 选择词性 → 填写中文释义

### 例句生成 AI
例句框为空时点击 **🤖** 按钮自动根据英文单词生成简短例句（≤15词）并翻译

### 对话 AI
右下角 **AI** 按钮打开聊天，AI 自动检测词汇并支持一键加入单词本

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

列：`英文单词, 音标, 词性, 释义, 例句, 例句翻译`

## 🧰 技术栈

- **[Vite](https://vite.dev/)** — 构建工具
- **[React 19](https://react.dev/)** — UI 框架
- **[TypeScript](https://www.typescriptlang.org/)** — 类型安全
- **localStorage** — 数据持久化
- **CSS Custom Properties** — 琥珀色主题，浅色/深色双模式

## 📄 开源协议

MIT License © 2026 Yejack819

---

<p align="center">Made with ❤️ and ☕</p>
