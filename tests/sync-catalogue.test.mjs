import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { preparerCatalogue, SupabaseService } from "../scripts/sync_catalogue.mjs";

const lire = async (nom) => JSON.parse(await readFile(new URL(`fixtures/${nom}`, import.meta.url), "utf8"));

test("prépare les lignes Supabase sans secret ni mutation", async () => {
  const poly = await lire("polymarket-event.json");
  const manifold = await lire("manifold-market.json");
  const catalogue = preparerCatalogue([poly], [manifold], new Date("2026-07-28T08:00:00Z"));

  assert.equal(catalogue.events.length, 2);
  assert.equal(catalogue.markets.length, 2);
  assert.equal(catalogue.outcomes.length, 4);
  assert.equal(catalogue.markets[0].source, "POLYMARKET");
  assert.equal(catalogue.markets[1].source, "MANIFOLD");
  assert.equal(catalogue.outcomes[0].market_key, "POLYMARKET:287395");
  assert.equal(catalogue.events[0].last_seen_at, "2026-07-28T08:00:00.000Z");
});

// Les payloads bruts occupaient à eux seuls l'essentiel du quota du projet
// Supabase partagé, dépassé le 12 août 2026, pour trois dates de création.
test("n'envoie plus les payloads bruts en base", async () => {
  const poly = await lire("polymarket-event.json");
  const manifold = await lire("manifold-market.json");
  const catalogue = preparerCatalogue([poly], [manifold], new Date("2026-07-28T08:00:00Z"));

  for (const ligne of [...catalogue.events, ...catalogue.markets, ...catalogue.outcomes]) {
    assert.equal("raw_payload" in ligne, false);
  }
});

test("promeut la date de création de la source en colonne", async () => {
  const poly = await lire("polymarket-event.json");
  const manifold = await lire("manifold-market.json");
  const catalogue = preparerCatalogue([poly], [manifold], new Date("2026-07-28T08:00:00Z"));

  // Manifold horodate en millisecondes, Polymarket en ISO. La fixture
  // Polymarket ne porte aucune date de création : la colonne reste vide et la
  // PWA se replie sur first_seen_at.
  assert.equal(catalogue.markets[1].created_source_at, new Date(1780000000000).toISOString());
  assert.equal(catalogue.markets[0].created_source_at, null);
});

test("purge les relevés et les exécutions au-delà de la rétention", async () => {
  const fetchOriginal = globalThis.fetch;
  const appels = [];
  globalThis.fetch = async (url, options) => {
    appels.push({ url: String(url), method: options.method });
    return new Response("", { status: 200 });
  };

  try {
    const db = new SupabaseService("https://example.supabase.co", "sb_secret_test");
    await db.purger(new Date("2026-08-12T00:00:00Z"));
    assert.equal(appels.length, 3);
    assert.equal(appels[0].method, "DELETE");
    assert.match(appels[0].url, /mk_price_snapshots\?recorded_at=lt\..*2026-05-14/);
    assert.match(appels[1].url, /mk_sync_runs\?started_at=lt\..*2026-07-13/);
  } finally {
    globalThis.fetch = fetchOriginal;
  }
});

test("mesure la taille de la base sans jamais faire échouer la synchro", async () => {
  const fetchOriginal = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response("1048576000", { status: 200 });
    const db = new SupabaseService("https://example.supabase.co", "sb_secret_test");
    assert.equal(await db.tailleBaseMo(), 1000);

    globalThis.fetch = async () => new Response("boum", { status: 500 });
    assert.equal(await db.tailleBaseMo(), null);
  } finally {
    globalThis.fetch = fetchOriginal;
  }
});

test("resserre la rétention quand on lui passe moins de jours", async () => {
  const fetchOriginal = globalThis.fetch;
  const appels = [];
  globalThis.fetch = async (url, options) => {
    appels.push({ url: String(url), body: options.body });
    return new Response("[]", { status: 200 });
  };

  try {
    const db = new SupabaseService("https://example.supabase.co", "sb_secret_test");
    await db.purger(new Date("2026-08-15T00:00:00Z"), 3);
    const rpc = appels.find((x) => x.url.includes("rpc/mk_purger_catalogue"));
    assert.deepEqual(JSON.parse(rpc.body), { p_jours: 3 });
  } finally {
    globalThis.fetch = fetchOriginal;
  }
});

