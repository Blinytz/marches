import { ETAT_SOURCES_DEFAUT, VALEUR_NOMINALE } from "./config.js";
import { chargerCatalogueReel } from "./api/market-data.js";
import { enrichirMarche } from "./api/market-detail.js";
import { acheter, chargerPortefeuille, vendre } from "./integration/eclats-wallet.js";
import { estConnecte, utilisateur } from "./api/supabase.js";

const CLE_STOCKAGE = "marches-reel";

function charger() {
  try { return JSON.parse(localStorage.getItem(CLE_STOCKAGE) || "{}"); }
  catch { return {}; }
}
const memo = charger();

export const etat = {
  marches: [],
  positions: [],
  claims: [],
  defaites: [],
  ledger: [],
  reglages: [],
  prefs: {
    themesSuivis: memo.themesSuivis || [],
    regionsSuivies: memo.regionsSuivies || [],
    horizonPrefereH: 24,
    masques: memo.masques || [],
    filtresEnregistres: memo.filtresEnregistres || []
  },
  valeurNominale: VALEUR_NOMINALE,
  solde: null,
  compteConnecte: estConnecte(),
  compteUtilisateur: utilisateur(),
  chargementCompte: estConnecte(),
  erreurCompte: null,
  favoris: new Set(memo.favoris || []),
  claimsRecuperes: new Set(),
  notifsLues: new Set(),
  notifsVues: new Set(),
  theme: memo.theme || "sombre",
  chargementCatalogue: true,
  modeDonnees: "chargement",
  catalogueActualiseAt: null,
  enrichissementsEnCours: new Set(),
  sources: structuredClone(ETAT_SOURCES_DEFAUT),
  ecouteurs: new Set()
};

function sauver() {
  localStorage.setItem(CLE_STOCKAGE, JSON.stringify({
    favoris: [...etat.favoris],
    themesSuivis: etat.prefs.themesSuivis,
    regionsSuivies: etat.prefs.regionsSuivies,
    masques: etat.prefs.masques,
    filtresEnregistres: etat.prefs.filtresEnregistres,
    theme: etat.theme
  }));
}

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
  try { await enrichirMarche(cible, issueId); }
  catch { /* le catalogue reste consultable */ }
  finally { etat.enrichissementsEnCours.delete(id); notifier(); }
  return true;
}

export async function chargerDonneesReelles() {
  etat.chargementCatalogue = true;
  notifier();
  const resultat = await chargerCatalogueReel();
  etat.marches = resultat.marches;
  etat.modeDonnees = resultat.origine;
  etat.catalogueActualiseAt = resultat.marches.length ? new Date().toISOString() : null;
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

export async function chargerCompteReel() {
  etat.chargementCompte = true;
  etat.erreurCompte = null;
  notifier();
  try {
    const portefeuille = await chargerPortefeuille();
    etat.compteConnecte = portefeuille.connecte;
    etat.compteUtilisateur = portefeuille.utilisateur;
    etat.solde = portefeuille.solde;
    etat.positions = portefeuille.positions;
    etat.ledger = portefeuille.ledger;
  } catch (erreur) {
    etat.erreurCompte = erreur.message;
    etat.solde = null;
    etat.positions = [];
    etat.ledger = [];
  } finally {
    etat.chargementCompte = false;
    notifier();
  }
}

export async function executerOrdre({ marche: marcheCible, issueId, mode, montant, parts, idempotencyKey }) {
  if (!etat.compteConnecte) throw new Error("Connectez-vous au portefeuille Éclats.");
  const resultat = mode === "vente"
    ? await vendre({
      positionId: etat.positions.find((p) => p.marcheId === marcheCible.id)?.id,
      parts,
      idempotencyKey
    })
    : await acheter({ marche: marcheCible, issueId, montant, idempotencyKey });
  await chargerCompteReel();
  return resultat;
}

export function basculerFavori(id) {
  if (etat.favoris.has(id)) etat.favoris.delete(id); else etat.favoris.add(id);
  notifier();
}
export function notificationsNonVues() { return 0; }
export function toutesNotifications() { return []; }
export function marquerNotifLue() {}
export function marquerToutLu() {}
export function marquerToutesVues() {}
export function etatClaim(c) { return c?.etat; }
export function claimsOuverts() { return []; }
export function totalARecuperer() { return 0; }
export function recupererClaim() { return Promise.reject(new Error("Aucun gain réel récupérable.")); }

export function basculerTheme() {
  etat.theme = etat.theme === "sombre" ? "clair" : "sombre";
  document.documentElement.dataset.theme = etat.theme;
  notifier();
}
