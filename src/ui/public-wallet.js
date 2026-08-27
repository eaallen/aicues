import van from "vanjs-core"
import { getCueDb } from "../firebase/config.js"
import { createCuePublicStore } from "../prompts/public-store.js"
import { normalizePublicTag, publicWalletPath } from "../prompts/tag.js"
import {
  DEFAULT_PROVIDER_ID,
  getProvider,
  listProviders,
  saveProviderId,
  storedProviderId,
} from "../providers/urls.js"
import { promptSnippet } from "./prompt-list.js"
import { LaunchProviderMenu, PrimaryProviderSelect } from "./provider-picker.js"
import { routeFromPath } from "./routes.js"
import { launchPrompt } from "./session.js"

const { a, button, div, h1, p, pre, span, ul, li } = van.tags

/**
 * Finds a public prompt by share tag.
 * @param {Array<{ tag: string }>} prompts
 * @param {string | null | undefined} tag
 */
export function findPublicPrompt(prompts, tag) {
  if (!tag) {
    return null
  }
  const normalized = normalizePublicTag(tag) || tag
  return prompts.find((prompt) => prompt.tag === normalized) ?? null
}

/**
 * Reactive public wallet: selected prompt plus the public catalog.
 * @param {object[]} prompts
 * @param {{
 *   tag?: string | null,
 *   providerId?: string,
 *   openUrl?: (url: string) => void,
 *   onProviderChange?: (id: string) => void,
 *   onNavigate?: (tag: string | null) => void,
 * }} [options]
 */
export function createPublicWalletState(prompts, options = {}) {
  const list = van.state(prompts)
  const selectedTag = van.state(
    options.tag ? normalizePublicTag(options.tag) || options.tag : null,
  )
  const providerId = van.state(
    getProvider(options.providerId ?? DEFAULT_PROVIDER_ID).id,
  )
  const openUrl = options.openUrl ?? (() => {})

  /**
   * Reloads the catalog from an array.
   * @param {object[]} next
   */
  function setPrompts(next) {
    list.val = next
  }

  /**
   * Focuses a public prompt and optionally notifies the URL layer.
   * @param {string | null} tag
   * @param {{ navigate?: boolean }} [opts]
   */
  function select(tag, opts = {}) {
    const next = tag ? normalizePublicTag(tag) || tag : null
    selectedTag.val = next
    if (opts.navigate !== false) {
      options.onNavigate?.(next)
    }
  }

  /**
   * Opens the selected prompt in the chosen AI.
   * @param {string} [overrideProviderId]
   */
  function launch(overrideProviderId) {
    launchPrompt(
      selectedPrompt(),
      overrideProviderId ?? providerId.val,
      openUrl,
    )
  }

  /**
   * Prompt currently opened in the public wallet.
   */
  function selectedPrompt() {
    return findPublicPrompt(list.val, selectedTag.val)
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
    prompts: list,
    selectedTag,
    providerId,
    setPrompts,
    select,
    launch,
    selectedPrompt,
    setProvider,
  }
}

/**
 * Public catalog anyone can browse; a share URL opens a prompt already.
 * @param {{
 *   initialTag?: string | null,
 *   publicStore?: { list: () => Promise<object[]> },
 *   openUrl?: (url: string) => void,
 *   storage?: Pick<Storage, "getItem" | "setItem">,
 *   location?: { pathname?: string },
 *   history?: { pushState: (data: unknown, unused: string, url: string) => void },
 * }} [props]
 */
