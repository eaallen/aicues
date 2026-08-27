# Module Plan: make-prompt-public

Reference: [docs/architecture.md](../../docs/architecture.md)

## Purpose

Let account users publish individual prompts to their public wallet. Share flow gates on having a tag, confirms before publish, and shows a green globe icon on public prompts with confirm-before-unpublish.

## Public API

### `src/prompts/record.js` (extend existing)

```js
/**
 * Whether a prompt is public (missing isPublic treated as false).
 * @param {{ isPublic?: boolean }} prompt
 */
export function isPublicPrompt(prompt)

/**
 * Applies isPublic to firestore fields.
 * @param {object} prompt
 */
export function toFirestorePrompt(prompt)  // extended: includes isPublic when true

/**
 * Rebuilds prompt from Firestore, defaulting isPublic to false.
 * @param {string} id
 * @param {object} [data]
 */
export function fromFirestorePrompt(id, data)  // extended

/**
 * Patch helper for visibility only.
 * @param {object} current
 * @param {boolean} isPublic
 * @param {number} [now]
 */
export function applyVisibilityPatch(current, isPublic, now)
```

### `src/prompts/firestore-store.js` (extend existing)

```js
// create/update accept patch: { title?, body?, isPublic? }
update(id, patch)  // existing signature, extended behavior
```

### `src/sharing/share-prompt.js`

```js
/**
 * Runs the share flow: tag gate → confirm publish → set isPublic true.
 * @param {{
 *   promptId: string,
 *   promptStore: { get: (id) => object | null, update: (id, patch) => object | null },
 *   profileStore: { get: () => Promise<Profile | null>, setTag: (tag) => Promise<Profile> },
 *   confirm?: (message: string) => boolean,
 *   promptForTag?: (message: string, defaultTag?: string) => string | null,
 * }} options
 */
export async function sharePrompt(options)

/**
 * Runs unpublish flow: confirm → set isPublic false.
 * @param {{
 *   promptId: string,
 *   promptStore: { update: (id, patch) => object | null },
 *   confirm?: (message: string) => boolean,
 * }} options
 */
export async function makePromptPrivate(options)
```

### `src/sharing/share-controls.js`

```js
/**
 * Share button for a private prompt row (account session only).
 */
export function SharePromptButton(props)

/**
 * Green globe icon with hover "Make private" for public prompts.
 */
export function PublicPromptIndicator(props)
```

### `src/ui/icons.js` (extend)

```js
export function GlobeIcon()  // green when used in PublicPromptIndicator
```

## Dependencies (interfaces only)

| Dependency | Interface |
|------------|-----------|
| Prompt store | `{ list, get, update }` — existing firestore store |
| Profile store | `{ get: () => Promise<Profile \| null>, setTag: (tag) => Promise<Profile> }` from user-profile |
| Confirm | `(message: string) => boolean` injectable, default `window.confirm` |
| Tag prompt | `(message, defaultTag?) => string \| null` injectable for inline tag entry during share |

No imports from `public-wallet` UI.

## Data Models

### Prompt document (extended)

```json
{
  "title": "My prompt",
  "body": "...",
  "createdAt": 1710000000000,
  "updatedAt": 1710000000001,
  "isPublic": true
}
```

Omit `isPublic` when false (rules and app treat missing as false).

### Firestore rules (this module extends prompt rules)

- `cueUsers/{uid}/prompts/{promptId}` read: owner OR `resource.data.isPublic == true`
- Write: owner only; `isPublic` must be boolean when present; existing title/body validation unchanged

Update `isValidCuePrompt` allowed fields to include optional `isPublic`.

## Acceptance Criteria

1. **isPublic helpers** — `isPublicPrompt` false when field missing; `fromFirestorePrompt` defaults false.
2. **Persist public** — `update(id, { isPublic: true })` writes to Firestore and cache; `toFirestorePrompt` includes field when true.
3. **Share hidden for guests** — Anonymous session prompt rows have no Share button or globe icon.
4. **Share with tag** — User with existing tag clicks Share → confirm "Make this prompt public?" → prompt becomes public, globe appears.
5. **Share without tag** — User without tag clicks Share → prompted to enter tag (validated) → tag saved via profileStore → then confirm publish → prompt public.
6. **Globe indicator** — Public prompts show green globe/network icon in row actions.
7. **Unpublish confirm** — Click globe → confirm "Make this prompt private?" → `isPublic: false`; icon removed.
8. **Private unreadable** — After unpublish, prompt no longer returned by public store queries (integration tested later).
9. **Cancel flows** — Declining confirm or tag prompt leaves prompt unchanged.

## Non-Goals

- Copy link to clipboard (future)
- Bulk publish/unpublish
- "Share entire wallet" toggle
- Social share buttons (Twitter, etc.)
- Public prompts for guest/localStorage users
