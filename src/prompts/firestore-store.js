import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
} from "firebase/firestore"
import {
  applyPromptPatch,
  buildPrompt,
  clonePrompt,
  fromFirestorePrompt,
  isPromptRecord,
  sortByUpdatedAtDesc,
  toFirestorePrompt,
} from "./record.js"

/**
 * Creates a prompt store with an in-memory cache and async persistence.
 * @param {{
 *   listDocs: () => Promise<object[]>,
 *   writeDoc: (prompt: object) => Promise<void>,
 *   deleteDoc: (id: string) => Promise<void>,
 * }} backend
 */
export function createFirestorePromptStore(backend) {
  let cache = /** @type {object[]} */ ([])
  let writes = Promise.resolve()

  /**
   * Queues a persistence task so writes stay ordered.
   * @param {() => Promise<void>} work
   */
  function enqueue(work) {
    writes = writes.then(work).catch((error) => {
      console.error("Failed to persist prompt", error)
    })
  }

  /**
   * Returns cached prompts, newest updatedAt first.
   */
  function list() {
    return sortByUpdatedAtDesc(cache.map(clonePrompt))
  }

  /**
   * Returns the cached prompt with the given id, or null.
   * @param {string} id
   */
  function get(id) {
    const found = cache.find((prompt) => prompt.id === id)
    return found ? clonePrompt(found) : null
  }

  /**
   * Creates a prompt in the cache and persists it.
   * @param {{ title?: string, body?: string }} [input]
   */
  function create(input = {}) {
    const prompt = buildPrompt(input)
    cache = [...cache, clonePrompt(prompt)]
    enqueue(() => backend.writeDoc(clonePrompt(prompt)))
    return prompt
  }

/**
 * Updates a cached prompt and persists it.
 * @param {string} id
 * @param {{ title?: string, body?: string, publicTag?: string | null }} [patch]
 */
  function update(id, patch = {}) {
    const index = cache.findIndex((prompt) => prompt.id === id)
    if (index === -1) {
      return null
    }
    const next = applyPromptPatch(cache[index], patch)
    cache = cache.map((prompt, i) => (i === index ? next : clonePrompt(prompt)))
    enqueue(() => backend.writeDoc(clonePrompt(next)))
    return clonePrompt(next)
  }

  /**
   * Deletes a cached prompt and persists the removal.
   * @param {string} id
   */
  function remove(id) {
    const remaining = cache.filter((prompt) => prompt.id !== id)
    if (remaining.length === cache.length) {
      return false
    }
    cache = remaining.map(clonePrompt)
    enqueue(() => backend.deleteDoc(id))
    return true
  }

  /**
   * Reloads the cache from the backend.
   */
  async function load() {
    const docs = await backend.listDocs()
    cache = docs.filter(isPromptRecord).map(clonePrompt)
  }

  /**
   * Waits until queued persistence has finished.
   */
  async function flush() {
    await writes
  }

  return { list, get, create, update, remove, load, flush }
}

/**
 * Firestore backend for `cueUsers/{uid}/prompts/{promptId}`.
 * @param {import("firebase/firestore").Firestore} db
 * @param {string} uid
 */
export function createCuePrivateBackend(db, uid) {
  const prompts = collection(db, "cueUsers", uid, "prompts")
  return {
    async listDocs() {
      const snap = await getDocs(prompts)
      return snap.docs.map((snapshot) =>
        fromFirestorePrompt(snapshot.id, snapshot.data()),
      )
    },
    async writeDoc(prompt) {
      await setDoc(doc(prompts, prompt.id), toFirestorePrompt(prompt))
    },
    async deleteDoc(id) {
      await deleteDoc(doc(prompts, id))
    },
  }
}

/**
 * Firestore-backed private prompt store for a signed-in AI Cues account.
 * @param {import("firebase/firestore").Firestore} db
 * @param {string} uid
 */
export function createCueFirestoreStore(db, uid) {
  return createFirestorePromptStore(createCuePrivateBackend(db, uid))
}
