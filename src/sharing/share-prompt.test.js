import { describe, expect, it, vi } from "vitest"
import { makePromptPrivate, sharePrompt } from "./share-prompt.js"

describe("sharePrompt", () => {
  /**
   * Builds mock stores for share flow tests.
   * @param {{
   *   tag?: string,
   *   prompt?: object,
   * }} [options]
   */
  function mocks(options = {}) {
    const prompt = options.prompt ?? {
      id: "p1",
      title: "Hello",
      body: "world",
      createdAt: 1,
      updatedAt: 1,
      isPublic: false,
    }
    const profileStore = {
      get: vi.fn(async () =>
        options.tag ? { tag: options.tag, updatedAt: 1 } : null,
      ),
      setTag: vi.fn(async (tag) => ({ tag, updatedAt: 2 })),
    }
    const promptStore = {
      get: vi.fn(() => prompt),
      update: vi.fn((id, patch) => ({ ...prompt, ...patch, updatedAt: 99 })),
    }
    return { profileStore, promptStore, prompt }
  }

  it("publishes when user has a tag and confirms", async () => {
    const { profileStore, promptStore } = mocks({ tag: "eli" })
    const confirm = vi.fn(() => true)

    const result = await sharePrompt({
      promptId: "p1",
      promptStore,
      profileStore,
      confirm,
    })

    expect(result).toEqual({ ok: true, tag: "eli" })
    expect(profileStore.get).toHaveBeenCalledOnce()
    expect(profileStore.setTag).not.toHaveBeenCalled()
    expect(confirm).toHaveBeenCalledWith("Make this prompt public?")
    expect(promptStore.update).toHaveBeenCalledWith("p1", { isPublic: true })
  })

  it("prompts for a tag when profile get fails, then publishes after setTag", async () => {
    const { profileStore, promptStore } = mocks()
    profileStore.get.mockRejectedValueOnce(
      new Error("Missing or insufficient permissions."),
    )
    const confirm = vi.fn(() => true)
    const promptForTag = vi.fn(() => "my-tag")

    const result = await sharePrompt({
      promptId: "p1",
      promptStore,
      profileStore,
      confirm,
      promptForTag,
    })

    expect(result).toEqual({ ok: true, tag: "my-tag" })
    expect(profileStore.setTag).toHaveBeenCalledWith("my-tag")
    expect(promptStore.update).toHaveBeenCalledWith("p1", { isPublic: true })
  })

  it("prompts for tag when missing, saves it, then publishes", async () => {
    const { profileStore, promptStore } = mocks()
    const confirm = vi.fn(() => true)
    const promptForTag = vi.fn(() => "my-tag")

    const result = await sharePrompt({
      promptId: "p1",
      promptStore,
      profileStore,
      confirm,
      promptForTag,
    })

    expect(result).toEqual({ ok: true, tag: "my-tag" })
    expect(promptForTag).toHaveBeenCalled()
    expect(profileStore.setTag).toHaveBeenCalledWith("my-tag")
    expect(promptStore.update).toHaveBeenCalledWith("p1", { isPublic: true })
  })

  it("re-prompts when tag is invalid", async () => {
    const { profileStore, promptStore } = mocks()
    const confirm = vi.fn(() => true)
    const promptForTag = vi
      .fn()
      .mockReturnValueOnce("-bad-")
      .mockReturnValueOnce("good-tag")

    const result = await sharePrompt({
      promptId: "p1",
      promptStore,
      profileStore,
      confirm,
      promptForTag,
    })

    expect(result).toEqual({ ok: true, tag: "good-tag" })
    expect(promptForTag).toHaveBeenCalledTimes(2)
    expect(profileStore.setTag).toHaveBeenCalledWith("good-tag")
  })

  it("leaves prompt unchanged when confirm is declined", async () => {
    const { profileStore, promptStore } = mocks({ tag: "eli" })
    const confirm = vi.fn(() => false)

    const result = await sharePrompt({
      promptId: "p1",
      promptStore,
      profileStore,
      confirm,
    })

    expect(result).toEqual({ ok: false, reason: "cancelled" })
    expect(promptStore.update).not.toHaveBeenCalled()
  })

  it("leaves prompt unchanged when tag prompt is cancelled", async () => {
    const { profileStore, promptStore } = mocks()
    const promptForTag = vi.fn(() => null)

    const result = await sharePrompt({
      promptId: "p1",
      promptStore,
      profileStore,
      confirm: vi.fn(() => true),
      promptForTag,
    })

    expect(result).toEqual({ ok: false, reason: "cancelled" })
    expect(profileStore.setTag).not.toHaveBeenCalled()
    expect(promptStore.update).not.toHaveBeenCalled()
  })
})

describe("makePromptPrivate", () => {
  it("unpublishes when confirmed", async () => {
    const promptStore = {
      update: vi.fn(() => ({ id: "p1", isPublic: false })),
    }
    const confirm = vi.fn(() => true)

    const result = await makePromptPrivate({
      promptId: "p1",
      promptStore,
      confirm,
    })

    expect(result).toEqual({ ok: true })
    expect(confirm).toHaveBeenCalledWith("Make this prompt private?")
    expect(promptStore.update).toHaveBeenCalledWith("p1", { isPublic: false })
  })

  it("leaves prompt unchanged when confirm is declined", async () => {
    const promptStore = {
      update: vi.fn(),
    }

    const result = await makePromptPrivate({
      promptId: "p1",
      promptStore,
      confirm: vi.fn(() => false),
    })

    expect(result).toEqual({ ok: false, reason: "cancelled" })
    expect(promptStore.update).not.toHaveBeenCalled()
  })
})
