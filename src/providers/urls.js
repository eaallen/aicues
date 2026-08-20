export const DEFAULT_PROVIDER_ID = "meta";
export const PROVIDER_PREF_KEY = "cue.provider";

/**
 * Known providers. Keep this the single registry — do not hardcode chat URLs elsewhere.
 * Only include platforms that can open a chat from a URL (prompt in a query param).
 */
export const PROVIDERS = {
  chatgpt: {
    id: "chatgpt",
    name: "ChatGPT",
    origin: "https://chatgpt.com",
    askPath: "/",
    queryParam: "q",
    embeds: false,
  },
  claude: {
    id: "claude",
    name: "Claude",
    origin: "https://claude.ai",
    askPath: "/new",
    queryParam: "q",
    embeds: false,
  },
  copilot: {
    id: "copilot",
    name: "Copilot",
    origin: "https://github.com",
    askPath: "/copilot",
    queryParam: "prompt",
    embeds: false,
  },
  deepseek: {
    id: "deepseek",
    name: "DeepSeek",
    origin: "https://chat.deepseek.com",
    askPath: "/",
    queryParam: "q",
    embeds: false,
  },
  gemini: {
    id: "gemini",
    name: "Gemini",
    origin: "https://gemini.google.com",
    askPath: "/app",
    queryParam: "q",
    embeds: false,
  },
  grok: {
    id: "grok",
    name: "Grok",
    origin: "https://grok.com",
    askPath: "/",
    queryParam: "q",
    embeds: false,
  },
  meta: {
    id: "meta",
    name: "Meta AI",
    origin: "https://www.meta.ai",
    askPath: "/ask",
    homePath: "/",
    queryParam: "prompt",
    plusSpaces: true,
    embeds: false,
  },
  mistral: {
    id: "mistral",
    name: "Mistral",
    origin: "https://chat.mistral.ai",
    askPath: "/chat",
    queryParam: "q",
    embeds: false,
  },
  perplexity: {
    id: "perplexity",
    name: "Perplexity",
    origin: "https://www.perplexity.ai",
    askPath: "/search",
    queryParam: "q",
    embeds: false,
  },
};

/**
 * Lists every registered provider in PROVIDERS key order.
 */
export function listProviders() {
  return Object.values(PROVIDERS);
}

/**
 * True when providerId is a non-empty string that is a key of PROVIDERS.
 * @param {string} [providerId]
 */
export function isKnownProviderId(providerId) {
  return typeof providerId === "string" && providerId !== "" && Object.hasOwn(PROVIDERS, providerId);
}

/**
 * Returns the provider record or the Meta AI default if id is unknown/empty.
 * @param {string} [providerId]
 */
export function getProvider(providerId) {
  if (providerId && Object.hasOwn(PROVIDERS, providerId)) {
    return PROVIDERS[providerId];
  }
  return PROVIDERS[DEFAULT_PROVIDER_ID];
}

/**
 * Whether the provider allows being shown in an iframe.
 * @param {string} [providerId]
 */
export function providerEmbeds(providerId) {
  return getProvider(providerId).embeds === true;
}

/**
 * Reads a stored provider id, falling back to the default when missing/unknown.
 * @param {Pick<Storage, "getItem">} [storage]
 */
export function storedProviderId(storage = globalThis.localStorage) {
  try {
    return getProvider(storage.getItem(PROVIDER_PREF_KEY) ?? "").id;
  } catch {
    return DEFAULT_PROVIDER_ID;
  }
}

/**
 * Persists a provider id after resolving it through the registry.
 * @param {string} [providerId]
 * @param {Pick<Storage, "setItem">} [storage]
 */
export function saveProviderId(providerId, storage = globalThis.localStorage) {
  const id = getProvider(providerId).id;
  try {
    storage.setItem(PROVIDER_PREF_KEY, id);
  } catch {
    // Private mode / quota errors should not block switching providers.
  }
  return id;
}

/**
 * Encodes prompt text for a query parameter.
 * @param {string} text
 * @param {boolean} [plusSpaces]
 */
function encodeAskPrompt(text, plusSpaces) {
  const encoded = encodeURIComponent(text);
  return plusSpaces ? encoded.replace(/%20/g, "+") : encoded;
}

/**
 * Joins origin and path without duplicating slashes.
 * @param {string} origin
 * @param {string} path
 */
function joinOriginPath(origin, path) {
  const trimmedOrigin = origin.replace(/\/+$/, "");
  if (!path || path === "/") {
    return `${trimmedOrigin}/`;
  }
  return `${trimmedOrigin}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Appends a query parameter, using & when the URL already has a query string.
 * @param {string} url
 * @param {string} param
 * @param {string} value
 */
function withQuery(url, param, value) {
  const join = url.includes("?") ? "&" : "?";
  return `${url}${join}${param}=${value}`;
}

/**
 * Builds the ask URL from a provider record and already-trimmed prompt text.
 * @param {{
 *   id: string,
 *   origin: string,
 *   askPath: string,
 *   homePath?: string,
 *   queryParam: string,
 *   plusSpaces?: boolean,
 * }} provider
 * @param {string} trimmedText
 */
function buildAskUrlForProvider(provider, trimmedText) {
  const path = trimmedText
    ? provider.askPath
    : (provider.homePath ?? provider.askPath);
  const baseUrl = joinOriginPath(provider.origin, path);
  if (!trimmedText) {
    return baseUrl;
  }
  return withQuery(
    baseUrl,
    provider.queryParam,
    encodeAskPrompt(trimmedText, provider.plusSpaces === true),
  );
}

/**
 * Builds the ask URL for a provider + prompt text.
 * @param {string} promptText
 * @param {string} [providerId]
 */
export function buildAskUrl(promptText, providerId = DEFAULT_PROVIDER_ID) {
  const provider = getProvider(providerId);
  const trimmedText = promptText.trim();
  return buildAskUrlForProvider(provider, trimmedText);
}
