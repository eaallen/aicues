import { beforeEach, describe, expect, it, vi } from "vitest"

/** @type {Map<string, object | undefined>} */
let docs = new Map()

vi.mock("firebase/firestore", () => ({
  doc: (_db, ...segments) => ({ path: segments.join("/") }),
  getDoc: vi.fn(async (ref) => ({
    exists: () => docs.has(ref.path),
    data: () => docs.get(ref.path),
  })),
  setDoc: vi.fn(async (ref, data) => {
    docs.set(ref.path, { ...data })
  }),
  deleteDoc: vi.fn(async (ref) => {
    docs.delete(ref.path)
  }),
  runTransaction: vi.fn(async (_db, fn) => {
    const tx = {
      get: async (ref) => ({
        exists: () => docs.has(ref.path),
        data: () => docs.get(ref.path),
      }),
      set: (ref, data) => {
        docs.set(ref.path, { ...data })
      },
      delete: (ref) => {
        docs.delete(ref.path)
      },
    }
    return fn(tx)
  }),
}))

import { createProfileStore } from "./firestore-store.js"

describe("createProfileStore", () => {
  const uid = "user-1"
  const db = /** @type {import("firebase/firestore").Firestore} */ ({})

  beforeEach(() => {
    docs = new Map()
  })

  it("returns null when no profile exists", async () => {
    const store = createProfileStore(db, uid)
    expect(await store.get()).toBeNull()
  })

  it("creates profile and tag index on first setTag", async () => {
    const store = createProfileStore(db, uid)
    const profile = await store.setTag("  Eli-Dev  ")

    expect(profile).toEqual({
      tag: "eli-dev",
      updatedAt: expect.any(Number),
    })
    expect(docs.get("cueUsers/user-1")).toEqual({
      tag: "eli-dev",
      updatedAt: profile.updatedAt,
    })
    expect(docs.get("userTags/eli-dev")).toEqual({ uid: "user-1" })
    expect(await store.get()).toEqual(profile)
  })

  it("never writes email to Firestore", async () => {
    const store = createProfileStore(db, uid)
    await store.setTag("eli-dev")
    const stored = docs.get("cueUsers/user-1")
    expect(stored).toBeDefined()
    expect(stored).not.toHaveProperty("email")
    expect(Object.keys(stored ?? {})).toEqual(["tag", "updatedAt"])
  })

  it("fails when another user owns the tag", async () => {
    docs.set("userTags/taken", { uid: "other-user" })
    const store = createProfileStore(db, uid)
    await expect(store.setTag("taken")).rejects.toThrow(/taken|available/i)
    expect(docs.has("cueUsers/user-1")).toBe(false)
  })

  it("isTagAvailable returns false when another uid owns the tag", async () => {
    docs.set("userTags/taken", { uid: "other-user" })
    const store = createProfileStore(db, uid)
    expect(await store.isTagAvailable("taken")).toBe(false)
  })

  it("isTagAvailable returns true for an unclaimed tag", async () => {
    const store = createProfileStore(db, uid)
    expect(await store.isTagAvailable("free-tag")).toBe(true)
  })

  it("isTagAvailable returns true when the current user already owns the tag", async () => {
    docs.set("userTags/mine", { uid: "user-1" })
    const store = createProfileStore(db, uid)
    expect(await store.isTagAvailable("mine")).toBe(true)
  })

  it("changes tag by deleting old index and creating new one", async () => {
    docs.set("cueUsers/user-1", { tag: "old-tag", updatedAt: 1 })
    docs.set("userTags/old-tag", { uid: "user-1" })
    const store = createProfileStore(db, uid)
    const profile = await store.setTag("new-tag")

    expect(profile.tag).toBe("new-tag")
    expect(docs.get("cueUsers/user-1")?.tag).toBe("new-tag")
    expect(docs.has("userTags/old-tag")).toBe(false)
    expect(docs.get("userTags/new-tag")).toEqual({ uid: "user-1" })
  })

  it("rejects invalid tags before writing", async () => {
    const store = createProfileStore(db, uid)
    await expect(store.setTag("ab")).rejects.toThrow(/3/)
    expect(docs.size).toBe(0)
  })
})
