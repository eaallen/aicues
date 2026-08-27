import {
  doc,
  getDoc,
  runTransaction,
} from "firebase/firestore"
import { buildProfile, normalizeTag, validateTag } from "./record.js"

/**
 * Rebuilds a profile from Firestore document data.
 * @param {object} [data]
 */
function fromFirestoreProfile(data = {}) {
  if (typeof data.tag !== "string" || !data.tag) {
    return null
  }
  return buildProfile({
    tag: data.tag,
    updatedAt: Number(data.updatedAt) || 0,
  })
}

/**
 * Firestore fields for a profile document.
 * @param {import("./record.js").Profile} profile
 */
function toFirestoreProfile(profile) {
  return {
    tag: profile.tag,
    updatedAt: profile.updatedAt,
  }
}

/**
 * Profile persistence for a signed-in account user.
 * @param {import("firebase/firestore").Firestore} db
 * @param {string} uid
 */
export function createProfileStore(db, uid) {
  const profileRef = doc(db, "cueUsers", uid)

  /**
   * Loads profile or null if none exists.
   */
  async function get() {
    const snap = await getDoc(profileRef)
    if (!snap.exists()) {
      return null
    }
    return fromFirestoreProfile(snap.data())
  }

  /**
   * True when no other uid owns this normalized tag (or current user already owns it).
   * @param {string} tag - normalized tag
   */
  async function isTagAvailable(tag) {
    const tagRef = doc(db, "userTags", tag)
    const snap = await getDoc(tagRef)
    if (!snap.exists()) {
      return true
    }
    const owner = snap.data()?.uid
    return owner === uid
  }

  /**
   * Sets or changes the user's tag (transaction: profile + userTags index).
   * @param {string} rawTag
   */
  async function setTag(rawTag) {
    const tag = normalizeTag(rawTag)
    const validationError = validateTag(tag)
    if (validationError) {
      throw new Error(validationError)
    }

    const profile = await runTransaction(db, async (transaction) => {
      const profileSnap = await transaction.get(profileRef)
      const currentProfile = profileSnap.exists()
        ? fromFirestoreProfile(profileSnap.data())
        : null
      const oldTag = currentProfile?.tag ?? null

      const tagRef = doc(db, "userTags", tag)
      const tagSnap = await transaction.get(tagRef)
      if (tagSnap.exists() && tagSnap.data()?.uid !== uid) {
        throw new Error("That tag is already taken")
      }

      if (oldTag && oldTag !== tag) {
        transaction.delete(doc(db, "userTags", oldTag))
      }

      const nextProfile = buildProfile({ tag })
      transaction.set(profileRef, toFirestoreProfile(nextProfile))
      transaction.set(tagRef, { uid })
      return nextProfile
    })

    return profile
  }

  return { get, setTag, isTagAvailable }
}
