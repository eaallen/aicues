import { describe, expect, it, vi } from "vitest"
import {
  PROVIDER_WINDOW_NAME,
  isAlreadyLeftPane,
  openProviderUrl,
  popupFeatures,
  splitBounds,
} from "./open-window.js"

/**
 * Builds a window-like object for openProviderUrl tests.
 * @param {object} [overrides]
 */
function fakeWindow(overrides = {}) {
  const opened = []
  const child = {
    opener: /** @type {object | null} */ ({}),
    focus: vi.fn(),
  }
  const win = {
    screenX: 0,
    screenY: 25,
    outerWidth: 1440,
    outerHeight: 900,
    screen: {
      availLeft: 0,
      availTop: 25,
      availWidth: 1440,
      availHeight: 875,
    },
    resizeTo: vi.fn(function resizeTo(width, height) {
      win.outerWidth = width
      win.outerHeight = height
    }),
    moveTo: vi.fn(function moveTo(x, y) {
      win.screenX = x
      win.screenY = y
    }),
    open: vi.fn((url, name, features) => {
      opened.push({ url, name, features })
      return child
    }),
    opened,
    child,
    ...overrides,
  }
  return win
}

describe("splitBounds", () => {
  it("splits available screen space into two panes", () => {
    expect(
      splitBounds({
        screen: {
          availLeft: 0,
          availTop: 25,
          availWidth: 1440,
          availHeight: 875,
        },
      }),
    ).toEqual({
      left: { x: 0, y: 25, width: 720, height: 875 },
      right: { x: 720, y: 25, width: 720, height: 875 },
    })
  })
})

describe("popupFeatures", () => {
  it("asks Chrome for a positioned popup, not a tab", () => {
    expect(popupFeatures({ x: 720, y: 25, width: 720, height: 875 })).toBe(
      "popup=yes,width=720,height=875,left=720,top=25",
    )
  })
})

describe("isAlreadyLeftPane", () => {
  it("is true when the window is already docked on the left half", () => {
    const left = { x: 0, y: 25, width: 720, height: 875 }
    expect(
      isAlreadyLeftPane(
        { screenX: 8, screenY: 25, outerWidth: 710, outerHeight: 875 },
        left,
      ),
    ).toBe(true)
    expect(
      isAlreadyLeftPane(
        { screenX: 200, screenY: 25, outerWidth: 1440, outerHeight: 875 },
        left,
      ),
    ).toBe(false)
  })
})

describe("openProviderUrl", () => {
  it("docks this window left and opens the provider on the right", () => {
    const win = fakeWindow()
    const url = "https://www.meta.ai/ask?prompt=I+like+pie"
    const child = openProviderUrl(url, win)

    expect(win.resizeTo).toHaveBeenCalledWith(720, 875)
    expect(win.moveTo).toHaveBeenCalledWith(0, 25)
    expect(win.open).toHaveBeenCalledWith(
      url,
      PROVIDER_WINDOW_NAME,
      "popup=yes,width=720,height=875,left=720,top=25",
    )
    expect(child.opener).toBeNull()
    expect(child.focus).toHaveBeenCalled()
  })

  it("reuses the named provider window without resizing when already split", () => {
    const win = fakeWindow({
      screenX: 0,
      screenY: 25,
      outerWidth: 720,
      outerHeight: 875,
    })
    openProviderUrl("https://www.meta.ai/ask?prompt=second", win)

    expect(win.resizeTo).not.toHaveBeenCalled()
    expect(win.open).toHaveBeenCalledWith(
      "https://www.meta.ai/ask?prompt=second",
      PROVIDER_WINDOW_NAME,
      "popup=yes,width=720,height=875,left=720,top=25",
    )
  })

  it("falls back to a blank tab when the popup is blocked", () => {
    const win = fakeWindow({
      open: vi.fn((url, name) => {
        if (name === PROVIDER_WINDOW_NAME) {
          return null
        }
        return { opener: null, focus: vi.fn() }
      }),
    })
    openProviderUrl("https://www.meta.ai/", win)
    expect(win.open).toHaveBeenLastCalledWith(
      "https://www.meta.ai/",
      "_blank",
      "noopener,noreferrer",
    )
  })
})
