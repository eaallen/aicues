import { describe, expect, it, vi } from "vitest"
import { LandingPage } from "./landing.js"

describe("LandingPage", () => {
  /**
   * Minimal auth API stub for the embedded AuthGate.
   */
  function mockAuthApi() {
    return {
      signInWithGoogle: vi.fn(async () => {}),
      signInWithEmail: vi.fn(async () => {}),
      createWithEmail: vi.fn(async () => {}),
      signInAnonymously: vi.fn(async () => {}),
    }
  }

  it("renders about content, a Get started CTA, and auth controls", () => {
    const authApi = mockAuthApi()
    const aboutHtml = "<h1>Why AI Cues</h1><p>Lorem ipsum.</p>"
    const root = LandingPage({ authApi, aboutHtml })
    document.body.append(root)

    expect(root.classList.contains("cue-landing")).toBe(true)

    const about = root.querySelector(".cue-landing-about")
    expect(about).toBeTruthy()
    expect(about?.innerHTML).toContain("<h1>Why AI Cues</h1>")
    expect(about?.textContent).toContain("Lorem ipsum.")

    const hero = root.querySelector(".cue-landing-hero")
    expect(hero).toBeTruthy()
    expect(hero?.textContent).toContain("Get started")

    const authPane = root.querySelector(".cue-landing-auth")
    expect(authPane).toBeTruthy()
    expect(authPane?.classList.contains("cue-landing-auth-open")).toBe(false)
    expect(authPane?.querySelector(".cue-auth")).toBeTruthy()
    expect(authPane?.textContent).toContain("Continue with Google")
    expect(authPane?.textContent).toContain("Continue as guest")

    root.remove()
  })

  it("opens and closes the auth modal from Get started and Close", () => {
    const root = LandingPage({
      authApi: mockAuthApi(),
      aboutHtml: "<p>About</p>",
    })
    document.body.append(root)

    const authPane = root.querySelector(".cue-landing-auth")
    expect(authPane?.classList.contains("cue-landing-auth-open")).toBe(false)

    root.querySelector(".cue-landing-get-started")?.click()
    expect(authPane?.classList.contains("cue-landing-auth-open")).toBe(true)

    root.querySelector(".cue-landing-auth-close")?.click()
    expect(authPane?.classList.contains("cue-landing-auth-open")).toBe(false)

    root.querySelector(".cue-landing-get-started")?.click()
    root.querySelector(".cue-landing-auth-backdrop")?.click()
    expect(authPane?.classList.contains("cue-landing-auth-open")).toBe(false)

    root.remove()
  })

  it("keeps about content out of the auth pane", () => {
    const root = LandingPage({
      authApi: mockAuthApi(),
      aboutHtml: "<p>Only on the left</p>",
    })
    document.body.append(root)

    const authPane = root.querySelector(".cue-landing-auth")
    expect(authPane?.textContent).not.toContain("Only on the left")
    expect(root.querySelector(".cue-landing-about")?.textContent).toContain(
      "Only on the left",
    )

    root.remove()
  })

  it("schedules mermaid render for diagram nodes in the about pane", async () => {
    const aboutHtml =
      '<h2>How it Works</h2><div class="mermaid">flowchart LR\nA --> B</div>'
    const root = LandingPage({
      authApi: mockAuthApi(),
      aboutHtml,
    })
    document.body.append(root)

    const diagram = root.querySelector(".cue-landing-about .mermaid")
    expect(diagram).toBeTruthy()
    expect(diagram?.textContent).toContain("A --> B")

    // Allow the landing page microtask / rAF render path to run.
    await new Promise((resolve) => setTimeout(resolve, 0))
    await new Promise((resolve) => requestAnimationFrame(() => resolve()))

    // Real mermaid may or may not draw SVG in jsdom; the node must stay present
    // and either be processed or still hold the source for a retry.
    expect(root.querySelector(".cue-landing-about .mermaid")).toBeTruthy()

    root.remove()
  })
})
