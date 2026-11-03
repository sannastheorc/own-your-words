// SEEDSED — sw.js
// Purpose: OFFLINE SHELL. Pre-caches every app file and serves them cache-first, so the app opens with
//          no network. Bump VERSION whenever a file changes. A new version waits for "Update now".
// Boundaries: only app files. His data lives in localStorage and is never touched here.
const VERSION = "own-your-words-v1";
const SHELL = ["./", "index.html", "manifest.webmanifest", "css/app.css", "js/app.js", "js/words.js", "js/commonwords.js", "js/spelling.js",
  "js/goals.js", "js/store.js", "js/content.js", "js/certificate.js", "js/speech.js", "js/blocks.js",
  "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "icons/apple-touch-icon.png"];
self.addEventListener("install", e => e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL))));
self.addEventListener("activate", e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener("message", e => { if (e.data === "skip-waiting") self.skipWaiting(); });
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    return (await cache.match(e.request, { ignoreSearch: true })) || (e.request.mode === "navigate" && (await cache.match("index.html"))) || fetch(e.request);
  })());
});
