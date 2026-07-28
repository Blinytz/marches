import { normaliserCatalogueManifold, normaliserCataloguePolymarket } from "./normalize.js";

const URL_POLYMARKET = "https://gamma-api.polymarket.com/events?limit=100&active=true&closed=false&order=volume24hr&ascending=false";
const URL_MANIFOLD = "https://api.manifold.markets/v0/markets?limit=500";
const CLE_CACHE = "marches-catalogue-reel-v1";
const DUREE_CACHE_MS = 15 * 60 * 1000;

async function json(url, { delaiMs = 12000 } = {}) {
  const controleur = new AbortController();
  const minuterie = setTimeout(() => controleur.abort(), delaiMs);
  try {
    const reponse = await fetch(url, {
      signal: controleur.signal,
      headers: { Accept: "application/json" },
      cache: "no-store"
    });
    if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
    return await reponse.json();
  } finally {
    clearTimeout(minuterie);
  }
}

export async function chargerPolymarket() {
  return normaliserCataloguePolymarket(await json(URL_POLYMARKET));
}

export async function chargerManifold() {
  const marches = await json(URL_MANIFOLD);
  return normaliserCatalogueManifold(marches)
    .filter((m) => m.status === "OPEN")
    .sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0) || (b.volume || 0) - (a.volume || 0))
    .slice(0, 150);
}

function lireCache() {
  try {
    const cache = JSON.parse(localStorage.getItem(CLE_CACHE));
    if (!cache || !Array.isArray(cache.marches) || !cache.marches.length) return null;
    return { ...cache, perime: Date.now() - cache.enregistreAt > DUREE_CACHE_MS };
  } catch {
    return null;
  }
}

function sauverCache(marches) {
  try {
    localStorage.setItem(CLE_CACHE, JSON.stringify({ enregistreAt: Date.now(), marches }));
  } catch {
    // Un catalogue trop volumineux ne doit jamais empêcher l'application de fonctionner.
  }
}

export async function chargerCatalogueReel() {
  const cache = lireCache();
  const resultats = await Promise.allSettled([chargerPolymarket(), chargerManifold()]);
  const [poly, manifold] = resultats;
  const marches = [
    ...(poly.status === "fulfilled" ? poly.value : []),
    ...(manifold.status === "fulfilled" ? manifold.value : [])
  ];
  if (marches.length) sauverCache(marches);
  return {
    marches: marches.length ? marches : (cache?.marches || []),
    origine: marches.length ? "reseau" : cache ? "cache" : "aucune",
    cachePerime: !marches.length && Boolean(cache?.perime),
    sources: {
      polymarket: poly.status === "fulfilled"
        ? { ok: true, count: poly.value.length }
        : { ok: false, erreur: poly.reason?.message || "indisponible" },
      manifold: manifold.status === "fulfilled"
        ? { ok: true, count: manifold.value.length }
        : { ok: false, erreur: manifold.reason?.message || "indisponible" }
    }
  };
}
