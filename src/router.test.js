import { afterEach, describe, expect, it } from "vitest"
import { applyRouteMeta, parseRoute } from "./router.js"

describe("parseRoute", () => {
  it("maps /app to the private wallet", () => {
    expect(parseRoute("/app")).toEqual({ kind: "app" })
    expect(parseRoute("/app/")).toEqual({ kind: "app" })
  })

  it("maps /app/profile to the profile view", () => {
    expect(parseRoute("/app/profile")).toEqual({ kind: "app-profile" })
  })

  it("maps /w/:tag to public-wallet", () => {
    expect(parseRoute("/w/eli-dev")).toEqual({
      kind: "public-wallet",
      tag: "eli-dev",
    })
  })

  it("normalizes tag casing in public-wallet routes", () => {
    expect(parseRoute("/w/Eli-Dev")).toEqual({
      kind: "public-wallet",
      tag: "eli-dev",
    })
  })

  it("maps /w/:tag/:promptId with promptId", () => {
    expect(parseRoute("/w/eli-dev/abc-123")).toEqual({
      kind: "public-wallet",
      tag: "eli-dev",
      promptId: "abc-123",
    })
  })
})

describe("applyRouteMeta", () => {
  /**
   * Restores document head after each test.
   */
  function setupHead() {
    document.title = "AI Cues"
    const existing = document.querySelector('meta[name="robots"]')
    if (existing) {
      existing.setAttribute("content", "noindex, nofollow")
    } else {
      const meta = document.createElement("meta")
      meta.setAttribute("name", "robots")
      meta.setAttribute("content", "noindex, nofollow")
      document.head.appendChild(meta)
    }
  }

  afterEach(() => {
    document.title = "AI Cues"
  })

  it("sets indexable title and robots for public wallet routes", () => {
    setupHead()
    applyRouteMeta({ kind: "public-wallet", tag: "eli-dev" })

    expect(document.title).toBe("@eli-dev — AI Cues")
    expect(document.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe(
      "index, follow",
    )
  })

  it("uses context tag when provided", () => {
    setupHead()
    applyRouteMeta({ kind: "public-wallet", tag: "old" }, { tag: "eli-dev" })

    expect(document.title).toBe("@eli-dev — AI Cues")
  })

  it("keeps noindex for private app routes", () => {
    setupHead()
    applyRouteMeta({ kind: "app" })

    expect(document.title).toBe("AI Cues")
    expect(document.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe(
      "noindex, nofollow",
    )
  })

  it("keeps noindex for profile routes", () => {
    setupHead()
    applyRouteMeta({ kind: "app-profile" })

    expect(document.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe(
      "noindex, nofollow",
    )
  })
})
