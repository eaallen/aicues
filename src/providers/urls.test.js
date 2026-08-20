import { describe, expect, it } from "vitest";
import { createMemoryStorage } from "../test/memory-storage.js";
import {
  DEFAULT_PROVIDER_ID,
  PROVIDERS,
  PROVIDER_PREF_KEY,
  buildAskUrl,
  getProvider,
  isKnownProviderId,
  listProviders,
  saveProviderId,
  storedProviderId,
} from "./urls.js";

describe("DEFAULT_PROVIDER_ID", () => {
  it('is "meta"', () => {
    expect(DEFAULT_PROVIDER_ID).toBe("meta");
  });
});

describe("PROVIDERS", () => {
  it("registers Meta AI as the default provider", () => {
    expect(PROVIDERS.meta).toMatchObject({
      id: "meta",
      name: "Meta AI",
      origin: "https://www.meta.ai",
    });
  });

  it("marks Meta AI as not embeddable", () => {
    expect(PROVIDERS.meta.embeds).toBe(false);
  });

  it("registers ChatGPT, Claude, Copilot, and DeepSeek", () => {
    expect(PROVIDERS.chatgpt.name).toBe("ChatGPT");
    expect(PROVIDERS.claude.name).toBe("Claude");
    expect(PROVIDERS.copilot.name).toBe("Copilot");
    expect(PROVIDERS.deepseek.name).toBe("DeepSeek");
  });

  it("lists every registered provider exactly once", () => {
    const listed = listProviders().map((provider) => provider.id);
    expect(listed.sort()).toEqual(Object.keys(PROVIDERS).sort());
  });
});

describe("listProviders", () => {
  it("returns every registered provider including Meta AI", () => {
    const listed = listProviders();
    expect(listed).toContain(PROVIDERS.meta);
    expect(listed).toHaveLength(Object.keys(PROVIDERS).length);
  });

  it("includes id and name strings on each provider", () => {
    for (const provider of listProviders()) {
      expect(typeof provider.id).toBe("string");
      expect(typeof provider.name).toBe("string");
    }
  });
});

describe("isKnownProviderId", () => {
  it('is true for "meta"', () => {
    expect(isKnownProviderId("meta")).toBe(true);
  });

  it("is false for unknown, empty, and missing ids", () => {
    expect(isKnownProviderId("nope")).toBe(false);
    expect(isKnownProviderId("")).toBe(false);
    expect(isKnownProviderId(undefined)).toBe(false);
  });
});

describe("getProvider", () => {
  it("returns Meta AI when called with no id", () => {
    expect(getProvider()).toBe(PROVIDERS.meta);
  });

  it('returns Meta AI for "meta"', () => {
    expect(getProvider("meta")).toBe(PROVIDERS.meta);
  });

  it("returns ChatGPT for chatgpt", () => {
    expect(getProvider("chatgpt")).toBe(PROVIDERS.chatgpt);
  });

  it("falls back to Meta AI for an unknown id", () => {
    expect(getProvider("nope")).toBe(PROVIDERS.meta);
  });

  it("falls back to Meta AI for an empty id", () => {
    expect(getProvider("")).toBe(PROVIDERS.meta);
  });
});

describe("storedProviderId / saveProviderId", () => {
  it("returns the default when nothing is stored", () => {
    expect(storedProviderId(createMemoryStorage())).toBe("meta");
  });

  it("returns a known stored id", () => {
    const storage = createMemoryStorage();
    storage.setItem(PROVIDER_PREF_KEY, "claude");
    expect(storedProviderId(storage)).toBe("claude");
  });

  it("falls back to the default for an unknown stored id", () => {
    const storage = createMemoryStorage();
    storage.setItem(PROVIDER_PREF_KEY, "nope");
    expect(storedProviderId(storage)).toBe("meta");
  });

  it("persists a resolved provider id", () => {
    const storage = createMemoryStorage();
    expect(saveProviderId("chatgpt", storage)).toBe("chatgpt");
    expect(storage.getItem(PROVIDER_PREF_KEY)).toBe("chatgpt");
  });

  it("stores the default when asked to save an unknown id", () => {
    const storage = createMemoryStorage();
    expect(saveProviderId("nope", storage)).toBe("meta");
    expect(storage.getItem(PROVIDER_PREF_KEY)).toBe("meta");
  });
});

