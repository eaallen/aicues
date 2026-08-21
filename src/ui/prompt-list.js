import van from "vanjs-core"
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
 * }} props
 */
export function PromptBoard({ state, session }) {
  return div(
    { class: "cue-library" },
    session
      ? div(
          { class: "cue-session" },
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
 *   prompts: Array<{ id: string, title: string, body?: string }>,
 *   primaryId: string,
 *   onSelect: (id: string, providerId?: string) => void,
 *   onEdit: (id: string) => void,
 *   onDelete: (id: string) => void,
 * }} props
 */
function PromptList({ prompts, primaryId, onSelect, onEdit, onDelete }) {
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
 *   prompt: { id: string, title: string, body?: string },
 *   primaryId: string,
 *   onSelect: (id: string, providerId?: string) => void,
 *   onEdit: (id: string) => void,
 *   onDelete: (id: string) => void,
 * }} props
 */
function PromptRow({ prompt, primaryId, onSelect, onEdit, onDelete }) {
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
