// État global du prototype Phase A.
// Tout est local (mémoire + localStorage) : aucune connexion réseau, aucune mutation financière.

import {
  MARCHES, POSITIONS, CLAIMS, DEFAITES, LEDGER, SOLDE_DEMO, NOTIFICATIONS,
  PREFS_DEMO, REGLAGES, ETAT_SOURCES_DEFAUT, VALEUR_NOMINALE
} from "./data/fixtures.js";
import { chargerCatalogueReel } from "./api/market-data.js";
import { enrichirMarche } from "./api/market-detail.js";

const CLE_STOCKAGE = "marches-proto";
const CLE_STOCKAGE_HISTORIQUE = "eclats-marches-proto";

function charger() {
  try {
    const valeur = localStorage.getItem(CLE_STOCKAGE)
      || localStorage.getItem(CLE_STOCKAGE_HISTORIQUE);
    return JSON.parse(valeur) || {};
  }
  catch { return {}; }
}
function sauver() {
  localStorage.setItem(CLE_STOCKAGE, JSON.stringify({
    favoris: [...etat.favoris],
    claimsRecuperes: [...etat.claimsRecuperes],
    notifsLues: [...etat.notifsLues],
    notifsVues: [...etat.notifsVues],
    theme: etat.theme,
    solde: etat.solde
  }));
}

const memo = charger();

export const etat = {
  marches: MARCHES,
  positions: POSITIONS,
  claims: CLAIMS,
  defaites: DEFAITES,
  ledger: [...LEDGER],
  reglages: REGLAGES,
  prefs: PREFS_DEMO,
  valeurNominale: VALEUR_NOMINALE,

  solde: typeof memo.solde === "number" ? memo.solde : SOLDE_DEMO,
  favoris: new Set(memo.favoris || ["pm-fed-juillet", "mf-greve-sncf"]),
  claimsRecuperes: new Set(memo.claimsRecuperes || []),
  notifsLues: new Set(memo.notifsLues || []),   // ouvertes individuellement (retire la pastille de la ligne)
  notifsVues: new Set(memo.notifsVues || []),   // simplement consultées (retire le badge de la cloche)
  theme: memo.theme || "sombre",
  chargementCatalogue: true,
  modeDonnees: "chargement",
  catalogueActualiseAt: null,
  enrichissementsEnCours: new Set(),

  // Bascules de la barre démo (états section 11)
  demo: {
    panne_polymarket: false,
    panne_manifold: false,
    ws_deconnecte: false,
    chargement: false,
    solde_insuffisant: false,
    prix_modifie: false,
    erreur_inconnue: false
  },

  sources: structuredClone(ETAT_SOURCES_DEFAUT),
  ecouteurs: new Set()
};

export function notifier() {
  sauver();
  etat.ecouteurs.forEach((fn) => fn());
}
export function surChangement(fn) { etat.ecouteurs.add(fn); }

export function marche(id) { return etat.marches.find((m) => m.id === id); }

export async function chargerDetailMarche(id, issueId) {
  const cible = marche(id);
  if (!cible || cible.detailEtat === "ok" || etat.enrichissementsEnCours.has(id)) return false;
  etat.enrichissementsEnCours.add(id);
  try {
    await enrichirMarche(cible, issueId);
  } catch {
    // La fiche conserve les données du catalogue et affiche l'état dégradé.
  } finally {
    etat.enrichissementsEnCours.delete(id);
    notifier();
  }
  return true;
}

export async function chargerDonneesReelles() {
  etat.chargementCatalogue = true;
  notifier();
  const resultat = await chargerCatalogueReel();
  const idsLocauxNecessaires = new Set([
    ...etat.positions.map((p) => p.marcheId),
    ...etat.claims.map((c) => c.marcheId),
    ...etat.defaites.map((d) => d.marcheId)
  ]);
  const supportsSimulation = MARCHES.filter((m) => idsLocauxNecessaires.has(m.id));

  if (resultat.marches.length) {
    etat.marches = [...resultat.marches, ...supportsSimulation];
    etat.modeDonnees = resultat.origine;
    etat.catalogueActualiseAt = new Date().toISOString();
  } else {
    etat.marches = MARCHES;
    etat.modeDonnees = "demo";
  }

  for (const source of ["polymarket", "manifold"]) {
    const info = resultat.sources[source];
    const nom = source === "polymarket" ? "Polymarket" : "Manifold";
    etat.sources[source] = info.ok
      ? { etat: "ok", libelle: `${nom} : ${info.count} marchés réels chargés` }
      : { etat: "panne", libelle: `${nom} : API indisponible (${info.erreur})` };
  }
  etat.sources.websocket = { etat: "catalogue", depuisS: 0 };
  etat.chargementCatalogue = false;
  notifier();
  return resultat;
}

