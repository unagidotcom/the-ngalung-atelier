const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const renderInline = (value: string): string => {
  let html = escapeHtml(value);
  html = html.replace(/!\[([^\]]*)\]\((https?:\/\/[^)\s]+|\/[^)\s]+)\)/g, '<img src="$2" alt="$1" loading="lazy" />');
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return html;
};

function flushParagraph(parts: string[], out: string[]) {
  if (parts.length === 0) return;
  out.push(`<p>${renderInline(parts.join(' '))}</p>`);
  parts.length = 0;
}

function flushList(items: string[], out: string[], ordered: boolean) {
  if (items.length === 0) return;
  const tag = ordered ? 'ol' : 'ul';
  out.push(`<${tag}>${items.map(item => `<li>${renderInline(item)}</li>`).join('')}</${tag}>`);
  items.length = 0;
}

function renderTable(lines: string[], out: string[]) {
  if (lines.length < 2) return;
  const rows = lines.map(line => line.trim().replace(/^\||\|$/g, '').split('|').map(cell => cell.trim()));
  const header = rows[0];
  const body = rows.slice(2);
  out.push(
    `<div class="article-table-wrap"><table><thead><tr>${header
      .map(cell => `<th>${renderInline(cell)}</th>`)
      .join('')}</tr></thead><tbody>${body
      .map(row => `<tr>${row.map(cell => `<td>${renderInline(cell)}</td>`).join('')}</tr>`)
      .join('')}</tbody></table></div>`
  );
}

export function renderArticleMarkdown(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  const paragraph: string[] = [];
  const bullets: string[] = [];
  const numbers: string[] = [];
  const table: string[] = [];

  const flushAll = () => {
    flushParagraph(paragraph, out);
    flushList(bullets, out, false);
    flushList(numbers, out, true);
    if (table.length > 0) {
      renderTable(table, out);
      table.length = 0;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushAll();
      continue;
    }

    if (line.includes('|') && /^\|?.+\|.+\|?$/.test(line)) {
      flushParagraph(paragraph, out);
      flushList(bullets, out, false);
      flushList(numbers, out, true);
      table.push(line);
      continue;
    }

    if (table.length > 0) {
      renderTable(table, out);
      table.length = 0;
    }

    if (line.startsWith('### ')) {
      flushAll();
      const text = line.slice(4).trim();
      out.push(`<h3 id="${slugify(text)}">${renderInline(text)}</h3>`);
      continue;
    }

    if (line.startsWith('## ')) {
      flushAll();
      const text = line.slice(3).trim();
      out.push(`<h2 id="${slugify(text)}">${renderInline(text)}</h2>`);
      continue;
    }

    if (line.startsWith('> [!CTA]')) {
      flushAll();
      out.push(`<aside class="article-inline-cta">${renderInline(line.replace('> [!CTA]', '').trim())}</aside>`);
      continue;
    }

    if (line.startsWith('> ')) {
      flushAll();
      out.push(`<blockquote>${renderInline(line.slice(2).trim())}</blockquote>`);
      continue;
    }

    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      flushParagraph(paragraph, out);
      flushList(numbers, out, true);
      bullets.push(bullet[1]);
      continue;
    }

    const numbered = line.match(/^\d+\.\s+(.+)$/);
    if (numbered) {
      flushParagraph(paragraph, out);
      flushList(bullets, out, false);
      numbers.push(numbered[1]);
      continue;
    }

    paragraph.push(line);
  }

  flushAll();
  return out.join('\n');
}

export function calculateReadingTime(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

export function createArticleSlug(title: string): string {
  return slugify(title) || 'untitled-article';
}
