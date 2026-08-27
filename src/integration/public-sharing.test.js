import { describe, expect, it } from "vitest"
import { isPublicPrompt } from "../prompts/record.js"
import { parseRoute } from "../router.js"
import { sharePrompt, makePromptPrivate } from "../sharing/share-prompt.js"

describe("public sharing integration", () => {
  it("routes public wallet URLs with optional prompt id", () => {
    expect(parseRoute("/w/eli-dev")).toEqual({
      kind: "public-wallet",
      tag: "eli-dev",
    })
    expect(parseRoute("/w/eli-dev/prompt-abc")).toEqual({
      kind: "public-wallet",
      tag: "eli-dev",
      promptId: "prompt-abc",
    })
    expect(parseRoute("/app/profile")).toEqual({ kind: "app-profile" })
  })

  it("share then unpublish toggles isPublic on the prompt store", async () => {
    const prompts = new Map([
      ["p1", { id: "p1", title: "T", body: "B", isPublic: false }],
    ])
    const promptStore = {
      get: (id) => prompts.get(id) ?? null,
      update: (id, patch) => {
        const current = prompts.get(id)
        if (!current) {
          return null
        }
        const next = { ...current, ...patch }
        prompts.set(id, next)
        return next
      },
    }
    const profileStore = {
      get: async () => ({ tag: "eli-dev" }),
      setTag: async (tag) => ({ tag, updatedAt: 1 }),
    }

    const shareResult = await sharePrompt({
      promptId: "p1",
      promptStore,
      profileStore,
      confirm: () => true,
    })
    expect(shareResult.ok).toBe(true)
    expect(isPublicPrompt(prompts.get("p1"))).toBe(true)

    const privateResult = await makePromptPrivate({
      promptId: "p1",
      promptStore,
      confirm: () => true,
    })
    expect(privateResult.ok).toBe(true)
    expect(isPublicPrompt(prompts.get("p1"))).toBe(false)
  })
})
