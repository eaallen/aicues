import { publicWalletUrl } from "../router.js"

/**
 * Copies the public permalink for a prompt to the clipboard.
 * @param {{
 *   tag: string,
 *   promptId: string,
 *   origin?: string,
 *   writeText?: (text: string) => Promise<void>,
 * }} options
 */
export async function copyPublicPromptLink({
  tag,
  promptId,
  origin = globalThis.location.origin,
  writeText = (text) => navigator.clipboard.writeText(text),
}) {
  const url = publicWalletUrl(tag, promptId, origin)
  await writeText(url)
  return url
}
