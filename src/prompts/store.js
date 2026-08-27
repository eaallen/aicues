import {
  applyPromptPatch,
  buildPrompt,
  clonePrompt,
  isPromptRecord,
  sortByUpdatedAtDesc,
} from "./record.js"

export const PROMPTS_KEY = "cue.prompts"

/**
 * Creates a prompt store backed by a Web Storage-like object.
 * @param {Pick<Storage, "getItem" | "setItem">} [storage]
 * @param {string} [key]
 */
export function createPromptStore(storage = globalThis.localStorage, key = PROMPTS_KEY) {
  /**
   * Returns all valid prompts, newest updatedAt first.
   */
  function list() {
    return sortByUpdatedAtDesc(readAll(storage, key))
  }

  /**
   * Returns the prompt with the given id, or null if it is unknown.
   * @param {string} id
   */
  function get(id) {
    const found = readAll(storage, key).find((prompt) => prompt.id === id)
    return found ? clonePrompt(found) : null
  }

  /**
   * Creates and persists a prompt from optional title and body fields.
   * @param {{ title?: string, body?: string }} [input]
   */
  function create(input = {}) {
    const prompt = buildPrompt(input)
    writeAll(storage, key, [...readAll(storage, key), clonePrompt(prompt)])
    return prompt
  }

  /**
   * Updates an existing prompt; returns null when the id is unknown.
   * @param {string} id
   * @param {{ title?: string, body?: string, publicTag?: string | null }} [patch]
   */
  function update(id, patch = {}) {
    const prompts = readAll(storage, key)
    const index = prompts.findIndex((prompt) => prompt.id === id)
    if (index === -1) {
      return null
    }

    const next = applyPromptPatch(prompts[index], patch)
    writeAll(
      storage,
      key,
      prompts.map((prompt, i) => (i === index ? next : clonePrompt(prompt))),
    )
    return clonePrompt(next)
  }

  /**
   * Deletes a prompt by id.
   * @param {string} id
   */
  function remove(id) {
    const prompts = readAll(storage, key)
    const remaining = prompts.filter((prompt) => prompt.id !== id)
    if (remaining.length === prompts.length) {
      return false
    }
    writeAll(storage, key, remaining.map(clonePrompt))
    return true
  }

  return { list, get, create, update, remove }
}

/**
 * Reads valid prompt records from storage without throwing on corrupt data.
 * @param {Pick<Storage, "getItem" | "setItem">} storage
 * @param {string} key
 */
function readAll(storage, key) {
  const raw = storage.getItem(key)
  if (raw == null) {
    return []
  }
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed.filter(isPromptRecord).map(clonePrompt)
  } catch {
    return []
  }
}

/**
 * Writes a cloned JSON array of prompts to storage.
 * @param {Pick<Storage, "getItem" | "setItem">} storage
 * @param {string} key
 * @param {object[]} prompts
 */
function writeAll(storage, key, prompts) {
  storage.setItem(key, JSON.stringify(prompts.map(clonePrompt)))
}
