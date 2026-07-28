import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { preparerCatalogue } from "../scripts/sync_catalogue.mjs";

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
