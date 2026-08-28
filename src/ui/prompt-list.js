import van from "vanjs-core"
import { isPublicPrompt } from "../prompts/record.js"
import { copyPublicPromptLink } from "../sharing/copy-link.js"
import { makePromptPrivate, sharePrompt } from "../sharing/share-prompt.js"
import {
  CopyPublicLinkButton,
  PublicPromptIndicator,
  SharePromptButton,
} from "../sharing/share-controls.js"
import { listProviders } from "../providers/urls.js"
import { DeleteIcon, EditIcon, PlusIcon } from "./icons.js"
import { LaunchProviderMenu, PrimaryProviderSelect } from "./provider-picker.js"

const { button, div, li, p, span, ul } = van.tags

/**
 * Centered prompt library: list, create, and row actions.
 * @param {{
 *   state: {
 *     prompts: { val: Array<{ id: string, title: string, body?: string }> },
 *     providerId: { val: string },
 *     startNew: () => void,
 *     select: (id: string, providerId?: string) => void,
 *     startEdit: (id: string) => void,
 *     remove: (id: string) => void,
 *     setProvider: (id: string) => void,
 *   },
 *   session?: {
 *     kind: "anonymous" | "account",
 *     label: string,
 *     onSignOut?: () => void,
 *   },
 *   profileStore?: {
 *     get: () => Promise<{ tag: string } | null>,
 *     setTag: (tag: string) => Promise<{ tag: string }>,
 *   },
 *   promptStore?: {
 *     get: (id: string) => object | null,
 *     update: (id: string, patch?: object) => object | null,
 *   },
 * }} props
 */
export function PromptBoard({ state, session, profileStore, promptStore }) {
  const isAccount = session?.kind === "account"
  const publicTag = van.state(/** @type {string | null} */ (null))
  if (profileStore) {
    void profileStore
      .get()
      .then((profile) => {
        if (profile?.tag) {
          publicTag.val = profile.tag
        }
      })
      .catch(() => {})
  }

  /**
   * Copies the public permalink for a prompt, loading the tag if needed.
   * @param {string} promptId
   */
  async function copyLink(promptId) {
    let tag = publicTag.val
    if (!tag && profileStore) {
      try {
        const profile = await profileStore.get()
        tag = profile?.tag ?? null
        if (tag) {
          publicTag.val = tag
        }
      } catch {
        return
      }
    }
    if (!tag) {
      return
    }
    await copyPublicPromptLink({ tag, promptId })
  }

  return div(
    { class: "cue-library" },
    session
      ? div(
          { class: "cue-session" },
          isAccount
            ? button(
                {
                  type: "button",
                  class: "btn btn-sm btn-ghost cue-btn-ghost",
                  onclick: () => {
                    window.location.assign("/app/profile")
                  },
                },
                "Profile",
              )
            : null,
          span({ class: "cue-session-label" }, session.label),
          button(
            {
              type: "button",
              class: "btn btn-sm btn-ghost cue-btn-ghost",
              onclick: () => session.onSignOut?.(),
            },
            "Sign out",
          ),
        )
      : null,
    session?.kind === "anonymous"
      ? p(
          { class: "cue-guest-warning", role: "status" },
          "Guest mode stores prompts only on this device. They are not synced and can be lost if you clear site data.",
        )
      : null,
    div(
      { class: "cue-toolbar" },
      button(
        {
          type: "button",
          class: "btn btn-sm btn-ghost cue-new-btn",
          onclick: () => state.startNew(),
        },
        PlusIcon(),
        "New prompt",
      ),
      () =>
        PrimaryProviderSelect({
          providers: listProviders(),
          selectedId: state.providerId.val,
          onChange: (id) => state.setProvider(id),
        }),
    ),
    () =>
      PromptList({
        prompts: state.prompts.val,
        primaryId: state.providerId.val,
        isAccount,
        profileStore,
        promptStore,
        onRefresh: () => state.refresh(),
        onCopyLink: (id) => copyLink(id),
        onPublicTag: (tag) => {
          publicTag.val = tag
        },
        onSelect: (id, providerId) => state.select(id, providerId),
        onEdit: (id) => state.startEdit(id),
        onDelete: (id) => state.remove(id),
      }),
  )
}

/**
 * One-line preview of a prompt body.
 * @param {string} [body]
 * @param {number} [max]
 */
export function promptSnippet(body, max = 88) {
  const text = String(body ?? "").replace(/\s+/g, " ").trim()
  if (!text) {
    return ""
  }
  if (text.length <= max) {
    return text
  }
  return `${text.slice(0, max)}…`
}

/**
 * Rebuilds the saved-prompt list from current state.
 * @param {{
 *   prompts: Array<{ id: string, title: string, body?: string, isPublic?: boolean }>,
 *   primaryId: string,
 *   isAccount: boolean,
 *   profileStore?: {
 *     get: () => Promise<{ tag: string } | null>,
 *     setTag: (tag: string) => Promise<{ tag: string }>,
 *   },
 *   promptStore?: {
 *     get: (id: string) => object | null,
 *     update: (id: string, patch?: object) => object | null,
 *   },
 *   onRefresh: () => void,
 *   onCopyLink: (id: string) => void,
 *   onPublicTag: (tag: string) => void,
 *   onSelect: (id: string, providerId?: string) => void,
 *   onEdit: (id: string) => void,
 *   onDelete: (id: string) => void,
 * }} props
 */
