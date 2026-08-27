import { describe, expect, it, vi } from "vitest"
import { createPromptStore } from "../prompts/store.js"
import { createMemoryStorage } from "../test/memory-storage.js"
import { createAppState } from "./app.js"
import { PromptBoard } from "./prompt-list.js"

/**
 * Builds a prompt store backed by memory storage.
 */
function memoryStore() {
  return createPromptStore(createMemoryStorage())
}

describe("PromptBoard layout", () => {
  it("places session auth above the prompt toolbar, not on the same row", () => {
    const state = createAppState(memoryStore())
    const root = PromptBoard({
      state,
      session: {
        kind: "account",
        label: "user@example.com",
        onSignOut: vi.fn(),
      },
    })
    document.body.append(root)

    const library = root.classList.contains("cue-library")
      ? root
      : root.querySelector(".cue-library")
    expect(library).toBeTruthy()

    const session = library?.querySelector(":scope > .cue-session")
    const toolbar = library?.querySelector(":scope > .cue-toolbar")
    expect(session).toBeTruthy()
    expect(toolbar).toBeTruthy()

    // Auth must not share the prompt-management toolbar row (mobile overflow).
    expect(toolbar?.contains(session)).toBe(false)
    expect(session?.textContent).toContain("user@example.com")
    expect(session?.textContent).toContain("Sign out")
    expect(session?.textContent).toContain("Public wallet")

    const children = [...(library?.children ?? [])]
    const sessionIndex = children.indexOf(/** @type {Element} */ (session))
    const toolbarIndex = children.indexOf(/** @type {Element} */ (toolbar))
    expect(sessionIndex).toBe(0)
    expect(toolbarIndex).toBeGreaterThan(sessionIndex)

    expect(toolbar?.querySelector(".cue-new-btn")).toBeTruthy()
    expect(
      toolbar?.querySelector('select[aria-label="Primary AI provider"]'),
    ).toBeTruthy()
    expect(toolbar?.querySelector(".cue-session")).toBeNull()

    root.remove()
  })

  it("keeps guest warning under the session bar and above the toolbar", () => {
    const state = createAppState(memoryStore())
    const root = PromptBoard({
      state,
      session: {
        kind: "anonymous",
        label: "Guest",
        onSignOut: vi.fn(),
      },
    })
    document.body.append(root)

    const library = root
    const session = library.querySelector(":scope > .cue-session")
    const warning = library.querySelector(":scope > .cue-guest-warning")
    const toolbar = library.querySelector(":scope > .cue-toolbar")

    expect(session).toBeTruthy()
    expect(warning).toBeTruthy()
    expect(toolbar).toBeTruthy()
    expect(toolbar?.contains(session)).toBe(false)

    const children = [...library.children]
    expect(children.indexOf(session)).toBeLessThan(children.indexOf(warning))
    expect(children.indexOf(warning)).toBeLessThan(children.indexOf(toolbar))

    root.remove()
  })

  it("shows a share action for signed-in accounts and hides it for guests", () => {
    const store = memoryStore()
    store.create({ title: "Pie", body: "I like pie" })

    const account = PromptBoard({
      state: createAppState(store),
      session: {
        kind: "account",
        label: "user@example.com",
        onSignOut: vi.fn(),
      },
    })
    document.body.append(account)
    expect(account.querySelector('.cue-row-btn[aria-label="Share"]')).toBeTruthy()
    account.remove()

    const guest = PromptBoard({
      state: createAppState(store),
      session: {
        kind: "anonymous",
        label: "Guest",
        onSignOut: vi.fn(),
      },
    })
    document.body.append(guest)
    expect(guest.querySelector('.cue-row-btn[aria-label="Share"]')).toBeNull()
    guest.remove()
  })
})
