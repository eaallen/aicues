import van from "vanjs-core"
import { findPrompt } from "../prompts/record.js"
import { createAuthApi, GUEST_STORAGE_WARNING, sessionFromUser } from "../firebase/auth.js"
import { getCueAuth, getCueDb } from "../firebase/config.js"
import { createProfileStore } from "../profile/firestore-store.js"
import { createCueFirestoreStore } from "../prompts/firestore-store.js"
import { createPromptStore } from "../prompts/store.js"
import { openProviderUrl } from "../providers/open-window.js"
import {
  DEFAULT_PROVIDER_ID,
  getProvider,
  saveProviderId,
  storedProviderId,
} from "../providers/urls.js"
import { AuthGate } from "./auth-gate.js"
import { Composer } from "./composer.js"
import { PromptBoard } from "./prompt-list.js"
import { ProfilePage } from "./profile-page.js"
import { launchPrompt } from "./session.js"

const { div, p } = van.tags

/**
 * Maps tray mode to the centered view.
 * @param {string} mode
 */
export function paneForMode(mode) {
  switch (mode) {
    case "compose":
      return "composer"
    case "list":
      return "list"
    default:
      return "list"
  }
}

/**
 * Creates reactive tray state and actions backed by a prompt store.
 * @param {{
 *   list: () => object[],
 *   get: (id: string) => object | null,
 *   create: (input?: { title?: string, body?: string }) => object,
 *   update: (id: string, patch?: { title?: string, body?: string }) => object | null,
 *   remove: (id: string) => boolean,
 * }} store
 * @param {{
 *   providerId?: string,
 *   openUrl?: (url: string) => void,
 *   onProviderChange?: (id: string) => void,
 * }} [options]
 */
export function createAppState(store, options = {}) {
  const prompts = van.state(store.list())
  const mode = van.state(/** @type {"list" | "compose"} */ ("list"))
  const editingId = van.state(/** @type {string | null} */ (null))
  const providerId = van.state(
    getProvider(options.providerId ?? DEFAULT_PROVIDER_ID).id,
  )
  const openUrl = options.openUrl ?? (() => {})

  /**
   * Reloads the prompt list from the store (assigns a new array).
   */
  function refresh() {
    prompts.val = store.list()
  }

  /**
   * Opens the composer for a new prompt.
   */
  function startNew() {
    editingId.val = null
    mode.val = "compose"
  }

  /**
   * Opens the prompt in the provider window and stays on the list.
   * @param {string} id
   * @param {string} [overrideProviderId]
   */
  function select(id, overrideProviderId) {
    launchPrompt(
      findPrompt(prompts.val, id),
      overrideProviderId ?? providerId.val,
      openUrl,
    )
  }

  /**
   * Opens the composer to edit an existing prompt.
   * @param {string} id
   */
  function startEdit(id) {
    editingId.val = id
    mode.val = "compose"
  }

  /**
   * Leaves the composer without saving.
   */
  function cancelCompose() {
    editingId.val = null
    mode.val = "list"
  }

  /**
   * Creates or updates a prompt, then returns to the list.
   * @param {{ title?: string, body?: string }} fields
   */
  function save(fields) {
    const currentEdit = editingId.val
    const prompt = currentEdit
      ? store.update(currentEdit, fields)
      : store.create(fields)
    refresh()
    editingId.val = null
    mode.val = "list"
    return prompt
  }

  /**
   * Deletes a prompt after confirmation.
   * @param {string} id
   * @param {{ confirm?: (message: string) => boolean }} [opts]
   */
  function remove(id, opts = {}) {
    const confirmFn = opts.confirm ?? ((message) => window.confirm(message))
    if (!confirmFn("Delete this prompt?")) {
      return false
    }
    const wasEditing = editingId.val === id
    store.remove(id)
    refresh()
    if (wasEditing) {
      editingId.val = null
      mode.val = "list"
    }
    return true
  }

  /**
   * Prompt currently loaded in the composer, if editing.
   */
  function editingPrompt() {
    return findPrompt(prompts.val, editingId.val)
  }

  /**
   * Switches the AI platform used when opening a prompt.
   * @param {string} id
   */
  function setProvider(id) {
    const next = getProvider(id).id
    providerId.val = next
    options.onProviderChange?.(next)
  }

  return {
    prompts,
    mode,
    editingId,
    providerId,
    refresh,
    startNew,
    select,
    startEdit,
    cancelCompose,
    save,
    remove,
    editingPrompt,
    setProvider,
  }
}

/**
 * Default opener used outside of tests.
 * @param {string} url
 */
function defaultOpenUrl(url) {
  openProviderUrl(url)
}

/**
 * Signed-in library: composer or prompt list.
 * @param {{
 *   store: ReturnType<typeof createPromptStore>,
 *   openUrl?: (url: string) => void,
 *   storage?: Pick<Storage, "getItem" | "setItem">,
 *   session?: {
 *     kind: "anonymous" | "account",
 *     label: string,
 *     onSignOut?: () => void,
 *   },
 * }} props
 */
export function LibraryApp({ store, openUrl, storage, session }) {
  const open = openUrl ?? defaultOpenUrl
  const prefStorage = storage ?? globalThis.localStorage
  const state = createAppState(store, {
    openUrl: open,
    providerId: storedProviderId(prefStorage),
    onProviderChange: (id) => {
      saveProviderId(id, prefStorage)
    },
  })

  return div(
    { class: "cue-shell" },
    LibraryBoard({ state, session }),
  )
}