export function basculerFavori(id) {
  if (etat.favoris.has(id)) etat.favoris.delete(id);
  else etat.favoris.add(id);
  notifier();
}

// Badge de la cloche : notifications ni consultées ni déjà lues à l'origine.
export function notificationsNonVues() {
  return NOTIFICATIONS.filter((n) => !etat.notifsVues.has(n.id) && !n.lu);
}
export function toutesNotifications() { return NOTIFICATIONS; }
export function marquerNotifLue(id) { etat.notifsLues.add(id); etat.notifsVues.add(id); notifier(); }
export function marquerToutLu() {
  NOTIFICATIONS.forEach((n) => { etat.notifsLues.add(n.id); etat.notifsVues.add(n.id); });
  notifier();
}
// Ouvrir le centre de notifications suffit à éteindre le badge, sans forcer à
// ouvrir chaque ligne : on les a vues, elles ne nous intéressent peut-être pas.
export function marquerToutesVues() {
  let change = false;
  NOTIFICATIONS.forEach((n) => { if (!etat.notifsVues.has(n.id)) { etat.notifsVues.add(n.id); change = true; } });
  if (change) notifier();
}

export function etatClaim(c) {
  if (etat.claimsRecuperes.has(c.id)) return "CLAIMED";
  return c.etat;
}
export function claimsOuverts() {
  return etat.claims.filter((c) => ["CLAIMABLE", "REFUND_CLAIMABLE"].includes(etatClaim(c)));
}
export function totalARecuperer() {
  return claimsOuverts().reduce((s, c) => s + c.montant, 0);
}

// Simulation de la récupération d'un claim : la vraie version passera par une fonction
// SQL atomique côté Supabase (voir TRADING_ENGINE.md). Ici : délai + crédit local unique.
const claimsEnCours = new Set();
export function recupererClaim(id) {
  return new Promise((resolve, reject) => {
    const c = etat.claims.find((x) => x.id === id);
    if (!c) return reject(new Error("Claim introuvable"));
    if (claimsEnCours.has(id) || etatClaim(c) === "CLAIMED" || etatClaim(c) === "CLAIMING") {
      return reject(new Error("Déjà récupéré ou récupération en cours"));
    }
    claimsEnCours.add(id);
    setTimeout(() => {
      claimsEnCours.delete(id);
      const avant = etat.solde;
      etat.claimsRecuperes.add(id);
      etat.solde = Math.round((etat.solde + c.montant) * 100) / 100;
      etat.ledger.unshift({
        t: new Date().toISOString(),
        montant: c.montant,
        source: c.type === "REMBOURSEMENT" ? "marches_remboursement" : "marches_gain",
        marcheId: c.marcheId,
        libelle: (c.type === "REMBOURSEMENT" ? "Remboursement récupéré · " : "Gain récupéré · ") + c.titre
      });
      notifier();
      resolve({ avant, apres: etat.solde, montant: c.montant });
    }, 900);
  });
}

export function reglerDemo(cle, valeur) {
  etat.demo[cle] = valeur;
  if (cle === "panne_polymarket") etat.sources.polymarket = valeur
    ? { etat: "panne", libelle: "Polymarket : source indisponible depuis 12 min" }
    : { etat: "ok", libelle: "Polymarket : opérationnel" };
  if (cle === "panne_manifold") etat.sources.manifold = valeur
    ? { etat: "panne", libelle: "Manifold : source indisponible depuis 3 min" }
    : { etat: "ok", libelle: "Manifold : opérationnel" };
  if (cle === "ws_deconnecte") etat.sources.websocket = valeur
    ? { etat: "deconnecte", depuisS: 42 }
    : { etat: "connecte", depuisS: 2 };
  notifier();
}

export function basculerTheme() {
  etat.theme = etat.theme === "sombre" ? "clair" : "sombre";
  document.documentElement.dataset.theme = etat.theme;
  notifier();
}
