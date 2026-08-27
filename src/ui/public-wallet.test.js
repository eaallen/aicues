import { describe, expect, it } from "vitest"
import {
  PublicWalletApp,
  PublicWalletBoard,
  createPublicWalletState,
  findPublicPrompt,
} from "./public-wallet.js"

describe("findPublicPrompt", () => {
  it("matches a normalized tag", () => {
    const prompts = [{ tag: "human-voice", title: "Human" }]
    expect(findPublicPrompt(prompts, "Human Voice")?.title).toBe("Human")
    expect(findPublicPrompt(prompts, "missing")).toBeNull()
    expect(findPublicPrompt(prompts, null)).toBeNull()
  })
})

describe("createPublicWalletState", () => {
  it("opens the tagged prompt and launches it", () => {
    const prompts = [
      { tag: "pie", title: "Pie", body: "I like pie" },
      { tag: "voice", title: "Voice", body: "keep it short" },
    ]
    /** @type {string[]} */
    const opened = []
    /** @type {Array<string | null>} */
    const navigated = []
    const state = createPublicWalletState(prompts, {
      tag: "voice",
      openUrl: (url) => {
        opened.push(url)
      },
      onNavigate: (tag) => {
        navigated.push(tag)
      },
    })

    expect(state.selectedPrompt()?.title).toBe("Voice")
    state.launch()
    expect(opened).toEqual(["https://www.meta.ai/ask?prompt=keep+it+short"])

    state.select("pie")
    expect(state.selectedPrompt()?.title).toBe("Pie")
    expect(navigated).toEqual(["pie"])
  })
})

describe("PublicWalletBoard", () => {
  it("shows the opened prompt and the rest of the catalog", () => {
    const state = createPublicWalletState(
      [
        { tag: "voice", title: "Human voice", body: "keep it short" },
        { tag: "pie", title: "Pie", body: "I like pie" },
      ],
      { tag: "voice", openUrl: () => {} },
    )
    const root = PublicWalletBoard({ state })
    document.body.append(root)

    expect(root.textContent).toContain("Public wallet")
    expect(root.textContent).toContain("Your prompts")
    expect(root.textContent).toContain("keep it short")
    expect(root.textContent).toContain("Open prompt")
    expect(root.textContent).toContain("Pie")
    expect(root.querySelector(".cue-prompt-row.is-selected")?.textContent).toContain(
      "Human voice",
    )
    root.remove()
  })
})

describe("PublicWalletApp", () => {
  /**
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

  it("loads public prompts and opens the tagged one", async () => {
    const publicStore = {
      async list() {
        return [
          { tag: "voice", title: "Human voice", body: "keep it short" },
          { tag: "pie", title: "Pie", body: "I like pie" },
        ]
      },
    }
    const root = PublicWalletApp({
      initialTag: "voice",
      publicStore,
      openUrl: () => {},
      storage: {
        getItem: () => null,
        setItem: () => {},
      },
      location: { pathname: "/w/voice" },
      history: { pushState: () => {} },
    })
    document.body.append(root)

    await waitFor(() =>
      [...root.querySelectorAll(".cue-public-title")].find((node) =>
        node.textContent?.includes("Human voice"),
      ),
    )
    expect(root.textContent).toContain("keep it short")
    expect(root.textContent).toContain("/pie")
    root.remove()
  })
})
