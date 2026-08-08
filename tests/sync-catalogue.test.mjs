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
  assert.equal(catalogue.markets[0].raw_payload.id, "287395");
  assert.equal(catalogue.outcomes[0].market_key, "POLYMARKET:287395");
  assert.equal(catalogue.events[0].last_seen_at, "2026-07-28T08:00:00.000Z");
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
