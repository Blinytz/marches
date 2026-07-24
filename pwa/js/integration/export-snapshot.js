import { convertirLedgerEclats } from "./eclats-adapter.js";

const APP_ID = "eclats-marches";
const TYPE_EXPORT = "eclats-application-snapshot";

function tableau(valeur) {
  if (valeur instanceof Set) return [...valeur];
  return Array.isArray(valeur) ? structuredClone(valeur) : [];
}

export function creerExportEclatsMarches(etat, {
  userId = "proprietaire-local",
  exportedAt = new Date().toISOString()
} = {}) {
  const mouvements = convertirLedgerEclats(etat.ledger || [], { userId });
  return {
    schemaVersion: 1,
    exportType: TYPE_EXPORT,
    appId: APP_ID,
    displayName: "Éclats Marchés",
    exportedAt: new Date(exportedAt).toISOString(),
    owner: { userId },
    eclats: {
      balance: String(Number(etat.solde || 0)),
      ledgerMode: "simulated",
      movements: mouvements
    },
    localState: {
      positions: tableau(etat.positions),
      claims: tableau(etat.claims),
      defeats: tableau(etat.defaites),
      favorites: tableau(etat.favoris),
      recoveredClaims: tableau(etat.claimsRecuperes),
      readNotifications: tableau(etat.notifsLues),
      seenNotifications: tableau(etat.notifsVues),
      preferences: structuredClone(etat.prefs || {}),
      theme: etat.theme || "sombre"
    },
    integrity: {
      movementCount: mouvements.length,
      positionCount: tableau(etat.positions).length,
      claimCount: tableau(etat.claims).length
    }
  };
}

export function telechargerExportEclatsMarches(etat, options = {}) {
  const contenu = creerExportEclatsMarches(etat, options);
  const date = contenu.exportedAt.slice(0, 10);
  const blob = new Blob([`${JSON.stringify(contenu, null, 2)}\n`], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = `eclats-marches-export-${date}.json`;
  lien.click();
  URL.revokeObjectURL(url);
  return contenu;
}
