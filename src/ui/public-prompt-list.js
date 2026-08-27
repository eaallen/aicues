import van from "vanjs-core"
import { listProviders } from "../providers/urls.js"
import { promptSnippet } from "./prompt-list.js"
import { LaunchProviderMenu } from "./provider-picker.js"

const { button, div, li, p, span, ul } = van.tags

/**
 * Moves the highlighted prompt to the front of the list.
 * @param {Array<{ id: string }>} prompts
 * @param {string | undefined} highlightPromptId
 */
export function reorderForHighlight(prompts, highlightPromptId) {
  if (!highlightPromptId) {
    return prompts
  }
  const index = prompts.findIndex((prompt) => prompt.id === highlightPromptId)
  if (index <= 0) {
    return prompts
  }
  const highlighted = prompts[index]
  return [
    highlighted,
    ...prompts.slice(0, index),
    ...prompts.slice(index + 1),
  ]
}

/**
 * Read-only prompt list (no edit/delete/share/new).
 * Reuses launch provider UI from existing prompt-list patterns.
 * @param {{
 *   prompts: Array<{ id: string, title: string, body?: string }>,
 *   highlightPromptId?: string,
 *   notFoundAlert?: boolean,
 *   providerId: string,
 *   onSelect: (id: string, providerId?: string) => void,
 *   onProviderChange: (id: string) => void,
 * }} props
 */
export function PublicPromptBoard({
  prompts,
  highlightPromptId,
  notFoundAlert = false,
  providerId,
  onSelect,
}) {
  const alertDismissed = van.state(false)

  return div(
    { class: "cue-public-board" },
    () =>
      notFoundAlert && !alertDismissed.val
        ? div(
            { class: "cue-not-found-alert", role: "alert" },
            span({}, "Prompt not found"),
            button(
              {
                type: "button",
                class: "cue-not-found-dismiss",
                "aria-label": "Dismiss",
                onclick: () => {
                  alertDismissed.val = true
                },
              },
              "×",
            ),
          )
        : null,
    () => {
      if (prompts.length === 0) {
        return p({ class: "cue-empty" }, "No public prompts yet.")
      }

      return ul(
        {
          class: "cue-prompt-list",
          "aria-label": "Public prompts",
        },
        prompts.map((prompt) =>
          PublicPromptRow({
            prompt,
            primaryId: providerId,
            highlighted: prompt.id === highlightPromptId,
            onSelect,
          }),
        ),
      )
    },
  )
}

/**
 * One read-only row with launch menu only.
 * @param {{
 *   prompt: { id: string, title: string, body?: string },
 *   primaryId: string,
 *   highlighted?: boolean,
 *   onSelect: (id: string, providerId?: string) => void,
 * }} props
 */
function PublicPromptRow({ prompt, primaryId, highlighted = false, onSelect }) {
  const snippet = promptSnippet(prompt.body)

  return li(
    {
      class: highlighted
        ? "cue-prompt-row cue-prompt-highlight"
        : "cue-prompt-row",
    },
    button(
      {
        type: "button",
        class: "cue-prompt-select",
        onclick: () => onSelect(prompt.id),
      },
      span({ class: "cue-prompt-title" }, prompt.title),
      snippet ? span({ class: "cue-prompt-snippet" }, snippet) : null,
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
          onLaunch: (launchProviderId) => onSelect(prompt.id, launchProviderId),
        }),
      ),
    ),
  )
}
