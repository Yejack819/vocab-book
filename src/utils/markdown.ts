/** 简单的 Markdown 渲染：粗体、代码、标题、列表、链接、段落 */
export function renderMarkdown(text: string): string {
  let html = text
    // 转义 HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // 图片 ![alt](url)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:6px;margin:8px 0" />')
    // 链接 [text](url)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    // 行内代码 `code`
    .replace(/`([^`]+)`/g, '<code style="background:var(--surface-hover);padding:2px 6px;border-radius:4px;font-size:.85em">$1</code>')
    // 粗体 **text**
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // 斜体 *text*
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // 标题 (### 开头)
    .replace(/^### (.+)$/gm, '<h4 style="margin:12px 0 6px;font-size:1rem">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 style="margin:14px 0 8px;font-size:1.1rem">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 style="margin:16px 0 10px;font-size:1.2rem">$1</h2>')
    // 无序列表 - 
    .replace(/^- (.+)$/gm, '<li style="margin:2px 0">$1</li>')
    // 有序列表 1. 
    .replace(/^\d+\. (.+)$/gm, '<li style="margin:2px 0">$1</li>')
    // 段落 (连续两个换行)
    .replace(/\n\n+/g, '</p><p style="margin:8px 0">');

  // Wrap consecutive <li> in <ul>
  html = html.replace(/((?:<li[^>]*>.*?<\/li>\s*)+)/g, '<ul style="padding-left:20px;margin:6px 0">$1</ul>');

  // Wrap in <p> if not already wrapped
  if (!html.startsWith('<')) {
    html = '<p style="margin:8px 0">' + html + '</p>';
  }

  return html;
}
