import { normalizeTag, validateTag } from "../profile/record.js"

/**
 * Ensures the user has a profile tag, prompting when needed.
 * @param {{
 *   profileStore: { get: () => Promise<{ tag?: string } | null>, setTag: (tag: string) => Promise<{ tag: string }> },
 *   promptForTag: (message: string, defaultTag?: string) => string | null,
 * }} options
 */
async function ensureProfileTag({ profileStore, promptForTag }) {
  let profile = null
  try {
    profile = await profileStore.get()
  } catch {
    profile = null
  }
  if (profile?.tag) {
    return profile
  }

  const message = "Choose a public tag for your wallet:"
  let promptMessage = message
  while (true) {
    const raw = promptForTag(promptMessage)
    if (raw === null) {
      return null
    }
    const tag = normalizeTag(raw)
    const error = validateTag(tag)
    if (error) {
      promptMessage = `${error}\n\n${message}`
      continue
    }
    try {
      return await profileStore.setTag(tag)
    } catch (caught) {
      const reason =
        caught instanceof Error ? caught.message : "Failed to save tag"
      promptMessage = `${reason}\n\n${message}`
    }
  }
}

/**
 * Runs the share flow: tag gate → confirm publish → set isPublic true.
 * @param {{
 *   promptId: string,
 *   promptStore: { get: (id: string) => object | null, update: (id: string, patch: object) => object | null },
 *   profileStore: { get: () => Promise<{ tag?: string } | null>, setTag: (tag: string) => Promise<{ tag: string }> },
 *   confirm?: (message: string) => boolean,
 *   promptForTag?: (message: string, defaultTag?: string) => string | null,
 * }} options
 */
export async function sharePrompt({
  promptId,
  promptStore,
  profileStore,
  confirm = (message) => window.confirm(message),
  promptForTag = (message) => window.prompt(message),
}) {
  const tagResult = await ensureProfileTag({ profileStore, promptForTag })
  if (!tagResult) {
    return { ok: false, reason: "cancelled" }
  }

  if (!confirm("Make this prompt public?")) {
    return { ok: false, reason: "cancelled" }
  }

  promptStore.update(promptId, { isPublic: true })
  return { ok: true, tag: tagResult.tag }
}

/**
 * Runs unpublish flow: confirm → set isPublic false.
 * @param {{
 *   promptId: string,
 *   promptStore: { update: (id: string, patch: object) => object | null },
 *   confirm?: (message: string) => boolean,
 * }} options
 */
export async function makePromptPrivate({
  promptId,
  promptStore,
  confirm = (message) => window.confirm(message),
}) {
  if (!confirm("Make this prompt private?")) {
    return { ok: false, reason: "cancelled" }
  }

  promptStore.update(promptId, { isPublic: false })
  return { ok: true }
}
