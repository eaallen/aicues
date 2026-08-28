import { normalizeTag } from "./profile/record.js"

/** @typedef {{ kind: "app" } | { kind: "app-profile" } | { kind: "public-wallet", tag: string, promptId?: string }} Route */

const ROBOTS_INDEX = "index, follow"
const ROBOTS_NOINDEX = "noindex, nofollow"

/**
 * Normalizes a pathname by trimming trailing slashes.
 * @param {string} pathname
 */
function normalizePath(pathname) {
  const trimmed = pathname.replace(/\/+$/, "")
  return trimmed.length > 0 ? trimmed : "/"
}

/**
 * Parses location.pathname into a route.
 * @param {string} pathname
 */
export function parseRoute(pathname) {
  const path = normalizePath(pathname)

  if (path === "/app") {
    return { kind: "app" }
  }
  if (path === "/app/profile") {
    return { kind: "app-profile" }
  }

  const walletMatch = path.match(/^\/w\/([^/]+)(?:\/([^/]+))?$/)
  if (walletMatch) {
    const route = /** @type {{ kind: "public-wallet", tag: string, promptId?: string }} */ ({
      kind: "public-wallet",
      tag: normalizeTag(walletMatch[1]),
    })
    if (walletMatch[2]) {
      route.promptId = walletMatch[2]
    }
    return route
  }

  return { kind: "app" }
}

/**
 * Path for a public wallet, optionally focused on one prompt.
 * @param {string} tag
 * @param {string} [promptId]
 */
export function publicWalletPath(tag, promptId) {
  const normalized = normalizeTag(tag)
  if (promptId) {
    return `/w/${normalized}/${promptId}`
  }
  return `/w/${normalized}`
}

/**
 * Absolute public wallet URL.
 * @param {string} tag
 * @param {string | undefined} promptId
 * @param {string} origin
 */
export function publicWalletUrl(tag, promptId, origin) {
  return `${origin}${publicWalletPath(tag, promptId)}`
}

/**
 * Finds or creates the robots meta element.
 */
function robotsMeta() {
  const existing = document.querySelector('meta[name="robots"]')
  if (existing) {
    return existing
  }
  const meta = document.createElement("meta")
  meta.setAttribute("name", "robots")
  document.head.appendChild(meta)
  return meta
}

/**
 * Updates document title and robots meta for the current route.
 * @param {Route} route
 * @param {{ tag?: string, promptTitle?: string }} [context]
 */
export function applyRouteMeta(route, context = {}) {
  if (route.kind === "public-wallet") {
    const tag = context.tag ?? route.tag
    document.title = `@${tag} — AI Cues`
    robotsMeta().setAttribute("content", ROBOTS_INDEX)
    return
  }

  document.title = "AI Cues"
  robotsMeta().setAttribute("content", ROBOTS_NOINDEX)
}
