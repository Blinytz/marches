// Service worker minimal Phase A : cache réseau d'abord, repli cache.
// La stratégie complète (offline, rattrapage à l'ouverture) arrive avec les données réelles.
const CACHE = "marches-reel-v2";

self.addEventListener("install", (e) => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(clients.claim()));

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  if (new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copie = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copie)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
