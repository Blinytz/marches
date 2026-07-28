// Synchronisation serveur du catalogue Marchés vers Supabase/PostgREST.
// Écriture impossible sans l'option explicite --write et les deux secrets d'environnement.

import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import {
  normaliserCatalogueManifold,
  normaliserCataloguePolymarket
} from "../pwa/js/api/normalize.js";

const POLYMARKET_URL = "https://gamma-api.polymarket.com/events?limit=100&active=true&closed=false&order=volume24hr&ascending=false";
const MANIFOLD_URL = "https://api.manifold.markets/v0/markets?limit=500";

async function lireJson(url, delaiMs = 30000) {
  const controleur = new AbortController();
  const minuterie = setTimeout(() => controleur.abort(), delaiMs);
  try {
    const reponse = await fetch(url, { signal: controleur.signal, headers: { Accept: "application/json" } });
    if (!reponse.ok) throw new Error(`${url} : HTTP ${reponse.status}`);
    return await reponse.json();
  } finally {
    clearTimeout(minuterie);
  }
}

const dateOuNull = (valeur) => {
  if (!valeur) return null;
  const date = new Date(valeur);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
};

const entierOuNull = (valeur) => Number.isFinite(Number(valeur)) ? Math.max(0, Math.round(Number(valeur))) : null;
const nombre = (valeur) => Number.isFinite(Number(valeur)) ? Number(valeur) : 0;

export function preparerCatalogue(polymarketBrut, manifoldBrut, maintenant = new Date()) {
  const instant = maintenant.toISOString();
  const polyNormalises = normaliserCataloguePolymarket(polymarketBrut, maintenant.getTime());
  const manifoldNormalises = normaliserCatalogueManifold(manifoldBrut, maintenant.getTime())
    .filter((marche) => marche.status === "OPEN")
    .sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0) || (b.volume || 0) - (a.volume || 0))
    .slice(0, 150);
  const brutParCle = new Map([
    ...(polymarketBrut || []).map((x) => [`POLYMARKET:${x.id}`, x]),
    ...(manifoldBrut || []).map((x) => [`MANIFOLD:${x.id}`, x])
  ]);
  const normalises = [...polyNormalises, ...manifoldNormalises];

  const events = normalises.map((marche) => {
    const brut = brutParCle.get(`${marche.source}:${marche.externalId}`) || {};
    return {
      source: marche.source,
      external_id: marche.externalId,
      slug: brut.slug || null,
      title: marche.titleOriginal,
      description: marche.descriptionOriginal || null,
      source_url: marche.sourceUrl,
      image_url: marche.imageUrl,
      category: marche.theme,
      regions: marche.regions,
      status: marche.status,
      close_at: dateOuNull(marche.closeAt),
      resolution_source: marche.resolutionSource || null,
      volume: nombre(marche.volume),
      volume_24h: nombre(marche.volume24h),
      liquidity: nombre(marche.liquidity),
      raw_payload: brut,
      source_updated_at: dateOuNull(brut.updatedAt || brut.lastUpdatedTime),
      last_seen_at: instant,
      unavailable_at: null
    };
  });

  const markets = normalises.map((marche) => {
    const brut = brutParCle.get(`${marche.source}:${marche.externalId}`) || {};
    return {
      source: marche.source,
      external_id: marche.externalId,
      slug: brut.slug || null,
      title: marche.titleOriginal,
      description: marche.descriptionOriginal || null,
      source_url: marche.sourceUrl,
      image_url: marche.imageUrl,
      market_type: marche.marketType,
      category: marche.theme,
      regions: marche.regions,
      status: marche.status,
      tradable: Boolean(marche.tradable),
      non_tradable_reason: marche.nonTradableReason || null,
      close_at: dateOuNull(marche.closeAt),
      expected_resolution_at: dateOuNull(marche.expectedResolutionAt),
      resolution_source: marche.resolutionSource || null,
      volume: nombre(marche.volume),
      volume_24h: nombre(marche.volume24h),
      liquidity: nombre(marche.liquidity),
      bettor_count: entierOuNull(marche.bettorCount),
      spread: Number.isFinite(Number(marche.spread)) ? Number(marche.spread) : null,
      raw_payload: brut,
      source_updated_at: dateOuNull(brut.updatedAt || brut.lastUpdatedTime),
      last_seen_at: instant,
      unavailable_at: null
    };
  });

  const outcomes = normalises.flatMap((marche) => marche.issues.map((issue, position) => ({
    market_key: `${marche.source}:${marche.externalId}`,
    external_id: String(issue.id),
    label: issue.label,
    position,
    probability: Number.isFinite(Number(issue.prob)) ? Number(issue.prob) : null,
    previous_24h: Number.isFinite(Number(issue.prev24h)) ? Number(issue.prev24h) : null,
    clob_token_id: issue.tokenId || null,
    source_market_id: issue.marketId || null,
    condition_id: issue.conditionId || null,
    raw_payload: issue,
    last_seen_at: instant
  })));

  return { events, markets, outcomes, normalises };
}

