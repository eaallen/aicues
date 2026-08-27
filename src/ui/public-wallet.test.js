import { describe, expect, it } from "vitest"
import { createMemoryStorage } from "../test/memory-storage.js"
import { PublicWalletApp } from "./public-wallet.js"

/**
 * Waits a turn so VanJS derived children can flush.
 */
async function tick() {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

describe("PublicWalletApp", () => {
  const prompts = [
    { id: "p1", title: "First", body: "one", updatedAt: 10 },
    { id: "p2", title: "Second", body: "two", updatedAt: 20 },
  ]

  /**
   * Builds a mock public store.
   * @param {{ profile?: { tag: string }, prompts?: object[] } | null} result
   */
  function mockStore(result) {
    return {
      listByTag: async () => result,
      getPublic: async () => null,
    }
  }

  it("shows a friendly 404 for an unknown tag", async () => {
    const root = PublicWalletApp({
      tag: "missing",
      publicStore: mockStore(null),
      openUrl: () => {},
      storage: createMemoryStorage(),
    })
    document.body.append(root)
    await tick()

    expect(root.textContent).toContain("Wallet not found")
    expect(root.textContent).toContain("This public wallet does not exist.")
    expect(root.querySelector(".cue-public-header")).toBeNull()

    root.remove()
  })

  it("shows the author tag without edit controls", async () => {
    const root = PublicWalletApp({
      tag: "eli-dev",
      publicStore: mockStore({ profile: { tag: "eli-dev" }, prompts }),
      openUrl: () => {},
      storage: createMemoryStorage(),
    })
    document.body.append(root)
    await tick()

    expect(root.querySelector(".cue-public-header")?.textContent).toBe("@eli-dev")
    expect(root.textContent).not.toContain("New prompt")
    expect(root.querySelector('.cue-row-btn[aria-label="Edit"]')).toBeNull()
    expect(root.querySelector('.cue-row-btn[aria-label="Delete"]')).toBeNull()
    expect(root.textContent).toContain("Second")
    expect(root.textContent).toContain("First")

    root.remove()
  })

  it("launches a prompt when a row is clicked", async () => {
    /** @type {string[]} */
    const opened = []
    const root = PublicWalletApp({
      tag: "eli-dev",
      publicStore: mockStore({ profile: { tag: "eli-dev" }, prompts }),
      openUrl: (url) => {
        opened.push(url)
      },
      storage: createMemoryStorage(),
    })
    document.body.append(root)
    await tick()

    const row = [...root.querySelectorAll(".cue-prompt-select")].find((button) =>
      button.textContent?.includes("Second"),
    )
    row?.dispatchEvent(new MouseEvent("click", { bubbles: true }))

    expect(opened).toEqual(["https://www.meta.ai/ask?prompt=two"])

    root.remove()
  })

  it("highlights and reorders a shared prompt", async () => {
    const root = PublicWalletApp({
      tag: "eli-dev",
      highlightPromptId: "p1",
      publicStore: mockStore({ profile: { tag: "eli-dev" }, prompts }),
      openUrl: () => {},
      storage: createMemoryStorage(),
    })
    document.body.append(root)
    await tick()

    const rows = root.querySelectorAll(".cue-prompt-row")
    expect(rows[0]?.classList.contains("cue-prompt-highlight")).toBe(true)
    expect(rows[0]?.textContent).toContain("First")
    expect(root.textContent).not.toContain("Prompt not found")

    root.remove()
  })

  it("shows a dismissible alert when the prompt id is missing", async () => {
    const root = PublicWalletApp({
      tag: "eli-dev",
      highlightPromptId: "missing",
      publicStore: mockStore({ profile: { tag: "eli-dev" }, prompts }),
      openUrl: () => {},
      storage: createMemoryStorage(),
    })
    document.body.append(root)
    await tick()

    expect(root.textContent).toContain("Prompt not found")
    expect(root.textContent).toContain("Second")

    const dismiss = root.querySelector(".cue-not-found-dismiss")
    dismiss?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    await tick()
    expect(root.textContent).not.toContain("Prompt not found")

    root.remove()
  })

  it("remembers the chosen provider", async () => {
    const storage = createMemoryStorage()
    const root = PublicWalletApp({
      tag: "eli-dev",
      publicStore: mockStore({ profile: { tag: "eli-dev" }, prompts }),
      openUrl: () => {},
      storage,
    })
    document.body.append(root)
    await tick()

    const picker = root.querySelector('select[aria-label="Primary AI provider"]')
    if (!(picker instanceof HTMLSelectElement)) {
      throw new Error("provider picker missing")
    }
    picker.value = "chatgpt"
    picker.dispatchEvent(new Event("change", { bubbles: true }))
    root.remove()

    const second = PublicWalletApp({
      tag: "eli-dev",
      publicStore: mockStore({ profile: { tag: "eli-dev" }, prompts }),
      openUrl: () => {},
      storage,
    })
    document.body.append(second)
    await tick()

    const restored = second.querySelector('select[aria-label="Primary AI provider"]')
    expect(restored instanceof HTMLSelectElement && restored.value).toBe("chatgpt")
    second.remove()
  })
})
