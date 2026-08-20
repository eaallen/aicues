import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth"

export const GUEST_STORAGE_WARNING =
  "AI Cues guest mode: prompts are stored only in this browser. They are not synced and can be lost if you clear site data. Sign in to save them in the cloud."

/**
 * Maps a Firebase Auth error code to a short message.
 * @param {unknown} error
 */
export function authErrorMessage(error) {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(/** @type {{ code?: unknown }} */ (error).code)
      : ""
  switch (code) {
    case "auth/invalid-email":
      return "Enter a valid email address."
    case "auth/missing-password":
    case "auth/weak-password":
      return "Use a password with at least 6 characters."
    case "auth/email-already-in-use":
      return "That email already has an account. Try signing in."
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Email or password is incorrect."
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Google sign-in was cancelled."
    case "auth/unauthorized-domain":
      return "This domain is not authorized for sign-in."
    default:
      return "Could not sign in. Try again."
  }
}

/**
 * Auth helpers used by the sign-in gate and session bar.
 * @param {import("firebase/auth").Auth} auth
 */
export function createAuthApi(auth) {
  const googleProvider = new GoogleAuthProvider()

  return {
    /**
     * Subscribes to auth state changes.
     * @param {(user: import("firebase/auth").User | null) => void} listener
     */
    watch(listener) {
      return onAuthStateChanged(auth, listener)
    },
    /**
     * Signs in with a Google popup.
     */
    signInWithGoogle() {
      return signInWithPopup(auth, googleProvider)
    },
    /**
     * Signs in with email and password.
     * @param {string} email
     * @param {string} password
     */
    signInWithEmail(email, password) {
      return signInWithEmailAndPassword(auth, email, password)
    },
    /**
     * Creates an email/password account and signs in.
     * @param {string} email
     * @param {string} password
     */
    createWithEmail(email, password) {
      return createUserWithEmailAndPassword(auth, email, password)
    },
    /**
     * Signs in anonymously for guest mode.
     */
    signInAnonymously() {
      return signInAnonymously(auth)
    },
    /**
     * Signs out the current user.
     */
    signOut() {
      return signOut(auth)
    },
  }
}

/**
 * Session kind used to choose local vs Firestore storage.
 * @param {import("firebase/auth").User | null} user
 */
export function sessionFromUser(user) {
  if (!user) {
    return null
  }
  if (user.isAnonymous) {
    return {
      kind: /** @type {const} */ ("anonymous"),
      label: "Guest",
      user,
    }
  }
  return {
    kind: /** @type {const} */ ("account"),
    label: user.email || user.displayName || "Signed in",
    user,
  }
}