export function PublicWalletApp({
  initialTag,
  publicStore,
  openUrl,
  storage,
  location,
  history,
} = {}) {
  const loc = location ?? globalThis.location
  const hist = history ?? globalThis.history
  const store = publicStore ?? createCuePublicStore(getCueDb())
  const prefStorage = storage ?? globalThis.localStorage
  const phase = van.state(
    /** @type {{ type: "loading" } | { type: "ready" } | { type: "error", message: string }} */ ({
      type: "loading",
    }),
  )
  const state = createPublicWalletState([], {
    tag: initialTag ?? null,
    openUrl,
    providerId: storedProviderId(prefStorage),
    onProviderChange: (id) => {
      saveProviderId(id, prefStorage)
    },
    onNavigate: (tag) => {
      const path = publicWalletPath(tag)
      if (hist?.pushState && loc?.pathname !== path) {
        hist.pushState({ tag }, "", path)
      }
    },
  })

  void store
    .list()
    .then((prompts) => {
      state.setPrompts(prompts)
      phase.val = { type: "ready" }
    })
    .catch((error) => {
      console.error("Failed to load public prompts", error)
      phase.val = {
        type: "error",
        message: "Could not load the public wallet.",
      }
    })

  if (loc === globalThis.location && globalThis.window) {
    globalThis.window.addEventListener("popstate", () => {
      const route = routeFromPath(globalThis.location.pathname)
      if (route.kind === "public") {
        state.select(route.tag, { navigate: false })
      }
    })
  }

  return div({ class: "cue-shell" }, () => {
    const current = phase.val
    if (current.type === "loading") {
      return div({ class: "cue-board" }, p({ class: "cue-empty" }, "Loading…"))
    }
    if (current.type === "error") {
      return div({ class: "cue-board" }, p({ class: "cue-empty" }, current.message))
    }
    return div({ class: "cue-board" }, PublicWalletBoard({ state }))
  })
}

/**
 * Selected public prompt plus the rest of the catalog.
 * @param {{ state: ReturnType<typeof createPublicWalletState> }} props
 */
export function PublicWalletBoard({ state }) {
  return div(
    { class: "cue-library" },
    div(
      { class: "cue-session" },
      span({ class: "cue-session-label" }, "Public wallet"),
      a({ href: "/app", class: "cue-text-link" }, "Your prompts"),
    ),
    () => {
      state.prompts.val
      state.selectedTag.val
      state.providerId.val
      return PublicPromptDetail({ state })
    },
    () =>
      PublicPromptList({
        prompts: state.prompts.val,
        selectedTag: state.selectedTag.val,
        onSelect: (tag) => state.select(tag),
      }),
  )
}

/**
 * Opened public prompt: full body plus launch controls.
 * @param {{ state: ReturnType<typeof createPublicWalletState> }} props
 */
function PublicPromptDetail({ state }) {
  const prompt = state.selectedPrompt()
  if (!prompt) {
    if (state.selectedTag.val) {
      return p(
        { class: "cue-empty" },
        "This prompt is not public, or the link is wrong.",
      )
    }
    return p(
      { class: "cue-empty" },
      "Choose a public prompt below, or open a shared link.",
    )
  }

  return div(
    { class: "cue-public-detail" },
    div(
      { class: "cue-toolbar" },
      h1({ class: "cue-public-title" }, prompt.title || "Untitled"),
      PrimaryProviderSelect({
        providers: listProviders(),
        selectedId: state.providerId.val,
        onChange: (id) => state.setProvider(id),
      }),
    ),
    pre({ class: "cue-public-body" }, prompt.body || ""),
    div(
      { class: "cue-composer-actions" },
      button(
        {
          type: "button",
          class: "btn btn-sm cue-btn-solid",
          onclick: () => state.launch(),
        },
        "Open prompt",
      ),
      LaunchProviderMenu({
        providers: listProviders(),
        primaryId: state.providerId.val,
        onLaunch: (providerId) => state.launch(providerId),
      }),
    ),
  )
}

/**
 * Browse the other public prompts.
 * @param {{
 *   prompts: Array<{ tag: string, title: string, body?: string }>,
 *   selectedTag: string | null,
 *   onSelect: (tag: string) => void,
 * }} props
 */
function PublicPromptList({ prompts, selectedTag, onSelect }) {
  if (prompts.length === 0) {
    return p({ class: "cue-empty" }, "No public prompts yet.")
  }

  return ul(
    {
      class: "cue-prompt-list",
      "aria-label": "Public prompts",
    },
    prompts.map((prompt) => {
      const snippet = promptSnippet(prompt.body)
      const selected = prompt.tag === selectedTag
      return li(
        {
          class: selected
            ? "cue-prompt-row is-selected"
            : "cue-prompt-row",
        },
        button(
          {
            type: "button",
            class: "cue-prompt-select",
            "aria-current": selected ? "true" : undefined,
            onclick: () => onSelect(prompt.tag),
          },
          span({ class: "cue-prompt-title" }, prompt.title),
          span({ class: "cue-prompt-snippet" }, `/${prompt.tag}`),
          snippet ? span({ class: "cue-prompt-snippet" }, snippet) : null,
        ),
      )
    }),
  )
}
