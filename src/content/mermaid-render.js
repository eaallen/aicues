/**
 * Cue mermaid theme variables for the inverted about pane.
 * Light UI → dark about pane; dark UI → light about pane.
 * @param {boolean} prefersDark
 */
export function cueMermaidThemeVariables(prefersDark) {
  // About pane is inverted vs system theme.
  if (prefersDark) {
    // Light diagram on the white about pane
    return {
      fontFamily: '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
      fontSize: "13px",
      background: "transparent",
      primaryColor: "#ececec",
      primaryTextColor: "#1a1a1a",
      primaryBorderColor: "#c8c8c8",
      secondaryColor: "#f5f5f5",
      tertiaryColor: "#e0e0e0",
      lineColor: "#6b6b6b",
      textColor: "#1a1a1a",
      mainBkg: "#ececec",
      nodeBorder: "#c8c8c8",
      clusterBkg: "#f5f5f5",
      titleColor: "#1a1a1a",
      edgeLabelBackground: "#ffffff",
      actorBkg: "#ececec",
      actorBorder: "#c8c8c8",
      actorTextColor: "#1a1a1a",
    }
  }

  // Light diagram ink on the dark about pane
  return {
    fontFamily: '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
    fontSize: "13px",
    background: "transparent",
    primaryColor: "#2c2c2c",
    primaryTextColor: "#e6e6e6",
    primaryBorderColor: "#4a4a4a",
    secondaryColor: "#1f1f1f",
    tertiaryColor: "#3a3a3a",
    lineColor: "#9b9b9b",
    textColor: "#e6e6e6",
    mainBkg: "#2c2c2c",
    nodeBorder: "#4a4a4a",
    clusterBkg: "#1f1f1f",
    titleColor: "#e6e6e6",
    edgeLabelBackground: "#1a1a1a",
    actorBkg: "#2c2c2c",
    actorBorder: "#4a4a4a",
    actorTextColor: "#e6e6e6",
  }
}

/**
 * Full mermaid.initialize config for the about pane.
 * @param {boolean} prefersDark
 */
export function cueMermaidConfig(prefersDark) {
  return {
    startOnLoad: false,
    securityLevel: "strict",
    theme: "base",
    themeVariables: cueMermaidThemeVariables(prefersDark),
    flowchart: {
      curve: "basis",
      padding: 12,
      nodeSpacing: 28,
      rankSpacing: 36,
      htmlLabels: false,
    },
  }
}

/**
 * Resolves when `node` is connected to the document.
 * @param {Node} node
 * @param {{ timeoutMs?: number }} [options]
 */
function whenConnected(node, options = {}) {
  if (node.isConnected) {
    return Promise.resolve()
  }
  const timeoutMs = options.timeoutMs ?? 2000
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      observer.disconnect()
      reject(new Error("mermaid container was not connected in time"))
    }, timeoutMs)
    const observer = new MutationObserver(() => {
      if (node.isConnected) {
        clearTimeout(timeoutId)
        observer.disconnect()
        resolve()
      }
    })
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    })
    if (node.isConnected) {
      clearTimeout(timeoutId)
      observer.disconnect()
      resolve()
    }
  })
}

/**
 * Initializes mermaid once (per injected API) and renders diagrams in `root`.
 * @param {ParentNode} root
 * @param {{
 *   mermaid: {
 *     initialize: (config: object) => void,
 *     run: (options: { nodes: HTMLElement[] }) => Promise<unknown>,
 *   },
 *   prefersDark?: boolean,
 * }} options
 */
export async function renderMermaidIn(root, options) {
  const nodes = [...root.querySelectorAll(".mermaid")].filter(
    (node) => node instanceof HTMLElement && !node.dataset.processed,
  )
  if (nodes.length === 0) {
    return
  }

  await whenConnected(root instanceof Node ? root : nodes[0])

  const prefersDark =
    options.prefersDark ??
    (typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)

  const api = options.mermaid
  if (!api.__cueInitialized) {
    api.initialize(cueMermaidConfig(Boolean(prefersDark)))
    api.__cueInitialized = true
  }

  await api.run({ nodes })
}
