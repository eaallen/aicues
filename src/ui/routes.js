/**
 * Strips query/hash and a trailing slash (except `/`).
 * @param {string | null | undefined} pathname
 */
export function normalizePath(pathname) {
  const raw = String(pathname ?? "/")
  const noQuery = raw.split("?")[0].split("#")[0]
  if (noQuery.length > 1 && noQuery.endsWith("/")) {
    return noQuery.slice(0, -1)
  }
  return noQuery || "/"
}

/**
 * SPA route for the prompt library vs the public wallet.
 * @param {string | null | undefined} pathname
 * @returns {{ kind: "library" } | { kind: "public", tag: string | null }}
 */
export function routeFromPath(pathname) {
  const path = normalizePath(pathname)
  if (path !== "/w" && !path.startsWith("/w/")) {
    return { kind: "library" }
  }
  const rest = path === "/w" ? "" : path.slice("/w/".length)
  const tagPart = rest.split("/").filter(Boolean)[0] ?? ""
  if (!tagPart) {
    return { kind: "public", tag: null }
  }
  try {
    return { kind: "public", tag: decodeURIComponent(tagPart) }
  } catch {
    return { kind: "public", tag: tagPart }
  }
}

/**
 * Whether a request path should be served as the wallet SPA (`app.html`).
 * @param {string | null | undefined} pathname
 */
export function isWalletSpaPath(pathname) {
  const path = normalizePath(pathname)
  return (
    path === "/app" ||
    path.startsWith("/app/") ||
    path === "/w" ||
    path.startsWith("/w/")
  )
}
