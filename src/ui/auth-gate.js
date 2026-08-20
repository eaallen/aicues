import van from "vanjs-core"
import { authErrorMessage } from "../firebase/auth.js"

const { button, div, form, input, p, span } = van.tags

/**
 * Sign-in options: Google, email/password, or guest.
 * @param {{
 *   authApi: {
 *     signInWithGoogle: () => Promise<unknown>,
 *     signInWithEmail: (email: string, password: string) => Promise<unknown>,
 *     createWithEmail: (email: string, password: string) => Promise<unknown>,
 *     signInAnonymously: () => Promise<unknown>,
 *   },
 * }} props
 */
export function AuthGate({ authApi }) {
  const email = van.state("")
  const password = van.state("")
  const error = van.state("")
  const busy = van.state(false)

  /**
   * Runs an auth action and surfaces failures.
   * @param {() => Promise<unknown>} action
   */
  async function run(action) {
    if (busy.val) {
      return
    }
    busy.val = true
    error.val = ""
    try {
      await action()
    } catch (caught) {
      error.val = authErrorMessage(caught)
    } finally {
      busy.val = false
    }
  }

  return div(
    { class: "cue-auth" },
    p({ class: "cue-auth-title" }, "AI Cues"),
    p(
      { class: "cue-auth-copy" },
      "Sign in to save prompts in the cloud, or continue as a guest on this device.",
    ),
    button(
      {
        type: "button",
        class: "btn btn-sm cue-btn-solid cue-auth-btn",
        disabled: () => busy.val,
        onclick: () => {
          void run(() => authApi.signInWithGoogle())
        },
      },
      "Continue with Google",
    ),
    span({ class: "cue-auth-or" }, "or"),
    form(
      {
        class: "cue-auth-form",
        onsubmit: (event) => {
          event.preventDefault()
          void run(() =>
            authApi.signInWithEmail(email.val.trim(), password.val),
          )
        },
      },
      input({
        class: "input input-sm cue-input",
        type: "email",
        name: "email",
        autocomplete: "email",
        placeholder: "Email",
        value: email,
        oninput: (event) => {
          email.val = event.target.value
        },
      }),
      input({
        class: "input input-sm cue-input",
        type: "password",
        name: "password",
        autocomplete: "current-password",
        placeholder: "Password",
        value: password,
        oninput: (event) => {
          password.val = event.target.value
        },
      }),
      div(
        { class: "cue-auth-row" },
        button(
          {
            type: "submit",
            class: "btn btn-sm cue-btn-solid",
            disabled: () => busy.val,
          },
          "Sign in",
        ),
        button(
          {
            type: "button",
            class: "btn btn-sm btn-ghost cue-btn-ghost",
            disabled: () => busy.val,
            onclick: () => {
              void run(() =>
                authApi.createWithEmail(email.val.trim(), password.val),
              )
            },
          },
          "Create account",
        ),
      ),
    ),
    () => (error.val ? p({ class: "cue-auth-error" }, error.val) : null),
    button(
      {
        type: "button",
        class: "btn btn-sm btn-ghost cue-btn-ghost cue-auth-guest",
        disabled: () => busy.val,
        onclick: () => {
          void run(() => authApi.signInAnonymously())
        },
      },
      "Continue as guest",
    ),
    p(
      { class: "cue-auth-guest-note" },
      "Guest prompts stay in this browser and are not synced.",
    ),
  )
}
