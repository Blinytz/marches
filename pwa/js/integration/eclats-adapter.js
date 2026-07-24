// Adaptateur en lecture seule vers le contrat Mouvement d'Éclats v1.
// Il ne connecte aucun serveur et ne modifie jamais le ledger source.

const APP_ID = "marches";

function empreinte(texte) {
  let hash = 2166136261;
  for (let i = 0; i < texte.length; i += 1) {
    hash ^= texte.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function typeMouvement(ligne) {
  if (ligne.source?.includes("remboursement")) return "refund";
  if (ligne.source?.includes("gain") || ligne.source?.includes("vente")) return "gain";
  if (Number(ligne.montant) < 0) return "spend";
  return "adjustment";
}

function montantExact(valeur) {
  const nombre = Number(valeur);
  if (!Number.isFinite(nombre) || nombre === 0) {
    throw new Error("Un mouvement doit avoir un montant numérique non nul.");
  }
  return nombre.toFixed(4).replace(/\.?0+$/, "");
}

export function convertirLedgerEclats(lignes, { userId, apres } = {}) {
  if (!userId) throw new Error("userId est obligatoire pour exporter un mouvement.");
  const borne = apres ? new Date(apres).getTime() : -Infinity;
  return lignes
    .filter((ligne) => new Date(ligne.t).getTime() > borne)
    .map((ligne) => {
      const signature = [
        APP_ID, ligne.t, ligne.source, ligne.montant,
        ligne.marcheId || ligne.application || "", ligne.libelle
      ].join("|");
      const cle = empreinte(signature);
      return {
        schemaVersion: 1,
        id: `${APP_ID}-${cle}`,
        userId,
        appId: APP_ID,
        amount: montantExact(ligne.montant),
        kind: typeMouvement(ligne),
        reason: ligne.libelle,
        referenceType: ligne.marcheId ? "market" : "application",
        referenceId: ligne.marcheId || ligne.application || APP_ID,
        idempotencyKey: `${APP_ID}:${cle}`,
        occurredAt: new Date(ligne.t).toISOString(),
        metadata: { source: ligne.source }
      };
    })
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
}
