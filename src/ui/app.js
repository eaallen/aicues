import van from "vanjs-core"
import { createAuthApi, GUEST_STORAGE_WARNING, sessionFromUser } from "../firebase/auth.js"
import { getCueAuth, getCueDb } from "../firebase/config.js"
import { createCueAccountStore } from "../prompts/account-store.js"
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
import { PublicWalletApp } from "./public-wallet.js"
import { routeFromPath } from "./routes.js"
import { SharePane } from "./share.js"
import { launchPrompt } from "./session.js"

const { div, p } = van.tags

/**
 * Finds a prompt by id in a list.
 * @param {Array<{ id: string }>} prompts
 * @param {string | null | undefined} id
 */
export function findPrompt(prompts, id) {
  if (!id) {
    return null
  }
  return prompts.find((prompt) => prompt.id === id) ?? null
}

/**
 * Maps tray mode to the centered view.
 * @param {string} mode
 */
export function paneForMode(mode) {
  switch (mode) {
    case "compose":
      return "composer"
    case "share":
      return "share"
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
 *   update: (id: string, patch?: { title?: string, body?: string, publicTag?: string | null }) => object | null,
 *   remove: (id: string) => boolean,
 *   publish?: (id: string, tag: string) => Promise<string>,
 *   unpublish?: (id: string) => Promise<boolean>,
 * }} store
 * @param {{
 *   providerId?: string,
 *   openUrl?: (url: string) => void,
 *   onProviderChange?: (id: string) => void,
 * }} [options]
 */
export function createAppState(store, options = {}) {
  const prompts = van.state(store.list())
  const mode = van.state(/** @type {"list" | "compose" | "share"} */ ("list"))
  const editingId = van.state(/** @type {string | null} */ (null))
  const sharingId = van.state(/** @type {string | null} */ (null))
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
    sharingId.val = null
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
    sharingId.val = null
    mode.val = "compose"
  }

  /**
   * Opens the share pane for an existing prompt.
   * @param {string} id
   */
  function startShare(id) {
    if (!findPrompt(prompts.val, id)) {
      return
    }
    sharingId.val = id
    editingId.val = null
    mode.val = "share"
  }

  /**
   * Leaves the composer without saving.
   */
  function cancelCompose() {
    editingId.val = null
    mode.val = "list"
  }

  /**
   * Leaves the share pane.
   */
  function cancelShare() {
    sharingId.val = null
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
    sharingId.val = null
    mode.val = "list"
    return prompt
  }

  /**
   * Publishes the prompt currently in the share pane.
   * @param {string} rawTag
   */
  async function publish(rawTag) {
    const id = sharingId.val
    if (!id) {
      return { ok: false, error: "Prompt not found." }
    }
    if (typeof store.publish !== "function") {
      return { ok: false, error: "Sign in to make a prompt public." }
    }
    try {
      const tag = await store.publish(id, rawTag)
      refresh()
      return { ok: true, tag }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not publish."
      return { ok: false, error: message }
    }
  }

  /**
   * Removes the prompt currently in the share pane from the public wallet.
   */
  async function unpublish() {
    const id = sharingId.val
    if (!id) {
      return { ok: false, error: "Prompt not found." }
    }
    if (typeof store.unpublish !== "function") {
      return { ok: false, error: "Sign in to make a prompt public." }
    }
    try {
      await store.unpublish(id)
      refresh()
      return { ok: true }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not unpublish."
      return { ok: false, error: message }
    }
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
    const wasSharing = sharingId.val === id
    store.remove(id)
    refresh()
    if (wasEditing || wasSharing) {
      editingId.val = null
      sharingId.val = null
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
   * Prompt currently loaded in the share pane.
   */
  function sharingPrompt() {
    return findPrompt(prompts.val, sharingId.val)
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
    sharingId,
    providerId,
    refresh,
    startNew,
    select,
    startEdit,
    startShare,
    cancelCompose,
    cancelShare,
    save,
    publish,
    unpublish,
    remove,
    editingPrompt,
    sharingPrompt,
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
 * Centered board for list or composer.
 * @param {{
 *   state: ReturnType<typeof createAppState>,
 *   session?: {
 *     kind: "anonymous" | "account",
 *     label: string,
 *     onSignOut?: () => void,
 *   },
 * }} props
 */
function LibraryBoard({ state, session }) {
  return div(
    { class: "cue-board" },
    () => {
      const pane = paneForMode(state.mode.val)
      if (pane === "composer") {
        return Composer({
          prompt: state.editingPrompt(),
          onSave: (fields) => {
            state.save(fields)
          },
          onCancel: () => state.cancelCompose(),
        })
      }
      if (pane === "share") {
        return SharePane({
          prompt: state.sharingPrompt(),
          onPublish: (tag) => state.publish(tag),
          onUnpublish: () => state.unpublish(),
          onCancel: () => state.cancelShare(),
        })
      }
      return PromptBoard({ state, session })
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
 *     publish?: (id: string, tag: string) => Promise<string>,
 *     unpublish?: (id: string) => Promise<boolean>,
 *   },
 *   warn?: (message: string) => void,
 * }} [props]
 */
export function AuthenticatedApp({
  openUrl,
  storage,
  authApi,
  createAccountStore,
  warn = console.warn,
} = {}) {
  const api = authApi ?? createAuthApi(getCueAuth())
  const makeAccountStore =
    createAccountStore ??
    ((uid) => createCueAccountStore(getCueDb(), uid))
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
    return LibraryBoard({
      state,
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
 * }} [props]
 */
export function App({ store, openUrl, storage } = {}) {
  if (store) {
    return LibraryApp({ store, openUrl, storage })
  }
  return AuthenticatedApp({ openUrl, storage })
}

/**
 * Path-aware root: public wallet at `/w`, signed-in library otherwise.
 * @param {{
 *   path?: string,
 *   store?: ReturnType<typeof createPromptStore>,
 *   publicStore?: { list: () => Promise<object[]> },
 *   openUrl?: (url: string) => void,
 *   storage?: Pick<Storage, "getItem" | "setItem">,
 * }} [props]
 */
export function Root(props = {}) {
  const path = props.path ?? globalThis.location?.pathname ?? "/app"
  const route = routeFromPath(path)
  if (route.kind === "public") {
    return PublicWalletApp({
      initialTag: route.tag,
      publicStore: props.publicStore,
      openUrl: props.openUrl,
      storage: props.storage,
    })
  }
  return App(props)
}
