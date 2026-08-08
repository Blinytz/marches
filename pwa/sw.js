// Cache réseau d'abord, repli sur le dernier contenu réel disponible.
const CACHE = "marches-reel-v7";

self.addEventListener("install", (e) => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(
  caches.keys()
    .then((noms) => Promise.all(noms.filter((nom) => nom !== CACHE).map((nom) => caches.delete(nom))))
    .then(() => clients.claim())
));

// GitHub Pages sert les fichiers avec « max-age=600 » : sans cette option le
// navigateur peut répondre depuis son propre cache HTTP et le « réseau d'abord »
// ne sert à rien. « no-cache » force une revalidation (304 si rien n'a changé).
function versLeReseau(requete) {
  return fetch(requete, { cache: "no-cache" }).catch(() => fetch(requete));
}

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  if (new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(
    versLeReseau(e.request)
      .then((res) => {
        const copie = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copie)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
