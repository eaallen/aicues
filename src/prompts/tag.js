export const PUBLIC_TAG_MIN_LENGTH = 2
export const PUBLIC_TAG_MAX_LENGTH = 32

/** Starts with a letter; later groups are hyphen + alphanumeric (no trailing or doubled hyphens). */
export const PUBLIC_TAG_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/

export const RESERVED_PUBLIC_TAGS = new Set([
  "about",
  "api",
  "app",
  "assets",
  "auth",
  "login",
  "static",
  "w",
  "wallet",
  "www",
])

export class TagTakenError extends Error {
  /**
   * @param {string} [message]
   */
  constructor(message = "That tag is already taken. Try another.") {
    super(message)
    this.name = "TagTakenError"
  }
}

/**
 * Canonical share tag: lowercase, hyphenated, trimmed of extra punctuation.
 * @param {unknown} [value]
 */
export function normalizePublicTag(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
}

/**
 * Whether a normalized tag can be used in a public wallet URL.
 * @param {string} tag
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function validatePublicTag(tag) {
  if (!tag) {
    return { ok: false, error: "Enter a tag to build your share link." }
  }
  if (RESERVED_PUBLIC_TAGS.has(tag)) {
    return { ok: false, error: "That tag is reserved. Try another." }
  }
  if (
    tag.length < PUBLIC_TAG_MIN_LENGTH ||
    tag.length > PUBLIC_TAG_MAX_LENGTH ||
    !PUBLIC_TAG_PATTERN.test(tag)
  ) {
    return {
      ok: false,
      error:
        "Use 2–32 characters: start with a letter, then letters, numbers, or hyphens.",
    }
  }
  return { ok: true }
}

/**
 * Path for the public wallet, optionally focused on a tag.
 * @param {string | null | undefined} [tag]
 */
export function publicWalletPath(tag) {
  if (!tag) {
    return "/w"
  }
  return `/w/${tag}`
}

/**
 * Absolute share URL for a public tag.
 * @param {string} tag
 * @param {string} [origin]
 */
export function publicWalletUrl(tag, origin = defaultOrigin()) {
  const base = String(origin ?? "").replace(/\/+$/, "")
  return `${base}${publicWalletPath(tag)}`
}

/**
 * Location origin when running in a browser.
 */
function defaultOrigin() {
  return globalThis.location?.origin ?? ""
}