// La PWA n'affiche que les marchés vivants. Sans purge, le catalogue gagnait
// 5 334 marchés morts par jour, soit la limite du plan gratuit en dix jours.
test("purge le catalogue périmé par la fonction SQL, jamais par un DELETE aveugle", async () => {
  const fetchOriginal = globalThis.fetch;
  const appels = [];
  globalThis.fetch = async (url, options) => {
    appels.push({ url: String(url), method: options.method, body: options.body });
    return new Response("[]", { status: 200 });
  };

  try {
    const db = new SupabaseService("https://example.supabase.co", "sb_secret_test");
    await db.purger(new Date("2026-08-12T00:00:00Z"));
    const rpc = appels.find((x) => x.url.includes("rpc/mk_purger_catalogue"));
    assert.ok(rpc, "la purge du catalogue doit passer par la fonction SQL");
    assert.equal(rpc.method, "POST");
    assert.deepEqual(JSON.parse(rpc.body), { p_jours: 7 });
    assert.equal(appels.some((x) => x.method === "DELETE" && x.url.includes("mk_markets")), false);
  } finally {
    globalThis.fetch = fetchOriginal;
  }
});

test("envoie les nouvelles clés secrètes uniquement dans apikey", async () => {
  const fetchOriginal = globalThis.fetch;
  let headers;
  globalThis.fetch = async (_url, options) => {
    headers = options.headers;
    return new Response("", { status: 200 });
  };

  try {
    await new SupabaseService("https://example.supabase.co", "sb_secret_test").requete("mk_sync_runs");
    assert.equal(headers.apikey, "sb_secret_test");
    assert.equal(headers.Authorization, undefined);
  } finally {
    globalThis.fetch = fetchOriginal;
  }
});

test("conserve Authorization pour l'ancienne clé service_role JWT", async () => {
  const fetchOriginal = globalThis.fetch;
  let headers;
  globalThis.fetch = async (_url, options) => {
    headers = options.headers;
    return new Response("", { status: 200 });
  };

  try {
    await new SupabaseService("https://example.supabase.co", "eyJservice-role").requete("mk_sync_runs");
    assert.equal(headers.apikey, "eyJservice-role");
    assert.equal(headers.Authorization, "Bearer eyJservice-role");
  } finally {
    globalThis.fetch = fetchOriginal;
  }
});

test("borne la probabilité Polymarket précédente entre zéro et un", async () => {
  const poly = await lire("polymarket-event.json");
  poly.markets[0].outcomePrices = "[\"0\", \"1\"]";
  poly.markets[0].oneDayPriceChange = 0.003;

  const catalogue = preparerCatalogue([poly], [], new Date("2026-07-28T08:00:00Z"));
  const issue = catalogue.outcomes.find((outcome) => outcome.external_id === "pm-1654956");

  assert.equal(issue.previous_24h, 0);
});

test("recoupe le lot quand la base dépasse son délai d'exécution", async () => {
  const fetchOriginal = globalThis.fetch;
  const tailles = [];
  globalThis.fetch = async (_url, options) => {
    const lot = JSON.parse(options.body);
    tailles.push(lot.length);
    if (lot.length > 1) {
      return new Response(
        JSON.stringify({ code: "57014", message: "canceling statement due to statement timeout" }),
        { status: 500 }
      );
    }
    return new Response(JSON.stringify(lot.map((ligne) => ({ id: ligne.external_id }))), { status: 200 });
  };

  try {
    const db = new SupabaseService("https://example.supabase.co", "sb_secret_test");
    const lignes = [1, 2, 3, 4].map((n) => ({ external_id: `m${n}` }));
    const sorties = await db.upsert("mk_markets", lignes, "source,external_id", "id", 4);

    assert.deepEqual(sorties.map((x) => x.id), ["m1", "m2", "m3", "m4"]);
    assert.deepEqual(tailles, [4, 2, 1, 1, 2, 1, 1]);
  } finally {
    globalThis.fetch = fetchOriginal;
  }
});

test("laisse remonter une vraie erreur de données sans la réessayer", async () => {
  const fetchOriginal = globalThis.fetch;
  let appels = 0;
  globalThis.fetch = async () => {
    appels += 1;
    return new Response(JSON.stringify({ code: "23502", message: "null value in column" }), { status: 400 });
  };

  try {
    const db = new SupabaseService("https://example.supabase.co", "sb_secret_test");
    await assert.rejects(() => db.upsert("mk_markets", [{ external_id: "m1" }], "source,external_id"));
    assert.equal(appels, 1);
  } finally {
    globalThis.fetch = fetchOriginal;
  }
});

test("ne remet pas d'indisponibilité sur les marchés déjà retirés", async () => {
  const source = await readFile(new URL("../scripts/sync_catalogue.mjs", import.meta.url), "utf8");
  assert.match(source, /mk_markets\?source=eq\.\$\{source\}&unavailable_at=is\.null/);
});
