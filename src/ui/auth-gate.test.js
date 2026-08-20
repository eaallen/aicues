import { describe, expect, it, vi } from "vitest"
import { AuthGate } from "./auth-gate.js"

describe("AuthGate", () => {
  /**
   * Waits a turn so async auth handlers can finish.
   */
  async function tick() {
    await new Promise((resolve) => setTimeout(resolve, 0))
  }

  it("calls Google, email, create, and guest auth actions", async () => {
    const authApi = {
      signInWithGoogle: vi.fn(async () => {}),
      signInWithEmail: vi.fn(async () => {}),
      createWithEmail: vi.fn(async () => {}),
      signInAnonymously: vi.fn(async () => {}),
    }
    const root = AuthGate({ authApi })
    document.body.append(root)

    root.querySelector(".cue-auth-btn")?.click()
    await tick()
    expect(authApi.signInWithGoogle).toHaveBeenCalledOnce()

    const email = root.querySelector('input[name="email"]')
    const password = root.querySelector('input[name="password"]')
    if (!(email instanceof HTMLInputElement) || !(password instanceof HTMLInputElement)) {
      throw new Error("auth fields missing")
    }
    email.value = "a@example.com"
    email.dispatchEvent(new Event("input", { bubbles: true }))
    password.value = "secret1"
    password.dispatchEvent(new Event("input", { bubbles: true }))

    root.querySelector("form")?.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    )
    await tick()
    expect(authApi.signInWithEmail).toHaveBeenCalledWith("a@example.com", "secret1")

    const createBtn = [...root.querySelectorAll("button")].find(
      (button) => button.textContent === "Create account",
    )
    createBtn?.click()
    await tick()
    expect(authApi.createWithEmail).toHaveBeenCalledWith("a@example.com", "secret1")

    root.querySelector(".cue-auth-guest")?.click()
    await tick()
    expect(authApi.signInAnonymously).toHaveBeenCalledOnce()

    root.remove()
  })
})
