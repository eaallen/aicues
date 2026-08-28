import van from "vanjs-core"
import { sessionFromUser } from "../firebase/auth.js"
import { openProviderUrl } from "../providers/open-window.js"
import {
  DEFAULT_PROVIDER_ID,
  getProvider,
  listProviders,
  saveProviderId,
  storedProviderId,
} from "../providers/urls.js"
import { findPrompt } from "../prompts/record.js"
import { PrimaryProviderSelect } from "./provider-picker.js"
import { PublicPromptBoard, reorderForHighlight } from "./public-prompt-list.js"
import { launchPrompt } from "./session.js"

const { a, div, h1, p } = van.tags

/**
 * Default opener used outside of tests.
 * @param {string} url
 */
function defaultOpenUrl(url) {
  openProviderUrl(url)
}

/**
 * Home + profile/account chrome for public wallet pages.
 * @param {{ isAccount: boolean }} props
 */
function PublicWalletNav({ isAccount }) {
  return div(
    { class: "cue-session cue-public-nav" },
    a(
      {
        class: "btn btn-sm btn-ghost cue-btn-ghost",
        href: "/",
      },
      "AI Cues",
    ),
    a(
      {
        class: "btn btn-sm btn-ghost cue-btn-ghost",
        href: isAccount ? "/app/profile" : "/app",
      },
      isAccount ? "Your profile" : "Create account",
    ),
  )
}

/**
 * Read-only wallet shell for /w/:tag routes.
 * @param {{
 *   tag: string,
 *   highlightPromptId?: string,
 *   publicStore: {
 *     listByTag: (tag: string) => Promise<{
 *       profile: { tag: string },
 *       prompts: Array<{ id: string, title: string, body?: string }>,
 *     } | null>,
 *   },
 *   openUrl?: (url: string) => void,
 *   storage?: Pick<Storage, "getItem" | "setItem">,
 *   session?: { kind: "account" | "anonymous" },
 *   authApi?: {
 *     watch: (listener: (user: import("firebase/auth").User | null) => void) => void,
 *   },
 * }} props
 */
export function PublicWalletApp({
  tag,
  highlightPromptId,
  publicStore,
  openUrl,
  storage,
  session,
  authApi,
}) {
  const phase = van.state(
    /** @type {{ type: "loading" } | { type: "not-found" } | { type: "ready", profile: { tag: string }, prompts: object[] }} */ ({
      type: "loading",
    }),
  )
  const isAccount = van.state(session?.kind === "account")
  const prefStorage = storage ?? globalThis.localStorage
  const providerId = van.state(
    getProvider(storedProviderId(prefStorage) ?? DEFAULT_PROVIDER_ID).id,
  )
  const open = openUrl ?? defaultOpenUrl

  if (!session && authApi) {
    authApi.watch((user) => {
      isAccount.val = sessionFromUser(user)?.kind === "account"
    })
  }

  void publicStore.listByTag(tag).then((result) => {
    if (!result) {
      phase.val = { type: "not-found" }
      return
    }
    phase.val = {
      type: "ready",
      profile: result.profile,
      prompts: result.prompts,
    }
  })

  /**
   * Opens the prompt in the provider window.
   * @param {string} id
   * @param {string} [overrideProviderId]
   */
  function select(id, overrideProviderId) {
    const current = phase.val
    if (current.type !== "ready") {
      return
    }
    launchPrompt(
      findPrompt(current.prompts, id),
      overrideProviderId ?? providerId.val,
      open,
    )
  }

  /**
   * Switches the AI platform used when opening a prompt.
   * @param {string} id
   */
  function setProvider(id) {
    const next = getProvider(id).id
    providerId.val = next
    saveProviderId(next, prefStorage)
  }

  return div({ class: "cue-shell" }, () => {
    const current = phase.val
    const nav = PublicWalletNav({ isAccount: isAccount.val })

    if (current.type === "loading") {
      return div(
        { class: "cue-board" },
        nav,
        p({ class: "cue-empty" }, "Loading…"),
      )
    }

    if (current.type === "not-found") {
      return div(
        { class: "cue-board cue-wallet-not-found" },
        nav,
        h1({ class: "cue-wallet-not-found-title" }, "Wallet not found"),
        p({ class: "cue-empty" }, "This public wallet does not exist."),
      )
    }

    const highlightExists =
      highlightPromptId &&
      current.prompts.some((prompt) => prompt.id === highlightPromptId)
    const orderedPrompts = reorderForHighlight(
      current.prompts,
      highlightExists ? highlightPromptId : undefined,
    )

    return div(
      { class: "cue-board" },
      nav,
      h1({ class: "cue-public-header" }, `@${current.profile.tag}`),
      div(
        { class: "cue-library" },
        div(
          { class: "cue-toolbar" },
          div(
            { class: "cue-toolbar-end" },
            PrimaryProviderSelect({
              providers: listProviders(),
              selectedId: providerId.val,
              onChange: setProvider,
            }),
          ),
        ),
        PublicPromptBoard({
          prompts: orderedPrompts,
          highlightPromptId: highlightExists ? highlightPromptId : undefined,
          notFoundAlert: Boolean(highlightPromptId && !highlightExists),
          providerId: providerId.val,
          onSelect: select,
          onProviderChange: setProvider,
        }),
      ),
    )
  })
}
