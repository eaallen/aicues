import { buildAskUrl } from "../providers/urls.js"

/**
 * Title shown for a prompt; falls back to the first body line, then Untitled.
 * @param {{ title?: string, body?: string } | null | undefined} prompt
 */
export function displayTitle(prompt) {
  if (!prompt) {
    return "Untitled"
  }
  const title = String(prompt.title ?? "").trim()
  if (title) {
    return title
  }
  const firstLine = String(prompt.body ?? "")
    .split(/\r?\n/, 1)[0]
    .trim()
  return firstLine || "Untitled"
}

/**
 * Builds the provider URL for a prompt body.
 * @param {{ body?: string } | null | undefined} prompt
 * @param {string} [providerId]
 */
export function sessionUrlForPrompt(prompt, providerId) {
  return buildAskUrl(prompt?.body ?? "", providerId)
}

/**
 * Opens the prompt in the provider window.
 * @param {{ body?: string } | null | undefined} prompt
 * @param {string} [providerId]
 * @param {(url: string) => void} openUrl
 */
export function launchPrompt(prompt, providerId, openUrl) {
  openUrl(sessionUrlForPrompt(prompt, providerId))
}
