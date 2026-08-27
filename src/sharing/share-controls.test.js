import { describe, expect, it, vi } from "vitest"
import { PublicPromptIndicator, SharePromptButton } from "./share-controls.js"

describe("SharePromptButton", () => {
  it("renders nothing for guest sessions", () => {
    const root = SharePromptButton({
      isAccount: false,
      onShare: vi.fn(),
    })
    expect(root).toBeNull()
  })

  it("renders a share button for account users", () => {
    const onShare = vi.fn()
    const root = SharePromptButton({
      isAccount: true,
      onShare,
    })
    document.body.append(root)

    const button = root.querySelector("button")
    expect(button?.getAttribute("aria-label")).toBe("Share")
    expect(root.querySelector(".tooltip-content")?.textContent).toBe("Share")

    button?.click()
    expect(onShare).toHaveBeenCalledOnce()

    root.remove()
  })
})

describe("PublicPromptIndicator", () => {
  it("renders nothing for guest sessions", () => {
    const root = PublicPromptIndicator({
      isAccount: false,
      onMakePrivate: vi.fn(),
    })
    expect(root).toBeNull()
  })

  it("shows a green globe with make-private tooltip for account users", () => {
    const onMakePrivate = vi.fn()
    const root = PublicPromptIndicator({
      isAccount: true,
      onMakePrivate,
    })
    document.body.append(root)

    expect(root.querySelector(".cue-globe-icon")).toBeTruthy()
    expect(root.querySelector(".cue-globe-icon")?.classList.contains("cue-globe-public")).toBe(
      true,
    )
    expect(root.querySelector(".tooltip-content")?.textContent).toBe("Make private")

    root.querySelector("button")?.click()
    expect(onMakePrivate).toHaveBeenCalledOnce()

    root.remove()
  })
})
