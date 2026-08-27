import { describe, expect, it } from "vitest"
import { createFirestorePromptStore } from "./firestore-store.js"
import { fromFirestorePrompt, toFirestorePrompt } from "./record.js"

describe("createFirestorePromptStore", () => {
  /**
   * Builds a store over an in-memory document map.
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
        async writeDoc(prompt) {
          docs.set(prompt.id, { ...prompt })
        },
        async deleteDoc(id) {
          docs.delete(id)
        },
      },
    }
  }

  it("creates, lists, updates, and removes through the cache", async () => {
    const { docs, backend } = memoryBackend()
    const store = createFirestorePromptStore(backend)

    const created = store.create({ title: "Pie", body: "I like pie" })
    expect(store.list()).toEqual([created])
    await store.flush()
    expect(docs.get(created.id)?.title).toBe("Pie")

    const updated = store.update(created.id, { body: "more pie" })
    expect(updated?.body).toBe("more pie")
    await store.flush()
    expect(docs.get(created.id)?.body).toBe("more pie")

    expect(store.remove(created.id)).toBe(true)
    expect(store.list()).toEqual([])
    await store.flush()
    expect(docs.has(created.id)).toBe(false)
  })

  it("load replaces the cache from the backend", async () => {
    const { backend } = memoryBackend()
    await backend.writeDoc({
      id: "remote",
      title: "Remote",
      body: "cloud",
      createdAt: 1,
      updatedAt: 2,
    })
    const store = createFirestorePromptStore(backend)
    await store.load()
    expect(store.get("remote")?.title).toBe("Remote")
  })

  it("returns null/false for unknown ids", async () => {
    const store = createFirestorePromptStore(memoryBackend().backend)
    expect(store.get("missing")).toBeNull()
    expect(store.update("missing", { title: "Nope" })).toBeNull()
    expect(store.remove("missing")).toBe(false)
    await store.flush()
  })

  it("persists isPublic through update", async () => {
    const { docs, backend } = memoryBackend()
    const store = createFirestorePromptStore(backend)
    const created = store.create({ title: "Share me", body: "body" })

    const published = store.update(created.id, { isPublic: true })
    expect(published?.isPublic).toBe(true)
    await store.flush()
    expect(docs.get(created.id)?.isPublic).toBe(true)

    const unpublished = store.update(created.id, { isPublic: false })
    expect(unpublished?.isPublic).toBe(false)
    await store.flush()
    expect(docs.get(created.id)?.isPublic).toBeUndefined()
  })
})

describe("firestore prompt field mapping", () => {
  it("omits id from the stored document", () => {
    expect(
      toFirestorePrompt({
        id: "abc",
        title: "T",
        body: "B",
        createdAt: 1,
        updatedAt: 2,
      }),
    ).toEqual({
      title: "T",
      body: "B",
      createdAt: 1,
      updatedAt: 2,
    })
  })

  it("restores id from the document path", () => {
    expect(
      fromFirestorePrompt("abc", {
        title: "T",
        body: "B",
        createdAt: 1,
        updatedAt: 2,
      }),
    ).toEqual({
      id: "abc",
      title: "T",
      body: "B",
      createdAt: 1,
      updatedAt: 2,
      isPublic: false,
    })
  })
})