export class SupabaseService {
  constructor(url, key) {
    if (!url || !key) throw new Error("SUPABASE_URL et SUPABASE_SERVICE_KEY sont requis avec --write");
    this.url = url.replace(/\/$/, "");
    this.key = key;
  }

  async requete(path, { method = "GET", body, prefer } = {}) {
    const reponse = await fetch(`${this.url}/rest/v1/${path}`, {
      method,
      headers: {
        apikey: this.key,
        Authorization: `Bearer ${this.key}`,
        "Content-Type": "application/json",
        ...(prefer ? { Prefer: prefer } : {})
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const texte = await reponse.text();
    if (!reponse.ok) throw new Error(`Supabase ${method} ${path} : HTTP ${reponse.status} ${texte.slice(0, 500)}`);
    return texte ? JSON.parse(texte) : null;
  }

  async upsert(table, lignes, conflit, select = "id") {
    const sorties = [];
    for (let i = 0; i < lignes.length; i += 100) {
      const lot = lignes.slice(i, i + 100);
      const resultat = await this.requete(
        `${table}?on_conflict=${encodeURIComponent(conflit)}&select=${encodeURIComponent(select)}`,
        { method: "POST", body: lot, prefer: "resolution=merge-duplicates,return=representation" }
      );
      sorties.push(...(resultat || []));
    }
    return sorties;
  }

  async inserer(table, lignes) {
    for (let i = 0; i < lignes.length; i += 250) {
      await this.requete(table, {
        method: "POST",
        body: lignes.slice(i, i + 250),
        prefer: "return=minimal"
      });
    }
  }
}

async function synchroniser({ ecriture = false, trigger = "manual" } = {}) {
  const startedAt = new Date();
  const runId = randomUUID();
  const resultats = await Promise.allSettled([lireJson(POLYMARKET_URL), lireJson(MANIFOLD_URL)]);
  const erreurs = resultats.flatMap((resultat, index) => resultat.status === "rejected"
    ? [{ source: index === 0 ? "POLYMARKET" : "MANIFOLD", message: resultat.reason?.message || String(resultat.reason) }]
    : []);
  const polyBrut = resultats[0].status === "fulfilled" ? resultats[0].value : [];
  const manifoldBrut = resultats[1].status === "fulfilled" ? resultats[1].value : [];
  if (!polyBrut.length && !manifoldBrut.length) throw new Error(`Aucune source disponible : ${JSON.stringify(erreurs)}`);

  const catalogue = preparerCatalogue(polyBrut, manifoldBrut, startedAt);
  const resume = {
    runId,
    ecriture,
    polymarket: catalogue.markets.filter((x) => x.source === "POLYMARKET").length,
    manifold: catalogue.markets.filter((x) => x.source === "MANIFOLD").length,
    markets: catalogue.markets.length,
    outcomes: catalogue.outcomes.length,
    erreurs
  };
  if (!ecriture) return resume;

  const db = new SupabaseService(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  await db.inserer("mk_sync_runs", [{
    run_id: runId,
    trigger,
    started_at: startedAt.toISOString(),
    status: "RUNNING",
    polymarket_count: resume.polymarket,
    manifold_count: resume.manifold
  }]);

  try {
    const eventsRetour = await db.upsert("mk_events", catalogue.events, "source,external_id", "id,source,external_id");
    const eventIds = new Map(eventsRetour.map((x) => [`${x.source}:${x.external_id}`, x.id]));
    const marketsAvecEvent = catalogue.markets.map((x) => ({
      ...x,
      event_id: eventIds.get(`${x.source}:${x.external_id}`) || null
    }));
    const marketsRetour = await db.upsert("mk_markets", marketsAvecEvent, "source,external_id", "id,source,external_id");
    const marketIds = new Map(marketsRetour.map((x) => [`${x.source}:${x.external_id}`, x.id]));
    const outcomesAvecMarket = catalogue.outcomes.map(({ market_key, ...issue }) => ({
      ...issue,
      market_id: marketIds.get(market_key)
    })).filter((x) => x.market_id);
    const outcomesRetour = await db.upsert("mk_outcomes", outcomesAvecMarket, "market_id,external_id", "id,market_id,external_id,probability");
    const marchesSnapshots = new Set(
      [...marketsAvecEvent]
        .sort((a, b) => (b.volume_24h || 0) - (a.volume_24h || 0) || (b.volume || 0) - (a.volume || 0))
        .slice(0, 100)
        .map((x) => marketIds.get(`${x.source}:${x.external_id}`))
        .filter(Boolean)
    );
    const quartHeure = new Date(Math.floor(startedAt.getTime() / (15 * 60 * 1000)) * 15 * 60 * 1000).toISOString();
    const snapshots = outcomesRetour
      .filter((x) => x.probability != null && marchesSnapshots.has(x.market_id))
      .slice(0, 300)
      .map((x) => ({ outcome_id: x.id, probability: x.probability, recorded_at: quartHeure }));
    await db.upsert("mk_price_snapshots", snapshots, "outcome_id,recorded_at", "id");

    for (const source of ["POLYMARKET", "MANIFOLD"]) {
      if (catalogue.markets.some((x) => x.source === source)) {
        await db.requete(`mk_markets?source=eq.${source}&last_seen_at=lt.${encodeURIComponent(startedAt.toISOString())}`, {
          method: "PATCH",
          body: { unavailable_at: startedAt.toISOString() },
          prefer: "return=minimal"
        });
      }
    }
    await db.requete(`mk_sync_runs?run_id=eq.${runId}`, {
      method: "PATCH",
      body: {
        finished_at: new Date().toISOString(),
        status: erreurs.length ? "PARTIAL" : "SUCCESS",
        market_count: marketsRetour.length,
        outcome_count: outcomesRetour.length,
        snapshot_count: snapshots.length,
        error_summary: erreurs
      },
      prefer: "return=minimal"
    });
    return { ...resume, snapshots: snapshots.length };
  } catch (erreur) {
    await db.requete(`mk_sync_runs?run_id=eq.${runId}`, {
      method: "PATCH",
      body: {
        finished_at: new Date().toISOString(),
        status: "FAILED",
        error_summary: [...erreurs, { source: "SUPABASE", message: erreur.message }]
      },
      prefer: "return=minimal"
    }).catch(() => {});
    throw erreur;
  }
}

const estProgrammePrincipal = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (estProgrammePrincipal) {
  const ecriture = process.argv.includes("--write");
  const triggerArg = process.argv.find((x) => x.startsWith("--trigger="));
  synchroniser({ ecriture, trigger: triggerArg?.split("=")[1] || "manual" })
    .then((resume) => console.log(JSON.stringify(resume, null, 2)))
    .catch((erreur) => {
      console.error(erreur.stack || erreur.message);
      process.exitCode = 1;
    });
}