function PromptList({
  prompts,
  primaryId,
  isAccount,
  profileStore,
  promptStore,
  onRefresh,
  onCopyLink,
  onPublicTag,
  onSelect,
  onEdit,
  onDelete,
}) {
  if (prompts.length === 0) {
    return p({ class: "cue-empty" }, "No prompts yet.")
  }

  return ul(
    {
      class: "cue-prompt-list",
      "aria-label": "Saved prompts",
    },
    prompts.map((prompt) =>
      PromptRow({
        prompt,
        primaryId,
        isAccount,
        profileStore,
        promptStore,
        onRefresh,
        onCopyLink,
        onPublicTag,
        onSelect,
        onEdit,
        onDelete,
      }),
    ),
  )
}

/**
 * One library row: open the prompt, with launch/Edit/Delete beside it.
 * @param {{
 *   prompt: { id: string, title: string, body?: string, isPublic?: boolean },
 *   primaryId: string,
 *   isAccount: boolean,
 *   profileStore?: {
 *     get: () => Promise<{ tag: string } | null>,
 *     setTag: (tag: string) => Promise<{ tag: string }>,
 *   },
 *   promptStore?: {
 *     get: (id: string) => object | null,
 *     update: (id: string, patch?: object) => object | null,
 *   },
 *   onRefresh: () => void,
 *   onCopyLink: (id: string) => void,
 *   onPublicTag: (tag: string) => void,
 *   onSelect: (id: string, providerId?: string) => void,
 *   onEdit: (id: string) => void,
 *   onDelete: (id: string) => void,
 * }} props
 */
function PromptRow({
  prompt,
  primaryId,
  isAccount,
  profileStore,
  promptStore,
  onRefresh,
  onCopyLink,
  onPublicTag,
  onSelect,
  onEdit,
  onDelete,
}) {
  const snippet = promptSnippet(prompt.body)

  return li(
    { class: "cue-prompt-row" },
    button(
      {
        type: "button",
        class: "cue-prompt-select",
        onclick: () => onSelect(prompt.id),
      },
      span({ class: "cue-prompt-title" }, prompt.title),
      snippet
        ? span({ class: "cue-prompt-snippet" }, snippet)
        : null,
    ),
    div(
      { class: "cue-row-actions" },
      div(
        { class: "tooltip tooltip-top tooltip-end cue-tooltip" },
        div(
          {
            class: "tooltip-content cue-tooltip-content",
            "aria-hidden": "true",
          },
          "Choose AI",
        ),
        LaunchProviderMenu({
          providers: listProviders(),
          primaryId,
          onLaunch: (providerId) => onSelect(prompt.id, providerId),
        }),
      ),
      RowAction({
        label: "Edit",
        icon: EditIcon(),
        onClick: (event) => {
          event.stopPropagation()
          onEdit(prompt.id)
        },
      }),
      isPublicPrompt(prompt)
        ? CopyPublicLinkButton({
            isAccount,
            onCopy: () => onCopyLink(prompt.id),
          })
        : null,
      isPublicPrompt(prompt)
        ? PublicPromptIndicator({
            isAccount,
            onMakePrivate: () => {
              if (!promptStore) {
                return
              }
              void makePromptPrivate({
                promptId: prompt.id,
                promptStore,
              }).then((result) => {
                if (result.ok) {
                  onRefresh()
                }
              })
            },
          })
        : SharePromptButton({
            isAccount,
            onShare: () => {
              if (!promptStore || !profileStore) {
                return
              }
              void sharePrompt({
                promptId: prompt.id,
                promptStore,
                profileStore,
              }).then(async (result) => {
                if (!result.ok) {
                  return
                }
                if (result.tag) {
                  onPublicTag(result.tag)
                  try {
                    await copyPublicPromptLink({
                      tag: result.tag,
                      promptId: prompt.id,
                    })
                  } catch {
                    // Copy button remains available if clipboard is blocked.
                  }
                }
                onRefresh()
              })
            },
          }),
      RowAction({
        label: "Delete",
        icon: DeleteIcon(),
        onClick: (event) => {
          event.stopPropagation()
          onDelete(prompt.id)
        },
      }),
    ),
  )
}

/**
 * Icon-only row action with a custom-styled hover tooltip.
 * @param {{
 *   label: string,
 *   icon: Node,
 *   onClick: (event: MouseEvent) => void,
 * }} props
 */
function RowAction({ label, icon, onClick }) {
  return div(
    { class: "tooltip tooltip-top tooltip-end cue-tooltip" },
    div(
      {
        class: "tooltip-content cue-tooltip-content",
        "aria-hidden": "true",
      },
      label,
    ),
    button(
      {
        type: "button",
        class: "cue-row-btn",
        "aria-label": label,
        onclick: onClick,
      },
      icon,
    ),
  )
}
