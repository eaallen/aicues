import { beforeEach, describe, expect, it, vi } from "vitest"

const { isSupported, getAnalytics, getCueApp } = vi.hoisted(() => ({
  isSupported: vi.fn(),
  getAnalytics: vi.fn(),
  getCueApp: vi.fn(),
}))

vi.mock("firebase/analytics", () => ({
  isSupported,
  getAnalytics,
}))

vi.mock("./config.js", () => ({
  getCueApp,
}))

describe("initCueAnalytics", () => {
  beforeEach(() => {
    vi.resetModules()
    isSupported.mockReset()
    getAnalytics.mockReset()
    getCueApp.mockReset()
  })

  it("initializes Firebase Analytics when the environment supports it", async () => {
    const app = { name: "[DEFAULT]" }
    const analyticsInstance = { app }
    isSupported.mockResolvedValue(true)
    getCueApp.mockReturnValue(app)
    getAnalytics.mockReturnValue(analyticsInstance)

    const { initCueAnalytics } = await import("./analytics.js")
    const first = await initCueAnalytics()
    const second = await initCueAnalytics()

    expect(first).toBe(analyticsInstance)
    expect(second).toBe(analyticsInstance)
    expect(getCueApp).toHaveBeenCalledOnce()
    expect(getAnalytics).toHaveBeenCalledOnce()
    expect(getAnalytics).toHaveBeenCalledWith(app)
  })

  it("returns null when Analytics is not supported", async () => {
    isSupported.mockResolvedValue(false)

    const { initCueAnalytics } = await import("./analytics.js")
    await expect(initCueAnalytics()).resolves.toBeNull()
    expect(getAnalytics).not.toHaveBeenCalled()
  })

  it("returns null when initialization throws", async () => {
    isSupported.mockRejectedValue(new Error("blocked"))

    const { initCueAnalytics } = await import("./analytics.js")
    await expect(initCueAnalytics()).resolves.toBeNull()
    expect(getAnalytics).not.toHaveBeenCalled()
  })
})
