import { describe, expect, it, vi } from "vitest"
import { isProfilePath, ProfilePage } from "./profile-page.js"

describe("isProfilePath", () => {
  it("matches /app/profile with or without trailing slash", () => {
    expect(isProfilePath("/app/profile")).toBe(true)
    expect(isProfilePath("/app/profile/")).toBe(true)
  })

  it("does not match other paths", () => {
    expect(isProfilePath("/app")).toBe(false)
    expect(isProfilePath("/app/wallet")).toBe(false)
    expect(isProfilePath("/w/eli-dev")).toBe(false)
  })
})

describe("ProfilePage", () => {
  /**
   * Waits a turn so async handlers can finish.
   */
  async function tick() {
    await new Promise((resolve) => setTimeout(resolve, 0))
  }

  /**
   * Builds a mock profile store.
   * @param {{ profile?: { tag: string, updatedAt: number } | null, setTag?: (tag: string) => Promise<{ tag: string, updatedAt: number }> }} [options]
   */
  function mockStore(options = {}) {
    let profile = options.profile ?? null
    return {
      get: vi.fn(async () => profile),
      setTag:
        options.setTag ??
        vi.fn(async (rawTag) => {
          const next = { tag: String(rawTag).trim().toLowerCase(), updatedAt: Date.now() }
          profile = next
          return next
        }),
      isTagAvailable: vi.fn(async () => true),
    }
  }

  it("shows read-only email when authEmail is provided", async () => {
    const root = ProfilePage({
      profileStore: mockStore(),
      authEmail: "user@example.com",
      onBack: () => {},
    })
    document.body.append(root)
    await tick()

    const emailInput = root.querySelector('input[name="email"]')
    expect(emailInput).toBeTruthy()
    expect(emailInput instanceof HTMLInputElement && emailInput.value).toBe(
      "user@example.com",
    )
    expect(emailInput instanceof HTMLInputElement && emailInput.readOnly).toBe(true)

    root.remove()
  })

  it("omits email field when authEmail is null, empty, or omitted", async () => {
    for (const authEmail of [null, "", undefined]) {
      const root = ProfilePage({
        profileStore: mockStore(),
        authEmail,
        onBack: () => {},
      })
      document.body.append(root)
      await tick()
      expect(root.querySelector('input[name="email"]')).toBeNull()
      root.remove()
    }
  })

  it("loads existing tag into the input", async () => {
    const root = ProfilePage({
      profileStore: mockStore({ profile: { tag: "eli-dev", updatedAt: 1 } }),
      authEmail: "user@example.com",
      onBack: () => {},
    })
    document.body.append(root)
    await tick()

    const tagInput = root.querySelector('input[name="tag"]')
    expect(tagInput instanceof HTMLInputElement && tagInput.value).toBe("eli-dev")

    root.remove()
  })

  it("saves a new tag through the profile store", async () => {
    const store = mockStore()
    const root = ProfilePage({
      profileStore: store,
      authEmail: "user@example.com",
      onBack: () => {},
    })
    document.body.append(root)
    await tick()

    const tagInput = root.querySelector('input[name="tag"]')
    if (!(tagInput instanceof HTMLInputElement)) {
      throw new Error("tag input missing")
    }
    tagInput.value = "new-tag"
    tagInput.dispatchEvent(new Event("input", { bubbles: true }))
    root.querySelector('button[type="submit"]')?.click()
    await tick()

    expect(store.setTag).toHaveBeenCalledWith("new-tag")

    root.remove()
  })

  it("requires confirm before changing an existing tag", async () => {
    const store = mockStore({ profile: { tag: "old-tag", updatedAt: 1 } })
    const confirm = vi.fn(() => false)
    const root = ProfilePage({
      profileStore: store,
      authEmail: "user@example.com",
      onBack: () => {},
      confirm,
    })
    document.body.append(root)
    await tick()

    const tagInput = root.querySelector('input[name="tag"]')
    if (!(tagInput instanceof HTMLInputElement)) {
      throw new Error("tag input missing")
    }
    tagInput.value = "new-tag"
    tagInput.dispatchEvent(new Event("input", { bubbles: true }))
    root.querySelector('button[type="submit"]')?.click()
    await tick()

    expect(confirm).toHaveBeenCalledOnce()
    expect(confirm.mock.calls[0]?.[0]).toMatch(/link/i)
    expect(store.setTag).not.toHaveBeenCalled()

    root.remove()
  })

  it("proceeds with tag change when confirm is accepted", async () => {
    const store = mockStore({ profile: { tag: "old-tag", updatedAt: 1 } })
    const root = ProfilePage({
      profileStore: store,
      authEmail: "user@example.com",
      onBack: () => {},
      confirm: () => true,
    })
    document.body.append(root)
    await tick()

    const tagInput = root.querySelector('input[name="tag"]')
    if (!(tagInput instanceof HTMLInputElement)) {
      throw new Error("tag input missing")
    }
    tagInput.value = "new-tag"
    tagInput.dispatchEvent(new Event("input", { bubbles: true }))
    root.querySelector('button[type="submit"]')?.click()
    await tick()

    expect(store.setTag).toHaveBeenCalledWith("new-tag")

    root.remove()
  })

  it("shows an error when the profile fails to load", async () => {
    const store = mockStore()
    store.get.mockRejectedValueOnce(
      new Error("Missing or insufficient permissions."),
    )
    const root = ProfilePage({
      profileStore: store,
      authEmail: "user@example.com",
      onBack: () => {},
    })
    document.body.append(root)
    await tick()

    expect(root.querySelector(".cue-profile-error")?.textContent).toMatch(
      /permission/i,
    )
    expect(root.querySelector('input[name="tag"]')).toBeTruthy()

    root.remove()
  })

  it("calls onBack from the back link", async () => {
    const onBack = vi.fn()
    const root = ProfilePage({
      profileStore: mockStore(),
      authEmail: "user@example.com",
      onBack,
    })
    document.body.append(root)
    await tick()

    root.querySelector(".cue-profile-back")?.click()
    expect(onBack).toHaveBeenCalledOnce()

    root.remove()
  })
})
