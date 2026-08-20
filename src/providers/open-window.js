export const PROVIDER_WINDOW_NAME = "cue-provider"

/**
 * Computes left/right bounds for a side-by-side layout on the current screen.
 * @param {{
 *   screen: {
 *     availLeft?: number,
 *     availTop?: number,
 *     availWidth: number,
 *     availHeight: number,
 *   },
 * }} win
 */
export function splitBounds(win) {
  const availLeft = Number(win.screen.availLeft) || 0
  const availTop = Number(win.screen.availTop) || 0
  const availWidth = Math.max(0, Number(win.screen.availWidth) || 0)
  const availHeight = Math.max(0, Number(win.screen.availHeight) || 0)
  const leftWidth = Math.max(400, Math.floor(availWidth / 2))
  const rightWidth = Math.max(400, availWidth - leftWidth)
  return {
    left: {
      x: availLeft,
      y: availTop,
      width: leftWidth,
      height: availHeight,
    },
    right: {
      x: availLeft + leftWidth,
      y: availTop,
      width: rightWidth,
      height: availHeight,
    },
  }
}

/**
 * Whether the opener is already docked to the left half of the screen.
 * @param {{ screenX: number, screenY: number, outerWidth: number, outerHeight: number }} win
 * @param {{ x: number, y: number, width: number, height: number }} left
 */
export function isAlreadyLeftPane(win, left) {
  return (
    Math.abs(win.screenX - left.x) < 48 &&
    Math.abs(win.outerWidth - left.width) < 96
  )
}

/**
 * Builds the window.open feature string for a positioned popup.
 * @param {{ x: number, y: number, width: number, height: number }} bounds
 */
export function popupFeatures(bounds) {
  return [
    "popup=yes",
    `width=${Math.round(bounds.width)}`,
    `height=${Math.round(bounds.height)}`,
    `left=${Math.round(bounds.x)}`,
    `top=${Math.round(bounds.y)}`,
  ].join(",")
}

/**
 * Opens the provider beside this window. Native Chrome tab-split cannot be
 * invoked from a website; this is the closest layout a page can request.
 * @param {string} url
 * @param {Pick<Window, "open" | "resizeTo" | "moveTo" | "screenX" | "screenY" | "outerWidth" | "outerHeight" | "screen">} [win]
 */
export function openProviderUrl(url, win = globalThis) {
  const { left, right } = splitBounds(win)
  if (!isAlreadyLeftPane(win, left)) {
    try {
      win.resizeTo(left.width, left.height)
      win.moveTo(left.x, left.y)
    } catch {
      // Tabs often ignore move/resize; the provider popup still opens.
    }
  }

  const child = win.open(url, PROVIDER_WINDOW_NAME, popupFeatures(right))
  if (!child) {
    return win.open(url, "_blank", "noopener,noreferrer")
  }
  try {
    child.opener = null
    if (typeof child.focus === "function") {
      child.focus()
    }
  } catch {
    // Cross-origin provider windows may reject opener/focus writes.
  }
  return child
}
