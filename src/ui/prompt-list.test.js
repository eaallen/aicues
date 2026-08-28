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
})

describe("PromptBoard copy link", () => {
  /**
   * Waits a turn so async handlers can finish.
   */
  async function tick() {
    await new Promise((resolve) => setTimeout(resolve, 0))
  }

  it("shows copy link on public prompts for account users", async () => {
    const store = memoryStore()
    const created = store.create({ title: "Hello", body: "world" })
    store.update(created.id, { isPublic: true })
    const state = createAppState(store)
    const writeText = vi.fn(async () => {})
    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: { writeText },
    })

    const root = PromptBoard({
      state,
      session: {
        kind: "account",
        label: "user@example.com",
        onSignOut: vi.fn(),
      },
      profileStore: {
        get: vi.fn(async () => ({ tag: "eli-dev", updatedAt: 1 })),
        setTag: vi.fn(),
      },
      promptStore: store,
    })
    document.body.append(root)
    await tick()

    const copyButton = root.querySelector('button[aria-label="Copy link"]')
    expect(copyButton).toBeTruthy()
    copyButton?.click()
    await tick()

    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}/w/eli-dev/${created.id}`,
    )

    vi.unstubAllGlobals()
    root.remove()
  })

  it("hides copy link for guests", () => {
    const store = memoryStore()
    const created = store.create({ title: "Hello", body: "world" })
    store.update(created.id, { isPublic: true })
    const state = createAppState(store)
    const root = PromptBoard({
      state,
      session: {
        kind: "anonymous",
        label: "Guest",
        onSignOut: vi.fn(),
      },
    })
    document.body.append(root)

    expect(root.querySelector('button[aria-label="Copy link"]')).toBeNull()
    expect(root.querySelector('button[aria-label="Share"]')).toBeNull()

    root.remove()
  })
})
