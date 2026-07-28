import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  normaliserEvenementPolymarket,
  normaliserMarcheManifold
} from "../pwa/js/api/normalize.js";

const lire = async (nom) => JSON.parse(await readFile(new URL(`fixtures/${nom}`, import.meta.url), "utf8"));

test("normalise un événement Polymarket multi-marchés sans fusionner sa source", async () => {
  const brut = await lire("polymarket-event.json");
  const marche = normaliserEvenementPolymarket(brut, Date.parse("2026-07-28T00:00:00Z"));
  assert.equal(marche.id, "pm-287395");
  assert.equal(marche.source, "POLYMARKET");
  assert.equal(marche.marketType, "MULTIPLE");
  assert.equal(marche.issues.length, 2);
  assert.equal(marche.issues[0].label, "Candidate A");
  assert.equal(marche.issues[0].prob, 0.42);
  assert.equal(marche.polymarketMarkets[0].tokenIds[0], "token-a-yes");
  assert.equal(marche.tradable, true);
});

test("normalise un marché Manifold binaire et sa variation réelle", async () => {
  const brut = await lire("manifold-market.json");
  const marche = normaliserMarcheManifold(brut, Date.parse("2026-07-28T00:00:00Z"));
  assert.equal(marche.id, "mf-LqpPQ9dcQE");
  assert.equal(marche.source, "MANIFOLD");
  assert.deepEqual(marche.regions, ["France"]);
  assert.equal(marche.issues[0].prob, 0.63);
  assert.equal(marche.issues[0].prev24h, 0.59);
  assert.equal(marche.issues[1].prob, 0.37);
  assert.equal(marche.prixMiroir, true);
});

test("rend consultable un format Manifold non pris en charge", () => {
  const marche = normaliserMarcheManifold({
    id: "poll-1",
    question: "Which option?",
    outcomeType: "POLL",
    closeTime: Date.parse("2027-01-01T00:00:00Z"),
    isResolved: false
  }, Date.parse("2026-07-28T00:00:00Z"));
  assert.equal(marche.tradable, false);
  assert.equal(marche.marketType, "OTHER");
  assert.match(marche.nonTradableReason, /POLL/);
});
