import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { markdownToHtml } from "./src/content/markdown.js";

/**
 * Imports `.md` files as pre-rendered HTML strings (dev and production build).
 */
function markdownAsHtml() {
  return {
    name: "markdown-as-html",
    /**
     * @param {string} code
     * @param {string} id
     */
    transform(code, id) {
      if (!id.endsWith(".md")) {
        return;
      }
      return {
        code: `export default ${JSON.stringify(markdownToHtml(code))};`,
        map: null,
      };
    },
  };
}

export default defineConfig({
  plugins: [markdownAsHtml(), tailwindcss()],
  test: {
    environment: "jsdom",
  },
});
