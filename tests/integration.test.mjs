import assert from "node:assert/strict";
import test from "node:test";
import { convertirLedgerEclats } from "../pwa/js/integration/eclats-adapter.js";

const lignes = [
  { t: "2026-07-20T10:00:00Z", montant: -100, source: "marches_mise", marcheId: "m1", libelle: "Achat OUI" },
  { t: "2026-07-21T10:00:00Z", montant: 250.5, source: "marches_gain", marcheId: "m1", libelle: "Gain récupéré" }
];

test("convertit le ledger local sans le modifier", () => {
  const copie = structuredClone(lignes);
  const mouvements = convertirLedgerEclats(lignes, { userId: "proprietaire" });
  assert.deepEqual(lignes, copie);
  assert.equal(mouvements.length, 2);
  assert.equal(mouvements[0].amount, "-100");
  assert.equal(mouvements[1].amount, "250.5");
  assert.equal(mouvements[1].kind, "gain");
  assert.match(mouvements[1].idempotencyKey, /^eclats-marches:/);
});

test("le curseur temporel est strictement postérieur", () => {
  const mouvements = convertirLedgerEclats(lignes, {
    userId: "proprietaire",
    apres: "2026-07-20T10:00:00Z"
  });
  assert.equal(mouvements.length, 1);
  assert.equal(mouvements[0].reason, "Gain récupéré");
});

test("refuse les mouvements nuls et l'identité absente", () => {
  assert.throws(() => convertirLedgerEclats(lignes), /userId/);
  assert.throws(() => convertirLedgerEclats([
    { ...lignes[0], montant: 0 }
  ], { userId: "proprietaire" }), /non nul/);
});
