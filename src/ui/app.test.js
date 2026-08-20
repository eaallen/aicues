import { describe, expect, it, vi } from "vitest"
import { GUEST_STORAGE_WARNING } from "../firebase/auth.js"
import { createPromptStore } from "../prompts/store.js"
import { createMemoryStorage } from "../test/memory-storage.js"
import { App, AuthenticatedApp, createAppState, findPrompt, paneForMode } from "./app.js"
import { promptSnippet } from "./prompt-list.js"
import { displayTitle, sessionUrlForPrompt } from "./session.js"

/**
 * Builds a prompt store backed by memory storage.
 */
function memoryStore() {
  return createPromptStore(createMemoryStorage())
}

describe("paneForMode", () => {
  it("maps tray modes to the centered view", () => {
    expect(paneForMode("list")).toBe("list")
    expect(paneForMode("compose")).toBe("composer")
  })

  it("falls back to the list for an unknown mode", () => {
    expect(paneForMode("session")).toBe("list")
    expect(paneForMode("nope")).toBe("list")
  })
})

describe("findPrompt", () => {
  it("returns the matching prompt or null", () => {
    const prompts = [
      { id: "a", title: "A" },
      { id: "b", title: "B" },
    ]
    expect(findPrompt(prompts, "b")?.title).toBe("B")
    expect(findPrompt(prompts, "missing")).toBeNull()
    expect(findPrompt(prompts, null)).toBeNull()
  })
})

describe("displayTitle", () => {
  it("prefers a non-empty title", () => {
    expect(displayTitle({ title: "Pie", body: "I like pie" })).toBe("Pie")
  })

  it("falls back to the first body line when title is blank", () => {
    expect(
      displayTitle({ title: "  ", body: "  First line  \nSecond" }),
    ).toBe("First line")
  })

  it('uses "Untitled" when title and body are empty', () => {
    expect(displayTitle({ title: "", body: "" })).toBe("Untitled")
    expect(displayTitle(null)).toBe("Untitled")
  })
})

describe("promptSnippet", () => {
  it("collapses whitespace and truncates long bodies", () => {
    expect(promptSnippet("  I like pie  ")).toBe("I like pie")
    expect(promptSnippet("a".repeat(90)).endsWith("…")).toBe(true)
    expect(promptSnippet("")).toBe("")
  })
})

describe("sessionUrlForPrompt", () => {
  it("builds the Meta ask URL from the prompt body", () => {
    expect(sessionUrlForPrompt({ body: "I like pie" })).toBe(
      "https://www.meta.ai/ask?prompt=I+like+pie",
    )
  })

  it("uses an empty body when the prompt is missing", () => {
    expect(sessionUrlForPrompt(null)).toBe("https://www.meta.ai/")
  })

  it("honors the selected provider", () => {
    expect(sessionUrlForPrompt({ body: "I like pie" }, "chatgpt")).toBe(
      "https://chatgpt.com/?q=I%20like%20pie",
    )
  })
})

describe("createAppState", () => {
  it("starts on the list with the store's current prompts", () => {
    const store = memoryStore()
    const existing = store.create({ title: "Saved", body: "hello" })
    const state = createAppState(store)

    expect(state.mode.val).toBe("list")
    expect(state.editingId.val).toBeNull()
    expect(state.prompts.val.map((prompt) => prompt.id)).toEqual([existing.id])
  })

  it("create then save returns to the list without opening the provider", () => {
    const store = memoryStore()
    /** @type {string[]} */
    const opened = []
    const state = createAppState(store, {
      openUrl: (url) => {
        opened.push(url)
      },
    })

    state.startNew()
    expect(state.mode.val).toBe("compose")

    const saved = state.save({ title: "Pie", body: "I like pie" })

    expect(saved?.body).toBe("I like pie")
    expect(state.mode.val).toBe("list")
    expect(state.editingId.val).toBeNull()
    expect(opened).toEqual([])
  })

  it("edit then save updates the prompt and returns to the list", () => {
    const store = memoryStore()
    const created = store.create({ title: "Old", body: "before" })
    const state = createAppState(store)

    state.startEdit(created.id)
    expect(state.mode.val).toBe("compose")
    expect(state.editingId.val).toBe(created.id)
    expect(state.editingPrompt()?.body).toBe("before")

    const updated = state.save({ title: "New", body: "after" })

    expect(updated?.id).toBe(created.id)
    expect(updated?.body).toBe("after")
    expect(state.mode.val).toBe("list")
    expect(state.editingId.val).toBeNull()
  })

  it("delete removes the prompt and stays on the list", () => {
    const store = memoryStore()
    const created = store.create({ title: "Gone", body: "bye" })
    const state = createAppState(store)

    const removed = state.remove(created.id, { confirm: () => true })

    expect(removed).toBe(true)
    expect(store.get(created.id)).toBeNull()
    expect(state.prompts.val).toEqual([])
    expect(state.mode.val).toBe("list")
  })

  it("does not delete when confirm is declined", () => {
    const store = memoryStore()
    const created = store.create({ title: "Keep", body: "stay" })
    const state = createAppState(store)

    const removed = state.remove(created.id, { confirm: () => false })

    expect(removed).toBe(false)
    expect(store.get(created.id)?.title).toBe("Keep")
  })

  it("opens the provider when a prompt is selected", () => {
    const store = memoryStore()
    const created = store.create({ title: "Pie", body: "I like pie" })
    /** @type {string[]} */
    const opened = []
    const state = createAppState(store, {
      openUrl: (url) => {
        opened.push(url)
      },
    })

    state.select(created.id)

    expect(opened).toEqual(["https://www.meta.ai/ask?prompt=I+like+pie"])
    expect(state.mode.val).toBe("list")
  })

  it("launches with an override without changing the primary", () => {
    const store = memoryStore()
    const created = store.create({ title: "Pie", body: "I like pie" })
    /** @type {string[]} */
    const opened = []
    const changed = []
    const state = createAppState(store, {
      openUrl: (url) => {
        opened.push(url)
      },
      onProviderChange: (id) => {
        changed.push(id)
      },
    })

    expect(state.providerId.val).toBe("meta")
    state.select(created.id, "chatgpt")

    expect(opened).toEqual(["https://chatgpt.com/?q=I%20like%20pie"])
    expect(state.providerId.val).toBe("meta")
    expect(changed).toEqual([])
  })

  it("opens the selected AI platform when the provider changes", () => {
    const store = memoryStore()
    const created = store.create({ title: "Pie", body: "I like pie" })
    /** @type {string[]} */
    const opened = []
    const changed = []
    const state = createAppState(store, {
      providerId: "chatgpt",
      openUrl: (url) => {
        opened.push(url)
      },
      onProviderChange: (id) => {
        changed.push(id)
      },
    })

    expect(state.providerId.val).toBe("chatgpt")
    state.setProvider("claude")
    state.select(created.id)

    expect(changed).toEqual(["claude"])
    expect(opened).toEqual(["https://claude.ai/new?q=I%20like%20pie"])
  })

  it("cancelCompose returns to the list", () => {
    const state = createAppState(memoryStore())
    state.startNew()
    state.cancelCompose()
    expect(state.mode.val).toBe("list")
  })
})

