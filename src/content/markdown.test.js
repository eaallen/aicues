import { describe, expect, it } from "vitest"
import { markdownToHtml } from "./markdown.js"

describe("markdownToHtml", () => {
  it("turns headings, paragraphs, and lists into HTML", () => {
    const html = markdownToHtml(
      [
        "# Why AI Cues",
        "",
        "Lorem ipsum dolor sit amet.",
        "",
        "- First point",
        "- Second point",
      ].join("\n"),
    )

    expect(html).toContain("<h1>")
    expect(html).toContain("Why AI Cues")
    expect(html).toContain("<p>")
    expect(html).toContain("Lorem ipsum dolor sit amet.")
    expect(html).toContain("<li>")
    expect(html).toContain("First point")
    expect(html).toContain("Second point")
  })

  it("escapes raw HTML in the markdown source", () => {
    const html = markdownToHtml('Hello <script>alert("x")</script>')
    expect(html).not.toContain("<script>")
    expect(html).toContain("&lt;script&gt;")
  })

  it("returns an empty string for blank input", () => {
    expect(markdownToHtml("")).toBe("")
    expect(markdownToHtml("   \n\n")).toBe("")
  })

  it("emits mermaid fences with parseable diagram source", () => {
    const html = markdownToHtml(
      ["```mermaid", "flowchart LR", "  A --> B", "```"].join("\n"),
    )
    expect(html).toContain('class="mermaid"')
    expect(html).toContain("flowchart LR")
    // Mermaid must see real arrows; HTML-escaping `>` breaks some render paths.
    expect(html).toContain("A --> B")
    expect(html).not.toContain("&gt;")
    // Still neutralize tag openers so markdown cannot inject HTML.
    const sneaky = markdownToHtml(
      ["```mermaid", 'A["<img src=x onerror=alert(1)>"]', "```"].join("\n"),
    )
    expect(sneaky).toContain("&lt;img")
    expect(sneaky).not.toContain("<img src")
  })

  it("renders links and blockquotes used in about copy", () => {
    const html = markdownToHtml(
      [
        "Try [meta.ai](https://meta.ai) today.",
        "",
        "> keep responses short",
      ].join("\n"),
    )
    expect(html).toContain('<a href="https://meta.ai"')
    expect(html).toContain("meta.ai</a>")
    expect(html).toContain("<blockquote>")
    expect(html).toContain("keep responses short")
  })

  it("renders ordered lists", () => {
    const html = markdownToHtml(["1. First", "2. Second"].join("\n"))
    expect(html).toContain("<ol>")
    expect(html).toContain("<li>First</li>")
    expect(html).toContain("<li>Second</li>")
  })
})
