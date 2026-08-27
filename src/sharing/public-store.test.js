import { beforeEach, describe, expect, it, vi } from "vitest"
import { createPublicPromptStore } from "./public-store.js"

const getDoc = vi.fn()
const getDocs = vi.fn()
const collection = vi.fn()
const doc = vi.fn()
const query = vi.fn()
const where = vi.fn()

vi.mock("firebase/firestore", () => ({
  collection: (...args) => collection(...args),
  doc: (...args) => doc(...args),
  getDoc: (...args) => getDoc(...args),
  getDocs: (...args) => getDocs(...args),
  query: (...args) => query(...args),
  where: (...args) => where(...args),
}))

describe("createPublicPromptStore", () => {
  const db = /** @type {import("firebase/firestore").Firestore} */ ({ id: "test-db" })

  beforeEach(() => {
    vi.clearAllMocks()
    collection.mockImplementation((_db, ...path) => ({ path: path.join("/") }))
    doc.mockImplementation((_db, ...path) => ({ path: path.join("/") }))
    query.mockImplementation((ref, ...constraints) => ({ ref, constraints }))
    where.mockImplementation((field, op, value) => ({ field, op, value }))
  })

  /**
   * Builds a Firestore document snapshot stand-in.
   * @param {boolean} exists
   * @param {object} [data]
   * @param {string} [id]
   */
  function snap(exists, data = {}, id = "doc-id") {
    return {
      exists: () => exists,
      id,
      data: () => data,
    }
  }

  it("returns null for an unknown tag", async () => {
    getDoc.mockResolvedValue(snap(false))
    const store = createPublicPromptStore(db)

    expect(await store.listByTag("missing")).toBeNull()
    expect(await store.getPublic("missing", "p1")).toBeNull()
  })

  it("lists public prompts sorted by updatedAt desc", async () => {
    getDoc
      .mockResolvedValueOnce(snap(true, { uid: "uid-1" }))
      .mockResolvedValueOnce(snap(true, { tag: "eli-dev" }))
    getDocs.mockResolvedValueOnce({
      docs: [
        {
          id: "older",
          data: () => ({
            title: "Older",
            body: "old",
            createdAt: 1,
            updatedAt: 10,
            isPublic: true,
          }),
        },
        {
          id: "newer",
          data: () => ({
            title: "Newer",
            body: "new",
            createdAt: 2,
            updatedAt: 20,
            isPublic: true,
          }),
        },
      ],
    })

    const store = createPublicPromptStore(db)
    const result = await store.listByTag("eli-dev")

    expect(result).toEqual({
      profile: { tag: "eli-dev" },
      prompts: [
        {
          id: "newer",
          title: "Newer",
          body: "new",
          createdAt: 2,
          updatedAt: 20,
          isPublic: true,
        },
        {
          id: "older",
          title: "Older",
          body: "old",
          createdAt: 1,
          updatedAt: 10,
          isPublic: true,
        },
      ],
    })
    expect(where).toHaveBeenCalledWith("isPublic", "==", true)
  })

  it("getPublic returns a public prompt or null", async () => {
    getDoc
      .mockResolvedValueOnce(snap(true, { uid: "uid-1" }))
      .mockResolvedValueOnce(
        snap(true, {
          title: "Shared",
          body: "hello",
          createdAt: 1,
          updatedAt: 2,
          isPublic: true,
        }),
        "prompt-1",
      )

    const store = createPublicPromptStore(db)
    const prompt = await store.getPublic("eli-dev", "prompt-1")

    expect(prompt).toEqual({
      id: "prompt-1",
      title: "Shared",
      body: "hello",
      createdAt: 1,
      updatedAt: 2,
      isPublic: true,
    })
  })

  it("getPublic returns null when prompt is not public", async () => {
    getDoc
      .mockResolvedValueOnce(snap(true, { uid: "uid-1" }))
      .mockResolvedValueOnce(
        snap(true, {
          title: "Private",
          body: "secret",
          createdAt: 1,
          updatedAt: 2,
          isPublic: false,
        }),
        "prompt-1",
      )

    const store = createPublicPromptStore(db)
    expect(await store.getPublic("eli-dev", "prompt-1")).toBeNull()
  })
})
