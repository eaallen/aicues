import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vite"
import tailwindcss from "@tailwindcss/vite"

const root = dirname(fileURLToPath(import.meta.url))

/**
 * Rewrites `/app` to `app.html` in Vite dev and preview.
 * @param {{ url?: string }} req
 */
function rewriteAppPath(req) {
  const url = req.url ?? ""
  const queryIndex = url.indexOf("?")
  const path = queryIndex === -1 ? url : url.slice(0, queryIndex)
  const query = queryIndex === -1 ? "" : url.slice(queryIndex)
  if (
    path === "/app" ||
    path === "/app/" ||
    path.startsWith("/app/") ||
    path.startsWith("/w/")
  ) {
    req.url = `/app.html${query}`
  }
}

/**
 * Serves the prompt library SPA at `/app` during `vite` and `vite preview`.
 */
function rewriteAppToHtml() {
  return {
    name: "rewrite-app-to-html",
    /**
     * @param {{ middlewares: { use: (handler: (req: { url?: string }, res: unknown, next: () => void) => void) => void } }} server
     */
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        rewriteAppPath(req)
        next()
      })
    },
    /**
     * @param {{ middlewares: { use: (handler: (req: { url?: string }, res: unknown, next: () => void) => void) => void } }} server
     */
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        rewriteAppPath(req)
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [tailwindcss(), rewriteAppToHtml()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(root, "index.html"),
        app: resolve(root, "app.html"),
      },
    },
  },
  test: {
    environment: "jsdom",
  },
})
