import { describe, expect, it } from "vitest"
import { isWalletSpaPath, normalizePath, routeFromPath } from "./routes.js"

describe("normalizePath", () => {
  it("strips trailing slashes, query, and hash", () => {
    expect(normalizePath("/w/foo/?x=1#bar")).toBe("/w/foo")
    expect(normalizePath("/")).toBe("/")
    expect(normalizePath("")).toBe("/")
  })
})

describe("routeFromPath", () => {
  it("treats /w as the public wallet", () => {
    expect(routeFromPath("/w")).toEqual({ kind: "public", tag: null })
    expect(routeFromPath("/w/")).toEqual({ kind: "public", tag: null })
    expect(routeFromPath("/w/human-voice")).toEqual({
      kind: "public",
      tag: "human-voice",
    })
  })

  it("decodes a tagged path", () => {
    expect(routeFromPath("/w/hello%20world")).toEqual({
      kind: "public",
      tag: "hello world",
    })
  })

  it("treats the library as the default", () => {
    expect(routeFromPath("/app")).toEqual({ kind: "library" })
    expect(routeFromPath("/")).toEqual({ kind: "library" })
  })
})

describe("isWalletSpaPath", () => {
  it("serves the SPA for /app and /w", () => {
    expect(isWalletSpaPath("/app")).toBe(true)
    expect(isWalletSpaPath("/app/")).toBe(true)
    expect(isWalletSpaPath("/w")).toBe(true)
    expect(isWalletSpaPath("/w/human-voice")).toBe(true)
    expect(isWalletSpaPath("/")).toBe(false)
  })
})
