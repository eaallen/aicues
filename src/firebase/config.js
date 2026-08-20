import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

export const firebaseConfig = {
  apiKey: "AIzaSyDuIRR76xhNiz5ttcu8DtIVWAuCN04mDB0",
  authDomain: "fire-rat.firebaseapp.com",
  projectId: "fire-rat",
  storageBucket: "fire-rat.firebasestorage.app",
  messagingSenderId: "55755258244",
  appId: "1:55755258244:web:d99ce81f910af6b27305d1",
  measurementId: "G-M0QG4SCCTN",
}

/** @type {import("firebase/app").FirebaseApp | null} */
let app = null

/**
 * Returns the shared Firebase app, initializing it on first use.
 */
export function getCueApp() {
  if (!app) {
    app = initializeApp(firebaseConfig)
  }
  return app
}

/**
 * Returns Firebase Auth for AI Cues.
 */
export function getCueAuth() {
  return getAuth(getCueApp())
}

/**
 * Returns the default Firestore database used by AI Cues.
 */
export function getCueDb() {
  return getFirestore(getCueApp())
}
