import "@fontsource/ibm-plex-sans/400.css"
import "@fontsource/ibm-plex-sans/500.css"
import "@fontsource/ibm-plex-mono/400.css"
import "@fontsource/ibm-plex-mono/500.css"
import "./style.css"
import van from "vanjs-core"
import { initCueAnalytics } from "./firebase/analytics.js"
import { App } from "./ui/app.js"

void initCueAnalytics()
van.add(document.getElementById("app"), App())