describe("App", () => {
  it("shows the centered library with saved prompts", () => {
    const store = memoryStore()
    store.create({ title: "Listed", body: "body" })
    const root = App({
      store,
      openUrl: () => {},
      storage: createMemoryStorage(),
    })
    document.body.append(root)

    expect(root.textContent).toContain("New prompt")
    expect(root.textContent).toContain("Listed")
    expect(root.textContent).toContain("body")
    expect(root.querySelector(".cue-board")).toBeTruthy()
    expect(root.querySelector(".cue-sidebar")).toBeNull()
    expect(
      root.querySelector('.cue-row-btn[aria-label="Edit"] svg.cue-icon'),
    ).toBeTruthy()
    expect(
      root.querySelector('.cue-row-btn[aria-label="Delete"] svg.cue-icon'),
    ).toBeTruthy()
    expect(root.querySelector(".cue-tooltip .cue-tooltip-content")).toBeTruthy()
    const picker = root.querySelector('select[aria-label="Primary AI provider"]')
    expect(picker).toBeTruthy()
    expect(picker instanceof HTMLSelectElement && picker.value).toBe("meta")
    expect(root.textContent).toContain("Primary")
    expect(
      root.querySelector('[aria-label="Choose AI to launch"]'),
    ).toBeTruthy()

    root.remove()
  })

  it("remembers the last chosen AI platform", () => {
    const store = memoryStore()
    store.create({ title: "Listed", body: "body" })
    const storage = createMemoryStorage()
    const first = App({ store, openUrl: () => {}, storage })
    document.body.append(first)

    const picker = first.querySelector('select[aria-label="Primary AI provider"]')
    if (!(picker instanceof HTMLSelectElement)) {
      throw new Error("provider picker missing")
    }
    picker.value = "chatgpt"
    picker.dispatchEvent(new Event("change", { bubbles: true }))
    first.remove()

    const second = App({ store, openUrl: () => {}, storage })
    document.body.append(second)
    const restored = second.querySelector('select[aria-label="Primary AI provider"]')
    expect(restored instanceof HTMLSelectElement && restored.value).toBe(
      "chatgpt",
    )
    second.remove()
  })
})

describe("AuthenticatedApp", () => {
  /**
   * Waits a turn so VanJS derived children can flush.
   */
  async function tick() {
    await new Promise((resolve) => setTimeout(resolve, 0))
  }

  it("shows the sign-in gate when signed out", async () => {
    const authApi = {
      watch: (listener) => {
        listener(null)
        return () => {}
      },
      signOut: vi.fn(async () => {}),
    }
    const root = AuthenticatedApp({
      authApi,
      storage: createMemoryStorage(),
      openUrl: () => {},
    })
    document.body.append(root)
    await tick()
    expect(root.textContent).toContain("Continue with Google")
    expect(root.textContent).toContain("Continue as guest")
    root.remove()
  })

  it("warns and uses this-device storage for guest sessions", async () => {
    const warnings = []
    const authApi = {
      watch: (listener) => {
        listener({ uid: "anon-1", isAnonymous: true, email: null })
        return () => {}
      },
      signOut: vi.fn(async () => {}),
    }
    const root = AuthenticatedApp({
      authApi,
      storage: createMemoryStorage(),
      openUrl: () => {},
      warn: (message) => {
        warnings.push(message)
      },
    })
    document.body.append(root)
    await tick()
    expect(warnings).toContain(GUEST_STORAGE_WARNING)
    expect(root.textContent).toContain("Guest mode stores prompts only on this device")
    expect(root.textContent).toContain("New prompt")
    expect(root.textContent).toContain("Guest")
    root.remove()
  })
})

describe("van state assignment", () => {
  it("does not mutate the prompts array in place", () => {
    const store = memoryStore()
    const state = createAppState(store)
    const before = state.prompts.val
    store.create({ title: "Next" })
    state.refresh()
    expect(state.prompts.val).not.toBe(before)
    expect(state.prompts.val).toHaveLength(1)
  })
})
