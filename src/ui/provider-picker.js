import van from "vanjs-core"
import { CheckIcon, ChevronIcon } from "./icons.js"

const { button, details, label, li, option, select, span, summary, ul } =
  van.tags

/**
 * Compact labeled select for the default AI used on prompt launches.
 * @param {{
 *   providers: Array<{ id: string, name: string }>,
 *   selectedId: string,
 *   onChange: (providerId: string) => void,
 * }} props
 */
export function PrimaryProviderSelect({ providers, selectedId, onChange }) {
  const known = providers.some((provider) => provider.id === selectedId)
  const selectProps = {
    class: "select select-sm cue-provider-select",
    "aria-label": "Primary AI provider",
    onchange: (event) => {
      onChange(event.target.value)
    },
  }
  if (known) {
    selectProps.value = selectedId
  }

  return label(
    { class: "cue-field cue-primary-provider" },
    span({ class: "cue-field-label" }, "Primary"),
    select(
      selectProps,
      providers.map((provider) =>
        option(
          {
            value: provider.id,
            selected: provider.id === selectedId,
          },
          provider.name,
        ),
      ),
    ),
  )
}

/**
 * Accessible name for a launch-menu provider button.
 * @param {string} name
 * @param {boolean} isPrimary
 */
function launchOptionLabel(name, isPrimary) {
  return isPrimary ? `${name} (primary)` : name
}

/**
 * One provider choice in the launch dropdown.
 * @param {{
 *   provider: { id: string, name: string },
 *   isPrimary: boolean,
 *   onChoose: (providerId: string) => void,
 * }} props
 */
function LaunchOption({ provider, isPrimary, onChoose }) {
  return li(
    button(
      {
        type: "button",
        class: "cue-launch-option",
        "aria-label": launchOptionLabel(provider.name, isPrimary),
        onclick: (event) => {
          event.stopPropagation()
          onChoose(provider.id)
        },
      },
      provider.name,
      isPrimary
        ? span({ class: "cue-launch-primary-mark" }, CheckIcon(), "Primary")
        : null,
    ),
  )
}

/**
 * Row-action dropdown that launches a prompt with a chosen AI.
 * @param {{
 *   providers: Array<{ id: string, name: string }>,
 *   primaryId: string,
 *   onLaunch: (providerId: string) => void,
 * }} props
 */
export function LaunchProviderMenu({ providers, primaryId, onLaunch }) {
  const menu = details(
    { class: "dropdown dropdown-end cue-launch-menu" },
    summary(
      {
        class: "cue-row-btn",
        "aria-label": "Choose AI to launch",
        onclick: (event) => {
          event.stopPropagation()
        },
      },
      ChevronIcon(),
    ),
    ul(
      {
        class: "dropdown-content menu cue-launch-menu-list",
        "aria-label": "AI providers",
      },
      providers.map((provider) =>
        LaunchOption({
          provider,
          isPrimary: provider.id === primaryId,
          onChoose: (providerId) => {
            onLaunch(providerId)
            menu.open = false
          },
        }),
      ),
    ),
  )

  return menu
}
