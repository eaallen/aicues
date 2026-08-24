import { getAnalytics, isSupported } from "firebase/analytics"
import { getCueApp } from "./config.js"

/** @type {import("firebase/analytics").Analytics | null | undefined} */
let analytics

/**
 * Initializes Firebase Analytics (Google Analytics) when the environment supports it.
 * Safe to call more than once; returns the shared instance after the first success.
 *
 * @returns {Promise<import("firebase/analytics").Analytics | null>}
 */
export async function initCueAnalytics() {
  if (analytics !== undefined) {
    return analytics
  }

  try {
    if (!(await isSupported())) {
      analytics = null
      return analytics
    }
    analytics = getAnalytics(getCueApp())
    return analytics
  } catch {
    analytics = null
    return analytics
  }
}
