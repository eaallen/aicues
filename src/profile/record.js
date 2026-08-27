/** @typedef {{ tag: string, updatedAt: number }} Profile */

export const TAG_MIN_LENGTH = 3
export const TAG_MAX_LENGTH = 32

const TAG_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/

/**
 * Normalizes a raw tag input (trim, lowercase).
 * @param {string} raw
 */
export function normalizeTag(raw) {
  return String(raw ?? "").trim().toLowerCase()
}

/**
 * Returns null if valid, or a short user-facing error string.
 * @param {string} tag - already normalized
 */
export function validateTag(tag) {
  if (tag.length < TAG_MIN_LENGTH) {
    return `Tag must be at least ${TAG_MIN_LENGTH} characters`
  }
  if (tag.length > TAG_MAX_LENGTH) {
    return `Tag must be at most ${TAG_MAX_LENGTH} characters`
  }
  if (!TAG_PATTERN.test(tag)) {
    return "Tag may only use lowercase letters, digits, and hyphens, and must start and end with a letter or digit"
  }
  return null
}

/**
 * Builds a profile object from fields.
 * @param {{ tag: string, updatedAt?: number }} input
 */
export function buildProfile(input) {
  return {
    tag: input.tag,
    updatedAt: input.updatedAt ?? Date.now(),
  }
}
