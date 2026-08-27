import { describe, expect, it, vi } from "vitest"
import { SharePane, copyText } from "./share.js"

describe("copyText", () => {
  it("writes to the clipboard API", async () => {
    const writeText = vi.fn(async () => {})
    await copyText("https://aicues.web.app/w/voice", { writeText })
    expect(writeText).toHaveBeenCalledWith("https://aicues.web.app/w/voice")
  })

  it("throws when clipboard is unavailable", async () => {
    await expect(copyText("x", null)).rejects.toThrow(/copy/i)
  })
})

describe("SharePane", () => {
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

  it("previews the share URL as the tag is typed", async () => {
    const root = SharePane({
      prompt: { id: "p1", title: "Human" },
      origin: "https://aicues.web.app",
      onPublish: async () => ({ ok: true, tag: "human-voice" }),
      onUnpublish: async () => ({ ok: true }),
      onCancel: () => {},
    })
    document.body.append(root)

    const field = root.querySelector('input[name="tag"]')
    if (!(field instanceof HTMLInputElement)) {
      throw new Error("tag field missing")
    }
    field.value = "Human Voice"
    field.dispatchEvent(new Event("input", { bubbles: true }))

    await waitFor(() =>
      [...root.querySelectorAll(".cue-share-url")].find((node) =>
        node.textContent?.includes("https://aicues.web.app/w/human-voice"),
      ),
    )
    expect(root.textContent).toContain("Make public")
    root.remove()
  })

  it("publishes and then offers copy and unpublish", async () => {
    const published = []
    const root = SharePane({
      prompt: { id: "p1", title: "Human" },
      origin: "https://aicues.web.app",
      clipboard: { writeText: vi.fn(async () => {}) },
      onPublish: async (tag) => {
        published.push(tag)
        return { ok: true, tag }
      },
      onUnpublish: async () => ({ ok: true }),
      onCancel: () => {},
    })
    document.body.append(root)

    const field = root.querySelector('input[name="tag"]')
    if (!(field instanceof HTMLInputElement)) {
      throw new Error("tag field missing")
    }
    field.value = "voice"
    field.dispatchEvent(new Event("input", { bubbles: true }))
    const publishBtn = [...root.querySelectorAll("button")].find((button) =>
      button.textContent?.includes("Make public"),
    )
    publishBtn?.click()

    await waitFor(() =>
      [...root.querySelectorAll("button")].find(
        (button) =>
          button.textContent?.includes("Update link") && !button.disabled,
      ),
    )
    expect(published).toEqual(["voice"])
    const copyBtn = [...root.querySelectorAll("button")].find((button) =>
      button.textContent?.includes("Copy link"),
    )
    expect(copyBtn instanceof HTMLButtonElement && copyBtn.disabled).toBe(false)
    root.remove()
  })
})
