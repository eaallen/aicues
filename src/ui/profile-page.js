import van from "vanjs-core"
import { normalizeTag } from "../profile/record.js"

const { button, div, form, input, label, p, span } = van.tags

/**
 * True when pathname is /app/profile (with or without trailing slash).
 * @param {string} pathname
 */
export function isProfilePath(pathname) {
  const path = pathname.replace(/\/$/, "") || "/"
  return path === "/app/profile"
}

/**
 * Profile editor UI for /app/profile.
 * @param {{
 *   profileStore: {
 *     get: () => Promise<{ tag: string, updatedAt: number } | null>,
 *     setTag: (rawTag: string) => Promise<{ tag: string, updatedAt: number }>,
 *   },
 *   authEmail?: string | null,
 *   onBack: () => void,
 *   confirm?: (message: string) => boolean,
 * }} props
 */
export function ProfilePage({ profileStore, authEmail, onBack, confirm }) {
  const tag = van.state("")
  const error = van.state("")
  const busy = van.state(false)
  const loading = van.state(true)
  const currentTag = van.state(/** @type {string | null} */ (null))
  const confirmFn = confirm ?? (() => true)

  void profileStore
    .get()
    .then((profile) => {
      if (profile) {
        tag.val = profile.tag
        currentTag.val = profile.tag
      }
    })
    .catch((caught) => {
      error.val =
        caught instanceof Error ? caught.message : "Failed to load profile"
    })
    .finally(() => {
      loading.val = false
    })

  /**
   * Persists the tag when validation and confirm pass.
   */
  async function saveTag() {
    if (busy.val) {
      return
    }
    error.val = ""
    const normalized = normalizeTag(tag.val)
    if (
      currentTag.val &&
      currentTag.val !== normalized &&
      !confirmFn(
        "Changing your tag will break links to your old public wallet (/w/" +
          currentTag.val +
          "). Continue?",
      )
    ) {
      return
    }
    busy.val = true
    try {
      const profile = await profileStore.setTag(tag.val)
      tag.val = profile.tag
      currentTag.val = profile.tag
    } catch (caught) {
      error.val =
        caught instanceof Error ? caught.message : "Failed to save tag"
    } finally {
      busy.val = false
    }
  }

  const showEmail = typeof authEmail === "string" && authEmail.length > 0

  return div(
    { class: "cue-profile" },
    button(
      {
        type: "button",
        class: "btn btn-sm btn-ghost cue-btn-ghost cue-profile-back",
        onclick: onBack,
      },
      "← Back to wallet",
    ),
    p({ class: "cue-profile-title" }, "Profile"),
    () =>
      loading.val
        ? p({ class: "cue-profile-loading" }, "Loading…")
        : form(
            {
              class: "cue-profile-form",
              onsubmit: (event) => {
                event.preventDefault()
                void saveTag()
              },
            },
            showEmail
              ? label(
                  { class: "cue-field" },
                  span({ class: "cue-field-label" }, "Email"),
                  input({
                    class: "input input-sm cue-input",
                    type: "email",
                    name: "email",
                    value: authEmail,
                    readOnly: true,
                  }),
                )
              : null,
            label(
              { class: "cue-field" },
              span({ class: "cue-field-label" }, "Public tag"),
              input({
                class: "input input-sm cue-input",
                type: "text",
                name: "tag",
                autocomplete: "off",
                placeholder: "your-tag",
                value: tag,
                oninput: (event) => {
                  tag.val = event.target.value
                },
              }),
            ),
            p(
              { class: "cue-profile-hint" },
              "Your public wallet will be at /w/your-tag",
            ),
            () => (error.val ? p({ class: "cue-profile-error" }, error.val) : null),
            button(
              {
                type: "submit",
                class: "btn btn-sm cue-btn-solid",
                disabled: () => busy.val,
              },
              "Save",
            ),
          ),
  )
}
