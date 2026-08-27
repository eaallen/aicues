# Module Plan: public-wallet

Reference: [docs/architecture.md](../../docs/architecture.md)

## Purpose

Render a read-only prompt wallet at `/w/:tag` and `/w/:tag/:promptId` for any visitor. Show the author's tag, list their public prompts, allow AI launch, highlight a shared prompt, and handle missing tag/prompt gracefully with SEO-friendly pages.

## Public API

### `src/router.js`

```js
/** @typedef {{ kind: "app" } | { kind: "app-profile" } | { kind: "public-wallet", tag: string, promptId?: string }} Route */

/**
 * Parses location.pathname into a route.
 * @param {string} pathname
 */
export function parseRoute(pathname)

/**
 * Updates document title and robots meta for the current route.
 * @param {Route} route
 * @param {{ tag?: string, promptTitle?: string }} [context]
 */
export function applyRouteMeta(route, context)
```

### `src/sharing/public-store.js`

```js
/**
 * Read-only access to public wallets by tag.
 * @param {import("firebase/firestore").Firestore} db
 */
export function createPublicPromptStore(db) → {
  /**
   * Resolves tag → uid, loads profile header + public prompts.
   * Returns null when tag unknown.
   */
  listByTag: (tag: string) => Promise<{ profile: Profile, prompts: Prompt[] } | null>,

  /**
   * Returns one public prompt or null.
   */
  getPublic: (tag: string, promptId: string) => Promise<Prompt | null>,
}
```

### `src/ui/public-wallet.js`

```js
/**
 * Read-only wallet shell for /w/:tag routes.
 * @param {{
 *   tag: string,
 *   highlightPromptId?: string,
 *   publicStore: ReturnType<typeof createPublicPromptStore>,
 *   openUrl?: (url: string) => void,
 *   storage?: Pick<Storage, "getItem" | "setItem">,
 * }} props
 */
export function PublicWalletApp(props)
```

### `src/ui/public-prompt-list.js`

```js
/**
 * Read-only prompt list (no edit/delete/share/new).
 * Reuses launch provider UI from existing prompt-list patterns.
 * @param {{
 *   prompts: Prompt[],
 *   highlightPromptId?: string,
 *   notFoundAlert?: boolean,
 *   providerId: string,
 *   onSelect: (id, providerId?) => void,
 *   onProviderChange: (id) => void,
 * }} props
 */
export function PublicPromptBoard(props)
```

### Hosting / Vite

- `firebase.json`: rewrite `/w/**` → `/app.html`
- `vite.config.js`: dev/preview rewrite for `/w/*` paths (mirror `/app` rewrite)

## Dependencies (interfaces only)

| Dependency | Interface |
|------------|-----------|
| Firestore | `Firestore` — read `userTags/{tag}`, `cueUsers/{uid}`, query prompts where `isPublic == true` |
| Profile type | `{ tag: string }` minimum for header (from profile record module) |
| Prompt type | `{ id, title, body, isPublic? }` |
| Launch | Existing `launchPrompt`, `openProviderUrl`, provider picker components |
| Provider prefs | `storedProviderId` / `saveProviderId` from localStorage |

No imports from profile-page or share-controls UI.

## Data Models

Reads only:

- `userTags/{tag}` → `{ uid }`
- `cueUsers/{uid}` → `{ tag, ... }` for header
- `cueUsers/{uid}/prompts` where `isPublic == true`

Firestore index: composite on `prompts` collection group or subcollection query `where("isPublic", "==", true)` (single-field index may suffice for subcollection).

## Acceptance Criteria

1. **parseRoute** — `/w/eli-dev` → `{ kind: "public-wallet", tag: "eli-dev" }`; `/w/eli-dev/uuid` adds `promptId`; `/app/profile` → `app-profile`; `/app` → `app`.
2. **listByTag** — Returns public prompts sorted by `updatedAt` desc; null for unknown tag.
3. **Read-only UI** — No New, Edit, Delete, or Share controls on public wallet.
4. **Author header** — Prominent `@tag` heading; no email shown.
5. **Launch works** — Clicking a prompt or provider menu opens AI with prompt body (same as private wallet).
6. **Highlight** — When `promptId` in URL matches a public prompt, that row appears first (or scrolled into view) with a subtle glow CSS class.
7. **Missing prompt alert** — When `promptId` present but not found or not public, show dismissible alert "Prompt not found" and still list other public prompts.
8. **Unknown tag** — Friendly 404 view ("Wallet not found" or similar), not a blank page.
9. **SEO** — `/w/:tag` sets `<title>` like `@eli-dev — AI Cues` and allows indexing (no `noindex`); private `/app` keeps `noindex`.
10. **Hosting rewrite** — `/w/any/path` serves SPA in production and dev.

## Non-Goals

- Signed-in editing from public wallet
- Email or other PII on public pages
- OG/social preview images
- View counts or analytics
- Comments or reactions on public prompts
- Copy-to-clipboard share URL button (can add later)
