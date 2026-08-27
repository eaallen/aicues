import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from "firebase/firestore"
import { clonePrompt, sortByUpdatedAtDesc } from "./record.js"
import { TagTakenError, normalizePublicTag, validatePublicTag } from "./tag.js"

export { TagTakenError }

/**
 * Whether a stored value is a public prompt with a non-empty tag.
 * @param {unknown} record
 */
export function isPublicPromptRecord(record) {
  if (record === null || typeof record !== "object" || Array.isArray(record)) {
    return false
  }
  const tag = /** @type {{ tag?: unknown }} */ (record).tag
  return typeof tag === "string" && tag.length > 0
}

/**
 * Firestore fields for a public prompt; tag lives in the document path too.
 * @param {object} prompt
 */
export function toPublicPrompt(prompt) {
  return {
    tag: String(prompt.tag ?? ""),
    promptId: String(prompt.promptId ?? ""),
    ownerUid: String(prompt.ownerUid ?? ""),
    title: String(prompt.title ?? ""),
    body: String(prompt.body ?? ""),
    createdAt: Number(prompt.createdAt) || 0,
    updatedAt: Number(prompt.updatedAt) || 0,
  }
}

/**
 * Rebuilds a public prompt from a Firestore document.
 * @param {string} tag
 * @param {object} [data]
 */
export function fromPublicPrompt(tag, data = {}) {
  return {
    tag,
    promptId: typeof data.promptId === "string" ? data.promptId : "",
    ownerUid: typeof data.ownerUid === "string" ? data.ownerUid : "",
    title: typeof data.title === "string" ? data.title : "",
    body: typeof data.body === "string" ? data.body : "",
    createdAt: Number(data.createdAt) || 0,
    updatedAt: Number(data.updatedAt) || 0,
  }
}

/**
 * Builds the public document for a private prompt and share tag.
 * @param {{
 *   tag: string,
 *   prompt: { id: string, title?: string, body?: string, createdAt?: number, updatedAt?: number },
 *   ownerUid: string,
 *   createdAt?: number,
 *   updatedAt?: number,
 * }} input
 */
export function buildPublicPrompt({ tag, prompt, ownerUid, createdAt, updatedAt }) {
  const now = Date.now()
  return {
    tag,
    promptId: prompt.id,
    ownerUid,
    title: String(prompt.title ?? ""),
    body: String(prompt.body ?? ""),
    createdAt: createdAt ?? (Number(prompt.createdAt) || now),
    updatedAt: updatedAt ?? (Number(prompt.updatedAt) || now),
  }
}

/**
 * Public prompt catalog with async persistence.
 * @param {{
 *   listDocs: () => Promise<object[]>,
 *   getDoc: (tag: string) => Promise<object | null>,
 *   writeDoc: (prompt: object) => Promise<void>,
 *   deleteDoc: (tag: string) => Promise<void>,
 * }} backend
 */
export function createPublicPromptStore(backend) {
  /**
   * Returns all public prompts, newest updatedAt first.
   */
  async function list() {
    const docs = await backend.listDocs()
    return sortByUpdatedAtDesc(docs.filter(isPublicPromptRecord).map(clonePrompt))
  }

  /**
   * Returns the public prompt for a tag, or null.
   * @param {string} tag
   */
  async function get(tag) {
    const normalized = normalizePublicTag(tag)
    if (!normalized) {
      return null
    }
    const found = await backend.getDoc(normalized)
    return found && isPublicPromptRecord(found) ? clonePrompt(found) : null
  }

  /**
   * Publishes a private prompt under a unique tag.
   * @param {{
   *   tag: string,
   *   prompt: { id: string, title?: string, body?: string, createdAt?: number, updatedAt?: number },
   *   ownerUid: string,
   *   previousTag?: string,
   * }} input
   */
  async function publish({ tag, prompt, ownerUid, previousTag }) {
    const normalized = normalizePublicTag(tag)
    const checked = validatePublicTag(normalized)
    if (!checked.ok) {
      throw new Error(checked.error)
    }
    const existing = await backend.getDoc(normalized)
    if (
      existing &&
      (existing.ownerUid !== ownerUid || existing.promptId !== prompt.id)
    ) {
      throw new TagTakenError()
    }
    const record = buildPublicPrompt({
      tag: normalized,
      prompt,
      ownerUid,
      createdAt: existing?.createdAt,
      updatedAt: Date.now(),
    })
    await backend.writeDoc(record)
    const previous = normalizePublicTag(previousTag)
    if (previous && previous !== normalized) {
      const prior = await backend.getDoc(previous)
      if (prior && prior.ownerUid === ownerUid && prior.promptId === prompt.id) {
        await backend.deleteDoc(previous)
      }
    }
    return clonePrompt(record)
  }

  /**
   * Updates an already-public copy when the owner edits the private prompt.
   * @param {string} tag
   * @param {{ id: string, title?: string, body?: string, updatedAt?: number }} prompt
   * @param {string} ownerUid
   */
  async function sync(tag, prompt, ownerUid) {
    const normalized = normalizePublicTag(tag)
    if (!normalized) {
      return null
    }
    const existing = await backend.getDoc(normalized)
    if (!existing || existing.ownerUid !== ownerUid) {
      return null
    }
    if (existing.promptId && existing.promptId !== prompt.id) {
      return null
    }
    const record = {
      ...existing,
      title: String(prompt.title ?? existing.title ?? ""),
      body: String(prompt.body ?? existing.body ?? ""),
      updatedAt: Number(prompt.updatedAt) || Date.now(),
    }
    await backend.writeDoc(record)
    return clonePrompt(record)
  }

  /**
   * Removes a public prompt when the owner unpublishes it.
   * @param {string} tag
   * @param {string} ownerUid
   */
  async function unpublish(tag, ownerUid) {
    const normalized = normalizePublicTag(tag)
    if (!normalized) {
      return false
    }
    const existing = await backend.getDoc(normalized)
    if (!existing) {
      return false
    }
    if (existing.ownerUid !== ownerUid) {
      throw new Error("You cannot unpublish this prompt.")
    }
    await backend.deleteDoc(normalized)
    return true
  }

  return { list, get, publish, sync, unpublish }
}

/**
 * Firestore backend for `publicPrompts/{tag}`.
 *
 * Uses standard getDocs/getDoc (not pipelines) so listing and tag lookup match
 * the existing private prompt store and stay a simple collection read plus
 * document-id get.
 * @param {import("firebase/firestore").Firestore} db
 */
export function createCuePublicBackend(db) {
  const prompts = collection(db, "publicPrompts")
  return {
    async listDocs() {
      const snap = await getDocs(prompts)
      return snap.docs.map((snapshot) =>
        fromPublicPrompt(snapshot.id, snapshot.data()),
      )
    },
    async getDoc(tag) {
      const snap = await getDoc(doc(prompts, tag))
      return snap.exists() ? fromPublicPrompt(snap.id, snap.data()) : null
    },
    async writeDoc(prompt) {
      await setDoc(doc(prompts, prompt.tag), toPublicPrompt(prompt))
    },
    async deleteDoc(tag) {
      await deleteDoc(doc(prompts, tag))
    },
  }
}

/**
 * Firestore-backed public prompt catalog.
 * @param {import("firebase/firestore").Firestore} db
 */
export function createCuePublicStore(db) {
  return createPublicPromptStore(createCuePublicBackend(db))
}
