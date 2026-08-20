import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createMemoryStorage } from "../test/memory-storage.js"
import { PROMPTS_KEY, createPromptStore } from "./store.js"

describe("createPromptStore", () => {
  /** @type {ReturnType<typeof createMemoryStorage>} */
  let storage
  /** @type {ReturnType<typeof createPromptStore>} */
  let store

  beforeEach(() => {
    storage = createMemoryStorage()
    store = createPromptStore(storage)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns an empty list when storage is empty", () => {
    expect(store.list()).toEqual([])
  })

  it("creates a prompt with trimmed title and body", () => {
    const prompt = store.create({ title: "  Hello  ", body: "  world  " })

    expect(prompt.title).toBe("Hello")
    expect(prompt.body).toBe("world")
    expect(prompt.id).toEqual(expect.any(String))
    expect(prompt.id.length).toBeGreaterThan(0)
    expect(prompt.createdAt).toBe(prompt.updatedAt)
    expect(typeof prompt.createdAt).toBe("number")
    expect(store.get(prompt.id)).toEqual(prompt)
  })

  it("derives title from the first line of body when title is omitted", () => {
    const prompt = store.create({
      body: "  First line  \nSecond line",
    })

    expect(prompt.title).toBe("First line")
    expect(prompt.body).toBe("First line  \nSecond line".trim())
  })

  it('uses title "Untitled" when create input is empty', () => {
    const prompt = store.create({})

    expect(prompt.title).toBe("Untitled")
    expect(prompt.body).toBe("")
  })

  it("truncates a long first-line title to 48 characters plus ellipsis", () => {
    const firstLine = "a".repeat(50)
    const prompt = store.create({ body: `${firstLine}\nmore` })

    expect(prompt.title).toBe(`${"a".repeat(48)}…`)
  })

  it("does not append ellipsis when the first line is exactly 48 characters", () => {
    const firstLine = "b".repeat(48)
    const prompt = store.create({ body: firstLine })

    expect(prompt.title).toBe(firstLine)
  })

  it("lists prompts newest updatedAt first", () => {
    storage.setItem(
      PROMPTS_KEY,
      JSON.stringify([
        {
          id: "old",
          title: "Old",
          body: "",
          createdAt: 1,
          updatedAt: 10,
        },
        {
          id: "newest",
          title: "Newest",
          body: "",
          createdAt: 2,
          updatedAt: 30,
        },
        {
          id: "middle",
          title: "Middle",
          body: "",
          createdAt: 3,
          updatedAt: 20,
        },
      ]),
    )

    expect(store.list().map((prompt) => prompt.id)).toEqual([
      "newest",
      "middle",
      "old",
    ])
  })

  it("returns null from get for an unknown id", () => {
    expect(store.get("missing")).toBeNull()
  })

  it("returns null from update for an unknown id and does not write", () => {
    expect(store.update("missing", { title: "Nope" })).toBeNull()
    expect(storage.getItem(PROMPTS_KEY)).toBeNull()
    expect(store.list()).toEqual([])
  })

  it("updates title and body and bumps updatedAt", () => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000)

    const created = store.create({ title: "Old", body: "before" })

    vi.setSystemTime(2_000)
    const updated = store.update(created.id, {
      title: "  New  ",
      body: "  after  ",
    })

    expect(updated).toEqual({
      id: created.id,
      title: "New",
      body: "after",
      createdAt: 1_000,
      updatedAt: 2_000,
    })
    expect(store.get(created.id)).toEqual(updated)
  })

  it("re-derives title from body when update would leave title empty", () => {
    const created = store.create({
      title: "Keep",
      body: "Derived title\nrest",
    })

    const updated = store.update(created.id, { title: "   " })

    expect(updated).not.toBeNull()
    expect(updated?.title).toBe("Derived title")
    expect(updated?.body).toBe("Derived title\nrest")
    expect(updated?.id).toBe(created.id)
    expect(updated?.createdAt).toBe(created.createdAt)
  })

  it("re-derives title from the patched body when title is cleared", () => {
    const created = store.create({ title: "Keep", body: "old body" })

    const updated = store.update(created.id, {
      title: "",
      body: "Fresh line\nmore",
    })

    expect(updated?.title).toBe("Fresh line")
    expect(updated?.body).toBe("Fresh line\nmore")
  })

  it("removes an existing prompt and reports missing ids as false", () => {
    const prompt = store.create({ title: "Gone" })

    expect(store.remove(prompt.id)).toBe(true)
    expect(store.get(prompt.id)).toBeNull()
    expect(store.list()).toEqual([])
    expect(store.remove(prompt.id)).toBe(false)
  })

  it("returns an empty list without throwing when storage JSON is corrupt", () => {
    storage.setItem(PROMPTS_KEY, "{not-json")

    expect(store.list()).toEqual([])
  })

  it("returns an empty list when stored JSON is not an array", () => {
    storage.setItem(PROMPTS_KEY, JSON.stringify({ id: "x", title: "Nope" }))

    expect(store.list()).toEqual([])
  })

  it("skips records that are missing a non-empty string id", () => {
    storage.setItem(
      PROMPTS_KEY,
      JSON.stringify([
        { title: "no id", body: "", createdAt: 1, updatedAt: 1 },
        { id: "", title: "empty id", body: "", createdAt: 2, updatedAt: 2 },
        {
          id: "ok",
          title: "Ok",
          body: "kept",
          createdAt: 3,
          updatedAt: 3,
        },
        "string-record",
        null,
        42,
        ["array"],
      ]),
    )

    expect(store.list()).toEqual([
      {
        id: "ok",
        title: "Ok",
        body: "kept",
        createdAt: 3,
        updatedAt: 3,
      },
    ])
  })

  it("round-trips prompts through the storage JSON array", () => {
    const created = store.create({ title: "Alpha", body: "bravo" })
    const raw = storage.getItem(PROMPTS_KEY)

    expect(raw).toEqual(expect.any(String))
    expect(JSON.parse(/** @type {string} */ (raw))).toEqual([created])

    const reopened = createPromptStore(storage)
    expect(reopened.list()).toEqual([created])
    expect(reopened.get(created.id)).toEqual(created)
  })

  it("uses PROMPTS_KEY as the default storage key", () => {
    expect(PROMPTS_KEY).toBe("cue.prompts")
    store.create({ title: "Keyed" })
    expect(storage.getItem(PROMPTS_KEY)).toEqual(expect.any(String))
  })
})
