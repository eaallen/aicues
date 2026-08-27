import { describe, expect, it } from "vitest"
import {
  createPublicPromptStore,
  fromPublicPrompt,
  toPublicPrompt,
} from "./public-store.js"
import { TagTakenError } from "./tag.js"

describe("createPublicPromptStore", () => {
  /**
   * Builds a store over an in-memory document map keyed by tag.
   */
  function memoryBackend() {
    /** @type {Map<string, object>} */
    const docs = new Map()
    return {
      docs,
      backend: {
        async listDocs() {
          return [...docs.values()]
        },
        async getDoc(tag) {
          return docs.has(tag) ? { ...docs.get(tag) } : null
        },
        async writeDoc(prompt) {
          docs.set(prompt.tag, { ...prompt })
        },
        async deleteDoc(tag) {
          docs.delete(tag)
        },
      },
    }
  }

  it("publishes, lists, and looks up by tag", async () => {
    const { backend } = memoryBackend()
    const store = createPublicPromptStore(backend)
    const published = await store.publish({
      tag: "Human Voice",
      ownerUid: "user-1",
      prompt: {
        id: "p1",
        title: "Human",
        body: "keep it short",
        createdAt: 1,
        updatedAt: 2,
      },
    })

    expect(published.tag).toBe("human-voice")
    expect(published.promptId).toBe("p1")
    expect((await store.get("human-voice"))?.title).toBe("Human")
    expect((await store.list()).map((prompt) => prompt.tag)).toEqual([
      "human-voice",
    ])
  })

  it("rejects a tag owned by someone else", async () => {
    const { backend } = memoryBackend()
    const store = createPublicPromptStore(backend)
    await store.publish({
      tag: "taken",
      ownerUid: "user-1",
      prompt: { id: "p1", title: "A", body: "", createdAt: 1, updatedAt: 1 },
    })

    await expect(
      store.publish({
        tag: "taken",
        ownerUid: "user-2",
        prompt: { id: "p2", title: "B", body: "", createdAt: 1, updatedAt: 1 },
      }),
    ).rejects.toBeInstanceOf(TagTakenError)
  })

  it("lets the owner update the same prompt and change tags", async () => {
    const { backend, docs } = memoryBackend()
    const store = createPublicPromptStore(backend)
    await store.publish({
      tag: "old-tag",
      ownerUid: "user-1",
      prompt: { id: "p1", title: "A", body: "one", createdAt: 1, updatedAt: 1 },
    })
    await store.publish({
      tag: "new-tag",
      ownerUid: "user-1",
      previousTag: "old-tag",
      prompt: { id: "p1", title: "A", body: "two", createdAt: 1, updatedAt: 2 },
    })

    expect(docs.has("old-tag")).toBe(false)
    expect(docs.get("new-tag")?.body).toBe("two")
  })

  it("syncs title and body for the owner only", async () => {
    const { backend } = memoryBackend()
    const store = createPublicPromptStore(backend)
    await store.publish({
      tag: "voice",
      ownerUid: "user-1",
      prompt: { id: "p1", title: "A", body: "one", createdAt: 1, updatedAt: 1 },
    })

    const synced = await store.sync(
      "voice",
      { id: "p1", title: "B", body: "two", updatedAt: 9 },
      "user-1",
    )
    expect(synced?.title).toBe("B")
    expect(await store.sync("voice", { id: "p1", title: "Nope" }, "user-2")).toBeNull()
  })

  it("unpublishes only for the owner", async () => {
    const { backend } = memoryBackend()
    const store = createPublicPromptStore(backend)
    await store.publish({
      tag: "voice",
      ownerUid: "user-1",
      prompt: { id: "p1", title: "A", body: "", createdAt: 1, updatedAt: 1 },
    })

    await expect(store.unpublish("voice", "user-2")).rejects.toThrow(
      /cannot unpublish/i,
    )
    expect(await store.unpublish("voice", "user-1")).toBe(true)
    expect(await store.get("voice")).toBeNull()
  })
})

describe("public prompt field mapping", () => {
  it("stores tag, owner, and prompt id", () => {
    expect(
      toPublicPrompt({
        tag: "voice",
        promptId: "p1",
        ownerUid: "u1",
        title: "T",
        body: "B",
        createdAt: 1,
        updatedAt: 2,
      }),
    ).toEqual({
      tag: "voice",
      promptId: "p1",
      ownerUid: "u1",
      title: "T",
      body: "B",
      createdAt: 1,
      updatedAt: 2,
    })
  })

  it("restores tag from the document path", () => {
    expect(
      fromPublicPrompt("voice", {
        promptId: "p1",
        ownerUid: "u1",
        title: "T",
        body: "B",
        createdAt: 1,
        updatedAt: 2,
      }),
    ).toEqual({
      tag: "voice",
      promptId: "p1",
      ownerUid: "u1",
      title: "T",
      body: "B",
      createdAt: 1,
      updatedAt: 2,
    })
  })
})
