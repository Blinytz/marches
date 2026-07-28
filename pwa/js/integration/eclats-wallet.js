import { estConnecte, rest, rpc, utilisateur } from "../api/supabase.js";

function nombrePortefeuille(valeur) {
  const resultat = Number(valeur);
  return Number.isFinite(resultat) ? resultat : 0;
}

function positionDepuis(ligne) {
  return {
    id: ligne.id,
    marcheId: `${ligne.source === "POLYMARKET" ? "pm" : "mf"}-${ligne.market_external_id}`,
    issueId: ligne.outcome_external_id,
    issueLabel: ligne.outcome_label,
    parts: nombrePortefeuille(ligne.shares),
    valeurNominale: 100,
    prixMoyen: nombrePortefeuille(ligne.average_price),
    probEntree: nombrePortefeuille(ligne.average_price) / 100,
    montantEngage: nombrePortefeuille(ligne.cost_basis),
    montantExpose: nombrePortefeuille(ligne.cost_basis),
    achatAt: ligne.opened_at,
    lots: [{
      id: ligne.id,
      parts: nombrePortefeuille(ligne.shares),
      prixUnitaire: nombrePortefeuille(ligne.average_price),
      valeurNominale: 100,
      date: ligne.opened_at
    }],
    chronologie: []
  };
}

export async function chargerPortefeuille() {
  if (!estConnecte()) return { connecte: false, utilisateur: null, solde: null, positions: [], ledger: [] };
  const [solde, positions, ledger] = await Promise.all([
    rpc("eclats_balance"),
    rest("mk_user_positions", { select: "*", order: "updated_at.desc" }),
    rest("eclats_ledger", {
      select: "id,amount,source,app_id,kind,reason,reference_id,occurred_at,created_at,metadata",
      order: "created_at.desc",
      limit: "100"
    })
  ]);
  return {
    connecte: true,
    utilisateur: utilisateur(),
    solde: nombrePortefeuille(solde),
    positions: (positions || []).map(positionDepuis),
    ledger: (ledger || []).map((ligne) => {
      const sourceMarche = ligne.metadata?.source;
      const idExterne = ligne.metadata?.market_external_id;
      return {
        id: ligne.id,
        t: ligne.occurred_at || ligne.created_at,
        montant: nombrePortefeuille(ligne.amount),
        source: ligne.source,
        application: ligne.app_id,
        marcheId: sourceMarche && idExterne
          ? `${sourceMarche === "POLYMARKET" ? "pm" : "mf"}-${idExterne}`
          : null,
        libelle: ligne.reason || ligne.source
      };
    })
  };
}

export async function acheter({ marche, issueId, montant, idempotencyKey }) {
  return rpc("mk_buy", {
    p_source: marche.source,
    p_market_external_id: String(marche.externalId),
    p_outcome_external_id: String(issueId),
    p_amount: montant,
    p_idempotency_key: idempotencyKey
  });
}

export async function vendre({ positionId, parts, idempotencyKey }) {
  return rpc("mk_sell", {
    p_position_id: positionId,
    p_shares: parts,
    p_idempotency_key: idempotencyKey
  });
}
