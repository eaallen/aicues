import { describe, expect, it } from "vitest"
import {
  PUBLIC_TAG_MAX_LENGTH,
  TagTakenError,
  normalizePublicTag,
  publicWalletPath,
  publicWalletUrl,
  validatePublicTag,
} from "./tag.js"

describe("normalizePublicTag", () => {
  it("lowercases, hyphenates, and trims punctuation", () => {
    expect(normalizePublicTag("  Hello World!  ")).toBe("hello-world")
    expect(normalizePublicTag("Keep_it--simple")).toBe("keep-it-simple")
    expect(normalizePublicTag("---Hi---")).toBe("hi")
  })
})

describe("validatePublicTag", () => {
  it("accepts a simple tag", () => {
    expect(validatePublicTag("human-voice")).toEqual({ ok: true })
  })

  it("rejects empty, reserved, and malformed tags", () => {
    expect(validatePublicTag("").ok).toBe(false)
    expect(validatePublicTag("a").ok).toBe(false)
    expect(validatePublicTag("app").error).toMatch(/reserved/i)
    expect(validatePublicTag("w").error).toMatch(/reserved/i)
    expect(validatePublicTag("-hello").ok).toBe(false)
    expect(validatePublicTag("hello-").ok).toBe(false)
    expect(validatePublicTag("1abc").ok).toBe(false)
    expect(validatePublicTag("a".repeat(PUBLIC_TAG_MAX_LENGTH + 1)).ok).toBe(
      false,
    )
  })
})

describe("public wallet URLs", () => {
  it("builds a path and absolute URL", () => {
    expect(publicWalletPath()).toBe("/w")
    expect(publicWalletPath("human-voice")).toBe("/w/human-voice")
    expect(publicWalletUrl("human-voice", "https://aicues.web.app")).toBe(
      "https://aicues.web.app/w/human-voice",
    )
  })
})

describe("TagTakenError", () => {
  it("has a stable name and message", () => {
    const error = new TagTakenError()
    expect(error.name).toBe("TagTakenError")
    expect(error.message).toMatch(/taken/i)
  })
})
