import { describe, expect, it } from "vitest"
import { createPromptStore } from "../prompts/store.js"
import { buildAskUrl } from "../providers/urls.js"
import { createMemoryStorage } from "../test/memory-storage.js"
import { AuthenticatedApp, App, createAppState, paneForMode } from "../ui/app.js"
import { sessionUrlForPrompt } from "../ui/session.js"

/**
 * Dispatches an input event after setting a field's value so VanJS state updates.
 * @param {HTMLInputElement | HTMLTextAreaElement} field
 * @param {string} value
 */
function typeInto(field, value) {
  field.value = value
  field.dispatchEvent(new Event("input", { bubbles: true }))
}

/**
 * Waits until a DOM query succeeds so VanJS derived children can flush.
 * @param {() => unknown} read
 */
async function waitFor(read) {
  const deadline = Date.now() + 1000
  while (Date.now() < deadline) {
    const value = read()
    if (value) {
      return value
    }
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
  throw new Error("timed out waiting for UI")
}

describe("prompt tray integration", () => {
  it("persists a prompt and can build the Meta ask URL", () => {
    const storage = createMemoryStorage()
    const store = createPromptStore(storage)
    const state = createAppState(store)

    state.startNew()
    const saved = state.save({ body: "I like pie" })
    expect(saved).toBeTruthy()
    if (!saved) {
      throw new Error("expected save to return a prompt")
    }

    expect(saved.title).toBe("I like pie")
    expect(paneForMode(state.mode.val)).toBe("list")
    expect(sessionUrlForPrompt(saved, state.providerId.val)).toBe(
      "https://www.meta.ai/ask?prompt=I+like+pie",
    )
    expect(buildAskUrl(saved.body)).toBe(
      "https://www.meta.ai/ask?prompt=I+like+pie",
    )

    const reopened = createPromptStore(storage)
    expect(reopened.get(saved.id)?.body).toBe("I like pie")
    expect(reopened.list()).toHaveLength(1)
  })

  it("create, edit, and delete stay consistent across store and tray state", () => {
    const store = createPromptStore(createMemoryStorage())
    const state = createAppState(store)

    const created = state.save({ title: "Draft", body: "first" })
    expect(created).toBeTruthy()
    if (!created) {
      throw new Error("expected save to return a prompt")
    }
    expect(store.get(created.id)?.body).toBe("first")

    state.startEdit(created.id)
    state.save({ title: "Draft", body: "second" })
    expect(store.get(created.id)?.body).toBe("second")
    expect(state.mode.val).toBe("list")
    expect(sessionUrlForPrompt(store.get(created.id))).toBe(
      "https://www.meta.ai/ask?prompt=second",
    )

    state.remove(created.id, { confirm: () => true })
    expect(store.list()).toEqual([])
    expect(state.mode.val).toBe("list")
  })

  it("saving from the composer returns to the centered list", async () => {
    const store = createPromptStore(createMemoryStorage())
    /** @type {string[]} */
    const opened = []
    const root = App({
      store,
      openUrl: (url) => {
        opened.push(url)
      },
      storage: createMemoryStorage(),
    })
    document.body.append(root)

    root.querySelector(".cue-new-btn")?.click()
    const title = await waitFor(() => {
      const field = root.querySelector('input[name="title"]')
      return field instanceof HTMLInputElement ? field : null
    })
    const body = root.querySelector("textarea[name='body']")
    if (!(body instanceof HTMLTextAreaElement)) {
      throw new Error("composer body missing")
    }
    typeInto(title, "Pie")
    typeInto(body, "I like pie")
    root.querySelector("form")?.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    )

    await waitFor(() =>
      [...root.querySelectorAll(".cue-prompt-title")].find((node) =>
        node.textContent?.includes("Pie"),
      ),
    )
    expect(root.querySelector("iframe")).toBeNull()
    expect(root.querySelector(".cue-board")).toBeTruthy()
    expect(root.textContent).toContain("I like pie")
    expect(opened).toEqual([])

    root.remove()
  })

  it("clicking a saved prompt opens Meta beside AI Cues", async () => {
    const store = createPromptStore(createMemoryStorage())
    store.create({ title: "Pie", body: "I like pie" })
    /** @type {string[]} */
    const opened = []
    const root = App({
      store,
      openUrl: (url) => {
        opened.push(url)
      },
      storage: createMemoryStorage(),
    })
    document.body.append(root)

    const selectBtn = await waitFor(() =>
      [...root.querySelectorAll(".cue-prompt-select")].find((node) =>
        node.textContent?.includes("Pie"),
      ),
    )
    selectBtn.click()

    expect(opened).toEqual(["https://www.meta.ai/ask?prompt=I+like+pie"])
    expect(root.querySelector(".cue-prompt-list")).toBeTruthy()

    root.remove()
  })

  it("switching the AI platform opens that chat with the prompt", async () => {
    const store = createPromptStore(createMemoryStorage())
    store.create({ title: "Pie", body: "I like pie" })
    /** @type {string[]} */
    const opened = []
    const root = App({
      store,
      openUrl: (url) => {
        opened.push(url)
      },
      storage: createMemoryStorage(),
    })
    document.body.append(root)

    const picker = await waitFor(() => {
      const field = root.querySelector('select[aria-label="Primary AI provider"]')
      return field instanceof HTMLSelectElement ? field : null
    })
    picker.value = "chatgpt"
    picker.dispatchEvent(new Event("change", { bubbles: true }))

    const selectBtn = await waitFor(() =>
      [...root.querySelectorAll(".cue-prompt-select")].find((node) =>
        node.textContent?.includes("Pie"),
      ),
    )
    selectBtn.click()

    expect(opened).toEqual(["https://chatgpt.com/?q=I%20like%20pie"])

    root.remove()
  })

  it("launch dropdown opens a chosen AI without changing the primary", async () => {
    const store = createPromptStore(createMemoryStorage())
    store.create({ title: "Pie", body: "I like pie" })
    /** @type {string[]} */
    const opened = []
    const root = App({
      store,
      openUrl: (url) => {
        opened.push(url)
      },
      storage: createMemoryStorage(),
    })
    document.body.append(root)

    const menu = await waitFor(() => {
      const details = root.querySelector(".cue-launch-menu")
      return details instanceof HTMLDetailsElement ? details : null
    })
    menu.open = true

    const chatgpt = await waitFor(() =>
      [...root.querySelectorAll("button.cue-launch-option")].find(
        (button) => button.getAttribute("aria-label") === "ChatGPT",
      ),
    )
    chatgpt.click()

    expect(opened).toEqual(["https://chatgpt.com/?q=I%20like%20pie"])
    const picker = root.querySelector('select[aria-label="Primary AI provider"]')
    expect(picker instanceof HTMLSelectElement && picker.value).toBe("meta")
    expect(menu.open).toBe(false)

    root.remove()
  })

  it("signed-in users can publish a prompt from the share pane", async () => {
    const store = createPromptStore(createMemoryStorage())
    store.create({ title: "Human", body: "keep it short" })
    store.publish = async (id, tag) => {
      store.update(id, { publicTag: tag })
      return tag
    }
    const authApi = {
      watch: (listener) => {
        listener({
          uid: "user-1",
          isAnonymous: false,
          email: "user@example.com",
        })
        return () => {}
      },
      signOut: async () => {},
    }
    const root = AuthenticatedApp({
      authApi,
      createAccountStore: () => store,
      storage: createMemoryStorage(),
      openUrl: () => {},
    })
    document.body.append(root)

    const share = await waitFor(() =>
      root.querySelector('.cue-row-btn[aria-label="Share"]'),
    )
    share.click()

    const tagField = await waitFor(() => {
      const field = root.querySelector('input[name="tag"]')
      return field instanceof HTMLInputElement ? field : null
    })
    typeInto(tagField, "voice")
    root.querySelector("form.cue-share")?.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    )

    await waitFor(() =>
      [...root.querySelectorAll("button")].find((button) =>
        button.textContent?.includes("Update link"),
      ),
    )
    expect(root.textContent).toContain("/w/voice")
    expect(store.list()[0].publicTag).toBe("voice")

    root.remove()
  })
})
