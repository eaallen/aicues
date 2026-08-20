import { describe, expect, it } from "vitest"
import { LaunchProviderMenu, PrimaryProviderSelect } from "./provider-picker.js"

const providers = [
  { id: "meta", name: "Meta AI" },
  { id: "chatgpt", name: "ChatGPT" },
]

/**
 * Launch-menu option buttons in a rendered menu.
 * @param {Element} root
 */
function optionButtons(root) {
  return [...root.querySelectorAll("button.cue-launch-option")]
}

describe("PrimaryProviderSelect", () => {
  it("renders options and the selected provider", () => {
    const root = PrimaryProviderSelect({
      providers,
      selectedId: "chatgpt",
      onChange: () => {},
    })
    document.body.append(root)

    const select = root.querySelector("select.cue-provider-select")
    expect(root.classList.contains("cue-primary-provider")).toBe(true)
    expect(root.textContent).toContain("Primary")
    expect(select.getAttribute("aria-label")).toBe("Primary AI provider")
    expect([...select.options].map((option) => option.value)).toEqual([
      "meta",
      "chatgpt",
    ])
    expect([...select.options].map((option) => option.textContent)).toEqual([
      "Meta AI",
      "ChatGPT",
    ])
    expect(select.value).toBe("chatgpt")

    root.remove()
  })

  it("calls onChange with the new id when the select changes", () => {
    /** @type {string[]} */
    const changed = []
    const root = PrimaryProviderSelect({
      providers,
      selectedId: "meta",
      onChange: (providerId) => {
        changed.push(providerId)
      },
    })
    document.body.append(root)

    const select = root.querySelector("select.cue-provider-select")
    select.value = "chatgpt"
    select.dispatchEvent(new Event("change"))

    expect(changed).toEqual(["chatgpt"])

    root.remove()
  })

  it("renders options without calling onChange when selectedId is unknown", () => {
    /** @type {string[]} */
    const changed = []
    const root = PrimaryProviderSelect({
      providers,
      selectedId: "missing",
      onChange: (providerId) => {
        changed.push(providerId)
      },
    })
    document.body.append(root)

    const select = root.querySelector("select.cue-provider-select")
    expect([...select.options].map((option) => option.value)).toEqual([
      "meta",
      "chatgpt",
    ])
    expect(changed).toEqual([])

    root.remove()
  })
})

describe("LaunchProviderMenu", () => {
  it("lists both provider names", () => {
    const root = LaunchProviderMenu({
      providers,
      primaryId: "meta",
      onLaunch: () => {},
    })
    document.body.append(root)

    expect(root.classList.contains("cue-launch-menu")).toBe(true)
    expect(root.querySelector('[aria-label="Choose AI to launch"]')).toBeTruthy()
    expect(
      root.querySelector("summary.cue-row-btn svg.cue-icon"),
    ).toBeTruthy()
    expect(root.querySelector('[aria-label="AI providers"]')).toBeTruthy()
    expect(optionButtons(root).map((button) => button.getAttribute("aria-label"))).toEqual([
      "Meta AI (primary)",
      "ChatGPT",
    ])
    expect(root.textContent).toContain("Meta AI")
    expect(root.textContent).toContain("ChatGPT")

    root.remove()
  })

  it("marks the primary provider", () => {
    const root = LaunchProviderMenu({
      providers,
      primaryId: "meta",
      onLaunch: () => {},
    })
    document.body.append(root)

    const [meta, chatgpt] = optionButtons(root)
    expect(meta.getAttribute("aria-label")).toBe("Meta AI (primary)")
    expect(meta.querySelector(".cue-launch-primary-mark")).toBeTruthy()
    expect(meta.querySelector(".cue-launch-primary-mark")?.textContent).toBe(
      "Primary",
    )
    expect(chatgpt.getAttribute("aria-label")).toBe("ChatGPT")
    expect(chatgpt.querySelector(".cue-launch-primary-mark")).toBeNull()

    root.remove()
  })

  it("launches a non-primary option and closes the menu", () => {
    /** @type {string[]} */
    const launched = []
    const root = LaunchProviderMenu({
      providers,
      primaryId: "meta",
      onLaunch: (providerId) => {
        launched.push(providerId)
      },
    })
    document.body.append(root)

    root.open = true
    const chatgpt = optionButtons(root).find(
      (button) => button.getAttribute("aria-label") === "ChatGPT",
    )
    chatgpt?.click()

    expect(launched).toEqual(["chatgpt"])
    expect(root.open).toBe(false)

    root.remove()
  })

  it("launches the primary option with that id", () => {
    /** @type {string[]} */
    const launched = []
    const root = LaunchProviderMenu({
      providers,
      primaryId: "meta",
      onLaunch: (providerId) => {
        launched.push(providerId)
      },
    })
    document.body.append(root)

    root.open = true
    const meta = optionButtons(root).find(
      (button) => button.getAttribute("aria-label") === "Meta AI (primary)",
    )
    meta?.click()

    expect(launched).toEqual(["meta"])
    expect(root.open).toBe(false)

    root.remove()
  })
})
