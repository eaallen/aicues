import { describe, expect, it, vi } from "vitest"
import {
  cueMermaidConfig,
  cueMermaidThemeVariables,
  renderMermaidIn,
} from "./mermaid-render.js"

describe("cueMermaidThemeVariables", () => {
  it("uses light neutrals on the dark-mode inverted (light) about pane", () => {
    const vars = cueMermaidThemeVariables(true)
    expect(vars.primaryColor).toBe("#ececec")
    expect(vars.primaryTextColor).toBe("#1a1a1a")
    expect(vars.lineColor).toBe("#6b6b6b")
    expect(vars.fontFamily).toContain("IBM Plex Sans")
  })

  it("uses dark neutrals on the light-mode inverted (dark) about pane", () => {
    const vars = cueMermaidThemeVariables(false)
    expect(vars.primaryColor).toBe("#2c2c2c")
    expect(vars.primaryTextColor).toBe("#e6e6e6")
    expect(vars.lineColor).toBe("#9b9b9b")
  })
})

describe("cueMermaidConfig", () => {
  it("uses the base theme with Cue variables (not default lavender)", () => {
    const config = cueMermaidConfig(false)
    expect(config.theme).toBe("base")
    expect(config.themeVariables.primaryColor).toBe("#2c2c2c")
    expect(config.startOnLoad).toBe(false)
  })
})

describe("renderMermaidIn", () => {
  /**
   * Builds a connected about pane with one mermaid node.
   * @param {string} source
   */
  function connectedAbout(source) {
    const root = document.createElement("div")
    root.className = "cue-landing-about"
    const node = document.createElement("div")
    node.className = "mermaid"
    node.textContent = source
    root.append(node)
    document.body.append(root)
    return { root, node }
  }

  it("initializes and runs mermaid on connected .mermaid nodes", async () => {
    const initialize = vi.fn()
    const run = vi.fn(async ({ nodes }) => {
      for (const node of nodes) {
        node.dataset.processed = "true"
        node.replaceChildren(
          document.createElementNS("http://www.w3.org/2000/svg", "svg"),
        )
      }
    })
    const { root, node } = connectedAbout("flowchart LR\nA --> B")

    await renderMermaidIn(root, {
      mermaid: { initialize, run },
      prefersDark: false,
    })

    expect(initialize).toHaveBeenCalledWith(
      expect.objectContaining({
        startOnLoad: false,
        theme: "base",
        themeVariables: expect.objectContaining({
          primaryColor: "#2c2c2c",
          fontFamily: expect.stringContaining("IBM Plex Sans"),
        }),
      }),
    )
    expect(run).toHaveBeenCalledOnce()
    expect(run.mock.calls[0][0].nodes).toEqual([node])
    expect(node.querySelector("svg")).toBeTruthy()

    root.remove()
  })

  it("waits until the container is connected before running", async () => {
    const run = vi.fn(async () => {})
    const root = document.createElement("div")
    root.innerHTML = '<div class="mermaid">flowchart LR\nA --> B</div>'

    const pending = renderMermaidIn(root, {
      mermaid: { initialize: vi.fn(), run },
      prefersDark: true,
    })

    expect(run).not.toHaveBeenCalled()
    document.body.append(root)
    await pending

    expect(run).toHaveBeenCalledOnce()
    root.remove()
  })

  it("is a no-op when there are no mermaid nodes", async () => {
    const initialize = vi.fn()
    const run = vi.fn()
    const root = document.createElement("div")
    root.innerHTML = "<p>No diagram</p>"
    document.body.append(root)

    await renderMermaidIn(root, {
      mermaid: { initialize, run },
      prefersDark: false,
    })

    expect(initialize).not.toHaveBeenCalled()
    expect(run).not.toHaveBeenCalled()
    root.remove()
  })
})