describe("buildAskUrl", () => {
  it('encodes "I like pie" with plus-separated spaces for Meta', () => {
    expect(buildAskUrl("I like pie")).toBe(
      "https://www.meta.ai/ask?prompt=I+like+pie",
    );
  });

  it("trims leading and trailing whitespace before encoding", () => {
    expect(buildAskUrl("  I like pie  ")).toBe(
      "https://www.meta.ai/ask?prompt=I+like+pie",
    );
  });

  it("returns the Meta origin with no query for an empty prompt", () => {
    expect(buildAskUrl("")).toBe("https://www.meta.ai/");
  });

  it("returns the Meta origin with no query for whitespace-only text", () => {
    expect(buildAskUrl("   \t  ")).toBe("https://www.meta.ai/");
  });

  it("builds a Meta URL when the provider id is unknown", () => {
    expect(buildAskUrl("I like pie", "nope")).toBe(
      "https://www.meta.ai/ask?prompt=I+like+pie",
    );
  });

  it("percent-encodes ampersand, question mark, and hash", () => {
    expect(buildAskUrl("a&b?c#d")).toBe(
      "https://www.meta.ai/ask?prompt=a%26b%3Fc%23d",
    );
  });

  it("percent-encodes newlines instead of converting them to spaces", () => {
    expect(buildAskUrl("line1\nline2")).toBe(
      "https://www.meta.ai/ask?prompt=line1%0Aline2",
    );
  });

  it("percent-encodes emoji and other reserved characters", () => {
    expect(buildAskUrl("pie 🥧")).toBe(
      "https://www.meta.ai/ask?prompt=pie+%F0%9F%A5%A7",
    );
  });

  it("uses Meta AI when providerId is omitted", () => {
    expect(buildAskUrl("hello")).toBe(
      "https://www.meta.ai/ask?prompt=hello",
    );
  });

  it("builds ChatGPT URLs with q=", () => {
    expect(buildAskUrl("I like pie", "chatgpt")).toBe(
      "https://chatgpt.com/?q=I%20like%20pie",
    );
    expect(buildAskUrl("", "chatgpt")).toBe("https://chatgpt.com/");
  });

  it("builds Claude URLs on /new with q=", () => {
    expect(buildAskUrl("I like pie", "claude")).toBe(
      "https://claude.ai/new?q=I%20like%20pie",
    );
    expect(buildAskUrl("", "claude")).toBe("https://claude.ai/new");
  });

  it("builds GitHub Copilot URLs with prompt=", () => {
    expect(buildAskUrl("I like pie", "copilot")).toBe(
      "https://github.com/copilot?prompt=I%20like%20pie",
    );
    expect(buildAskUrl("", "copilot")).toBe("https://github.com/copilot");
  });

  it("builds DeepSeek URLs with q=", () => {
    expect(buildAskUrl("I like pie", "deepseek")).toBe(
      "https://chat.deepseek.com/?q=I%20like%20pie",
    );
    expect(buildAskUrl("", "deepseek")).toBe("https://chat.deepseek.com/");
  });

  it("builds Gemini, Grok, Mistral, and Perplexity URLs", () => {
    expect(buildAskUrl("I like pie", "gemini")).toBe(
      "https://gemini.google.com/app?q=I%20like%20pie",
    );
    expect(buildAskUrl("I like pie", "grok")).toBe(
      "https://grok.com/?q=I%20like%20pie",
    );
    expect(buildAskUrl("I like pie", "mistral")).toBe(
      "https://chat.mistral.ai/chat?q=I%20like%20pie",
    );
    expect(buildAskUrl("I like pie", "perplexity")).toBe(
      "https://www.perplexity.ai/search?q=I%20like%20pie",
    );
  });
});