/**
 * Centered board for list, composer, or profile.
 * @param {{
 *   state: ReturnType<typeof createAppState>,
 *   session?: {
 *     kind: "anonymous" | "account",
 *     label: string,
 *     onSignOut?: () => void,
 *   },
 *   route?: { kind: string },
 *   profileStore?: ReturnType<typeof createProfileStore>,
 *   authEmail?: string | null,
 *   promptStore?: {
 *     get: (id: string) => object | null,
 *     update: (id: string, patch?: object) => object | null,
 *   },
 * }} props
 */
function LibraryBoard({ state, session, route, profileStore, authEmail, promptStore }) {
  return div(
    { class: "cue-board" },
    () => {
      if (
        route?.kind === "app-profile" &&
        session?.kind === "anonymous"
      ) {
        window.location.replace("/app")
        return p({ class: "cue-empty" }, "Loading…")
      }
      if (
        route?.kind === "app-profile" &&
        session?.kind === "account" &&
        profileStore
      ) {
        return ProfilePage({
          profileStore,
          authEmail,
          onBack: () => {
            window.location.assign("/app")
          },
        })
      }
      if (paneForMode(state.mode.val) === "composer") {
        return Composer({
          prompt: state.editingPrompt(),
          onSave: (fields) => {
            state.save(fields)
          },
          onCancel: () => state.cancelCompose(),
        })
      }
      return PromptBoard({ state, session, profileStore, promptStore })
    },
  )
}

/**
 * Auth-aware root: gate, then local or Firestore library.
 * @param {{
 *   openUrl?: (url: string) => void,
 *   storage?: Pick<Storage, "getItem" | "setItem">,
 *   authApi?: ReturnType<typeof createAuthApi>,
 *   createAccountStore?: (uid: string) => {
 *     list: () => object[],
 *     get: (id: string) => object | null,
 *     create: (input?: object) => object,
 *     update: (id: string, patch?: object) => object | null,
 *     remove: (id: string) => boolean,
 *     load?: () => Promise<void>,
 *   },
 *   warn?: (message: string) => void,
 *   route?: { kind: string },
 * }} [props]
 */
export function AuthenticatedApp({
  openUrl,
  storage,
  authApi,
  createAccountStore,
  warn = console.warn,
  route = { kind: "app" },
} = {}) {
  const api = authApi ?? createAuthApi(getCueAuth())
  const makeAccountStore =
    createAccountStore ??
    ((uid) => createCueFirestoreStore(getCueDb(), uid))
  const phase = van.state(
    /** @type {{ type: "loading" } | { type: "gate" } | { type: "app", session: object, store: object }} */ ({
      type: "loading",
    }),
  )
  let lastUid = /** @type {string | null | undefined} */ (undefined)

  api.watch((user) => {
    const uid = user?.uid ?? null
    if (uid === lastUid) {
      return
    }
    lastUid = uid
    const session = sessionFromUser(user)
    if (!session) {
      phase.val = { type: "gate" }
      return
    }
    if (session.kind === "anonymous") {
      warn(GUEST_STORAGE_WARNING)
      phase.val = {
        type: "app",
        session,
        store: createPromptStore(storage ?? globalThis.localStorage),
      }
      return
    }
    const store = makeAccountStore(session.user.uid)
    phase.val = { type: "loading" }
    const loaded = store.load ? store.load() : Promise.resolve()
    void loaded
      .catch((error) => {
        console.error("Failed to load prompts", error)
      })
      .then(() => {
        if (lastUid !== uid) {
          return
        }
        phase.val = { type: "app", session, store }
      })
  })

  return div({ class: "cue-shell" }, () => {
    const current = phase.val
    if (current.type === "loading") {
      return div({ class: "cue-board" }, p({ class: "cue-empty" }, "Loading…"))
    }
    if (current.type === "gate") {
      return div({ class: "cue-gate" }, AuthGate({ authApi: api }))
    }
    const open = openUrl ?? defaultOpenUrl
    const prefStorage = storage ?? globalThis.localStorage
    const state = createAppState(current.store, {
      openUrl: open,
      providerId: storedProviderId(prefStorage),
      onProviderChange: (id) => {
        saveProviderId(id, prefStorage)
      },
    })
    const profileStore =
      current.session.kind === "account"
        ? createProfileStore(getCueDb(), current.session.user.uid)
        : undefined
    return LibraryBoard({
      state,
      route,
      profileStore,
      promptStore: current.store,
      authEmail:
        current.session.kind === "account"
          ? current.session.user.email
          : null,
      session: {
        kind: current.session.kind,
        label: current.session.label,
        onSignOut: () => {
          void api.signOut()
        },
      },
    })
  })
}

/**
 * Root prompt library.
 * @param {{
 *   store?: ReturnType<typeof createPromptStore>,
 *   openUrl?: (url: string) => void,
 *   storage?: Pick<Storage, "getItem" | "setItem">,
 *   route?: { kind: string },
 * }} [props]
 */
export function App({ store, openUrl, storage, route = { kind: "app" } } = {}) {
  if (store) {
    return LibraryApp({ store, openUrl, storage })
  }
  return AuthenticatedApp({ openUrl, storage, route })
}
