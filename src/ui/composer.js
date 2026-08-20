import van from "vanjs-core"

const { button, div, form, input, label, span, textarea } = van.tags

/**
 * New / edit prompt form on the main work surface.
 * @param {{
 *   prompt?: { title?: string, body?: string } | null,
 *   onSave: (fields: { title: string, body: string }) => void,
 *   onCancel: () => void,
 * }} props
 */
export function Composer({ prompt, onSave, onCancel }) {
  const title = van.state(prompt?.title ?? "")
  const body = van.state(prompt?.body ?? "")

  return form(
    {
      class: "cue-composer",
      onsubmit: (event) => {
        event.preventDefault()
        onSave({ title: title.val, body: body.val })
      },
    },
    label(
      { class: "cue-field" },
      span({ class: "cue-field-label" }, "Title"),
      input({
        class: "input input-sm cue-input",
        type: "text",
        name: "title",
        autocomplete: "off",
        placeholder: "Optional",
        value: title,
        oninput: (event) => {
          title.val = event.target.value
        },
      }),
    ),
    label(
      { class: "cue-field" },
      span({ class: "cue-field-label" }, "Prompt"),
      textarea({
        class: "textarea textarea-sm cue-textarea",
        name: "body",
        rows: "10",
        spellcheck: "true",
        value: body,
        oninput: (event) => {
          body.val = event.target.value
        },
      }),
    ),
    div(
      { class: "cue-composer-actions" },
      button({ type: "submit", class: "btn btn-sm cue-btn-solid" }, "Save"),
      button(
        {
          type: "button",
          class: "btn btn-sm btn-ghost cue-btn-ghost",
          onclick: onCancel,
        },
        "Cancel",
      ),
    ),
  )
}
