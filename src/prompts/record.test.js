import { describe, expect, it } from "vitest"
import {
  applyVisibilityPatch,
  fromFirestorePrompt,
  isPublicPrompt,
  toFirestorePrompt,
} from "./record.js"

describe("isPublicPrompt", () => {
  it("returns false when isPublic is missing", () => {
    expect(isPublicPrompt({})).toBe(false)
    expect(isPublicPrompt({ title: "T" })).toBe(false)
  })

  it("returns false when isPublic is false", () => {
    expect(isPublicPrompt({ isPublic: false })).toBe(false)
  })

  it("returns true when isPublic is true", () => {
    expect(isPublicPrompt({ isPublic: true })).toBe(true)
  })
})

describe("firestore visibility mapping", () => {
  it("includes isPublic in toFirestorePrompt when true", () => {
    expect(
      toFirestorePrompt({
        id: "abc",
        title: "T",
        body: "B",
        createdAt: 1,
        updatedAt: 2,
        isPublic: true,
      }),
    ).toEqual({
      title: "T",
      body: "B",
      createdAt: 1,
      updatedAt: 2,
      isPublic: true,
    })
  })

  it("omits isPublic from toFirestorePrompt when false or missing", () => {
    expect(
      toFirestorePrompt({
        id: "abc",
        title: "T",
        body: "B",
        createdAt: 1,
        updatedAt: 2,
        isPublic: false,
      }),
    ).toEqual({
      title: "T",
      body: "B",
      createdAt: 1,
      updatedAt: 2,
    })

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

  it("defaults isPublic to false in fromFirestorePrompt", () => {
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

  it("reads isPublic true from Firestore data", () => {
    expect(
      fromFirestorePrompt("abc", {
        title: "T",
        body: "B",
        createdAt: 1,
        updatedAt: 2,
        isPublic: true,
      }).isPublic,
    ).toBe(true)
  })
})

describe("applyVisibilityPatch", () => {
  const base = {
    id: "p1",
    title: "T",
    body: "B",
    createdAt: 100,
    updatedAt: 100,
  }

  it("sets isPublic true and bumps updatedAt", () => {
    expect(applyVisibilityPatch(base, true, 200)).toEqual({
      id: "p1",
      title: "T",
      body: "B",
      createdAt: 100,
      updatedAt: 200,
      isPublic: true,
    })
  })

  it("clears isPublic when making private", () => {
    const publicPrompt = { ...base, isPublic: true, updatedAt: 150 }
    expect(applyVisibilityPatch(publicPrompt, false, 300)).toEqual({
      id: "p1",
      title: "T",
      body: "B",
      createdAt: 100,
      updatedAt: 300,
      isPublic: false,
    })
  })
})
