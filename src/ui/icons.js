import van from "vanjs-core"

const { path, svg } = van.tags("http://www.w3.org/2000/svg")

const stroke = {
  stroke: "currentColor",
  "stroke-width": "1.5",
  "stroke-linecap": "square",
  "stroke-linejoin": "miter",
}

/**
 * Shared 12×12 stroke icon shell.
 * @param {...Node} children - SVG path nodes drawn inside the icon.
 */
function CueIcon(...children) {
  return svg(
    {
      class: "cue-icon",
      width: "12",
      height: "12",
      viewBox: "0 0 12 12",
      fill: "none",
      "aria-hidden": "true",
      focusable: "false",
    },
    ...children,
  )
}

/**
 * Tiny plus mark for the New prompt control.
 */
export function PlusIcon() {
  return CueIcon(
    path({
      d: "M6 2.25v7.5M2.25 6h7.5",
      ...stroke,
    }),
  )
}

/**
 * Pencil mark for the edit control.
 */
export function EditIcon() {
  return CueIcon(
    path({
      d: "M8.25 2.5 9.5 3.75 4.25 9H3V7.75z",
      ...stroke,
    }),
  )
}

/**
 * Trash mark for the delete control.
 */
export function DeleteIcon() {
  return CueIcon(
    path({ d: "M3 4.25h6", ...stroke }),
    path({ d: "M5 3.25h2", ...stroke }),
    path({ d: "M4.25 4.25v5h3.5v-5", ...stroke }),
  )
}

/**
 * Downward chevron for the launch-provider control.
 */
export function ChevronIcon() {
  return CueIcon(
    path({
      d: "M2.75 4.25 6 8 9.25 4.25",
      ...stroke,
    }),
  )
}

/**
 * Check mark for the primary provider in the launch menu.
 */
export function CheckIcon() {
  return CueIcon(
    path({
      d: "M2.5 6.25 4.75 8.75 9.5 3.25",
      ...stroke,
    }),
  )
}

/**
 * Globe mark for share / public visibility controls.
 * @param {{ public?: boolean }} [props]
 */
export function GlobeIcon(props = {}) {
  return svg(
    {
      class: props.public ? "cue-icon cue-globe-icon cue-globe-public" : "cue-icon cue-globe-icon",
      width: "12",
      height: "12",
      viewBox: "0 0 12 12",
      fill: "none",
      "aria-hidden": "true",
      focusable: "false",
    },
    path({
      d: "M6 10.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z",
      ...stroke,
    }),
    path({ d: "M2.25 6h7.5", ...stroke }),
    path({ d: "M6 1.5c1.2 1.35 1.875 3.075 1.875 4.5S7.2 8.85 6 10.2", ...stroke }),
    path({ d: "M6 1.5C4.8 2.85 4.125 4.575 4.125 6S4.8 9.15 6 10.2", ...stroke }),
  )
}
