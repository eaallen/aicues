export const TITLE_MAX_LENGTH = 48
export const TITLE_MAX_STORED_LENGTH = 80
export const BODY_MAX_LENGTH = 100_000
export const UNTITLED_TITLE = "Untitled"

/**
 * Returns a shallow copy of a prompt record.
 * @param {object} prompt
 */
export function clonePrompt(prompt) {
  return { ...prompt }
}

/**
 * Whether a stored value is an object with a non-empty string id.
 * @param {unknown} record
 */
export function isPromptRecord(record) {
  if (record === null || typeof record !== "object" || Array.isArray(record)) {
    return false
  }
  const id = /** @type {{ id?: unknown }} */ (record).id
  return typeof id === "string" && id.length > 0
}

/**
 * Sorts prompts by updatedAt descending without mutating the input array.
 * @param {object[]} prompts
 */
export function sortByUpdatedAtDesc(prompts) {
  return [...prompts].sort(
    (a, b) => (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0),
  )
}

/**
 * Trims a field value; missing values become an empty string.
 * @param {unknown} [value]
 */
export function trimField(value) {
  if (value === undefined || value === null) {
    return ""
  }
  return String(value).trim()
}

/**
 * Returns a non-empty title, deriving one from body when title is blank.
 * @param {string} title
 * @param {string} body
 */
export function normalizeTitle(title, body) {
  const trimmedTitle = title.trim()
  if (trimmedTitle) {
    return trimmedTitle
  }
  return deriveTitleFromBody(body)
}

/**
 * Derives a display title from the first line of the prompt body.
 * @param {string} body
 */
export function deriveTitleFromBody(body) {
  const newlineIndex = body.indexOf("\n")
  const firstLine = (
    newlineIndex === -1 ? body : body.slice(0, newlineIndex)
  ).trim()
  if (!firstLine) {
    return UNTITLED_TITLE
  }
  if (firstLine.length > TITLE_MAX_LENGTH) {
    return `${firstLine.slice(0, TITLE_MAX_LENGTH)}…`
  }
  return firstLine
}

/**
 * Builds a new prompt record from optional title and body fields.
 * @param {{ title?: string, body?: string }} [input]
 * @param {number} [now]
 */
export function buildPrompt(input = {}, now = Date.now()) {
  const body = trimField(input.body)
  const title = normalizeTitle(trimField(input.title), body)
  return {
    id: crypto.randomUUID(),
    title,
    body,
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Applies a title/body patch to an existing prompt.
 * @param {object} current
 * @param {{ title?: string, body?: string, isPublic?: boolean }} [patch]
 * @param {number} [now]
 */
export function applyPromptPatch(current, patch = {}, now = Date.now()) {
  const next = clonePrompt(current)
  if (patch.title !== undefined) {
    next.title = trimField(patch.title)
  }
  if (patch.body !== undefined) {
    next.body = trimField(patch.body)
  }
  if (patch.isPublic !== undefined) {
    next.isPublic = Boolean(patch.isPublic)
  }
  next.title = normalizeTitle(next.title, next.body)
  next.updatedAt = now
  next.id = current.id
  next.createdAt = current.createdAt
  return next
}

/**
 * Finds a prompt by id in a list.
 * @param {Array<{ id: string }>} prompts
 * @param {string | null | undefined} id
 */
export function findPrompt(prompts, id) {
  if (!id) {
    return null
  }
  return prompts.find((prompt) => prompt.id === id) ?? null
}

/**
 * Whether a prompt is public (missing isPublic treated as false).
 * @param {{ isPublic?: boolean }} prompt
 */
export function isPublicPrompt(prompt) {
  return prompt.isPublic === true
}

/**
 * Patch helper for visibility only.
 * @param {object} current
 * @param {boolean} isPublic
 * @param {number} [now]
 */
export function applyVisibilityPatch(current, isPublic, now = Date.now()) {
  return applyPromptPatch(current, { isPublic }, now)
}

/**
 * Firestore fields for a prompt; id lives in the document path.
 * @param {object} prompt
 */
export function toFirestorePrompt(prompt) {
  const doc = {
    title: String(prompt.title ?? ""),
    body: String(prompt.body ?? ""),
    createdAt: Number(prompt.createdAt) || 0,
    updatedAt: Number(prompt.updatedAt) || 0,
  }
  if (isPublicPrompt(prompt)) {
    doc.isPublic = true
  }
  return doc
}

/**
 * Rebuilds a prompt record from a Firestore document.
 * @param {string} id
 * @param {object} [data]
 */
export function fromFirestorePrompt(id, data = {}) {
  return {
    id,
    title: typeof data.title === "string" ? data.title : "",
    body: typeof data.body === "string" ? data.body : "",
    createdAt: Number(data.createdAt) || 0,
    updatedAt: Number(data.updatedAt) || 0,
    isPublic: data.isPublic === true,
  }
}
