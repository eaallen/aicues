import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const html = readFileSync(join(root, "index.html"), "utf8")

describe("static landing page", () => {
  it("exposes crawlable product copy and a Get started link to the app", () => {
    expect(html).toContain("<h1>AI Cues</h1>")
    expect(html).toContain('href="/app"')
    expect(html).toContain('href="/w"')
    expect(html).toContain("Get started")
    expect(html).toContain("Browse public prompts")
    expect(html).toContain("Save a prompt")
    expect(html).toContain("Pick an AI")
    expect(html).toContain("Chat opens prefilled")
    expect(html).toContain("<svg")
    expect(html).toContain('href="/src/landing.css"')
    expect(html).not.toContain('src="/src/main.js"')
    expect(html).not.toContain("landing-entry.js")
  })

  it("includes Google Analytics with the Firebase measurement ID", () => {
    const config = readFileSync(join(root, "src/firebase/config.js"), "utf8")
    expect(config).toContain('GA_MEASUREMENT_ID = "G-M0QG4SCCTN"')
    expect(config).toContain("measurementId: GA_MEASUREMENT_ID")
    expect(html).toContain("https://www.googletagmanager.com/gtag/js?id=G-M0QG4SCCTN")
    expect(html).toContain('gtag("config", "G-M0QG4SCCTN")')
  })

  it("includes SEO metadata and SoftwareApplication JSON-LD", () => {
    expect(html).toContain('rel="canonical"')
    expect(html).toContain("https://aicues.web.app/")
    expect(html).toContain('name="description"')
    expect(html).toContain("og:title")
    expect(html).toContain("SoftwareApplication")
    expect(html).toContain("application/ld+json")
  })

  it("ships robots, sitemap, and llms.txt for crawlers and assistants", () => {
    const robots = readFileSync(join(root, "public/robots.txt"), "utf8")
    const sitemap = readFileSync(join(root, "public/sitemap.xml"), "utf8")
    const llms = readFileSync(join(root, "public/llms.txt"), "utf8")

    expect(robots).toContain("Allow: /")
    expect(robots).toContain("Disallow: /app")
    expect(robots).toContain("https://aicues.web.app/sitemap.xml")
    expect(sitemap).toContain("https://aicues.web.app/")
    expect(sitemap).toContain("https://aicues.web.app/w")
    expect(llms).toContain("# AI Cues")
    expect(llms).toContain("https://aicues.web.app/")
    expect(llms).toContain("https://aicues.web.app/w")
  })
})
