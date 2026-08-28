import "@fontsource/ibm-plex-sans/400.css"
import "@fontsource/ibm-plex-sans/500.css"
import "@fontsource/ibm-plex-mono/400.css"
import "@fontsource/ibm-plex-mono/500.css"
import "./style.css"
import van from "vanjs-core"
import { initCueAnalytics } from "./firebase/analytics.js"
import { createAuthApi } from "./firebase/auth.js"
import { getCueAuth, getCueDb } from "./firebase/config.js"
import { applyRouteMeta, parseRoute } from "./router.js"
import { createPublicPromptStore } from "./sharing/public-store.js"
import { App } from "./ui/app.js"
import { PublicWalletApp } from "./ui/public-wallet.js"

const route = parseRoute(window.location.pathname)
applyRouteMeta(route)

/**
 * Root shell: public wallet or authenticated app by path.
 */
function Root() {
  if (route.kind === "public-wallet") {
    return PublicWalletApp({
      tag: route.tag,
      highlightPromptId: route.promptId,
      publicStore: createPublicPromptStore(getCueDb()),
      authApi: createAuthApi(getCueAuth()),
    })
  }
  return App({ route })
}

void initCueAnalytics()
van.add(document.getElementById("app"), Root())
