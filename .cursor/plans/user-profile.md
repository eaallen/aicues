# Module Plan: user-profile

Reference: [docs/architecture.md](../../docs/architecture.md)

## Purpose

Let signed-in account users manage a public **tag** on a dedicated profile page at `/app/profile`. Email is shown only when available from Firebase Auth at display time — it is never written to Firestore.

## Public API

### `src/profile/record.js`

```js
/** @typedef {{ tag: string, updatedAt: number }} Profile */

export const TAG_MIN_LENGTH = 3
export const TAG_MAX_LENGTH = 32

/**
 * Normalizes a raw tag input (trim, lowercase).
 * @param {string} raw
 */
export function normalizeTag(raw)

/**
 * Returns null if valid, or a short user-facing error string.
 * @param {string} tag - already normalized
 */
export function validateTag(tag)

/**
 * Builds a profile object from fields.
 * @param {{ tag: string, updatedAt?: number }} input
 */
export function buildProfile(input)
```

### `src/profile/firestore-store.js`

```js
/**
 * Profile persistence for a signed-in account user.
 * @param {import("firebase/firestore").Firestore} db
 * @param {string} uid
 */
export function createProfileStore(db, uid) → {
  /** Loads profile or null if none exists. */
  get: () => Promise<Profile | null>,

  /**
   * Sets or changes the user's tag (transaction: profile + userTags index).
   * @param {string} rawTag
   * @throws when tag invalid, taken, or Firestore fails
   */
  setTag: (rawTag: string) => Promise<Profile>,

  /** True when no other uid owns this normalized tag (or current user already owns it). */
  isTagAvailable: (tag: string) => Promise<boolean>,
}
```

### `src/ui/profile-page.js`

```js
/**
 * Profile editor UI for /app/profile.
 * @param {{
 *   profileStore: ReturnType<typeof createProfileStore>,
 *   authEmail?: string | null,
 *   onBack: () => void,
 *   confirm?: (message: string) => boolean,
 * }} props
 */
export function ProfilePage(props)
```

When `authEmail` is a non-empty string, show it read-only. When missing or empty, do not render an email field.

### Router hook (consumed by integration, implemented here)

```js
/** True when pathname is /app/profile (with or without trailing slash). */
export function isProfilePath(pathname)
```

## Dependencies (interfaces only)

| Dependency | Interface |
|------------|-----------|
| Firestore | `Firestore` from `firebase/firestore` — `doc`, `getDoc`, `runTransaction`, `deleteDoc`, `setDoc` |
| Auth email (UI only) | Optional `authEmail?: string \| null` passed into `ProfilePage` from the app's auth session — not persisted |
| Confirm dialog | Optional inject `(message: string) => boolean` for tag-change warning |

No imports from `make-prompt-public` or `public-wallet` UI.

## Data Models

### Firestore: `cueUsers/{uid}`

```json
{
  "tag": "eli-dev",
  "updatedAt": 1710000000000
}
```

No email field. PII stays in Firebase Auth only.

### Firestore: `userTags/{tag}`

```json
{
  "uid": "firebase-uid"
}
```

Doc ID is the normalized tag. Created on first tag set; deleted and recreated on tag change.

### Firestore rules (this module owns the profile + tag-index rules)

- `cueUsers/{uid}`: owner read/write; public read when `tag` field exists (for public wallet header). Allowed fields: `tag`, `updatedAt` only.
- `userTags/{tag}`: authenticated read; create when `request.resource.data.uid == request.auth.uid` and doc absent; delete when `resource.data.uid == request.auth.uid`; no update.

## Acceptance Criteria

1. **Tag validation** — `validateTag` rejects tags shorter than 3, longer than 32, with invalid characters, or not starting/ending with alphanumeric; accepts `eli-dev`, `abc123`.
2. **Normalize** — `normalizeTag("  Eli-Dev  ")` → `"eli-dev"`.
3. **First tag set** — `setTag` creates `cueUsers/{uid}` (tag + updatedAt only) and `userTags/{tag}` in one transaction; returns profile without email.
4. **Uniqueness** — `setTag` fails when another uid owns the tag; `isTagAvailable` returns false.
5. **Tag change** — When user already has tag `old`, `setTag("new")` deletes `userTags/old`, creates `userTags/new`, updates profile; warns via confirm dialog before proceeding.
6. **Profile page with email** — When `authEmail` is provided, shows read-only email and tag input with Save; link back to wallet.
7. **Profile page without email** — When `authEmail` is null/empty/omitted, email field is not rendered.
8. **Tag change warning** — Changing an existing tag requires confirm with message about broken old links.
9. **Route** — `/app/profile` renders `ProfilePage` for signed-in account users; guests/anonymous redirected or shown gate.
10. **Toolbar link** — Private wallet toolbar includes navigation to profile (account users only).
11. **No email in Firestore** — Profile writes never include an email field; rules reject extra fields if enforced.

## Non-Goals

- Display name, avatar, bio
- Storing or syncing email to Firestore
- Email editing (comes from Auth only)
- Public profile page separate from tag (public wallet handles public view)
- Tag search or discovery directory
- OAuth profile photo
