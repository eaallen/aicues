import { describe, expect, it, vi } from "vitest"
import { copyPublicPromptLink } from "./copy-link.js"

describe("copyPublicPromptLink", () => {
  it("writes the absolute public prompt URL", async () => {
    const writeText = vi.fn(async () => {})

    const url = await copyPublicPromptLink({
      tag: "Eli-Dev",
      promptId: "p1",
      origin: "https://aicues.web.app",
      writeText,
    })

    expect(url).toBe("https://aicues.web.app/w/eli-dev/p1")
    expect(writeText).toHaveBeenCalledWith("https://aicues.web.app/w/eli-dev/p1")
  })
})
