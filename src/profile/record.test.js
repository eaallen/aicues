import { describe, expect, it } from "vitest"
import {
  TAG_MAX_LENGTH,
  TAG_MIN_LENGTH,
  buildProfile,
  normalizeTag,
  validateTag,
} from "./record.js"

describe("normalizeTag", () => {
  it("trims and lowercases raw input", () => {
    expect(normalizeTag("  Eli-Dev  ")).toBe("eli-dev")
    expect(normalizeTag("ABC123")).toBe("abc123")
  })
})

describe("validateTag", () => {
  it("accepts valid tags", () => {
    expect(validateTag("eli-dev")).toBeNull()
    expect(validateTag("abc123")).toBeNull()
    expect(validateTag("a1b")).toBeNull()
  })

  it("rejects tags shorter than minimum length", () => {
    expect(validateTag("ab")).toMatch(/3/)
  })

  it("rejects tags longer than maximum length", () => {
    expect(validateTag("a".repeat(TAG_MAX_LENGTH + 1))).toMatch(/32/)
  })

  it("rejects invalid characters", () => {
    expect(validateTag("eli_dev")).not.toBeNull()
    expect(validateTag("eli dev")).not.toBeNull()
  })

  it("rejects tags not starting or ending with alphanumeric", () => {
    expect(validateTag("-eli-dev")).not.toBeNull()
    expect(validateTag("eli-dev-")).not.toBeNull()
  })
})

describe("buildProfile", () => {
  it("builds a profile with tag and updatedAt", () => {
    const profile = buildProfile({ tag: "eli-dev", updatedAt: 1000 })
    expect(profile).toEqual({ tag: "eli-dev", updatedAt: 1000 })
  })

  it("defaults updatedAt when omitted", () => {
    const before = Date.now()
    const profile = buildProfile({ tag: "eli-dev" })
    expect(profile.tag).toBe("eli-dev")
    expect(profile.updatedAt).toBeGreaterThanOrEqual(before)
  })
})

describe("tag length constants", () => {
  it("exports expected min and max lengths", () => {
    expect(TAG_MIN_LENGTH).toBe(3)
    expect(TAG_MAX_LENGTH).toBe(32)
  })
})
