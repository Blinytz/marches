// Cache réseau d'abord, repli sur le dernier contenu réel disponible.
const CACHE = "marches-reel-v4";

self.addEventListener("install", (e) => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(
  caches.keys()
    .then((noms) => Promise.all(noms.filter((nom) => nom !== CACHE).map((nom) => caches.delete(nom))))
    .then(() => clients.claim())
));

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
