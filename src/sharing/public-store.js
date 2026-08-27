import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore"
import { fromFirestorePrompt, sortByUpdatedAtDesc } from "../prompts/record.js"
import { normalizeTag } from "../profile/record.js"

/**
 * Whether a Firestore document snapshot exists and has data.
 * @param {{ exists?: () => boolean } | null | undefined} snapshot
 */
function snapshotExists(snapshot) {
  return Boolean(snapshot?.exists?.())
}

/**
 * Resolves a tag document to the owner's uid.
 * @param {import("firebase/firestore").Firestore} db
 * @param {string} tag
 */
async function resolveUidForTag(db, tag) {
  const tagSnap = await getDoc(doc(db, "userTags", tag))
  if (!snapshotExists(tagSnap)) {
    return null
  }
  const uid = tagSnap.data()?.uid
  return typeof uid === "string" && uid.length > 0 ? uid : null
}

/**
 * Read-only access to public wallets by tag.
 * @param {import("firebase/firestore").Firestore} db
 */
export function createPublicPromptStore(db) {
  /**
   * Resolves tag → uid, loads profile header + public prompts.
   * Returns null when tag unknown.
   * @param {string} tag
   */
  async function listByTag(rawTag) {
    const tag = normalizeTag(rawTag)
    const uid = await resolveUidForTag(db, tag)
    if (!uid) {
      return null
    }

    const profileSnap = await getDoc(doc(db, "cueUsers", uid))
    const profileData = profileSnap.exists() ? profileSnap.data() : {}
    const profileTag =
      typeof profileData?.tag === "string" && profileData.tag.length > 0
        ? profileData.tag
        : tag

    const promptsRef = collection(db, "cueUsers", uid, "prompts")
    const snap = await getDocs(
      query(promptsRef, where("isPublic", "==", true)),
    )
    const prompts = snap.docs.map((snapshot) =>
      fromFirestorePrompt(snapshot.id, snapshot.data()),
    )

    return {
      profile: { tag: profileTag },
      prompts: sortByUpdatedAtDesc(prompts),
    }
  }

  /**
   * Returns one public prompt or null.
   * @param {string} tag
   * @param {string} promptId
   */
  async function getPublic(rawTag, promptId) {
    const tag = normalizeTag(rawTag)
    const uid = await resolveUidForTag(db, tag)
    if (!uid) {
      return null
    }

    const promptSnap = await getDoc(
      doc(db, "cueUsers", uid, "prompts", promptId),
    )
    if (!snapshotExists(promptSnap)) {
      return null
    }

    const data = promptSnap.data()
    if (!data?.isPublic) {
      return null
    }

    return fromFirestorePrompt(promptId, data)
  }

  return { listByTag, getPublic }
}
