import mermaid from "mermaid"
import van from "vanjs-core"
import { renderMermaidIn } from "../content/mermaid-render.js"
import { AuthGate } from "./auth-gate.js"

const { button, div, p } = van.tags

/**
 * Signed-out front page: about + auth side-by-side on desktop; on mobile, a
 * Get Started hero above about, with auth in a modal.
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

  const authPanel = div(
    { class: "cue-landing-auth-panel" },
    button(
      {
        type: "button",
        class: "btn btn-sm btn-ghost cue-btn-ghost cue-landing-auth-close",
        onclick: () => {
          closeAuth()
        },
        "aria-label": "Close sign in",
      },
      "Close",
    ),
    AuthGate({ authApi }),
  )

  const authPane = div(
    { class: "cue-landing-auth" },
    div({
      class: "cue-landing-auth-backdrop",
      onclick: () => {
        closeAuth()
      },
    }),
    authPanel,
  )

  /**
   * Opens the mobile auth modal.
   */
  function openAuth() {
    authPane.classList.add("cue-landing-auth-open")
    authPanel.setAttribute("role", "dialog")
    authPanel.setAttribute("aria-modal", "true")
  }

  /**
   * Closes the mobile auth modal.
   */
  function closeAuth() {
    authPane.classList.remove("cue-landing-auth-open")
    authPanel.removeAttribute("role")
    authPanel.removeAttribute("aria-modal")
  }

  return div(
    { class: "cue-landing" },
    div(
      { class: "cue-landing-hero" },
      p({ class: "cue-landing-hero-title" }, "AI Cues"),
      p(
        { class: "cue-landing-hero-copy" },
        "Save prompts you like and open them in your favorite AI tools.",
      ),
      button(
        {
          type: "button",
          class: "btn btn-sm cue-btn-solid cue-landing-get-started",
          onclick: () => {
            openAuth()
          },
        },
        "Get started",
      ),
    ),
    about,
    authPane,
  )
}
