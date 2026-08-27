import van from "vanjs-core"
import { GlobeIcon } from "../ui/icons.js"

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
