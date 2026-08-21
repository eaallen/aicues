/**
 * Escapes HTML special characters in plain text.
 * @param {string} text
 */
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/**
 * Escapes mermaid source for safe HTML embedding without breaking `-->` arrows.
 * @param {string} text
 */
function escapeMermaidSource(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;")
}

/**
 * Escapes inline text and turns links / bold markers into HTML.
 * @param {string} text
 */
function formatInline(text) {
  /** @type {string[]} */
  const parts = []
  const tokenRe = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*/g
  let last = 0
  let match = tokenRe.exec(text)
  while (match) {
    parts.push(escapeHtml(text.slice(last, match.index)))
    if (match[1] !== undefined) {
      const href = match[2]
      const safeHref = /^(https?:|mailto:)/i.test(href) ? href : "#"
      parts.push(
        `<a href="${escapeHtml(safeHref)}" target="_blank" rel="noopener noreferrer">${escapeHtml(match[1])}</a>`,
      )
    } else {
      parts.push(`<strong>${escapeHtml(match[3])}</strong>`)
    }
    last = match.index + match[0].length
    match = tokenRe.exec(text)
  }
  parts.push(escapeHtml(text.slice(last)))
  return parts.join("")
}

/**
 * True when a line starts a new block type (stop paragraph accumulation).
 * @param {string} line
 */
function isBlockStart(line) {
  const trimmed = line.trim()
  return (
    /^(#{1,6})\s+/.test(line) ||
    /^[-*]\s+/.test(line) ||
    /^\d+\.\s+/.test(line) ||
    trimmed.startsWith("```") ||
    line.startsWith(">")
  )
}

/**
 * Converts a small Markdown subset to HTML.
 * Supports headings, paragraphs, lists, blockquotes, links, and mermaid fences.
 * Raw HTML in the source is escaped.
 * @param {string} markdown
 */
export function markdownToHtml(markdown) {
  const source = String(markdown ?? "")
  if (!source.trim()) {
    return ""
  }

  const lines = source.replace(/\r\n/g, "\n").split("\n")
  /** @type {string[]} */
  const blocks = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) {
      i += 1
      continue
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line)
    if (heading) {
      const level = heading[1].length
      blocks.push(
        `<h${level}>${formatInline(heading[2].trim())}</h${level}>`,
      )
      i += 1
      continue
    }

    if (line.trim().startsWith("```")) {
      const lang = line.trim().slice(3).trim().toLowerCase()
      i += 1
      /** @type {string[]} */
      const body = []
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        body.push(lines[i])
        i += 1
      }
      if (i < lines.length) {
        i += 1
      }
      const code =
        lang === "mermaid"
          ? escapeMermaidSource(body.join("\n"))
          : escapeHtml(body.join("\n"))
      if (lang === "mermaid") {
        blocks.push(`<div class="mermaid">${code}</div>`)
      } else {
        blocks.push(`<pre><code>${code}</code></pre>`)
      }
      continue
    }

    if (line.startsWith(">")) {
      /** @type {string[]} */
      const quoteLines = []
      while (i < lines.length && lines[i].startsWith(">")) {
        quoteLines.push(formatInline(lines[i].replace(/^>\s?/, "").trim()))
        i += 1
      }
      blocks.push(`<blockquote><p>${quoteLines.join(" ")}</p></blockquote>`)
      continue
    }

    if (/^[-*]\s+/.test(line)) {
      /** @type {string[]} */
      const items = []
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        const itemText = lines[i].replace(/^[-*]\s+/, "").trim()
        items.push(`<li>${formatInline(itemText)}</li>`)
        i += 1
      }
      blocks.push(`<ul>${items.join("")}</ul>`)
      continue
    }

    if (/^\d+\.\s+/.test(line)) {
      /** @type {string[]} */
      const items = []
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        const itemText = lines[i].replace(/^\d+\.\s+/, "").trim()
        items.push(`<li>${formatInline(itemText)}</li>`)
        i += 1
      }
      blocks.push(`<ol>${items.join("")}</ol>`)
      continue
    }

    /** @type {string[]} */
    const paragraphLines = []
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) {
      paragraphLines.push(formatInline(lines[i].trim()))
      i += 1
    }
    blocks.push(`<p>${paragraphLines.join(" ")}</p>`)
  }

  return blocks.join("")
}
