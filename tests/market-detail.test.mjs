import assert from "node:assert/strict";
import test from "node:test";
import { enrichirPolymarket } from "../pwa/js/api/market-detail.js";

test("enrichit une fiche Polymarket avec carnet, midpoint et historique CLOB", async () => {
  const fetchOriginal = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const contenu = String(url).includes("/book?")
      ? { bids: [{ price: "0.41", size: "120" }], asks: [{ price: "0.43", size: "80" }] }
      : String(url).includes("prices-history")
        ? { history: [{ t: 1785120000, p: 0.39 }, { t: 1785206400, p: 0.42 }] }
        : { mid: "0.42" };
    return { ok: true, json: async () => contenu };
  };
  try {
    const marche = {
      source: "POLYMARKET",
      marketType: "BINARY",
      issues: [
        { id: "oui", prob: 0.4, history: [], tokenId: "token-oui" },
        { id: "non", prob: 0.6, history: [], tokenId: "token-non" }
      ]
    };
    await enrichirPolymarket(marche, "oui");
    assert.deepEqual(marche.carnet.bids[0], [0.41, 120]);
    assert.ok(Math.abs(marche.spread - 0.02) < 1e-9);
    assert.equal(marche.issues[0].history.length, 2);
    assert.equal(marche.issues[0].prob, 0.42);
    assert.ok(Math.abs(marche.issues[1].prob - 0.58) < 1e-9);
    assert.equal(marche.detailEtat, "ok");
  } finally {
    globalThis.fetch = fetchOriginal;
  }
});
