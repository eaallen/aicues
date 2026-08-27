import { createCuePrivateBackend, createFirestorePromptStore } from "./firestore-store.js"
import { createCuePublicBackend, createPublicPromptStore } from "./public-store.js"
import { normalizePublicTag, validatePublicTag } from "./tag.js"

/**
 * Signed-in library store: private prompts plus publish/unpublish to the public wallet.
 * @param {{
 *   listDocs: () => Promise<object[]>,
 *   writeDoc: (prompt: object) => Promise<void>,
 *   deleteDoc: (id: string) => Promise<void>,
 * }} privateBackend
 * @param {{
 *   listDocs: () => Promise<object[]>,
 *   getDoc: (tag: string) => Promise<object | null>,
 *   writeDoc: (prompt: object) => Promise<void>,
 *   deleteDoc: (tag: string) => Promise<void>,
 * }} publicBackend
 * @param {string} uid
 */
export function createAccountPromptStore(privateBackend, publicBackend, uid) {
  const privateStore = createFirestorePromptStore(privateBackend)
  const publicStore = createPublicPromptStore(publicBackend)

  /**
   * Updates a private prompt and mirrors the public copy when it is published.
   * @param {string} id
   * @param {{ title?: string, body?: string, publicTag?: string | null }} [patch]
   */
  function update(id, patch = {}) {
    const result = privateStore.update(id, patch)
    if (result?.publicTag) {
      void publicStore.sync(result.publicTag, result, uid).catch((error) => {
        console.error("Failed to sync public prompt", error)
      })
    }
    return result
  }

  /**
   * Deletes a private prompt and its public copy when present.
   * @param {string} id
   */
  function remove(id) {
    const existing = privateStore.get(id)
    const removed = privateStore.remove(id)
    if (removed && existing?.publicTag) {
      void publicStore.unpublish(existing.publicTag, uid).catch((error) => {
        console.error("Failed to unpublish prompt", error)
      })
    }
    return removed
  }

  /**
   * Makes a prompt public under a share tag.
   * @param {string} id
   * @param {string} rawTag
   */
  async function publish(id, rawTag) {
    const tag = normalizePublicTag(rawTag)
    const checked = validatePublicTag(tag)
    if (!checked.ok) {
      throw new Error(checked.error)
    }
    const prompt = privateStore.get(id)
    if (!prompt) {
      throw new Error("Prompt not found.")
    }
    await publicStore.publish({
      tag,
      prompt,
      ownerUid: uid,
      previousTag: prompt.publicTag,
    })
    privateStore.update(id, { publicTag: tag })
    await privateStore.flush()
    return tag
  }

  /**
   * Removes a prompt from the public wallet.
   * @param {string} id
   */
  async function unpublish(id) {
    const prompt = privateStore.get(id)
    if (!prompt?.publicTag) {
      return false
    }
    await publicStore.unpublish(prompt.publicTag, uid)
    privateStore.update(id, { publicTag: "" })
    await privateStore.flush()
    return true
  }

  return {
    list: privateStore.list,
    get: privateStore.get,
    create: privateStore.create,
    update,
    remove,
    load: privateStore.load,
    flush: privateStore.flush,
    publish,
    unpublish,
  }
}

/**
 * Signed-in AI Cues store: private Firestore prompts plus the public wallet.
 * @param {import("firebase/firestore").Firestore} db
 * @param {string} uid
 */
export function createCueAccountStore(db, uid) {
  return createAccountPromptStore(
    createCuePrivateBackend(db, uid),
    createCuePublicBackend(db),
    uid,
  )
}
