import { describe, expect, it } from "vitest"
import { authErrorMessage, sessionFromUser } from "./auth.js"

describe("authErrorMessage", () => {
  it("maps known codes to short copy", () => {
    expect(authErrorMessage({ code: "auth/invalid-email" })).toBe(
      "Enter a valid email address.",
    )
    expect(authErrorMessage({ code: "auth/email-already-in-use" })).toContain(
      "already has an account",
    )
  })

  it("falls back when the error is unknown", () => {
    expect(authErrorMessage({})).toBe("Could not sign in. Try again.")
    expect(authErrorMessage("nope")).toBe("Could not sign in. Try again.")
  })
})

describe("sessionFromUser", () => {
  it("returns null when signed out", () => {
    expect(sessionFromUser(null)).toBeNull()
  })

  it("marks anonymous users as guests", () => {
    expect(
      sessionFromUser({ isAnonymous: true, email: null, displayName: null }),
    ).toMatchObject({ kind: "anonymous", label: "Guest" })
  })

  it("uses email for account sessions", () => {
    expect(
      sessionFromUser({
        isAnonymous: false,
        email: "a@example.com",
        displayName: "A",
      }),
    ).toMatchObject({ kind: "account", label: "a@example.com" })
  })
})
