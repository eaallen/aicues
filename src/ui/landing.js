import mermaid from "mermaid"
import van from "vanjs-core"
import { renderMermaidIn } from "../content/mermaid-render.js"
import { AuthGate } from "./auth-gate.js"

const { div } = van.tags

/**
 * Signed-out front page: about copy on the left, auth on the right.
 * @param {{
 *   authApi: {
 *     signInWithGoogle: () => Promise<unknown>,
 *     signInWithEmail: (email: string, password: string) => Promise<unknown>,
 *     createWithEmail: (email: string, password: string) => Promise<unknown>,
 *     signInAnonymously: () => Promise<unknown>,
 *   },
 *   aboutHtml: string,
 * }} props
 */
export function LandingPage({ authApi, aboutHtml }) {
  const about = div({ class: "cue-landing-about", innerHTML: aboutHtml })
  queueMicrotask(() => {
    void renderMermaidIn(about, { mermaid }).catch((error) => {
      console.error("Failed to render mermaid diagram", error)
    })
  })
  return div(
    { class: "cue-landing" },
    about,
    div({ class: "cue-landing-auth" }, AuthGate({ authApi })),
  )
}
