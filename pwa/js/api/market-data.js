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
    // Date de création à la source et date d'entrée dans notre catalogue, pour
    // un vrai tri Nouveaux. Les marchés d'avant l'allègement du catalogue n'ont
    // pas de date de création : ils se replient sur leur date d'entrée.
    createdAt: ligne.created_source_at || ligne.first_seen_at || null,
    firstSeenAt: ligne.first_seen_at || null,
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
        id: issue.external_id,
        label: issue.label,
        prob: issue.probability == null ? null : Number(issue.probability),
        prev24h: issue.previous_24h == null ? null : Number(issue.previous_24h),
        tokenId: issue.clob_token_id || null,
        marketId: issue.source_market_id || null,
        conditionId: issue.condition_id || null,
        history: []
      }))
  };
}

// Colonnes réellement lues par le client. « select=* » ramenait aussi les
// raw_payload complets, soit 14 Mo pour 546 marchés dont 12 Mo inutiles : le
// chargement mobile était lent et la mise en cache hors ligne dépassait
// silencieusement le quota. Ces payloads ont depuis été supprimés de la base,
// où ils occupaient l'essentiel du quota du projet partagé, et la date de
// création a sa propre colonne.
const COLONNES_MARCHE = [
  "source", "external_id", "source_url", "title", "description", "image_url",
  "market_type", "status", "tradable", "non_tradable_reason", "category", "regions",
  "close_at", "expected_resolution_at", "resolution_source",
  "volume", "volume_24h", "liquidity", "bettor_count", "spread",
  "source_updated_at", "last_seen_at", "first_seen_at", "created_source_at",
  "mk_outcomes(external_id,label,position,probability,previous_24h,clob_token_id,source_market_id,condition_id)"
].join(",");

// Le catalogue dépasse le millier de marchés : demandé d'un bloc, PostgREST
// dépasse le délai d'exécution accordé au rôle public. On le lit page par page,
// du plus gros volume au plus petit, et on garde ce qu'on a pu obtenir.
const TAILLE_PAGE = 300;
const PAGES_MAX = 9;
const PAGES_SIMULTANEES = 3;

function pageCatalogue(page) {
  return rest("mk_markets", {
    select: COLONNES_MARCHE,
    status: "eq.OPEN",
    unavailable_at: "is.null",
    // Tri par clé primaire : stable d'une page à l'autre (aucun recouvrement,
    // aucun trou) et surtout dix fois plus rapide qu'un tri par volume, qui
    // dépassait le délai d'exécution accordé au rôle public. Le classement
    // affiché est de toute façon calculé côté client.
    order: "id.asc",
    limit: String(TAILLE_PAGE),
    offset: String(page * TAILLE_PAGE)
  });
}

export async function chargerCatalogueSupabase() {
  const marches = [];
  let premiereErreur = null;
  for (let debut = 0; debut < PAGES_MAX; debut += PAGES_SIMULTANEES) {
    const lot = await Promise.all(
      Array.from({ length: PAGES_SIMULTANEES }, (_, i) => debut + i)
        .filter((page) => page < PAGES_MAX)
        .map((page) => pageCatalogue(page).catch((erreur) => {
          premiereErreur = premiereErreur || erreur;
          return null;
        }))
    );
    for (const lignes of lot) {
      if (!lignes?.length) continue;
      marches.push(...lignes.map(marcheDepuisSupabase).filter((m) => m.issues.length));
    }
    // Un lot incomplet signifie que le catalogue est épuisé.
    if (lot.some((lignes) => !lignes || lignes.length < TAILLE_PAGE)) break;
  }
  // Une page manquante vaut mieux qu'un écran vide, mais zéro marché est une
  // vraie panne qu'il faut laisser remonter jusqu'au repli hors ligne.
  if (!marches.length && premiereErreur) throw premiereErreur;
  return marches;
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
  // Le quota localStorage (~5 Mo) est vite atteint : plutôt que de renoncer au
  // hors-ligne, on retente avec un catalogue de plus en plus réduit.
  const tentatives = [
    marches,
    marches.map(({ descriptionOriginal, ...m }) => ({ ...m, descriptionOriginal: "" })),
    marches.slice(0, 400).map(({ descriptionOriginal, ...m }) => ({ ...m, descriptionOriginal: "" }))
  ];
  for (const lot of tentatives) {
    try {
      localStorage.setItem(CLE_CACHE, JSON.stringify({ enregistreAt: Date.now(), marches: lot }));
      return;
    } catch {
      // Trop volumineux : on essaie la variante suivante.
    }
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
