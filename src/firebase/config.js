import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

/** Google Analytics 4 measurement ID (Firebase Analytics / gtag). */
export const GA_MEASUREMENT_ID = "G-M0QG4SCCTN"

export const firebaseConfig = {
  apiKey: "AIzaSyDuIRR76xhNiz5ttcu8DtIVWAuCN04mDB0",
  authDomain: "fire-rat.firebaseapp.com",
  projectId: "fire-rat",
  storageBucket: "fire-rat.firebasestorage.app",
  messagingSenderId: "55755258244",
  appId: "1:55755258244:web:d99ce81f910af6b27305d1",
  measurementId: GA_MEASUREMENT_ID,
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
