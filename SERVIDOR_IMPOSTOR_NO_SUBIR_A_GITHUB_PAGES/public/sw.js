const CACHE_NAME = "impostor-aula-v2";
const ASSETS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/assets/bg.png",
  "/assets/icon-192.png",
  "/assets/icon-512.png",
  "/socket.io/socket.io.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Don't cache socket.io websocket/polling requests
  if (url.pathname.startsWith("/socket.io/")) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((resp) => {
        // Cache only GET same-origin
        if (req.method === "GET" && url.origin === location.origin) {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return resp;
      }).catch(() => cached);
    })
  );
});
