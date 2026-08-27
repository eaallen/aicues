import { describe, expect, it } from "vitest"
import { createAccountPromptStore } from "./account-store.js"

describe("createAccountPromptStore", () => {
  /**
   * Private docs keyed by prompt id plus public docs keyed by tag.
   */
  function memoryBackends() {
    /** @type {Map<string, object>} */
    const privateDocs = new Map()
    /** @type {Map<string, object>} */
    const publicDocs = new Map()
    return {
      privateDocs,
      publicDocs,
      privateBackend: {
        async listDocs() {
          return [...privateDocs.values()]
        },
        async writeDoc(prompt) {
          privateDocs.set(prompt.id, { ...prompt })
        },
        async deleteDoc(id) {
          privateDocs.delete(id)
        },
      },
      publicBackend: {
        async listDocs() {
          return [...publicDocs.values()]
        },
        async getDoc(tag) {
          return publicDocs.has(tag) ? { ...publicDocs.get(tag) } : null
        },
        async writeDoc(prompt) {
          publicDocs.set(prompt.tag, { ...prompt })
        },
        async deleteDoc(tag) {
          publicDocs.delete(tag)
        },
      },
    }
  }

  it("publishes a private prompt under a tag", async () => {
    const { privateBackend, publicBackend, publicDocs } = memoryBackends()
    const store = createAccountPromptStore(privateBackend, publicBackend, "user-1")
    const created = store.create({ title: "Human", body: "keep it short" })

    const tag = await store.publish(created.id, "Human Voice")
    await store.flush()

    expect(tag).toBe("human-voice")
    expect(store.get(created.id)?.publicTag).toBe("human-voice")
    expect(publicDocs.get("human-voice")?.body).toBe("keep it short")
  })

  it("mirrors edits to the public copy and unpublishes on request", async () => {
    const { privateBackend, publicBackend, publicDocs } = memoryBackends()
    const store = createAccountPromptStore(privateBackend, publicBackend, "user-1")
    const created = store.create({ title: "Human", body: "keep it short" })
    await store.publish(created.id, "voice")

    store.update(created.id, { body: "even shorter" })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(publicDocs.get("voice")?.body).toBe("even shorter")

    expect(await store.unpublish(created.id)).toBe(true)
    await store.flush()
    expect(store.get(created.id)?.publicTag).toBeUndefined()
    expect(publicDocs.has("voice")).toBe(false)
  })

  it("removes the public copy when the private prompt is deleted", async () => {
    const { privateBackend, publicBackend, publicDocs } = memoryBackends()
    const store = createAccountPromptStore(privateBackend, publicBackend, "user-1")
    const created = store.create({ title: "Human", body: "keep it short" })
    await store.publish(created.id, "voice")

    store.remove(created.id)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(publicDocs.has("voice")).toBe(false)
  })
})
