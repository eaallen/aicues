/**
 * In-memory Web Storage stand-in so tests do not touch real localStorage.
 */
export function createMemoryStorage() {
  /** @type {Record<string, string>} */
  const data = {}
  return {
    /**
     * Returns the stored string for a key, or null if missing.
     * @param {string} key
     */
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null
    },
    /**
     * Saves a string value under a key.
     * @param {string} key
     * @param {string} value
     */
    setItem(key, value) {
      data[key] = String(value)
    },
  }
}
