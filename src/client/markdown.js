/**
 * A deliberately small, dependency-free Markdown renderer for project READMEs.
 *
 * Security: every piece of source text is HTML-escaped before markup is added;
 * link targets are restricted to http(s) and mailto. Raw HTML in a README is
 * therefore displayed as text, never executed.
 */

const ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ESCAPES[character])
}

function safeHref(raw) {
  const value = String(raw ?? '').trim().replace(/^&lt;|&gt;$/g, '')
  if (/^(?:https?:\/\/|mailto:)/i.test(value)) return value
  return ''
}

function inline(text) {
  let source = escapeHtml(text)
  const codes = []
  source = source.replace(/`([^`]+)`/g, (_, code) => {
    codes.push(code)
    return `\u0000${codes.length - 1}\u0000`
  })

  // Images become a textual marker: project-relative files are not served.
  source = source.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt) =>
    `<span class="ait-md-image">🖼 ${alt || '图片'}</span>`)

  source = source.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
    const target = safeHref(href)
    return target
      ? `<a href="${escapeHtml(target)}" target="_blank" rel="noreferrer noopener">${label}</a>`
      : label
  })

  source = source.replace(/&lt;(https?:\/\/[^&\s]+?)&gt;/g, (_, href) => {
    const target = safeHref(href)
    return target
      ? `<a href="${escapeHtml(target)}" target="_blank" rel="noreferrer noopener">${escapeHtml(href)}</a>`
      : href
  })

  source = source
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/(^|[^_])_([^_]+)_/g, '$1<em>$2</em>')

  source = source.replace(/\u0000(\d+)\u0000/g, (_, index) => `<code>${codes[Number(index)]}</code>`)
  return source
}

function isBlockStart(line) {
  return /^\s*(?:#{1,6}\s|```|~~~|>|[-*+]\s|\d+\.\s|---+\s*$)/.test(line)
}

function renderTable(lines, start) {
  const headerLine = lines[start]
  const separator = lines[start + 1] ?? ''
  if (!headerLine.includes('|') || !/^\s*\|?[\s:|-]+\|?\s*$/.test(separator)) return null
  const split = (row) => row
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())
  const headers = split(headerLine)
  const rows = []
  let index = start + 2
  while (index < lines.length && lines[index].includes('|') && lines[index].trim() !== '') {
    rows.push(split(lines[index]))
    index++
  }
  const head = headers.map((cell) => `<th>${inline(cell)}</th>`).join('')
  const body = rows.map((row) => `<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join('')}</tr>`).join('')
  return {
    html: `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`,
    next: index,
  }
}

/**
 * Render a README to a safe HTML string.
 * @param {string} markdown
 * @returns {string}
 */
export function renderMarkdown(markdown) {
  let source = String(markdown ?? '').replace(/\r\n?/g, '\n')
  source = source.replace(/^---\n[\s\S]*?\n---\n/, '')
  const lines = source.split('\n')
  const html = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]

    if (/^\s*$/.test(line)) { index++; continue }

    const fence = /^\s*(```|~~~)\s*([\w-]*)\s*$/.exec(line)
    if (fence) {
      const marker = fence[1]
      const language = fence[2] || ''
      index++
      const code = []
      while (index < lines.length && !new RegExp(`^\\s*${marker}`).test(lines[index])) {
        code.push(lines[index])
        index++
      }
      if (index < lines.length) index++
      const className = language ? ` class="language-${escapeHtml(language)}"` : ''
      html.push(`<pre><code${className}>${escapeHtml(code.join('\n'))}</code></pre>`)
      continue
    }

    const heading = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line)
    if (heading) {
      const level = heading[1].length
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`)
      index++
      continue
    }

    if (/^\s*(?:---+|\*\*\*+|___+)\s*$/.test(line)) {
      html.push('<hr/>')
      index++
      continue
    }

    if (/^\s*>/.test(line)) {
      const quote = []
      while (index < lines.length && /^\s*>/.test(lines[index])) {
        quote.push(lines[index].replace(/^\s*>\s?/, ''))
        index++
      }
      html.push(`<blockquote>${renderMarkdown(quote.join('\n'))}</blockquote>`)
      continue
    }

    const listMatch = /^(\s*)([-*+]|\d+\.)\s+(.+)$/.exec(line)
    if (listMatch) {
      const ordered = /\d+\./.test(listMatch[2])
      const items = []
      while (index < lines.length) {
        const item = /^(\s*)([-*+]|\d+\.)\s+(.+)$/.exec(lines[index])
        if (!item) break
        let content = item[3]
        const task = /^\[([ xX])\]\s+(.*)$/.exec(content)
        if (task) content = `<span class="ait-md-check">${task[1].toLowerCase() === 'x' ? '☑' : '☐'}</span> ${inline(task[2])}`
        else content = inline(content)
        items.push(`<li>${content}</li>`)
        index++
      }
      html.push(ordered ? `<ol>${items.join('')}</ol>` : `<ul>${items.join('')}</ul>`)
      continue
    }

    if (line.includes('|')) {
      const table = renderTable(lines, index)
      if (table) {
        html.push(table.html)
        index = table.next
        continue
      }
    }

    const paragraph = [line]
    index++
    while (index < lines.length && !/^\s*$/.test(lines[index]) && !isBlockStart(lines[index])) {
      if (lines[index].includes('|') && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[index + 1] ?? '')) break
      paragraph.push(lines[index])
      index++
    }
    html.push(`<p>${paragraph.map(inline).join('<br/>')}</p>`)
  }

  return html.join('')
}