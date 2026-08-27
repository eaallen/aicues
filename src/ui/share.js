import van from "vanjs-core"
import {
  normalizePublicTag,
  publicWalletUrl,
  validatePublicTag,
} from "../prompts/tag.js"

const { button, div, form, input, label, p, span } = van.tags

/**
 * Copies text to the clipboard when the platform supports it.
 * @param {string} text
 * @param {Pick<Clipboard, "writeText"> | null | undefined} [clipboard]
 */
export async function copyText(text, clipboard = globalThis.navigator?.clipboard) {
  if (!clipboard?.writeText) {
    throw new Error("Could not copy the link.")
  }
  await clipboard.writeText(text)
}

/**
 * Publish / unpublish a prompt under a share tag.
 * @param {{
 *   prompt: { id: string, title?: string, publicTag?: string } | null | undefined,
 *   origin?: string,
 *   clipboard?: Pick<Clipboard, "writeText"> | null,
 *   onPublish: (tag: string) => Promise<{ ok: boolean, tag?: string, error?: string }>,
 *   onUnpublish: () => Promise<{ ok: boolean, error?: string }>,
 *   onCancel: () => void,
 * }} props
 */
export function SharePane({
  prompt,
  origin,
  clipboard,
  onPublish,
  onUnpublish,
  onCancel,
}) {
  const tag = van.state(prompt?.publicTag ?? "")
  const publishedTag = van.state(prompt?.publicTag ?? "")
  const error = van.state("")
  const busy = van.state(false)
  const copied = van.state(false)

  /**
   * @param {() => Promise<void>} action
   */
  async function run(action) {
    if (busy.val) {
      return
    }
    busy.val = true
    error.val = ""
    copied.val = false
    try {
      await action()
    } finally {
      busy.val = false
    }
  }

  return form(
    {
      class: "cue-composer cue-share",
      onsubmit: (event) => {
        event.preventDefault()
        void run(async () => {
          const normalized = normalizePublicTag(tag.val)
          const checked = validatePublicTag(normalized)
          if (!checked.ok) {
            error.val = checked.error
            return
          }
          const result = await onPublish(normalized)
          if (!result.ok) {
            error.val = result.error || "Could not publish."
            return
          }
          const nextTag = result.tag || normalized
          tag.val = nextTag
          publishedTag.val = nextTag
        })
      },
    },
    p({ class: "cue-share-title" }, prompt?.title || "Untitled"),
    p(
      { class: "cue-share-copy" },
      "Pick a tag for the public link. Anyone with the URL can open this prompt in the public wallet.",
    ),
    label(
      { class: "cue-field" },
      span({ class: "cue-field-label" }, "Share tag"),
      input({
        class: "input input-sm cue-input",
        type: "text",
        name: "tag",
        autocomplete: "off",
        spellcheck: "false",
        maxlength: "32",
        placeholder: "short-human-tag",
        value: tag,
        oninput: (event) => {
          tag.val = event.target.value
          copied.val = false
        },
      }),
    ),
    () => {
      const normalized = normalizePublicTag(tag.val)
      const url = normalized ? publicWalletUrl(normalized, origin) : ""
      return p(
        { class: "cue-share-url", title: url || undefined },
        url || "Your link will appear here.",
      )
    },
    () => (error.val ? p({ class: "cue-auth-error" }, error.val) : null),
    div(
      { class: "cue-composer-actions" },
      button(
        {
          type: "submit",
          class: "btn btn-sm cue-btn-solid",
          disabled: () => busy.val,
        },
        () => (publishedTag.val ? "Update link" : "Make public"),
      ),
      button(
        {
          type: "button",
          class: "btn btn-sm cue-btn-solid",
          disabled: () => busy.val || !publishedTag.val,
          onclick: () => {
            void run(async () => {
              try {
                await copyText(
                  publicWalletUrl(publishedTag.val, origin),
                  clipboard,
                )
                copied.val = true
              } catch (caught) {
                error.val =
                  caught instanceof Error
                    ? caught.message
                    : "Could not copy the link."
              }
            })
          },
        },
        () => (copied.val ? "Copied" : "Copy link"),
      ),
      button(
        {
          type: "button",
          class: "btn btn-sm btn-ghost cue-btn-ghost",
          disabled: () => busy.val || !publishedTag.val,
          onclick: () => {
            void run(async () => {
              const result = await onUnpublish()
              if (!result.ok) {
                error.val = result.error || "Could not unpublish."
                return
              }
              publishedTag.val = ""
            })
          },
        },
        "Unpublish",
      ),
      button(
        {
          type: "button",
          class: "btn btn-sm btn-ghost cue-btn-ghost",
          disabled: () => busy.val,
          onclick: onCancel,
        },
        "Done",
      ),
    ),
  )
}
