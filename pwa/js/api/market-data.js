import { normaliserCatalogueManifold, normaliserCataloguePolymarket } from "./normalize.js";
import { rest } from "./supabase.js";

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

function marcheDepuisSupabase(ligne) {
  const prefixe = ligne.source === "POLYMARKET" ? "pm" : "mf";
  const sourceDate = Date.parse(ligne.source_updated_at || ligne.last_seen_at || "");
  return {
    id: `${prefixe}-${ligne.external_id}`,
    source: ligne.source,
    externalId: ligne.external_id,
    sourceUrl: ligne.source_url,
    titleOriginal: ligne.title,
    descriptionOriginal: ligne.description || "",
    imageUrl: ligne.image_url,
    marketType: ligne.market_type,
    status: ligne.status,
    tradable: Boolean(ligne.tradable),
    nonTradableReason: ligne.non_tradable_reason,
    theme: ligne.category || "Autres",
    regions: ligne.regions || ["Monde"],
    closeAt: ligne.close_at,
    expectedResolutionAt: ligne.expected_resolution_at,
    resolutionTimeConfidence: "EXPECTED",
    resolutionSource: ligne.resolution_source,
    volume: Number(ligne.volume) || 0,
    volume24h: Number(ligne.volume_24h) || 0,
    liquidity: Number(ligne.liquidity) || 0,
    bettorCount: ligne.bettor_count == null ? null : Number(ligne.bettor_count),
    spread: ligne.spread == null ? 0.02 : Number(ligne.spread),
    fraicheurS: Number.isFinite(sourceDate) ? Math.max(0, Math.round((Date.now() - sourceDate) / 1000)) : 0,
    detailEtat: "initial",
    issues: (ligne.mk_outcomes || [])
      .sort((a, b) => a.position - b.position)
      .map((issue) => ({
        ...(issue.raw_payload || {}),
        id: issue.external_id,
        label: issue.label,
        prob: issue.probability == null ? null : Number(issue.probability),
        prev24h: issue.previous_24h == null ? null : Number(issue.previous_24h),
        tokenId: issue.clob_token_id || issue.raw_payload?.tokenId || null,
        marketId: issue.source_market_id || issue.raw_payload?.marketId || null,
        conditionId: issue.condition_id || issue.raw_payload?.conditionId || null,
        history: []
      }))
  };
}

export async function chargerCatalogueSupabase() {
  const lignes = await rest("mk_markets", {
    select: "*,mk_outcomes(*)",
    status: "eq.OPEN",
    unavailable_at: "is.null",
    order: "volume_24h.desc",
    limit: "300"
  });
  return (lignes || []).map(marcheDepuisSupabase).filter((m) => m.issues.length);
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
  try {
    const marchesSupabase = await chargerCatalogueSupabase();
    if (marchesSupabase.length) {
      sauverCache(marchesSupabase);
      const polyCount = marchesSupabase.filter((m) => m.source === "POLYMARKET").length;
      const manifoldCount = marchesSupabase.length - polyCount;
      return {
        marches: marchesSupabase,
        origine: "supabase",
        cachePerime: false,
        sources: {
          polymarket: { ok: polyCount > 0, count: polyCount, erreur: polyCount ? null : "aucun marché synchronisé" },
          manifold: { ok: manifoldCount > 0, count: manifoldCount, erreur: manifoldCount ? null : "aucun marché synchronisé" }
        }
      };
    }
  } catch {
    // Repli temporaire vers les API publiques ou le dernier cache réel.
  }
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
