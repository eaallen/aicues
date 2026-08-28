import van from "vanjs-core"
import { GlobeIcon, LinkIcon } from "../ui/icons.js"

const { button, div } = van.tags

/**
 * Icon-only row action with a custom-styled hover tooltip.
 * @param {{
 *   label: string,
 *   icon: Node,
 *   className?: string,
 *   onClick: (event: MouseEvent) => void,
 * }} props
 */
function RowAction({ label, icon, className = "cue-row-btn", onClick }) {
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
        class: className,
        "aria-label": label,
        onclick: onClick,
      },
      icon,
    ),
  )
}

/**
 * Copies a public prompt permalink. Account users only; shown on public rows.
 * @param {{
 *   isAccount: boolean,
 *   onCopy: () => void | Promise<void>,
 * }} props
 */
export function CopyPublicLinkButton({ isAccount, onCopy }) {
  if (!isAccount) {
    return null
  }

  const copied = van.state(false)

  return div(
    { class: "tooltip tooltip-top tooltip-end cue-tooltip" },
    () =>
      div(
        {
          class: "tooltip-content cue-tooltip-content",
          "aria-hidden": "true",
        },
        copied.val ? "Copied!" : "Copy link",
      ),
    button(
      {
        type: "button",
        class: "cue-row-btn",
        "aria-label": "Copy link",
        onclick: (event) => {
          event.stopPropagation()
          void Promise.resolve(onCopy())
            .then(() => {
              copied.val = true
              globalThis.setTimeout(() => {
                copied.val = false
              }, 1500)
            })
            .catch(() => {})
        },
      },
      LinkIcon(),
    ),
  )
}

/**
 * Share button for a private prompt row (account session only).
 * @param {{
 *   isAccount: boolean,
 *   onShare: () => void,
 * }} props
 */
export function SharePromptButton({ isAccount, onShare }) {
  if (!isAccount) {
    return null
  }

  return RowAction({
    label: "Share",
    icon: GlobeIcon(),
    onClick: (event) => {
      event.stopPropagation()
      onShare()
    },
  })
}

/**
 * Green globe icon with hover "Make private" for public prompts.
 * @param {{
 *   isAccount: boolean,
 *   onMakePrivate: () => void,
 * }} props
 */
export function PublicPromptIndicator({ isAccount, onMakePrivate }) {
  if (!isAccount) {
    return null
  }

  return RowAction({
    label: "Make private",
    icon: GlobeIcon({ public: true }),
    onClick: (event) => {
      event.stopPropagation()
      onMakePrivate()
    },
  })
}
